'use strict';

require('dotenv').config();

//Dependencies and setup
const express = require('express');
const app = express();
const cors = require('cors');
const pg = require('pg');
const superagent = require('superagent');
app.use(cors());

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

const client = new pg.Client(process.env.DATABASE_URL);
client.on('err', err => console.error(err));

// Access to API modules
const getWeather = require('./weather.js');
const getMovies = require('./movies.js');
const getYelp = require('./yelp.js');
// const getLocation = require('./location.js');
const getTrail = require('./trail.js');

// PORT
const PORT = process.env.PORT || 3000;

function getHome(request,response) {
  response.status(200).send('Welcome to the Home Page')
}

//Errors
function notFoundHandler(request,response) {
  response.status(404).send('');
}
function errorHandler(error,request,response) {
  response.status(500).send(error);
}

// Location Constructor
function Location(query, data){
  this.search_query = query;
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
}

// Google Geocode API Fetch
Location.fetchLocation = function (query){
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;

  return superagent
    .get(url)
    .then( result=> {
      if(!result.body.results.length) {throw 'No data';}
      let location = new Location(query, result.body.results[0]);
      return location.save()
        .then( result => {
          location.id = result.rows[0].id; //update, delete...etc...
          return location;
        });
    });
};

// Location SQL lookup
Location.lookup = (handler) => {
  const SQL = `SELECT * FROM locations WHERE search_query=$1`;
  const values = [handler.query];

  return client.query(SQL, values)
    .then( results => {
      if (results.rowCount > 0){
        handler.cacheHit(results);
      }else {
        handler.cacheMiss();
      }
    })
    .catch(console.error);
};

// Location SQL save data
Location.prototype.save = function(){
  const SQL = `INSERT INTO locations
  (search_query, formatted_query, latitude, longitude)
  VALUES ($1, $2, $3, $4)
  RETURNING *`;

  let values = Object.values(this);
  return client.query(SQL, values);
};

// Function to query DB or fetch from API
function getLocation(request,response) {

  const locationHandler = {
    query: request.query.data,

    cacheHit: (results) => {
      console.log('Got data from DB');
      response.send(results.rows[0]);
    },

    cacheMiss: () => {
      console.log('No data in DB, fetching...');
      Location.fetchLocation(request.query.data)
        .then( data => response.send(data));
    }
  };
  Location.lookup(locationHandler);
}

// API Routes
app.get('/', getHome);
app.get('/location', getLocation);
app.get('/trails', getTrail);
app.get('/weather', getWeather);
app.get('/movies', getMovies);
app.get('/yelp', getYelp);


// Registered middleware
app.use('*', notFoundHandler);
app.use(errorHandler);

// Make sure the server is listening for requests
client.connect()

app.listen(PORT, ()=> {
  console.log('server and db are up, listening on port ', PORT);
});
