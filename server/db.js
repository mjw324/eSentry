var mysql = require('mysql2');
const mkdirp = require('mkdirp');

mkdirp.sync('./var/db');


// Database configuration
const dbConfig = {
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Creating a MySQL pool - https://www.npmjs.com/package/mysql#pooling-connections
// According to Wikipedia, 
// "connection pool is a cache of database connections maintained so that the 
// connections can be reused when future requests to the database are required"
// This avoids creating a connection to the database each time it needs accessed by user logging in/configuriing their monitor
var pool = mysql.createPool(dbConfig);


pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) UNIQUE,
    hashed_password VARBINARY(255),
    salt VARBINARY(255),
    name VARCHAR(255)
  )
`);

pool.query(`
  CREATE TABLE IF NOT EXISTS federated_credentials (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    provider VARCHAR(255) NOT NULL,
    subject VARCHAR(255) NOT NULL,
    UNIQUE (provider, subject)
  )
`);

// Creating monitors table, holding the search parameters for each monitor and the respective owner
// db_pool.query(`
//   CREATE TABLE IF NOT EXISTS monitors (
//     id INT AUTO_INCREMENT PRIMARY KEY,
//     owner_id INT NOT NULL,
//     search_parameters VARCHAR(255) NOT NULL,
//   )
// `);
pool.query(`
  CREATE TABLE IF NOT EXISTS todos (
    id INT AUTO_INCREMENT PRIMARY KEY,
    owner_id INT NOT NULL,
    title VARCHAR(255) NOT NULL,
    completed INT
  )
`);


// Exporting the database pool
module.exports.pool = pool;
