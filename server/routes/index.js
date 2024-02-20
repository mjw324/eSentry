const express = require('express');
const router = express.Router();
const db = require('../db');
// Import BadWords module. This is to reject any attempts to add a monitor with a bad word in the keywords
const BadWords = require('bad-words');
const filter = new BadWords();
// Import addScraper function from scrape.js
const { addScraper, stopScraper } = require('../scrape');



// GET: Fetch all monitors for a given chatid
router.get('/monitors', function (req, res, next) {
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


// POST: Add a new monitor
router.post('/monitors', function (req, res, next) {
  // Extract the following from the request body
  // keywords object JSON format. Example is a new condition "iphone" with a price range of $100-$500, excluding "pro" and "max" keywords
  // {
  //   "chatid": 123456789,
  //   "keywords": "iphone",
  //   "min_price": 100,
  //   "max_price": 500,
  //   "condition_new": true,
  //   "condition_open_box": false,
  //   "condition_used": false,
  //   "exclude_keywords": "pro max"
  // }

  const monitorObj = req.body;


  if (!monitorObj.keywords || !monitorObj.chatid || !monitorObj.userid) {
    // If 'keywords' or 'chatid' is not provided, respond with an error status and message
    return res.status(400).json({ message: 'Keywords, chatid, and userid are required' });
  }
  if (filter.isProfane(monitorObj.keywords)) {
    return res.status(400).json({ message: 'Keywords contain a inappropriate words' });
  }
  // First count how many active monitors user has before adding a new one
  db.pool.query('SELECT COUNT(*) as count FROM monitors WHERE userid = ? and active = 1', 
    [monitorObj.userid], 
    function (error, results, fields) {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' }); // Notify the client that an internal server error occurred
      }
      // If the user has 2 or more monitors, respond with an error status and message
      if (results[0].count >= 2) {
        return res.status(400).json({ message: 'Maximum number of monitors reached' });
      } else {
        db.pool.query(
          'INSERT INTO monitors (keywords, chatid, userid, recentlink, min_price, max_price, condition_new, condition_open_box, condition_used, exclude_keywords) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
          [
            monitorObj.keywords,
            monitorObj.chatid,
            monitorObj.userid,
            null, // recentlink is always null/non-existent when scraper is first initialized
            monitorObj.min_price || null,
            monitorObj.max_price || null,
            monitorObj.condition_new || null,
            monitorObj.condition_open_box || null,
            monitorObj.condition_used || null,
            monitorObj.exclude_keywords || null
          ],
          function (error, results, fields) {
            if (error) {
              console.log(error);
              return res.status(500).json({ message: 'Internal server error' }); // Notify the client that an internal server error occurred
            }
            // If no error, proceed to add the scraper and respond with the ID of the newly created monitor
            monitorObj.id = results.insertId;
            // Respond with the ID of the newly created monitor
            res.json({ id: results.insertId });
          }
        );
      }
    });
});

// PATCH: Route to update the status of a monitor
router.patch('/monitors/:id/status', (req, res) => {
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
router.delete('/monitors/:id', function (req, res, next) {
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

module.exports = router;