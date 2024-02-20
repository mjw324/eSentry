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

// Creating monitors table, holding the filters for each monitor and the respective owner
// If considering a scalable database design, this table would be split into two entities, the primary monitors table and a secondary table holding the filters
// However, since this is a small project, I decided to keep it simple and have all the data in one table to minimize SQL queries
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
    active BOOLEAN DEFAULT 0
  )
`, (err, results, fields) => {
  if (err) throw err;

  // On server startup, initialize all scrapers saved in MySQL database
  pool.query('SELECT * FROM monitors WHERE active = 1', function(error, results, fields) {
    if (error) { 
      console.error("Error fetching monitors on startup:", error);
      return;
    }
    results.forEach(function(monitorObj) {
      // installing scrapers from the query results of monitors table
      addScraper(monitorObj, process.env.SCRAPE_REFRESH_RATE);
    });
  });
});


// Exporting the database pool
module.exports.pool = pool;