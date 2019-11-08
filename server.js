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
// Routes
//-------------------------
app.get('/', homePage);
app.get('/location', getLocation);
app.get('/weather', getWeather);

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
  this.formatted_query = geoData.results[0].formatted_address;
  this.latitude = geoData.results[0].geometry.location.lat;
  this.longitude = geoData.results[0].geometry.location.lng;
}

function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toDateString();
}

Weather.tableName = 'weather';
//-------------------------
// Location Database and API
//-------------------------
Location.fetchLocation = function(query) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${query}&key=${process.env.GEOCODE_API_KEY}`;

  return superagent.get(url)
    .then(result => {
      if (!result.body.results.length) throw 'no data';
      let location = new Location(query, result.body.results[0]);
      return location.save()
        .then(result => {
          location.id = result.rows[0].id;
          return location;
        });

    })
    .catch(() => errorHandler());
};

Location.lookup = handler => {
  const SQL = `SELECT * FROM locations WHERE search_query=$1;`;
  const values = [handler.query];

  return client.query(SQL, values)
    .then(results => {
      if (results.rowCount > 0) {
        handler.cacheHit(results);
      } else {
        handler.cacheMiss(results);
      }
    })
    .catch(console.error);
};

Location.prototype.save = function() {
  let SQL = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES($1, $2, $3, $4) RETURNING *';
  let safeValues = Object.values(this);
  client.query(SQL, safeValues).catch( error => errorHandler(error));
};

function getLocation (request, response) {
  const locationHandler = {
    query: request.query.data,
    cacheHit: result => {
      response.send(result.rows[0]);
    },
    cacheMiss: () => {
      Location.fetchLocation(request.query.data)
        .then(result => response.send(result));
    }
  };

  Location.lookup(locationHandler);
};

//-------------------------
// Weather
//-------------------------
function getWeather (request, response) {
  const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

  superagent.get(url)
    .then( data => {
      const weatherSummaries = data.body.daily.data.map(day => {
        const weatherDay = new Weather(day);
        weatherDay.save(request.query.data.id);
        return weatherDay
      });
      response.json(weatherSummaries);
    })
    .catch( () => {
      errorHandler('So sorry, something went really wrong', request, response);
    });
}

Weather.prototype.save = function (location_id) {
  let SQL = 'INSERT INTO weather (forecast, time, location_id) VALUES ($1, $2, $3)';

  let values = Object.values(this);
  values.push(location_id);

  client.query(SQL, values);
}

//-------------------------
// Error Handler
//-------------------------
function errorHandler(error,request,response) {
  response.status(500).send(error);
}

// Error if route does not exist
app.use('*', (request, response) => response.send('Sorry, that route does not exist.'));

app.listen(PORT, () => console.log(`App is listening on ${PORT}`));
