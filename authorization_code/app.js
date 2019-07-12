/*
 * This is an example of a basic node.js script that performs
 * the Authorization Code oAuth2 flow to authenticate against
 * the Spotify Accounts.
 *
 * For more information, read
 * https://developer.spotify.com/web-api/authorization-guide/#authorization_code_flow
 */

const path = require('path');
const bodyparser = require('body-parser');
const hbs = require('express-handlebars');
//const fs = require('fs');
const AWS = require('aws-sdk');
const multer = require('multer');
//const { promisify } = require('util')
//const unlinkAsync = promisify(fs.unlink)

var metodos = require('./public/metodos');

var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');

var client_id = '***********************'; // Your client id
var client_secret = '***********************'; // Your secret
var redirect_uri = 'http://localhost:8888/callback'; // Your redirect uri

//ESTO ES LO NUEVOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO
//const morgan = require('morgan');
const mysql = require('mysql');
const myConnection = require('express-myconnection');
var app = express();

var access_token = "";
var idUsuario = "";

const s3 = new AWS.S3({
  accessKeyId: 'AKIAYTJ4SQN4PCQXWIGK',
  secretAccessKey: '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',
});

const rekognition = new AWS.Rekognition({
  accessKeyId: 'AKIAYTJ4SQN4PCQXWIGK',
  secretAccessKey: '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',
  region: 'us-east-1'
});

var Storage = multer.diskStorage({
  destination: function (req, file, callback) {
    callback(null, __dirname + '/public/images');
  },
  filename: function (req, file, callback) {
    callback(null, file.originalname);
  }
});


//CONEXION A BASE DE DATOOOOOOOSSS
/*app.use(morgan('dev'));
app.use(myConnection(mysql, {
  host: 'dbvirt.coxxbjw0iq0i.us-east-1.rds.amazonaws.com',
  user: 'devuser',
  password: 'Hola123*',
  port: 3306,
  database: 'dbvirt'
}, 'single'));
app.use(express.urlencoded({ extended: false }));*/

var mysqlConnection = mysql.createConnection({
  host: 'musicdb.coxxbjw0iq0i.us-east-1.rds.amazonaws.com',
  user: 'devuser',
  password: 'Hola123*',
  port: 3306,
  database: 'dbvirt'
});

mysqlConnection.connect((err) => {
  if (!err)
    console.log('DB connection succeded');
  else
    console.log('DB connection fail Error' + JSON.stringify(err, undefined, 2));
});


var upload = multer({
  storage: Storage
}).single('photo'); //Field name and max count



/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */

var generateRandomString = function (length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

//var app = express();

app.use(express.static(__dirname + '/public'))
  .use(cors())
  .use(cookieParser())
  .use(bodyparser.json())
  .use(bodyparser.urlencoded({ extended: false }));


app.set('views', path.join(__dirname, '/public/views')); //set views file
app.engine('hbs', hbs({ extname: 'hbs', defaultLayout: 'mainLayout', layoutsDir: __dirname + '/public/views/layouts/' }))
app.set('view engine', 'hbs'); //set view engine

app.post('/historial', (req,res) => {
  let sql = "INSERT INTO CANCIONES (id_usuario, id_song, url, nombre_song, artista) VALUES ('" + idUsuario + "', '" + req.body.idCancion + "', '" + req.body.url + "','" + req.body.nombreCancion + "', '" + req.body.artistaN + "');";
  console.log(sql);
  mysqlConnection.query(sql, (err, results) => {
    if (!err) {
      console.log("insert[e")
      res.redirect(req.body.url);
    }
  });

})

//FUNCION PARA CARGAR IMAGENES Y OBTENER EMOCIONES /////////////////////////////////////////////////////
app.post('/uploader', upload, (req, res) => {
  metodos.uploadToRemoteBucket(req.file.path, req.file.originalname, s3);
  metodos.processImages(req.file.originalname, rekognition);
  setTimeout(function () {
    console.log(metodos.maxConfidence);
    console.log(metodos.maxClima);
    console.log("llegue a recomendacion");
    //res.sendFile(path.join(__dirname+'/public/vista.html'));
    setTimeout(function () {
      console.log(metodos.maxConfidence);
      res.render('recommend', {
        llave: access_token,
        emotion: metodos.maxConfidence,
        clima: metodos.maxClima
      })
    }, 6000);

  }, 4000);
});

function insertarUsuario(body) {
  console.log("llegue al metodo");
  console.log(body);
  idUsuario = body.id;
 
  //console.log(body.display_name);
  let sql = "INSERT INTO USUARIOS (id_usuario, nombre_usuario) VALUES ('" + body.id + "', '" + body.display_name + "');";
  mysqlConnection.query(sql, (err, results) => {
    if (!err) {
      Console.log('yey');
    }
  });
  //mysqlConnection.end();
};


app.get('/login', function (req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email user-top-read';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});



app.get('/callback', function (req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };


    request.post(authOptions, function (error, response, body) {
      if (!error && response.statusCode === 200) {

        access_token = body.access_token,
          refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function (error, response, body) {

          insertarUsuario(body);
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});

app.get('/refresh_token', function (req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function (error, response, body) {
    if (!error && response.statusCode === 200) {
      access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});

console.log('Listening on 8888');
app.listen(8888);
//app.listen(10000);
