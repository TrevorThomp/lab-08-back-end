'use strict';

require('dotenv').config();

//Dependencies and setup
const express = require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');


const getWeather = require('./weather.js');
const getMovies = require('./movies.js');
const getYelp = require('./yelp.js');
const PORT = process.env.PORT || 3000;
const app = express();
app.use(cors());

//Configure Database
const client = new pg.Client(process.env.DATABASE_URL);
client.connect();
client.on('err', err => console.error(err));

//Errors
function notFoundHandler(request,response) {
  response.status(404).send('huh?');
}
function errorHandler(error,request,response) {
  response.status(500).send(error);
}

//Constructor Functions
function Location(query, data){
  this.search_query = query;
  this.formatted_query = data.formatted_address;
  this.latitude = data.geometry.location.lat;
  this.longitude = data.geometry.location.lng;
}

//Static Constructor Functions
Location.fetchLocation = function (query){
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;

  return superagent.get(url)
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

//Define a prototype function to save data to DB
Location.prototype.save = function(){
  const SQL = `INSERT INTO locations
  (search_query, formatted_query, latitude, longitude)
  VALUES ($1, $2, $3, $4)
  RETURNING *`;

  let values = Object.values(this);
  return client.query(SQL, values);
};

//Route Handlers
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
app.get('/location', getLocation);
app.get('/weather', getWeather);
app.get('/movies', getMovies);
app.get('/yelp', getYelp);


app.use('*', notFoundHandler);
app.use(errorHandler);

// Make sure the server is listening for requests
app.listen(PORT, () => console.log(`App is listening on ${PORT}`) );
