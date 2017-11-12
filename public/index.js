var audioCtx = new(window.AudioContext || window.webkitAudioContext)();

var recording = false;

var media_stream = null;
var media_recorder = null;
var media_chunks = null;

var map;
var markers = new Set();

var feedback;

var seenCategories = {};
var iconColors = ['white', 'red', 'darkred', 'lightred', 'orange', 'beige', 'green', 'darkgreen', 'lightgreen', 'blue', 'darkblue', 'lightblue', 'purple', 'darkpurple', 'pink', 'cadetblue', 'white', 'gray', 'lightgray', 'black'];

function record() {
    if (!recording) {
        recording = true;
        navigator.mediaDevices.getUserMedia({
                audio: true
            })
            .then(function (stream) {
                media_stream = stream;
                media_recorder = new MediaRecorder(stream);
                media_recorder.start();
                chunks = [];
                media_recorder.ondataavailable = function (e) {
                    chunks.push(e.data);
                }
            });
    } else {
        recording = false;
        media_recorder.stop();
        media_recorder.onstop = function (e) {
            var blob = new Blob(chunks, {
                'type': 'audio/webm; codecs=opus'
            });
            var fd = new FormData();
            fd.append('data', blob);
            $.ajax({
                type: 'POST',
                url: './input',
                processData: false,
                data: fd,
                contentType: false,
                success: function (data) {
                    if (data.command == 'location') {
                        feedback.html('Command detected: location');
                        map.fitBounds([[data.bounds.northeast.lat, data.bounds.northeast.lng],
                                       [data.bounds.southwest.lat, data.bounds.southwest.lng]]);
                    }
                    if (data.command == 'zoom') {
                        feedback.html('Command detected: zoom');
                        if (data.wish == 'in') {
                            map.zoomIn(5);
                        } else {
                            map.zoomOut(5);
                        }
                    }
                    if (data.command == 'crimes') {
                        feedback.html('Command detected: crimes');
                        var coords = map.getCenter();
                        var bounds = map.getBounds();
                        getCrime(coords.lat, coords.lng, bounds);
                    }
                    if (data.command == 'filter') {
                        feedback.html('Command detected: filter');
                        filterMarkers(data.filters);
                    }
                    if (data.command == 'restrooms' || data.command == 'toilets') {
                        feedback.html('Command detected: toilets');
                        var coords = map.getCenter();
                        getRestroom(coords.lat, coords.lng);
                    }
                }
            });
            media_chunks = null;
            media_stream = null;
            media_recorder = null;
        }
        media_stream.getTracks().forEach((track) => {
            track.stop();
        });
    }
}

function getRestroom(lat, lng) {
    $.get('./restroom', {
        lat: lat,
        lng: lng
    }, (data, status, iqXHR) => {
        data.forEach((entry) => {
            createMarker(entry.lat, entry.lng, `Toilet: ${entry.name}`, entry.name);
        });
    });
}

function getCrime(lat, lng, bounds) {
    var boundsToSend = {
        ne: {
            lat: bounds._northEast.lat,
            lng: bounds._northEast.lng
        },
        sw: {
            lat: bounds._southWest.lat,
            lng: bounds._southWest.lng
        }
    }
    $.get('./crime', {
        lat: lat,
        lng: lng,
        bounds: boundsToSend
    }, (data, status, jqXHR) => {
        data.forEach((entry) => {
            createMarker(entry.lat, entry.lng, `Crime: ${entry.category}`, entry.category);
        });
    });
}

function createMarker(lat, lng, title, category) {
    if (lat && lng) {
        var randomColor;
        if (seenCategories.hasOwnProperty(category)) {
            randomColor = seenCategories[category];
        } else {
            randomColor = iconColors[Math.floor(Math.random() * iconColors.length)];
            seenCategories[category] = randomColor;
        }
        var customIcon = L.AwesomeMarkers.icon({
            prefix: 'ion',
            icon: 'eye',
            markerColor: randomColor
        });
        var m = L.marker([lat, lng], {
            icon: customIcon
        });
        m.bindPopup(title);
        m['category'] = category.toLowerCase();
        m.addTo(map);
        markers.add(m);
    }
}

function filterMarkers(filters) {
    var initialLength = markers.length;
    var toRemove = []
    markers.forEach((marker) => {
        var matches = false
        filters.forEach((filter) => {
            if (marker.category.includes(filter)) {
                matches = true;
            }
        });
        if (!matches) {
            toRemove.push(marker);
        }
    });
    toRemove.forEach((marker) => {
        marker.removeFrom(map);
        markers.delete(marker);
        console.log('DEBUG: removed crime: ' + marker.category);
    })
}

$(document).ready(() => {
    feedback = $('#feedback');
    map = L.Wrld.map("map", "7a72309b1aeda260fbdb2265317f6f79", {
        center: [56.458882, -2.981787],
        zoom: 28.9,
        zoomControl: true
    });
    $(window).bind('storage', function (e) {
        if (localStorage.getItem('client_coords') !== null) {
            var retrievedObject = localStorage.getItem('client_coords');
            var coords = JSON.parse(retrievedObject);
            var lat = coords[0];
            var lon = coords[1];
            setTimeout(function () {
                map.setView([lat, lon], 25, {
                    animate: true
                });
            }, 1000);
        }
    });
});
