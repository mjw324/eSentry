const mysql = require('mysql2');
const { addScraper } = require('./scrape');

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
const pool = mysql.createPool(dbConfig);

// Creating users table
pool.query(`
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  email VARCHAR(255) UNIQUE,
  username VARCHAR(255) UNIQUE,
  password VARCHAR(255),
  userid VARCHAR(255) UNIQUE NOT NULL,
  photo_url VARCHAR(255),
  account_type ENUM('manual', 'google') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
)`, (err) => {
  if (err) throw err;
  console.log("Users table created or already exists.");
});

// Adjusting the monitors table to reference the users table correctly
pool.query(`
CREATE TABLE IF NOT EXISTS monitors (
  id INT AUTO_INCREMENT PRIMARY KEY,
  userid VARCHAR(255) NOT NULL,
  keywords VARCHAR(255) NOT NULL,
  chatid VARCHAR(255) NOT NULL,
  recentlink VARCHAR(255),
  min_price DECIMAL(10,2),
  max_price DECIMAL(10,2),
  condition_new BOOLEAN,
  condition_open_box BOOLEAN,
  condition_used BOOLEAN,
  exclude_keywords VARCHAR(255),
  active BOOLEAN DEFAULT 0,
  FOREIGN KEY (userid) REFERENCES users(userid) ON DELETE CASCADE
)`, (err) => {
  if (err) throw err;
  console.log("Monitors table created or adjusted to reference the new users table.");
});

// Initialize all active scrapers on server startup
pool.query('SELECT * FROM monitors WHERE active = 1', function(error, results) {
  if (error) { 
    console.error("Error fetching monitors on startup:", error);
    return;
  }
  results.forEach(function(monitorObj) {
    addScraper(monitorObj, process.env.SCRAPE_REFRESH_RATE);
  });
});

// Exporting the database pool
module.exports.pool = pool;