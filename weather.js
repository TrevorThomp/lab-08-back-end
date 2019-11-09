'use strict';

// Application Dependencies
const superagent = require('superagent');

// Weather Constructor
function Weather(day) {
  this.forecast = day.summary;
  this.time = new Date(day.time * 1000).toDateString();
}

// Weather API Fetch
function getWeather(request, response) {
  const url = `https://api.darksky.net/forecast/${process.env.WEATHER_API_KEY}/${request.query.data.latitude},${request.query.data.longitude}`;

  return superagent
    .get(url)
    .then( data => {
      const weatherSummaries = data.body.daily.data.map(day => {
        return new Weather(day);
      });
      response.status(200).json(weatherSummaries);
    })
    .catch( ()=> {
      response.status(500).send('So sorry, something went really wrong', request, response);
    });
}

// Export Weather API Fetch
module.exports = getWeather
