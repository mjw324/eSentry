const express = require('express');
const router = express.Router();
const db = require('../db');
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
    if (error) { return next(error); }

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
  // First retrieve number of monitors for the userid
  db.pool.query('SELECT COUNT(*) as count FROM monitors WHERE userid = ?', 
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
            // Install addScraper here with specified interval
            addScraper(monitorObj, process.env.SCRAPE_REFRESH_RATE);
    
            // Respond with the ID of the newly created monitor
            res.json({ id: results.insertId });
          }
        );
      }
    });
});

// DELETE: Delete a monitor by its ID
// TODO: Delete the scraper as well, check if userid matches monitor's ownerid
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