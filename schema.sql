DROP TABLE IF EXISTS locations, weather, movies, yelp;

CREATE TABLE locations (
  id SERIAL PRIMARY KEY,
  search_query VARCHAR(255),
  formatted_query VARCHAR(255),
  latitude NUMERIC(10,7),
  longitude NUMERIC(10,7)
);

CREATE TABLE weather (
  id SERIAL PRIMARY KEY,
  forecast VARCHAR(255),
  timeDay VARCHAR(255),
  location_id INTEGER NOT NULL,
  FOREIGN KEY (location_id) REFERENCES locations (id)
);

CREATE TABLE movies (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255),
  overview VARCHAR(255),
  average_votes NUMERIC(10,7),
  total_votes BIGINT,
  image_url VARCHAR(255),
  popularity NUMERIC(10,7),
  released_on CHAR(10),
  location_id INTEGER NOT NULL REFERENCES locations(id)
);

CREATE TABLE yelp (
  id SERIAL PRIMARY KEY,
  yelpName VARCHAR(255),
  image_url VARCHAR(255),
  price CHAR(5),
  rating NUMERIC(10,7),
  url VARCHAR(255),
  location_id INTEGER NOT NULL REFERENCES locations(id)
);