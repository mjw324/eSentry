const express = require('express');
// Import BadWords module. This is to reject any attempts to add a monitor with a bad word in the keywords
const BadWords = require('bad-words');
const bcrypt = require('bcrypt');
const db = require('../db');
// Use UUID to generate unique IDs
const { v4: uuidv4 } = require('uuid'); 
// Import rateLimit module. This is to limit the number of requests to the server
const rateLimit = require('express-rate-limit');
const moment = require('moment');
// Import addScraper function from scrape.js
const { addScraper, stopScraper, grabItemSoldHistory } = require('../scrape');
const router = express.Router();
const saltRounds = 10; // for bcrypt password hashing
const filter = new BadWords();



// This limiter is meant for the requests that take some execution time on the server
// This is meant to prevent the server from undefined behavior
const update_limiter = rateLimit({
  windowMs: 5 * 1000, // 5 seconds
  max: 1, // Limit each IP to 1 update requests per time window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const get_post_limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20, // Limit each IP to 10 get or post request per time window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});


// GET: Fetch all monitors for a given user identifier (email or google_id)
router.get('/monitors', get_post_limiter, async (req, res, next) => {
  
  const userID = req.headers.userid;

  if (!userID) {
    return res.status(400).send("User ID is required");
  }

  // The SQL query selects monitors (aliased as m) based on the internal user ID (aliased as u) that's stored in the `users` table
  const query = 'SELECT * FROM monitors WHERE userid = ?';

  try {
    const [results] = await db.pool.promise().query(query, [userID]);
    // Respond with the list of monitors for the given user
    res.json(results);
  } catch (error) {
    console.error(error);
    next(error); // Pass the error to the main error handler
  }
});

// POST: Add a new monitor
router.post('/monitors', async (req, res) => {
  const monitorObj = req.body;
  const userID = req.headers.userid;

  // Telegram ID and/or email is required, keywords and/or seller is required
  if ((!monitorObj.keywords && !monitorObj.seller) || (!monitorObj.chatid && !monitorObj.email) || !userID) {
    return res.status(400).json({ message: 'Keywords/Seller and User ID are required. Either Telegram ID or Email must be provided.' });
  }

  // Check for inappropriate words in keywords
  if (filter.isProfane(monitorObj.keywords)) {
    return res.status(400).json({ message: 'Keywords contain inappropriate words' });
  }
  // Check for inappropriate words in seller
  if (filter.isProfane(monitorObj.seller)) {
    return res.status(400).json({ message: 'Seller contains inappropriate words' });
  }

  try {
    // Verify if the user exists in the users table
    const [users] = await db.pool.promise().query('SELECT id FROM users WHERE userid = ?', [userID]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    // Check the number of active monitors for the user - limit it to 2 active monitors
    const [countResult] = await db.pool.promise().query('SELECT COUNT(*) AS count FROM monitors WHERE userid = ? AND active = 1', [userID]);
    if (countResult[0].count >= 2) {
      return res.status(400).json({ message: 'Maximum number of active monitors reached' });
    }

    // Insert the new monitor
    const [insertResult] = await db.pool.promise().query(
      'INSERT INTO monitors (keywords, seller, chatid, email, userid, recentlink, min_price, max_price, condition_new, condition_open_box, condition_used, exclude_keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        monitorObj.keywords || null,
        monitorObj.seller || null,
        monitorObj.chatid || null,
        monitorObj.email || null,
        userID,
        null, // recentlink is always null/non-existent when scraper is first initialized
        monitorObj.min_price || null,
        monitorObj.max_price || null,
        monitorObj.condition_new || false,
        monitorObj.condition_open_box || false,
        monitorObj.condition_used || false,
        monitorObj.exclude_keywords || null
      ]
    );

    // Respond with the ID of the newly created monitor
    res.json({ id: insertResult.insertId });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});



router.patch('/monitors/:id/status', update_limiter, async (req, res) => {
  const { id } = req.params; // Monitor ID
  const { active } = req.body; // Expecting {"active": true/false}
  const userID = req.headers.userid;

  // Validate that userEmail is provided
  if (!userID) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    // First, validate the user exists and get the user's ID
    const [user] = await db.pool.promise().query('SELECT id FROM users WHERE userid = ?', [userID]);
    if (user.length === 0) {
      return res.status(404).json({ message: 'User not found in database' });
    }

    // Then, check the current status of the monitor to avoid unnecessary updates, ensuring it belongs to the user
    const [results] = await db.pool.promise().query('SELECT active FROM monitors WHERE userid = ?', [userID]);

    if (results.length === 0) {
      return res.status(404).json({ message: `Monitor not found for the provided user.` });
    }

    const monitor = results[0];

    if (monitor.active !== active) {
      if (active) {
        // Enable monitor if it's currently inactive
        await checkAndEnableMonitor(id, userID, res);
      } else {
        // Disable monitor if it's currently active
        await performUpdate(id, false, res);
        stopScraper(parseInt(id));
      }
    } else {
      // No change needed, monitor is already in the requested state
      res.json({ message: `Monitor ${id} is already ${monitor.active ? 'active' : 'inactive'}. No action taken.` });
    }
  } catch (error) {
    console.error('Error updating monitor status:', error);
    res.status(500).json({ message: 'Error querying the database', error: error.message });
  }
});


async function checkAndEnableMonitor(id, userid, res) {
  try {
    const [results] = await db.pool.promise().query('SELECT COUNT(*) as count FROM monitors WHERE userid = ? AND active = 1', [userid]);

    if (results[0].count >= 2) {
      // User already has 2 active monitors, do not enable another
      res.status(400).json({ message: 'Maximum number of active monitors reached' });
    } else {
      // User has less than 2 active monitors, proceed to enable this one on database and start the scraper
      await performUpdate(id, true, res);

      // Pull parameters from the database to start the scraper
      const [monitorObj] = await db.pool.promise().query('SELECT * FROM monitors WHERE id = ?', [id]);
      if (monitorObj.length > 0) {
        addScraper(monitorObj[0], process.env.SCRAPE_REFRESH_RATE);
      }
    }
  } catch (error) {
    res.status(500).json({ message: 'Error querying the database', error: error.message });
  }
}


async function performUpdate(id, active, res) {
  try {
    await db.pool.promise().query('UPDATE monitors SET active = ? WHERE id = ?', [active, id]);
    res.json({ message: `Monitor ${id} has been ${active ? 'enabled' : 'disabled'}.` });
  } catch (error) {
    res.status(500).json({ message: 'Error updating monitor status', error: error.message });
  }
}


// DELETE: Delete a monitor by its ID
router.delete('/monitors/:id', get_post_limiter, async (req, res, next) => {
  // Extract 'id' from the request parameters
  const id = req.params.id;
  const userID = req.headers.userid;
  if (!id || !userID) {
    // If 'id' is not provided, respond with an error status and message
    return res.status(400).json({ message: 'Monitor ID and User ID are required' });
  }

  try {
    const [results] = await db.pool.promise().query('DELETE FROM monitors WHERE id = ? AND userid = ?', [id, userID]);
    stopScraper(parseInt(id));
    if (results.affectedRows > 0) {
      // Respond with a success message if the monitor was successfully deleted
      res.json({ message: 'Monitor successfully deleted' });
    } else {
      // If no rows were affected, it means the monitor wasn't found for the given id and userid
      res.status(404).json({ message: 'Monitor not found or you do not have permission to delete it' });
    }
  } catch (error) {
    console.error('Failed to delete monitor:', error);
    next(error); // Pass the error to the next middleware/error handler
  }
});

// PATCH: Update an existing monitor
router.patch('/monitors/:id', update_limiter, async (req, res) => {
  const monitorId = req.params.id;
  const updateObj = req.body; // Contains updated monitor details
  const userID = req.headers.userid;

  // User ID is required for identification
  if (!userID) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  // Ensure at least one notification method is provided
  if (!updateObj.chatid && !updateObj.email) {
    return res.status(400).json({ message: 'At least one notification method (Telegram ID or email) is required' });
  }

  try {
    // Fetch the current state of the monitor
    const [results] = await db.pool.promise().query('SELECT * FROM monitors WHERE id = ? AND userid = ?', [monitorId, userID]);
    if (results.length === 0) {
      return res.status(404).json({ message: `Monitor with id ${monitorId} not found.` });
    }
    const currentMonitor = results[0];

    // Construct the SQL query for updating the monitor, now including the email field
    const query = `
      UPDATE monitors SET 
      keywords = ?, 
      seller = ?,
      chatid = ?, 
      email = ?, 
      userid = ?, 
      min_price = ?, 
      max_price = ?, 
      condition_new = ?, 
      condition_open_box = ?, 
      condition_used = ?, 
      exclude_keywords = ?, 
      active = ? 
      WHERE id = ?
    `;
    const queryParams = [
      updateObj.keywords,
      updateObj.seller,
      updateObj.chatid,
      updateObj.email,
      userID, // User ID does not change
      updateObj.min_price,
      updateObj.max_price,
      updateObj.condition_new,
      updateObj.condition_open_box,
      updateObj.condition_used,
      updateObj.exclude_keywords,
      currentMonitor.active,
      monitorId
    ];

    // Execute the update
    await db.pool.promise().query(query, queryParams);

    // Restart scraper if needed
    if (currentMonitor.active) {
      stopScraper(parseInt(monitorId));
      addScraper(updateObj, process.env.SCRAPE_REFRESH_RATE);
    }

    res.json({ message: `Monitor ${monitorId} updated successfully.` });
  } catch (error) {
    console.error('Error updating monitor:', error);
    res.status(500).json({ message: 'Error updating monitor', error: error.message });
  }
});

// POST: Register a new user
router.post('/register', async (req, res) => {
  const { username, password } = req.body;

  // Basic validation
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // Check if username or email already exists
    const userExistsQuery = 'SELECT * FROM users WHERE username = ? LIMIT 1';
    const [users] = await db.pool.promise().query(userExistsQuery, [username]);

    if (users.length > 0) {
      return res.status(409).json({ message: 'Username already taken' });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate a unique user ID
    const userid = uuidv4(); // Generates a unique UUID for each user

    // Insert the new user into the database
    const insertQuery = 'INSERT INTO users (username, password, userid, account_type) VALUES (?, ?, ?, ?)';
    await db.pool.promise().query(insertQuery, [username, hashedPassword, userid, 'manual']);

    res.status(201).json({ message: 'User registered successfully', userid: userid }); // Respond with the UUID
  } catch (error) {
    console.error('Database error during user registration:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});


// POST: Login a user
router.post('/login', get_post_limiter, async (req, res) => {
  const { username, password } = req.body;

  // Basic validation
  if (!username || !password) {
    return res.status(400).json({ message: 'Username and password are required' });
  }

  try {
    // Fetch the user by username
    const query = 'SELECT * FROM users WHERE username = ? LIMIT 1';
    const [users] = await db.pool.promise().query(query, [username]);

    if (users.length === 0) {
      // No user found with the given username
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    const user = users[0];

    // Compare the submitted password with the stored hashed password
    const match = await bcrypt.compare(password, user.password);

    if (!match) {
      // Passwords do not match
      return res.status(401).json({ message: 'Invalid username or password' });
    }

    // At this point, the user is authenticated
    res.json({ message: 'Login successful', userid: user.userid });
  } catch (error) {
    console.error('Database error during login:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// POST: Register or login a user via Google
router.post('/register-or-login', get_post_limiter, async (req, res) => {
  const { email, id, name, photoUrl } = req.body; // Extracting user details from the request body

  if (!email || !id || !name) {
    return res.status(400).json({ message: 'Email, ID, and name are required' });
  }

  try {
    // Check if the user already exists
    const userExistsQuery = 'SELECT * FROM users WHERE email = ? LIMIT 1';
    const [existingUsers] = await db.pool.promise().query(userExistsQuery, [email]);

    if (existingUsers.length > 0) {
      // User exists, log them in (for this example, just return a success message and user data)
      return res.json({ message: 'User logged in successfully', user: existingUsers[0] });
    } else {
      // User doesn't exist, register them
      const insertQuery = 'INSERT INTO users (email, username, userid, photo_url, account_type) VALUES (?, ?, ?, ?, ?)';
      await db.pool.promise().query(insertQuery, [email, email, id, photoUrl, 'google']);

      // Fetch the newly created user to return
      const [newUser] = await db.pool.promise().query(userExistsQuery, [email]);
      return res.status(201).json({ message: 'User registered successfully', user: newUser[0] });
    }
  } catch (error) {
    console.error('Database error during user registration or login:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


const calculateIQR = (data) => {
  const sortedData = data.sort((a, b) => a - b);
  const q1 = sortedData[Math.floor((sortedData.length / 4))];
  // For Q3, multiply quartile by 3 and subtract 1 due to zero indexing
  const q3 = sortedData[Math.floor((sortedData.length * (3 / 4)) - 1)];
  return q3 - q1;
};

// POST: Get statistics for a given item
router.post('/itemStatistics', async (req, res) => {
  const monitorObj = req.body;
  const userID = req.headers.userid;

  if ((!monitorObj.keywords && !monitorObj.seller) || !userID) {
    return res.status(400).json({ message: 'Keywords and User ID are required.' });
  }

  // Verify if the user exists in the users table
  const [users] = await db.pool.promise().query('SELECT id FROM users WHERE userid = ?', [userID]);
  if (users.length === 0) {
    return res.status(404).json({ message: 'User not found in database' });
  }

  // Check for inappropriate words in keywords
  if (filter.isProfane(monitorObj.keywords)) {
    return res.status(400).json({ message: 'Keywords contain inappropriate words' });
  }

  try {
    const soldHistory = await grabItemSoldHistory(monitorObj);
    const prices = soldHistory.map(item => parseFloat(item.price.replace(/[^0-9.-]+/g, "")));

    // Calculate statistics 
    const iqr = calculateIQR(prices);
    const n = prices.length;
    // Calculate statistics
    const sum = prices.reduce((a, b) => a + b, 0);
    const avgPrice = sum / prices.length || 0;
    const minPriceRaw = Math.min(...prices);
    const maxPriceRaw = Math.max(...prices);

    // Calculate sales volumes
    const salesLastMonth = soldHistory.filter(item => moment(item.date, 'MMM DD, YYYY').isAfter(moment().subtract(1, 'month'))).length;
    const salesLastYear = soldHistory.filter(item => moment(item.date, 'MMM DD, YYYY').isAfter(moment().subtract(1, 'year'))).length;

    // Determine the dataset's date range
    const earliestDateInDataset = moment.min(soldHistory.map(item => moment(item.date, 'MMM DD, YYYY')));
    const mostRecentDate = moment.max(soldHistory.map(item => moment(item.date, 'MMM DD, YYYY')));

    // Check if the dataset possibly includes all sales within the last month/year
    const includesSalesLastMonth = mostRecentDate.isSameOrAfter(moment().subtract(1, 'month'));
    const includesSalesLastYear = mostRecentDate.isSameOrAfter(moment().subtract(1, 'year'));
    // If the earliest date is less than a month/year ago, there are probably more sales
    const mightHaveMoreSalesLastMonth = includesSalesLastMonth && !earliestDateInDataset.isSameOrBefore(moment().subtract(1, 'month'));
    const mightHaveMoreSalesLastYear = includesSalesLastYear && !earliestDateInDataset.isSameOrBefore(moment().subtract(1, 'year'));
    
    // Calculate bin width using Freedman-Diaconis Rule
    const binWidth = 2 * iqr * Math.pow(n, -1/3);

    // Determine the number of bins based on the range of your data divided by the bin width
    const range = maxPriceRaw - minPriceRaw;
    const numBins = Math.ceil(range / binWidth);

    // Adjust the bin width based on the rounded range and number of bins
    const adjustedBinWidth = Math.ceil((range / numBins) / 5) * 5; // Ensure bin width is rounded up to the nearest multiple of 5

    // Calculate the actual number of bins based on the adjusted bin width
    const adjustedNumBins = Math.ceil(range / adjustedBinWidth);

    // Initialize histogram buckets with adjusted bin width and range
    let histogramBuckets = Array.from({ length: adjustedNumBins }, (_, i) => {
      let lowerBound = minPriceRaw + (i * adjustedBinWidth);
      let upperBound = lowerBound + adjustedBinWidth;
      // Adjust lowerBound and upperBound to the nearest multiple of 5
      lowerBound = Math.floor(lowerBound / 5) * 5;
      upperBound = Math.ceil(upperBound / 5) * 5;

      return {
        priceRange: `${lowerBound}-${upperBound}`,
        count: 0,
      };
    });

    // Populate histogram buckets
    prices.forEach(price => {
      const index = Math.floor((price - minPriceRaw) / adjustedBinWidth);
      if (index >= 0 && index < histogramBuckets.length) {
        histogramBuckets[index].count++;
      }
    });

    // Prepare response
    res.json({
      averagePrice: avgPrice.toFixed(2),
      minPrice: minPriceRaw.toFixed(2),
      maxPrice: maxPriceRaw.toFixed(2),
      volumeLastMonth: salesLastMonth + (mightHaveMoreSalesLastMonth ? "+" : ""),
      volumeLastYear: salesLastYear + (mightHaveMoreSalesLastYear ? "+" : ""),
      priceDistribution: histogramBuckets.filter(bucket => bucket.count > 0) // Filter out empty buckets for cleaner output
    });
  } catch (error) {
    console.error('Error retrieving item statistics:', error);
    res.status(500).json({ message: 'Error retrieving item statistics', error: error.message });
  }
});

module.exports = router;