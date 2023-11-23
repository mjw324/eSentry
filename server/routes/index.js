const express = require('express');
// const ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
const db = require('../db');
// Import addScraper function from scrape.js
const { addScraper } = require('../scrape');

// const ensureLoggedIn = ensureLogIn();

// function fetchTodos(req, res, next) {
//   db.pool.query('SELECT * FROM todos WHERE owner_id = ?', [
//     req.user.id
//   ], function(error, results, fields) {
//     if (error) { return next(error); }

//     var todos = results.map(function(row) {
//       return {
//         id: row.id,
//         title: row.title,
//         completed: row.completed == 1 ? true : false,
//         url: '/' + row.id
//       }
//     });
//     res.locals.todos = todos;
//     res.locals.activeCount = todos.filter(function(todo) { return !todo.completed; }).length;
//     res.locals.completedCount = todos.length - res.locals.activeCount;
//     next();
//   });
// }

const router = express.Router();

// GET home page, if user isn't logged in it displays login homepage */
// router.get('/', function(req, res, next) {
//   if (!req.user) { return res.render('home'); }
//   next();
// }, fetchTodos, function(req, res, next) {
//   res.locals.filter = null;
//   res.render('index', { user: req.user });
// });

// router.get('/active', ensureLoggedIn, fetchTodos, function(req, res, next) {
//   res.locals.todos = res.locals.todos.filter(function(todo) { return !todo.completed; });
//   res.locals.filter = 'active';
//   res.render('index', { user: req.user });
// });

// router.get('/completed', ensureLoggedIn, fetchTodos, function(req, res, next) {
//   res.locals.todos = res.locals.todos.filter(function(todo) { return todo.completed; });
//   res.locals.filter = 'completed';
//   res.render('index', { user: req.user });
// });

// router.post('/', ensureLoggedIn, function(req, res, next) {
//   req.body.title = req.body.title.trim();
//   next();
// }, function(req, res, next) {
//   // If submitted monitor keyword doesn't exist, we ignore and return
//   if (req.body.title !== '') { return next(); }
//   return res.redirect('/' + (req.body.filter || ''));
// }, function(req, res, next) {
//   db.pool.query('INSERT INTO monitors (owner_id, title, completed) VALUES (?, ?, ?)', [
//     req.user.id,
//     req.body.title,
//   ], function(err) {
//     if (err) { return next(err); }
//     return res.redirect('/' + (req.body.filter || ''));
//   });
// });

// router.post('/:id(\\d+)', ensureLoggedIn, function(req, res, next) {
//   req.body.title = req.body.title.trim();
//   next();
// }, function(req, res, next) {
//   if (req.body.title !== '') { return next(); }
//   db.run('DELETE FROM todos WHERE id = ? AND owner_id = ?', [
//     req.params.id,
//     req.user.id
//   ], function(err) {
//     if (err) { return next(err); }
//     return res.redirect('/' + (req.body.filter || ''));
//   });
// }, function(req, res, next) {
//   db.pool.query('UPDATE todos SET title = ?, completed = ? WHERE id = ? AND owner_id = ?', [
//     req.body.title,
//     req.body.completed !== undefined ? 1 : null,
//     req.params.id,
//     req.user.id
//   ], function(err) {
//     if (err) { return next(err); }
//     return res.redirect('/' + (req.body.filter || ''));
//   });
// });

// router.post('/:id(\\d+)/delete', ensureLoggedIn, function(req, res, next) {
//   db.pool.query('DELETE FROM todos WHERE id = ? AND owner_id = ?', [
//     req.params.id,
//     req.user.id
//   ], function(err) {
//     if (err) { return next(err); }
//     return res.redirect('/' + (req.body.filter || ''));
//   });
// });

// router.post('/toggle-all', ensureLoggedIn, function(req, res, next) {
//   db.pool.query('UPDATE todos SET completed = ? WHERE owner_id = ?', [
//     req.body.completed !== undefined ? 1 : null,
//     req.user.id
//   ], function(err) {
//     if (err) { return next(err); }
//     return res.redirect('/' + (req.body.filter || ''));
//   });
// });

// router.post('/clear-completed', ensureLoggedIn, function(req, res, next) {
//   db.pool.query('DELETE FROM todos WHERE owner_id = ? AND completed = ?', [
//     req.user.id,
//     1
//   ], function(err) {
//     if (err) { return next(err); }
//     return res.redirect('/' + (req.body.filter || ''));
//   });
// });

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
    function(error, results, fields) {
      if (error) {
        console.log(error);
        return res.status(500).json({ message: 'Internal server error' }); // Notify the client that an internal server error occurred
      }
      // If no error, proceed to add the scraper and respond with the ID of the newly created monitor

      // Install addScraper here with specified interval
      addScraper(monitorObj, process.env.SCRAPE_REFRESH_RATE);

      // Respond with the ID of the newly created monitor
      res.json({ id: results.insertId });
    }
  );


});

// DELETE: Delete a monitor by its ID
// TODO: Delete the scraper as well, check if userid matches monitor's ownerid
router.delete('/monitors/:id', function (req, res, next) {
  // Extract 'id' from the request parameters
  const id = req.params.id;

  if (!id) {
    // If 'id' is not provided, respond with an error status and message
    return res.status(400).json({ message: 'Monitor id is required' });
  }

  db.pool.query('DELETE FROM monitors WHERE id = ?', [id], function (error, results, fields) {
    if (error) { return next(error); }

    // Respond with a success message
    res.json({ message: 'Monitor successfully deleted' });
  });

});

module.exports = router;