

const fs = require('fs');
const { promisify } = require('util')
const unlinkAsync = promisify(fs.unlink)
var amqp = require('amqplib/callback_api');

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library

var app = express();


exports.pruebaFunct = function (a, b) {
  var variable = 1
  variable = variable + a + b;
  return variable;
}


function getClima(id_clima) {
  var id = parseInt(id_clima);
  var result = 0;
  if (id >= 200 && id <= 232) {
    result = 1;
  }
  else if ((id >= 300 && id <= 321) || (id >= 500 && id <= 531)) {
    result = 4;
  }
  else if (id >= 600 && id <= 622) {
    result = 4;
  }
  else if (id >= 701 && id <= 781) {
    result = 1;
  }
  else if (id >= 800 && id <= 801) {
    result = 2;
  }
  else if (id >= 802 && id <= 804) {
    result = 3;
  }
  return result;
}


var isPaused = false;
exports.isPaused = isPaused;
exports.uploadToRemoteBucket = function (path, name, s3) {
  isPaused = true;
  fs.readFile(path, (err, data) => {
    if (err) throw err;
    const params = {
      Bucket: 'grupovirt', // pass your bucket name
      Key: 'images/' + name, // file will be saved as images/image_name.extension
      Body: data//JSON.stringify(data, null, 2)
    };
    s3.upload(params, function (s3Err, data) {
      if (s3Err) throw s3Err
      console.log(`File uploaded successfully at ${data.Location}`)
      isPaused = false;
    })
  })
  //remove file from server
  unlinkAsync(path);
}


var maxConfidence = 'UNKNOWN';
var maxClima = 0
exports.processImages = function (name, rekognition) {
  function waitForIt() {
    if (isPaused) {
      setTimeout(function () { waitForIt() }, 500);
    } else {
      //llamada rabbit
      amqp.connect('amqp://proyecto:1234@34.226.118.240', function (error0, connection) {
        //amqp.connect('amqp://localhost', function(error0, connection) {
        if (error0) {
          throw error0;
        }
        connection.createChannel(function (error1, channel) {
          if (error1) {
            throw error1;
          }
          channel.assertQueue('', {
            exclusive: true
          }, function (error2, q) {
            if (error2) {
              throw error2;
            }
            var correlationId = generateUuid();
            console.log(' [x] Requesting Emotion' + name);

            channel.consume(q.queue, function (msg) {
              if (msg.properties.correlationId == correlationId) {
                console.log(' [.] Got %s', msg.content.toString());
                exports.maxConfidence = msg.content.toString();
                //maxConfidence = msg.content.toString();
                setTimeout(function () {
                  connection.close();
                  //process.exit(0) 
                }, 500);
              }
            }, {
                noAck: true
              });

            channel.sendToQueue('emociones_queue',
              Buffer.from(name.toString()), {
                correlationId: correlationId,
                replyTo: q.queue
              });
          });
        });
      });
      //Coneccion al servicio del clima de rabbit
      amqp.connect('amqp://proyecto:1234@34.226.118.240', function (error0, connection) {
        if (error0) {
          throw error0;
        }
        connection.createChannel(function (error1, channel) {
          if (error1) {
            throw error1;
          }
          channel.assertQueue('', {
            exclusive: true
          }, function (error2, q) {
            if (error2) {
              throw error2;
            }
            var correlationId = generateUuid();
            var num = parseInt(1);

            console.log(' [x] Requesting Climate');

            channel.consume(q.queue, function (msg) {
              if (msg.properties.correlationId == correlationId) {
                console.log(' [.] Got %s', msg.content.toString());
                maxClima = getClima(msg.content.toString());
                exports.maxClima = maxClima;
                setTimeout(function () {
                  connection.close();
                  //process.exit(0) 
                }, 500);
              }
            }, {
                noAck: true
              });

            channel.sendToQueue('rpc_queue',
              Buffer.from(num.toString()), {
                correlationId: correlationId,
                replyTo: q.queue
              });
          });
        });
      });
    };
  }
  waitForIt();
}

function generateUuid() {
  return Math.random().toString() +
    Math.random().toString() +
    Math.random().toString();
}

function getParametros(clima, animo) {
  var params = {};
  var energy, danceability;
  console.log("estoy en parametros");
  clima = clima.toString();
  console.log(clima);
  console.log(animo);
  switch (clima) {
    case '1':
      energy = 1;
      break;

    case '2':
      energy = 0.7;
      break;

    case '3':
      energy = 0.4;
      break;

    case '4':
      energy = 0.2;
      break;

    default:
      energy = 0.5;
      break;
  }


  switch (animo) {
    case 'HAPPY':
      danceability = 1;
      break;

    case 'SAD':
      danceability = 0.1;
      break;

    case 'ANGRY':
      danceability = 0.8;
      break;

    case 'CONFUSED':
      danceability = 0.3;
      break;

    case 'DISGUSTED':
      danceability = 0.2;
      break;

    case 'SURPRISED':
      danceability = 0.7;
      break;

    case 'CALM':
      danceability = 0.4;
      break;

    case 'UNKNOWN':
      danceability = 0.5;
      break;

    default:
      danceability = 0.5;
      break;
  }

  params[0] = energy;
  params[1] = danceability;
  return params;
};

function obtenerCanciones(token_var) {

  //var params = getHashParams();
  var response = {};

  var access_token = token_var;
  //var access_token = params.access_token,
  //refresh_token = params.refresh_token,
  //error = params.error;

  return $.ajax({
    url: 'https://api.spotify.com/v1/me/top/tracks?time_range=medium_term&limit=10&offset=0',
    headers: {
      'Authorization': 'Bearer ' + access_token
    },
    async: false,
    dataType: 'json',
    success: function (response) {
      //console.log(response)
      //return response

    }
  });
  //return response;
};

function obtenerArtistas(token_var) {

  //var params = getHashParams();
  //var response = {};

  var access_token = token_var;
  //var access_token = params.access_token,
  //refresh_token = params.refresh_token,
  //error = params.error;

  return $.ajax({
    url: 'https://api.spotify.com/v1/me/top/artists?time_range=medium_term&limit=10&offset=0',
    headers: {
      'Authorization': 'Bearer ' + access_token
    },
    async: false,
    dataType: 'json',
    success: function (response) {
      //console.log(response)
      //return response

    }
  });

  //return response;
};


function obtenerRecomendacion(var_token, emotion, climate, id) {
  console.log("llamada a recomendacion")
  console.log(var_token)
  console.log(emotion)
  console.log(climate)
  //var params = getHashParams();
  //var cancionesP = obtenerCanciones();
  //var artistasP = obtenerArtistas();

  var cancionesP = obtenerCanciones(var_token);
  var artistasP = obtenerArtistas(var_token);
  var variables = getParametros(climate, emotion);

  console.log(variables);

  var access_token = var_token;
  //var access_token = params.access_token,
  //refresh_token = params.refresh_token,
  //error = params.error;


  const prueba1 = `
      <div class="row">
        <div class="pull-left">
            <img class="media-object" width="300" src="{{tracks.0.album.images.0.url}}" />
        </div>
    </div>
    <div class="row">
      
      <div class="form-group"> 
        <label for="nombreCancion">Canción: </label>
        <h4 id="nombreCancion">{{tracks.0.name}}</h4>
        <label for="artistaN">Artista: </label>
        <h4 id="artistaN">{{tracks.0.album.artists.0.name}}</h4>      
      </div>
      <div>
      <form action="/historial" method="post">
        <input hidden type="text" id="nombreCancion" name="nombreCancion" value="{{tracks.0.name}}">
        <input hidden type="text" id="artistaN" name="artistaN" value="{{tracks.0.album.artists.0.name}}">
        <input hidden type="text" id="idCancion" name="idCancion" value="{{tracks.0.id}}">
        <input hidden type="text" id="url" name="url" value="{{tracks.0.external_urls.spotify}}">
      <button type="submit" class="btn btn-success">Escuchar</button>
      </form>     
      </div>
    </div>
      `;



  //var userSongSource = document.getElementById('prueba1').innerHTML,
  var userSongSource = prueba1,
    userSongTemplate = Handlebars.compile(userSongSource),
    userSongPlaceholder = document.getElementById('user-song');

  $.ajax({
    url: 'https://api.spotify.com/v1/recommendations?limit=2&seed_artists=' + artistasP.responseJSON.items[0].id + '%2C' + artistasP.responseJSON.items[1].id + '&seed_tracks=' + cancionesP.responseJSON.items[0].id + '%2C' + cancionesP.responseJSON.items[1].id + '&target_danceability=' + variables[1] + '&target_energy=' + variables[0] + '&min_popularity=50',
    headers: {
      'Authorization': 'Bearer ' + access_token
    },
    success: function (response) {
      userSongPlaceholder.innerHTML = userSongTemplate(response);
    }
  });
}


function salir() {
  AuthenticationClient.clearCookies(getApplication());
}


function getHashParams() {
  var hashParams = {};
  var e, r = /([^&;=]+)=?([^&;]*)/g,
    q = window.location.hash.substring(1);
  while (e = r.exec(q)) {
    hashParams[e[1]] = decodeURIComponent(e[2]);
  }
  //console.log(hashParams)
  return hashParams;
}

