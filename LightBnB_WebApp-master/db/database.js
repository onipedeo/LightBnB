const { Pool } = require('pg');

const pool = new Pool({
  user: 'labber',
  password: 'labber',
  host: 'localhost',
  database: 'lightbnb'
});

/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  //Parameterizing query to mitigate SQL injection
  const queryString = `
  SELECT * 
  FROM users
  WHERE email = $1
  `;

  const values = [email];
  return pool
    .query(queryString, values)
    .then(res => {
      //checking if the provided email does not exist
      if (res.rows.length === 0) {
        return null;
      }
      return res.rows[0];
    })
    .catch(err => {
      console.log(err);
    });

};

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
  //Parameterizing query to mitigate SQL injection
  const queryString = `
  SELECT * 
  FROM users
  WHERE id = $1
  `;

  const values = [id];
  return pool
    .query(queryString, values)
    .then(res => {
      //checking if the provided email does not exist in the db
      if (res.rows.length === 0) {
        return null;
      }
      return res.rows[0];
    })
    .catch(err => {
      console.log(err);
    });
};

/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser = function(user) {
  const queryString = `
  INSERT INTO users (name, email, password)
  VALUES ($1, $2, $3)
  RETURNING *
  `;
  const values = [user.name, user.email, user.password];
  return pool
    .query(queryString, values)
    .then(res => {
      return res.rows[0];
    })
    .catch(err => {
      console.log(err);
    });
};

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {

  const queryString = `
  SELECT reservations.*, properties.*, avg(rating) as average_rating
  FROM reservations
  JOIN properties ON reservations.property_id = properties.id
  JOIN property_reviews ON properties.id = property_reviews.property_id
  WHERE reservations.guest_id = $1
  GROUP BY properties.id, reservations.id
  ORDER BY reservations.start_date
  LIMIT $2;
  `;

  return pool
    .query(queryString, [guest_id, limit])
    .then(res => {
      return res.rows;
    })
    .catch(err => {
      console.log(err);
    });
};

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = function(options, limit = 10) {

  const queryParams = [];
  let queryString = `
  SELECT properties.*, avg(property_reviews.rating) as average_rating
  FROM properties
  JOIN property_reviews ON properties.id = property_id
  `;

  //filtering by city
  if (options.city) {
    queryParams.push(`%${options.city}%`);
    queryString += `WHERE city LIKE $${queryParams.length} `;
  }
  // Filtering by owner_id
  if (options.owner_id) {
    queryParams.push(options.owner_id);
    queryString += `WHERE owner_id = $${queryParams.length} `;
  }

  // Filtering by price range
  if (options.minimum_price_per_night && options.maximum_price_per_night) {
    if (queryParams.length === 0) {
      queryString += `WHERE `;
    } else {
      queryString += `AND `;
    }
    queryParams.push(options.minimum_price_per_night * 100);// Convert to cents
    queryParams.push(options.maximum_price_per_night * 100);// Convert to cents
    queryString += `cost_per_night BETWEEN $${queryParams.length - 1} AND $${queryParams.length} `;
  }

  // Filtering by minimum_rating
  if (options.minimum_rating) {
    if (queryParams.length === 0) {
      queryString += `WHERE `;
    } else {
      queryString += `AND `;
    }
    queryParams.push(options.minimum_rating);
    queryString += `rating >= $${queryParams.length} `;
  }

  queryParams.push(limit);
  queryString += `
  GROUP BY properties.id
  ORDER BY cost_per_night
  LIMIT $${queryParams.length};
  `;

  // Execute the query using the database connection pool and return the result rows
  return pool
    .query(queryString, queryParams)
    .then(res => {
      return res.rows;
    })
    .catch(err => {
      console.log(err.message);
    });
};

/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */

const addProperty = function(property) {
  const queryString = `
  INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night,
    street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
  VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14) RETURNING *
  `;

  const values = [property.owner_id, property.title, property.description, property.thumbnail_photo_url, property.cover_photo_url, property.cost_per_night, property.street, property.city, property.province, property.post_code, property.country, property.parking_spaces, property.number_of_bathrooms, property.number_of_bedrooms];

  return pool
    .query(queryString, values)
    .then((response) => {
      return response.rows[0];
    })
    .catch((err) => {
      console.log(err.message);
    });
};

module.exports = {
  getUserWithEmail,
  getUserWithId,
  addUser,
  getAllReservations,
  getAllProperties,
  addProperty,
};
