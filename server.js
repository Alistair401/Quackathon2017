var express = require('express');
var request = require('request');
var spotcrime = require('spotcrime');

var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer({
    dest: 'uploads/'
});
var ffmpeg = require('fluent-ffmpeg');

var fs = require('fs');

var {
    BingSpeechClient,
    VoiceRecognitionResponse
} = require('bingspeech-api-client');

var command = ffmpeg();

bingEndpoint = 'https://speech.platform.bing.com/speech/recognition/interactive/cognitiveservices/v1?language=en-GB';
bingKey = '26508f7a24f3407faf2eb20928a7b7ac';

if (fs.existsSync(__dirname + '/ffmpeg.exe') && fs.existsSync(__dirname + '/ffmpeg.exe')) {
    ffmpeg.setFfmpegPath(__dirname + '/ffmpeg.exe');
    ffmpeg.setFfprobePath(__dirname + '/ffprobe.exe');
}

app.use('/', express.static('public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.post('/input', upload.single('data'), function (req, res) {
    var filepath = 'uploads/' + req.file.filename;
    ffmpeg(filepath)
        .on('end', () => {
            var audioStream = fs.createReadStream(filepath + '.wav');
            var client = new BingSpeechClient(bingKey);
            client.recognizeStream(audioStream).then(response => console.log(response.results[0].name));
        })
        .save(filepath + '.wav');
});

app.listen(3000);

// TODO: Feed in countries dynamically
var englandWalesCountry = "RUK";
var scotlandCountry = "SC";
var usaCountry = "US";

// TODO: Feed in categories dynamically
var burglaryCategory = 'burglary';
var arsonCategory = 'criminal-damage-arson';
var violentCategory = 'violent-crime';

// TODO: Feed in locations dynamically
var dundeeLatLng = [56.4586, 2.9827];
var londonLatLng = [51.5074, 0.1278];
var manchesterLatLng = [53.4808, 2.2426];

var crimeResults = [];

var currentCountry = '';
var currentLocation = '';
var currentCategory = '';

/* Construct API url for England and Wales */
function buildEnglandWalesApiUrl(latitude, longitude){
    var CONST_POLICE_URL = 'https://data.police.uk/api/crimes-street/all-crime?lat=';
    var CONST_POLICE_URL_2 = '&lng=';
    return CONST_POLICE_URL+latitude+CONST_POLICE_URL_2+longitude;
}

/* Make request of USA Crime API (https://github.com/contra/spotcrime) */
function requestCategoryUS (){
    spotcrime.getCrimes(loc, radius, function(err, crimes){

    });
}
/* Make request of UK Crime API (https://data.police.uk/docs/)*/
function requestCategoryUK(apiURL, chosenCategory) {
    request.get(apiURL, function(error, response, body) {
        if (response.statusCode === 200){
            var result = JSON.parse(body);
            extractAllCrimeRequests(result, chosenCategory);
        }
    });
}
/* Add all crime results of chosen category to global array */
function extractAllCrimeRequests(result, chosenCategory) {
    for (var i = 0; i < result.length; i++) {
        var currentRecord = result[i];
        var category = currentRecord.category;
        var coords = [currentRecord.location.latitude, currentRecord.location.longitude];
        if (category === chosenCategory) {
            crimeResults.push({
                'cat': category,
                'coords': coords
            });
        }
    }
}

/* Selection of country - END RESULT: country of location */
/* Selection of location - END RESULT: coords of location */
/* Selection of category - END RESULT: array of crimes and coords*/
var categoryURL = buildEnglandWalesApiUrl(londonLatLng[0], londonLatLng[1]);
requestCategoryUK(categoryURL, 'burglary');

/* Add markers of crimes to map */




