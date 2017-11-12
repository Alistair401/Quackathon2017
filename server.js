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

googleGeocodeEndpoint = 'https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyAdc-OUimLZdJPxDCpHMxdxNOQFvB52Gj0';
bingEndpoint = 'https://speech.platform.bing.com/speech/recognition/interactive/cognitiveservices/v1?language=en-GB';
bingKey = '26508f7a24f3407faf2eb20928a7b7ac';

if (fs.existsSync(__dirname + '/ffmpeg.exe') && fs.existsSync(__dirname + '/ffprobe.exe')) {
    ffmpeg.setFfmpegPath(__dirname + '/ffmpeg.exe');
    ffmpeg.setFfprobePath(__dirname + '/ffprobe.exe');
}

app.use('/', express.static('public'));
app.use(bodyParser.urlencoded({
    extended: true
}));
app.get('/crime', function (req, res) {
    var latitude = parseFloat(req.query.lat);
    var longitude = parseFloat(req.query.lng);
    console.log('DEBUG: getting crimes around: ' + latitude + ',' + longitude);
    var getCountryURL = googleGeocodeEndpoint + '&result_type=political&latlng=' + latitude + ',' + longitude
    request.get(getCountryURL,
        function (error, response, body) {
            var results = JSON.parse(body).results;
            if (results.length > 0) {
                var political = results[0].formatted_address.toLowerCase().trim();
                if (political.toLowerCase().includes('uk')) {
                    var englandWalesURL = buildEnglandWalesApiUrl(req.query.bounds);
                    requestCategoryUK(englandWalesURL, (info) => {
                        console.log('DEBUG: crimes found: ' + info.length);
                        res.json(info);
                    });
                }
                if (political.toLowerCase().includes('usa')) {
                    var loc = {
                        lat: parseFloat(req.query.lat).toFixed(5),
                        lon: parseFloat(req.query.lng).toFixed(5)
                    }
                    requestCategoryUS(loc, (info) => {
                        console.log('DEBUG: crimes found: ' + info.length);
                        res.json(info);
                    });
                }
            }
        });
});
app.get('/restroom', function (req, res) {
    var latitude = parseFloat(req.query.lat);
    var longitude = parseFloat(req.query.lng);
    console.log('DEBUG: getting crimes around: ' + latitude + ',' + longitude);
    var restroomURL = buildRestroomApiUrl(req.query.lat, req.query.lng);
    requestRestroom(restroomURL, (info) => {
        console.log('DEBUG: restroom found: ' + info.length);
        res.json(info);
    });
});
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
                    request.get(googleGeocodeEndpoint + '&address=' + encodeURIComponent(wish), function (error, response, body) {
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
                        res.json({
                            command: command,
                            filters: [...JSON.parse(body).map((entry) => entry.word), wish]
                        });
                    });
                } else if (command == 'zoom') {
                    if (wish == 'in' || wish == 'out') {
                        res.json({
                            command: command,
                            wish: wish
                        });
                    }
                } else if (command == 'crimes') {
                    res.json({
                        command: command,
                        wish: wish
                    });
                } else if (command == 'restrooms' || command == 'toilets') {
                    res.json({
                        command: command
                    });
                }
                fs.unlinkSync(filepath);
                fs.unlinkSync(filepath + '.wav');
            });
        })
        .save(filepath + '.wav');
});

app.listen(3000);

/* Construct API url for England and Wales */
function buildEnglandWalesApiUrl(bounds) {
    var CONST_POLICE_URL = 'https://data.police.uk/api/crimes-street/all-crime?poly=';
    return CONST_POLICE_URL + `${bounds.ne.lat},${bounds.ne.lng}:${bounds.ne.lat},${bounds.sw.lng}:${bounds.sw.lat},${bounds.sw.lng}:${bounds.sw.lat},${bounds.ne.lng}`;
}
/* Make request of USA Crime API (https://github.com/contra/spotcrime) */
function requestCategoryUS(loc, success) {
    spotcrime.getCrimes(loc, 10, function (err, crimes) {
        success(processCrimeResults(crimes, 'usa'));
    });
}
/* Make request of UK Crime API (https://data.police.uk/docs/)*/
function requestCategoryUK(apiURL, success) {
    request.get(apiURL, function (error, response, body) {
        if (response.statusCode === 200) {
            var results = JSON.parse(body);
            success(processCrimeResults(results, 'uk'));
        }
    });
}

/* Add all crime results of chosen category to global array */
function processCrimeResults(result, political) {
    if (political == 'usa') {
        return result.map((entry) => {
            return {
                category: entry.type,
                lat: entry.lat,
                lng: entry.lon
            }
        });
    } else if (political == 'uk') {
        return result.map((entry) => {
            return {
                category: entry.category,
                lat: entry.location.latitude,
                lng: entry.location.longitude
            }
        });
    }
    return [];
}

/* Construct Restroom API url */
function buildRestroomApiUrl(latitude, longitude) {
    var CONST_RESTROOM_URL = 'https://www.refugerestrooms.org:443/api/v1/restrooms/by_location.json?lat=';
    var CONST_RESTROOM_URL_2 = '&lng=';
    return CONST_RESTROOM_URL + latitude + CONST_RESTROOM_URL_2 + longitude;
}

/* Make request of Restroom API (https://www.refugerestrooms.org/api/docs/)*/
function requestRestroom(apiURL, success) {
    request.get(apiURL, function (error, response, body) {
        if (response.statusCode === 200) {
            var results = JSON.parse(body);
            success(processRestroomResults(results));
        }
    })
}

/* Add all Restroom results of chosen category to global array */
function processRestroomResults(result) {
    return result.map((entry) => {
        return {
            name: entry.name,
            lat: entry.latitude,
            lng: entry.longitude
        }
    });
}
