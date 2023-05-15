const express = require('express');
const ensureLogIn = require('connect-ensure-login').ensureLoggedIn;
const db = require('../db');
// Import addScraper function from scrape.js
const { addScraper } = require('../scrape');

const ensureLoggedIn = ensureLogIn();

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

// GET: Fetch all monitors
router.get('/monitors', function(req, res, next) {
  db.pool.query('SELECT * FROM monitors', function(error, results, fields) {
    if (error) { return next(error); }
  
    // Respond with the list of monitors
    res.json(results);
  });
});

// POST: Add a new monitor
router.post('/monitors', function(req, res, next) {
    console.log(req.body);
    // Extract 'keywords' from the request body
    const keywords = req.body.keywords;
    const chatID = req.body.chatid;

    if (!keywords || !chatID) {
      // If 'keywords' or 'chatid' is not provided, respond with an error status and message
      return res.status(400).json({ message: 'Keywords and chatID are required' });
    }
  
    db.pool.query('INSERT INTO monitors (keywords, chatid, recentlink) VALUES (?, ?, ?)', [
      keywords, chatID, ""
    ], function(error, results, fields) {
      if (error) { return next(error); }
      // Install addScraper here with 60s interval
      addScraper(keywords, chatID, 5000);
      // Respond with the fID of the newly created monitor
      res.json({ id: results.insertId });
    });
  });

module.exports = router;