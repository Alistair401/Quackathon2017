var audioCtx = new(window.AudioContext || window.webkitAudioContext)();

var recording = false;

var media_stream = null;
var media_recorder = null;
var media_chunks = null;

var map;
var markers = new Set();

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
                        map.fitBounds([[data.bounds.northeast.lat, data.bounds.northeast.lng],
                                       [data.bounds.southwest.lat, data.bounds.southwest.lng]]);
                    }
                    if (data.command == 'zoom') {
                        if (data.wish == 'in') {
                            map.zoomIn(5);
                        } else {
                            map.zoomOut(5);
                        }
                    }
                    if (data.command == 'crimes') {
                        var coords = map.getCenter();
                        map.zoomIn(5);
                        getCrime(coords.lat, coords.lng, data.wish);
                    }
                    if (data.command == 'filter') {
                        filterMarkers(data.filters);
                    }
                    if (data.command == 'restroom' || data.command == 'toilet') {
                        var coords = map.getCenter();
                        map.zoomIn(5);
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
            createMarkerWithName(entry.lat, entry.lng, entry.name);
        });
    });
}

function createMarkerWithName(lat, lng, name) {
    if (lat && lng) {
        var m = L.marker([lat,lng],{title:name});
        m.bindPopup(name);
        m.addTo(map);
    }
}

function getCrime(lat, lng, filter) {
    $.get('./crime', {
        lat: lat,
        lng: lng
    }, (data, status, jqXHR) => {
        data.forEach((entry) => {
            createMarker(entry.lat, entry.lng, entry.category);
        });
    });
}

function createMarker(lat, lng, category) {
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
            icon: 'locked',
            markerColor: randomColor
        });
        var m = L.marker([lat, lng], {
            icon: customIcon
        });
        m.bindPopup(`crime: ${category}`);
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


// Geolocation functionality
var store = require('browser-store');
if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(function (position) {
        var location = {
            'lat': position.coords.latitude,
            'lon': position.coords.longitude
        };
        store.put('client_coords', JSON.stringify(location), function (err) {
            //=> err === null
            store.get('client_coords', function (err, value) {
                //=> err === null
                if (value !== null) { //=> value === {'lat': lat, 'lon':lon}
                }
            })
        })
    });
} else {
    /* geolocation IS NOT available */
}
