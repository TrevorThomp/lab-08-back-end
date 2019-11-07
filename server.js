// 'use strict';

// Load Environment Variables from the .env file
require('dotenv').config();

// Application Dependencies
const express =require('express');
const cors = require('cors');
const superagent = require('superagent');
const pg = require('pg');

const PORT = process.env.PORT;
const app = express();

app.use(cors());

const client = new pg.Client(process.env.DATABASE_URL);
client.on('error', err => console.error(err));

// Routes
app.get('/', homePage);
app.get('/location', getLocation);
app.get('/weather', getWeather);

// Helper Function

let lookup = (data) => {
  let SQL = `SELECT * FROM ${data.tableName} WHERE location_id=$1;`;

  return client.query(SQL, [data.location_id])
    .then(results => {
      if (results.rowCount > 0) {
        data.cacheHit(results);
      } else {
        data.cacheMiss();
      }
    })
    .catch(() => errorHandler());
};

function homePage(request,response) {
  response.status(200).send('Welcome to the Home Page!');
}

// Location Methods
function getLocation (request,response) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${request.query.data}&key=${process.env.GEOCODE_API_KEY}`;

  superagent.get(url)
    .then( result => {
      const geoData = result.body;
      const location = new Location(request.query.data, geoData);
      insert(location);
      response.send(location);
      response.send(result);
    })
    .catch( error => {
      console.error(error);
      response.status(500).send('Status: 500. Sorry, there is something not quite right');
    })
}

function insert(location) {
  let SQL = 'INSERT INTO locations (search_query, formatted_query, latitude, longitude) VALUES($1, $2, $3, $4)';

  let safeValues = Object.values(location);

  client.query(SQL, safeValues).catch( error => errorHandler(error));
}

// Weather Methods
function getWeather (request, response) {
  const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

  superagent.get(url)
    .then( data => {
      const weatherSummaries = data.body.daily.data.map(day => {
        const weatherDay = new Weather(day);
        weatherDay.insert(request.query.data.id);
        return weatherDay
      });
      response.json(weatherSummaries);
    })
    .catch( error => {
      errorHandler('So sorry, something went really wrong', request, response);
    });
}

Weather.prototype.insert = function (id) {
  let SQL = `INSERT INTO weather (forecast, time, location_id)
              VALUES($1, $2, $3);`;

  let values = Object.values(this);
  values.push(id);

  return client.query(SQL, values);
}

// Weather Constructor Function
function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toDateString();
}

Weather.tableName = 'weather';

// Location Constructor Function
function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData.results[0].formatted_address;
  this.latitude = geoData.results[0].geometry.location.lat;
  this.longitude = geoData.results[0].geometry.location.lng;
}

Location.tableName = 'locations';

// Error Handler function to throw
function errorHandler(error,request,response) {
  response.status(500).send(error);
}

// Error if route does not exist
app.use('*', (request, response) => response.send('Sorry, that route does not exist.'));

// PORT to for the server to listen too
client.connect()
  .then ( () => {
    app.listen(PORT, () => console.log(`App is listening on ${PORT}`));
  })

