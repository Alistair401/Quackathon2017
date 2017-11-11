var audioCtx = new(window.AudioContext || window.webkitAudioContext)();

var recording = false;

var media_stream = null;
var media_recorder = null;
var media_chunks = null;

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
        record = false;
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
                    // TODO
                }
            });
        }
        media_stream.getTracks().forEach((track) => {
            track.stop();
        });
    }
}
