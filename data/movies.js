'use strict';

// Application Dependencies
const superagent = require('superagent');

// Movies Constructor
function Movies(movie) {
  this.title = movie.title;
  this.overview = movie.overview;
  this.average_votes = movie.vote_average;
  this.total_votes = movie.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500/${movie.poster_path}`;
  this.popularity = movie.popularity;
  this.released_on = movie.release_date;
}

// Movies API Fetch
function getMovies(request,response) {
  const url = `https://api.themoviedb.org/3/search/movie?api_key=${process.env.MOVIE_API_KEY}&language=en-US&page=1&include_adult=false&query=${request.query.data.search_query}`;

  return superagent.get(url)
    .then(result => {
      const movieData = result.body.results.map(day => {
        return new Movies(day);
      });
      response.status(200).json(movieData)
    })
    .catch(() => response.status(500).send('So sorry, something went really wrong', request, response));
}

// Export MovieDB API Fetch
module.exports = getMovies;
