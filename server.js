var express = require('express');
var request = require('request');

var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer({
    dest: 'uploads/'
});
var ffmpeg = require('fluent-ffmpeg');

var { BingSpeechClient, VoiceRecognitionResponse } = require('bingspeech-api-client');

var command = ffmpeg();

bingEndpoint = 'https://speech.platform.bing.com/speech/recognition/interactive/cognitiveservices/v1?language=en-GB';
bingKey = '26508f7a24f3407faf2eb20928a7b7ac';

ffmpeg.setFfmpegPath(__dirname + '/ffmpeg.exe');
ffmpeg.setFfprobePath(__dirname + '/ffprobe.exe');

app.use('/', express.static('public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.post('/input', upload.single('data'), function (req, res) {
    var filepath = 'uploads/' + req.file.filename;
    ffmpeg(filepath)
        .save(filepath + '.wav');
//    var requestOptions = {
//        url: bingEndpoint,
//        'Content-Type': audio/wav,
//        'Ocp-Apim-Subscription-Key': bingKey,
//        'Transfer-Encoding': chunked
//    }
    var audioStream = fs.createReadStream(myFileName);
    var client = new BingSpeechClient(bingKey);
    client.recognizeStream(audioStream).then(response => console.log(response.results));
    res.send('POST request to input');
});

app.use('/', express.static('public'));

app.listen(3000);

// TODO: Feed in coordinates dynamically
var CONST_POLICE_URL = 'https://data.police.uk/api/crimes-street/all-crime?lat=';
var CONST_POLICE_URL_2 = '&lng=';
var CONST_MONTH = '&date=2017-01';

var dundeeLatLng = [56.4586, 2.9827];
var londonLatLng = [51.5074, 0.1278];
var manchesterLatLng = [53.4808, 2.2426];

var submittedURL = CONST_POLICE_URL + londonLatLng[0] + CONST_POLICE_URL_2 + londonLatLng[1] + CONST_MONTH;

var crimeResults = [];

// Make request of police API
request.get(submittedURL, function (error, response, body) {
    if (response.statusCode === 200) {
        var result = JSON.parse(body);
        for (var i = 0; i < result.length; i++) {
            var currentRecord = result[i];
            var category = currentRecord.category;
            var coords = [currentRecord.location.latitude, currentRecord.location.longitude];
            crimeResults.push({
                'cat': category,
                'coords': coords
            });
        }
    }
});
/*request.get(submittedURL)
    .on('response', function(response) {
        //console.log(response);
    })
    .on('body', function(body) {
        console.log(body);
    })
    .on('error', function(err) {
        //console.log(err);
})*/
