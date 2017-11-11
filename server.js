var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer({
    dest: 'uploads/'
})
var ffmpeg = require('fluent-ffmpeg');

var command = ffmpeg();

ffmpeg.setFfmpegPath(__dirname + '/ffmpeg.exe');
ffmpeg.setFfprobePath(__dirname + '/ffprobe.exe');

app.use('/', express.static('public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.post('/input', upload.single('data'), function (req, res) {
    ffmpeg('uploads/' + req.file.filename)
        .save('uploads/' + req.file.filename + '.wav');
    res.send('POST request to input');
});

app.listen(3000);
