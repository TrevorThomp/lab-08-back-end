'use strict';

// Load Environment Variables from the .env file
require('dotenv').config();

//---------------------------
// Application Dependencies
//---------------------------
const express =require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

const PORT = process.env.PORT || 3000;
const app = express();

app.use(cors());

//-------------------------
// Configure Database
//-------------------------
const client = new pg.Client(process.env.DATABASE_URL);

client.connect();
client.on('error', err => console.error(err));

//-------------------------
// Home Page
//-------------------------
function homePage(request,response) {
  response.status(200).send('Welcome to the Home Page!');
}

//-------------------------
// Constructor Functions
//-------------------------
function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData.formatted_address;
  this.latitude = geoData.geometry.location.lat;
  this.longitude = geoData.geometry.location.lng;
}

function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toDateString();
}

Weather.tableName = 'weather';
Weather.lookup = lookup;

function Movies(movie) {
  this.title = movie.title;
  this.overview = movie.overview;
  this.average_votes = movie.average_votes;
  this.total_votes = movie.total_votes;
  this.image_url = movie.image_url;
  this.popularity = movie.popularity;
  this.released_on = movie.released_on;
}

Movies.tableName = 'movies';
Movies.lookup = lookup;

//-------------------------
// Lookup Function
//-------------------------
function lookup(handler) {
  let SQL = `SELECT * FROM ${handler.tableName} WHERE location_id=$1;`;

  return client.query(SQL, [handler.location_id])
    .then(results => {
      if (results.rowCount > 0) {
        handler.cacheHit(results);
      } else {
        handler.cacheMiss();
      }
    })
    .catch(() => errorMessage());
}

//-------------------------
// Location Database and API
//-------------------------
Location.fetchLocation = function (query){
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;
  return superagent.get(url)
    .then( result=> {
      if(!result.body.results.length) {throw 'No data';}
      let location = new Location(query, result.body.results[0]);
      return location.save()
        .then( result => {
          location.id = result.rows[0].id;
          return location;
        });
    });
};

Location.lookup = (handler) => {
  const SQL = 'SELECT * FROM locations WHERE search_query=$1';
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

Location.prototype.save = function(){
  const SQL = `INSERT INTO locations
  (search_query, formatted_query, latitude, longitude)
  VALUES ($1, $2, $3, $4)
  RETURNING *`;
  let values = Object.values(this);
  return client.query(SQL, values);
};

function getLocation(request,response) {
  const locationHandler = {
    query: request.query.data,
    cacheHit: (result) => {
      response.send(result.rows[0]);
    },
    cacheMiss: () => {
      Location.fetchLocation(request.query.data)
        .then( data => response.send(data));
    }
  };
  Location.lookup(locationHandler);
 }

//-------------------------
// Weather
//-------------------------
Weather.fetch = (query) => {
  const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${query.latitude},${query.longitude}`;

  return superagent.get(url)
    .then(result => {
      let weatherData = result.body.daily.data.map(day => {
        let weather = new Weather(day);
        weather.save(query.id);
        return weather;
      });
      return weatherData;
    })
    .catch(() => errorMessage());
};

Weather.prototype.save = function(location_id) {
  let SQL = `INSERT INTO weather 
    (forecast, timeDay, location_id)
    VALUES ($1, $2, $3);`;

  let values = Object.values(this);
  values.push(location_id);

  return client.query(SQL, values);
};

let getWeather = (request, response) => {
  const weatherHandler = {
    location_id: request.query.data.id,
    tableName: Weather.tableName,
    cacheHit: (result) => {
      response.send(result.rows);
    },
    cacheMiss: () => {
      Weather.fetch(request.query.data)
        .then((results) => response.send(results))
        .catch(() => errorMessage());
    }
  };

  Weather.lookup(weatherHandler);
};

//-------------------------
// Routes
//-------------------------
app.get('/', homePage);
app.get('/location', getLocation);
app.get('/weather', getWeather);

//-------------------------
// Error Handler
//-------------------------
let errorMessage = () => {
  let errorObj = {
    status: 500,
    responseText: 'Sorry something went wrong',
  };
  return errorObj;
};


// Error if route does not exist
app.use('*', (request, response) => response.send('Sorry, that route does not exist.'));

app.listen(PORT, () => console.log(`App is listening on ${PORT}`));
