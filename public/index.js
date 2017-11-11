var audioCtx = new(window.AudioContext || window.webkitAudioContext)();

var recording = false;

var media_stream = null;
var media_recorder = null;
var media_chunks = null;

var map;

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
                            map.zoomIn(-5);
                        } else {
                            map.zoomOut(5);
                        }
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

$(document).ready(() => {
    map = L.Wrld.map("map", "7a72309b1aeda260fbdb2265317f6f79", {
        center: [56.458882, -2.981787],
        zoom: 28.9,
        zoomControl: true
    });
});

// Geolocation functionality
var store = require('browser-store');
if ("geolocation" in navigator) {
    navigator.geolocation.getCurrentPosition(function(position) {
        var location = {'lat': position.coords.latitude, 'lon':position.coords.longitude};
        store.put('client_coords', JSON.stringify(location), function (err) {
            //=> err === null
            store.get('client_coords', function (err, value) {
                //=> err === null
                if (value !== null){//=> value === {'lat': lat, 'lon':lon}
                }
            })
        })
    });
} else {
    /* geolocation IS NOT available */
}
