'use strict';

// Application Dependencies
const superagent = require('superagent');

// Yelp Constructor
function Yelp(data) {
  this.name = data.name;
  this.rating = data.rating;
  this.price = data.price;
  this.url = data.url;
  this.image_url = data.image_url;
}

// Yelp API Fetch
function getYelp(request,response) {
  const url = `https://api.yelp.com/v3/businesses/search?latitude=${request.query.data.latitude}&longitude=${request.query.data.longitude}`;

  return superagent
    .get(url)
    .set('Authorization', `Bearer ${process.env.YELP_API_KEY}`)
    .then(result => {
      const yelpData = result.body.businesses.map(data => {
        return new Yelp(data);
      })
      response.status(200).json(yelpData);
    })
    .catch(() => errorHandler('So sorry, something went wrong', request, response));
}

// Export API fetch
module.exports = getYelp;
