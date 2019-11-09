'use strict';

const superagent = require('superagent');

function getMovies(request,response) {
  const url = `https://api.themoviedb.org/3/movie/now_playing?api_key=${process.env.MOVIE_API_KEY}&language=en-US&page=1`;

  return superagent.get(url)
    .then(result => {
      const movieData = result.body.results.map(day => {
        return new Movies(day);
      });
      response.status(200).json(movieData)
    })
    .catch(() => errorHandler('So sorry, something went wrong', request, response));
}

function Movies(movie) {
  this.title = movie.title;
  this.overview = movie.overview;
  this.average_votes = movie.vote_average;
  this.total_votes = movie.vote_count;
  this.image_url = `https://image.tmdb.org/t/p/w500/${movie.poster_path}`;
  this.popularity = movie.popularity;
  this.released_on = movie.release_date;
}

module.exports = getMovies;
