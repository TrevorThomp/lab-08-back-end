'use strict';

require('dotenv').config();

//Dependencies and setup
const express = require('express');
const app = express();
const cors = require('cors');
const pg = require('pg');
app.use(cors());

const client = new pg.Client(process.env.DATABASE_URL);
client.on('err', err => console.error(err));

// Access to API modules
const getWeather = require('./weather.js');
const getMovies = require('./movies.js');
const getYelp = require('./yelp.js');
const getLocation = require('./location.js');
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
