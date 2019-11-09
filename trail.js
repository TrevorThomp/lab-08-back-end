'use strict';

// Application Dependencies
const superagent = require('superagent');

// Trail Constructor
function Trail(route) {
  this.name = route.name;
  this.location = route.location;
  this.length = route.length;
  this.stars = route.stars;
  this.star_votes = route.star_votes;
  this.summary = route.summary;
  this.trail_url = route.trail_url;
  this.conditions = route.conditions;
  this.condition_date = route.condition_date;
  this.condition_time = route.condition_time;
}

// Trail API Fetch
function getTrail(request,response) {
  const url = `https://www.hikingproject.com/data/get-trails?lat=${request.query.data.latitude}&lon=${request.query.data.longitude}&key=${process.env.TRAIL_API_KEY}`;

  return superagent
    .get(url)
    .then(result => {
      console.log(result)
      const trailData = result.body.trails.map(data => {
        return new Trail(data);
      })
      response.status(200).json(trailData);
    })
    .catch(() => response.status(500).send('So sorry, something went really wrong', request, response));
}

module.exports = getTrail;
