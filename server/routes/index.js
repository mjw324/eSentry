const express = require('express');
const router = express.Router();
const db = require('../db');
// Import BadWords module. This is to reject any attempts to add a monitor with a bad word in the keywords
const BadWords = require('bad-words');
const filter = new BadWords();
// Import rateLimit module. This is to limit the number of requests to the server
const rateLimit = require('express-rate-limit');
// Import addScraper function from scrape.js
const { addScraper, stopScraper } = require('../scrape');

// This limiter is meant for the requests that take some execution time on the server
// This is meant to prevent the server from undefined behavior
const update_limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1, // Limit each IP to 1 update requests per time window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

const get_post_limiter = rateLimit({
  windowMs: 5 * 1000, // 5 seconds
  max: 1, // Limit each IP to 1 get or post request per time window
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});


// GET: Fetch all monitors for a given chatid
router.get('/monitors', get_post_limiter, function (req, res, next) {
  // Extract 'userid' from the request query parameters
  const userid = req.headers.userid;
  // Validate chatid if necessary
  if (!userid) {
    return res.status(400).send("UserID is required");
  }

  // Modified SQL query to select monitors with the given chatid and userid
  const query = 'SELECT * FROM monitors WHERE userid = ?';

  db.pool.query(query, [userid], function (error, results, fields) {
    if (error) { console.log(error); return next(error); }

    // Respond with the list of monitors for the given chatid
    res.json(results);
  });
});



// PATCH: Route to update the status of a monitor
router.patch('/monitors/:id/status', update_limiter, (req, res) => {
  const { id } = req.params;
  const { active } = req.body; // Expecting {"active": true/false}
  const userid = req.headers.userid;
  // Validate that userid is provided
  if (!userid) {
    return res.status(400).json({ message: 'Userid is required' });
  }

  // First, check the current status of the monitor to avoid unnecessary updates
  db.pool.query('SELECT active FROM monitors WHERE id = ? AND userid = ?', [id, userid], (error, results) => {
    if (error) {
      return res.status(500).json({ message: 'Error querying the database', error: error.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: `Monitor with id ${id} not found for the provided userid.` });
    }

    // Should only be one monitor with the provided id and userid
    const monitor = results[0];

    if (monitor.active && !active) {
      // Monitor is active and client wants to disable it
      stopScraper(parseInt(id));
      // Update the monitor status in the database
      performUpdate(id, false, res);
    } else if (!monitor.active && active) {
      // Monitor is inactive and client wants to enable it
      // Check if enabling is allowed based on the number of active monitors
      checkAndEnableMonitor(id, userid, res);
    } else {
      // No change needed, monitor is already in the requested state
      res.json({ message: `Monitor ${id} is already ${monitor.active ? 'active' : 'inactive'}. No action taken.` });
    }
  });
});

function checkAndEnableMonitor(id, userid, res) {
  db.pool.query('SELECT COUNT(*) as count FROM monitors WHERE userid = ? AND active = 1', [userid], (error, results) => {
    if (error) {
      return res.status(500).json({ message: 'Error querying the database', error: error.message });
    }

    if (results[0].count >= 2) {
      // User already has 2 active monitors, do not enable another
      return res.status(400).json({ message: 'Maximum number of active monitors reached' });
    } else {
      // User has less than 2 active monitors, proceed to enable this one on database and start the scraper
      performUpdate(id, true, res);
      // Pull paramaters from the database to start the scraper
      db.pool.query('SELECT * FROM monitors WHERE active = 1', function(error, monitorObj) {
        if (error) {
          return res.status(500).json({ message: 'Error querying the database', error: error.message });
        }
          // Installing scraper from the query results of monitors table
          addScraper(monitorObj[0], process.env.SCRAPE_REFRESH_RATE);
        });
    }
  });
}

function performUpdate(id, active, res) {
  db.pool.query('UPDATE monitors SET active = ? WHERE id = ?', [active, id], (error, results) => {
    if (error) {
      return res.status(500).json({ message: 'Error updating monitor status', error: error.message });
    }
    res.json({ message: `Monitor ${id} has been ${active ? 'enabled' : 'disabled'}.` });
  });
}

// DELETE: Delete a monitor by its ID
router.delete('/monitors/:id', get_post_limiter, function (req, res, next) {
  // Extract 'id' from the request parameters
  const id = req.params.id;
  const userid = req.headers.userid;
  if (!id || !userid) {
    // If 'id' is not provided, respond with an error status and message
    return res.status(400).json({ message: 'Monitor id is required' });
  }

  db.pool.query('DELETE FROM monitors WHERE id = ? AND userid = ?', [id, userid], function (error, results, fields) {
    if (error) { return next(error); }
    stopScraper(parseInt(id));
    // Respond with a success message
    res.json({ message: 'Monitor successfully deleted' });
  });

});

// PATCH: Update an existing monitor and handle starting/stopping if needed
router.patch('/monitors/:id', update_limiter, (req, res) => {
  const monitorId = req.params.id;
  const updateObj = req.body; // Contains updated monitor details
  const userid = req.headers.userid;

  if (!userid) {
    return res.status(400).json({ message: 'Userid is required' });
  }

  // Fetch the current state of the monitor
  db.pool.query('SELECT * FROM monitors WHERE id = ? AND userid = ?', [monitorId, userid], (error, results) => {
    if (error) {
      return res.status(500).json({ message: 'Error querying the database', error: error.message });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: `Monitor with id ${monitorId} not found.` });
    }

    const currentMonitor = results[0];

    // Construct the SQL query for updating the monitor
    const query = 'UPDATE monitors SET keywords = ?, chatid = ?, userid = ?, min_price = ?, max_price = ?, condition_new = ?, condition_open_box = ?, condition_used = ?, exclude_keywords = ? WHERE id = ?';
    const queryParams = [
      updateObj.keywords || currentMonitor.keywords,
      updateObj.chatid || currentMonitor.chatid,
      userid, // the userid doesn't change
      updateObj.min_price || currentMonitor.min_price,
      updateObj.max_price || currentMonitor.max_price,
      updateObj.condition_new || currentMonitor.condition_new,
      updateObj.condition_open_box || currentMonitor.condition_open_box,
      updateObj.condition_used || currentMonitor.condition_used,
      updateObj.exclude_keywords || currentMonitor.exclude_keywords,
      monitorId
    ];

    // Update the monitor in the database
    db.pool.query(query, queryParams, (error, results) => {
      if (error) {
        return res.status(500).json({ message: 'Error updating monitor', error: error.message });
      }

      // Start or stop the monitor based on the 'active' status change
      if (currentMonitor.active) {
        if (updateObj.active) {
          stopScraper(parseInt(monitorId));
          // Start the monitor
          addScraper(updateObj, process.env.SCRAPE_REFRESH_RATE);
        } else {

        }
      }

      res.json({ message: `Monitor ${monitorId} updated successfully.` });
    });
  });
});

module.exports = router;