const express = require('express');
const router = express.Router();
const db = require('../db');
// Import BadWords module. This is to reject any attempts to add a monitor with a bad word in the keywords
const BadWords = require('bad-words');
const bcrypt = require('bcrypt');
const saltRounds = 10; // for bcrypt password hashing
const { v4: uuidv4 } = require('uuid'); // Use UUID to generate unique IDs
const filter = new BadWords();
// Import rateLimit module. This is to limit the number of requests to the server
const rateLimit = require('express-rate-limit');
// Import addScraper function from scrape.js
const { addScraper, stopScraper } = require('../scrape');


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

  // Validate required fields
  if (!monitorObj.keywords || !monitorObj.chatid || !monitorObj.userid) {
    return res.status(400).json({ message: 'Keywords, chatid, and userid are required' });
  }

  // Check for inappropriate words in keywords
  if (filter.isProfane(monitorObj.keywords)) {
    return res.status(400).json({ message: 'Keywords contain inappropriate words' });
  }

  try {
    // Verify if the user exists in the users table
    const [users] = await db.pool.promise().query('SELECT id FROM users WHERE userid = ?', [monitorObj.userid]);
    if (users.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Check the number of active monitors for the user
    const [countResult] = await db.pool.promise().query('SELECT COUNT(*) AS count FROM monitors WHERE userid = ? AND active = 1', [monitorObj.userid]);
    if (countResult[0].count >= 2) {
      return res.status(400).json({ message: 'Maximum number of monitors reached' });
    }

    // Insert the new monitor
    const [insertResult] = await db.pool.promise().query(
      'INSERT INTO monitors (keywords, chatid, userid, recentlink, min_price, max_price, condition_new, condition_open_box, condition_used, exclude_keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        monitorObj.keywords,
        monitorObj.chatid,
        monitorObj.userid, // Ensure this userid is correctly linked to an existing user's id in the users table
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
      return res.status(404).json({ message: 'User not found.' });
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
        await checkAndEnableMonitor(id, userID, res); // Make sure this function is properly updated for async handling
      } else {
        // Disable monitor if it's currently active
        await performUpdate(id, false, res); // Make sure this function is properly updated for async handling
        stopScraper(parseInt(id)); // Assuming stopScraper is synchronous or has its own async handling
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
    // Assuming stopScraper is synchronous or properly handles asynchronous operations itself
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


router.patch('/monitors/:id', update_limiter, async (req, res) => {
  const monitorId = req.params.id;
  const updateObj = req.body; // Contains updated monitor details
  const userID = req.headers.userid;

  if (!userid) {
    return res.status(400).json({ message: 'User ID is required' });
  }

  try {
    // Fetch the current state of the monitor
    const [results] = await db.pool.promise().query('SELECT * FROM monitors WHERE id = ? AND userid = ?', [monitorId, userID]);

    if (results.length === 0) {
      return res.status(404).json({ message: `Monitor with id ${monitorId} not found.` });
    }

    const currentMonitor = results[0];

    // Check if an update is necessary based on the active status
    if (currentMonitor.active !== updateObj.active) {
      // Construct the SQL query for updating the monitor
      const query = 'UPDATE monitors SET keywords = ?, chatid = ?, userid = ?, min_price = ?, max_price = ?, condition_new = ?, condition_open_box = ?, condition_used = ?, exclude_keywords = ?, active = ? WHERE id = ?';
      const queryParams = [
        updateObj.keywords || currentMonitor.keywords,
        updateObj.chatid || currentMonitor.chatid,
        userID, // the user ID doesn't change
        updateObj.min_price || currentMonitor.min_price,
        updateObj.max_price || currentMonitor.max_price,
        updateObj.condition_new || currentMonitor.condition_new,
        updateObj.condition_open_box || currentMonitor.condition_open_box,
        updateObj.condition_used || currentMonitor.condition_used,
        updateObj.exclude_keywords || currentMonitor.exclude_keywords,
        updateObj.active,
        monitorId
      ];

      await db.pool.promise().query(query, queryParams);

      // Start or stop the scraper based on the 'active' status change
      if (updateObj.active) {
        addScraper(updateObj, process.env.SCRAPE_REFRESH_RATE);
      } else {
        stopScraper(parseInt(monitorId)); // Assuming this can be synchronous or you'd await a promise here too if it were async
      }
    }

    res.json({ message: `Monitor ${monitorId} updated successfully.` });
  } catch (error) {
    console.error('Error updating monitor:', error);
    res.status(500).json({ message: 'Error updating monitor', error: error.message });
  }
});


// POST: Register a new user
router.post('/register', async (req, res) => {
  const { username, password } = req.body; // Assuming you're getting email in the request

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
router.post('/register-or-login', async (req, res) => {
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
      await db.pool.promise().query(insertQuery, [email, name, id, photoUrl, 'google']);

      // Fetch the newly created user to return
      const [newUser] = await db.pool.promise().query(userExistsQuery, [email]);
      return res.status(201).json({ message: 'User registered successfully', user: newUser[0] });
    }
  } catch (error) {
    console.error('Database error during user registration or login:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});


module.exports = router;