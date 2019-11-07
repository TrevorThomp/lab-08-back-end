// 'use strict';

// Load Environment Variables from the .env file
require('dotenv').config();

// Application Dependencies
const express =require('express');
const cors = require('cors');
const superagent = require('superagent')
const pg = require('pg')

const PORT = process.env.PORT;
const app = express();

app.use(cors());

const client = pg.Client(process.env.DATABASE_URL);

// Routes
app.get('/', homePage);
app.get('/location', handleLocation);
app.get('/weather', handleWeather);

function homePage(request,response) {
  response.status(200).send('Welcome to the Home Page!');
}

function handleLocation(request,response) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${request.query.data}&key=${process.env.GEOCODE_API_KEY}`;

  superagent.get(url)
    .then( data => {
      const geoData = data.body;
      const location = new Location(request.query.data, geoData);
      response.status(200).send(location);
    })
    .catch( error => {
      response.status(500).send('Status: 500. Sorry, there is something not quite right');
    })
}

// // Function to handle darksky.json data
function handleWeather(request, response) {
  const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

  superagent.get(url)
    .then( data => {
      const weatherSummaries = data.body.daily.data.map(day => new Weather(day));
      response.status(200).send(weatherSummaries);
    })
    .catch( error => {
      errorHandler('So sorry, something went really wrong', request, response);
    });
}

// Weather Constructor Function
function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toDateString();
}

// Location Constructor Function
function Location(city, geoData) {
  this.search_query = city;
  this.formatted_query = geoData.formatted_address;
  this.formatted_query = geoData.results[0].formatted_address;
  this.latitude = geoData.results[0].geometry.location.lat;
  this.longitude = geoData.results[0].geometry.location.lng;
}

// Error Handler function to throw
function errorHandler(error,request,response) {
  response.status(500).send(error);
}

// Error if route does not exist
app.use('*', (request, response) => response.send('Sorry, that route does not exist.'));

// PORT to for the server to listen too
app.listen(PORT, () => console.log(`App is listening on ${PORT}`));
