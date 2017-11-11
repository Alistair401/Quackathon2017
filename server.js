var express = require('express');
var request = require('request');

var app = express();
var bodyParser = require('body-parser');
var multer = require('multer');
var upload = multer({
    dest: 'uploads/'
});
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

app.use('/',express.static('public'));

app.listen(3000);

// TODO: Feed in coordinates dynamically
var CONST_POLICE_URL = 'https://data.police.uk/api/crimes-street/all-crime?lat=';
var CONST_POLICE_URL_2 = '&lng=';
var CONST_MONTH = '&date=2017-01';

var dundeeLatLng = [56.4586, 2.9827];
var londonLatLng = [51.5074, 0.1278];
var manchesterLatLng = [53.4808, 2.2426];

var crimeResults = [];

/* Construct API url for England and Wales (https://data.police.uk/docs/) */
function buildEnglandWalesApiUrl(latitude, longitude){
    var CONST_POLICE_URL = 'https://data.police.uk/api/crimes-street/all-crime?lat=';
    var CONST_POLICE_URL_2 = '&lng=';
    return CONST_POLICE_URL+latitude+CONST_POLICE_URL_2+longitude;
}

/* Make request of police API */
function requestCategory(apiURL, chosenCategory) {
    request.get(apiURL, function(error, response, body) {
        if (response.statusCode === 200){
            var result = JSON.parse(body);
            extractAllCrimeRequests(result, chosenCategory);
        }
    });
}
/* Add all crime results of chosen category to global array */
function extractAllCrimeRequests(result, chosenCategory) {
    for (var i = 0 ; i < result.length ; i++ ){
        var currentRecord = result[i];
        var category = currentRecord.category;
        var coords = [currentRecord.location.latitude, currentRecord.location.longitude];
        if (category === chosenCategory){
            crimeResults.push({'cat':category, 'coords': coords});
        }
    }
}
/* Selection of country */
/* Selection of location */
var lat = londonLatLng[0]; // End up with these
var lon = londonLatLng[1];
/* Selection of category */
var categoryURL = buildEnglandWalesApiUrl(lat, lon);
requestCategory(categoryURL, 'burglary');
console.log(crimeResults);
/* Add markers of crimes to map */




