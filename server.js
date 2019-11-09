'use strict';

require('dotenv').config();

//Dependencies and setup
const express = require('express');
const app = express();
const cors = require('cors');
app.use(cors());

// Access to API modules
const getWeather = require('./weather.js');
const getMovies = require('./movies.js');
const getYelp = require('./yelp.js');
const getLocation = require('./location.js');

// PORT
const PORT = process.env.PORT || 3000;

//Errors
function notFoundHandler(request,response) {
  response.status(404).send('huh?');
}
function errorHandler(error,request,response) {
  response.status(500).send(error);
}

// API Routes
app.get('/location', getLocation);
app.get('/weather', getWeather);
app.get('/movies', getMovies);
app.get('/yelp', getYelp);

// Registered middleware
app.use('*', notFoundHandler);
app.use(errorHandler);

// Make sure the server is listening for requests
app.listen(PORT, () => console.log(`App is listening on ${PORT}`) );
