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
            client.recognizeStream(audioStream).then((response) => {
                var sentence = response.results[0].name;
                var command = sentence.split(' ')[0].trim();
                var wish = sentence.replace(command, '').trim();
                console.log(command);
                console.log(wish);
                if (command == 'location') {
                    request.get('https://maps.googleapis.com/maps/api/geocode/json?address=' + encodeURIComponent(wish) + '&key=' + 'AIzaSyAdc-OUimLZdJPxDCpHMxdxNOQFvB52Gj0', function (error, response, body) {
                        var locations = JSON.parse(body).results;
                        if (locations.length > 0) {
                            res.json({
                                command: command,
                                geometry: locations[0].geometry.location,
                                bounds: locations[0].geometry.bounds
                            });
                        }
                    });
                } else if (command == 'filter') {
                    request.get('https://api.datamuse.com/words?ml=' + encodeURIComponent(wish), function (error, response, body) {
                        res.json(JSON.parse(body).map((entry) => entry.word));
                    });
                } else if (command == 'zoom') {
                    if (wish == 'in' || wish == 'out') {
                        res.json({
                            command: command,
                            wish: wish
                        });
                    }
                }
                fs.unlinkSync(filepath);
                fs.unlinkSync(filepath + '.wav');
            });
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

//var crimeResults = [];

var currentCountry = '';
var currentLocation = '';
var currentCategory = '';

/* Construct API url for England and Wales */
function buildEnglandWalesApiUrl(latitude, longitude) {
    var CONST_POLICE_URL = 'https://data.police.uk/api/crimes-street/all-crime?lat=';
    var CONST_POLICE_URL_2 = '&lng=';
    return CONST_POLICE_URL + latitude + CONST_POLICE_URL_2 + longitude;
}

/* Make request of USA Crime API (https://github.com/contra/spotcrime) */
function requestCategoryUS(coords, chosenCategory) {
    spotcrime.getCrimes(coords, 1, function (err, crimes) {
        var results = JSON.parse(crimes);
        return extractAllCrimeRequests(results, chosenCategory, 'US');
    });
}
/* Make request of UK Crime API (https://data.police.uk/docs/)*/
function requestCategoryUK(apiURL, chosenCategory) {
    request.get(apiURL, function (error, response, body) {
        if (response.statusCode === 200) {
            var results = JSON.parse(body);
            return extractAllCrimeRequests(results, chosenCategory, 'UK');
        }
    });
}
/* Return all crime results of chosen category as array */
function extractAllCrimeRequests(results, chosenCategory, countryCode) {
    var crimeResults = [];
    for (var i = 0; i < results.length; i++) {
        var currentRecord = results[i];

        /* Extract crime categories and coordinates */
        var category;
        var coords;
        if (countryCode === 'UK'){
            category = currentRecord.category;
            coords = [currentRecord.location.latitude, currentRecord.location.longitude];
        } else if (countryCode === 'US') {
            category = currentRecord.type;
            coords = [currentRecord.latitude, currentRecord.longitude];
        }
        /* Store category and coords if they are relevant */
        if (category === chosenCategory) {
            crimeResults.push({
                'cat': category,
                'coords': coords
            });
        }
    }
    return crimeResults;
}

/* Selection of country - END RESULT: country of location */
/* Selection of location - END RESULT: coords of location */
/* Selection of category - END RESULT: array of crimes and coords*/
var categoryURL = buildEnglandWalesApiUrl(londonLatLng[0], londonLatLng[1]);
var crimeArray = requestCategoryUK(categoryURL, 'burglary');


/**
 * INPUT FROM VOICE WILL BE (crime category) OR (location)
 */
var location = false;
var crime_category = false;
if (location){
    // get [lat,lng] coords
    // get
} else if (crime_category){

}
/* Add markers of crimes to map */
