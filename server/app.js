// imports environment variables, which are stored in .env file.
require('dotenv').config();

var createError = require('http-errors');
var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var csrf = require('csurf');
var passport = require('passport');
var logger = require('morgan');

// Import MySQL session store
var MySQLStore = require('express-mysql-session')(session);
var database = require('./boot/database'); // Import the MySQL pool
var indexRouter = require('./routes/index');
var authRouter = require('./routes/auth');

// Configuration used for sessionStore
const options = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
};

// Stores user sessions in the MySQL database
const sessionStore = new MySQLStore(options);

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');


// Useful to determine if outputed strings should be singular or plural, given the amount
app.locals.pluralize = require('pluralize');

// Dev logger, can delete when in production
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Configure session middleware
app.use(
  session({
    secret: 'cardboard cat',
    resave: false,
    saveUninitialized: false,
    store: sessionStore // uses MySQL Session Store
  })
);

app.use(csrf());
app.use(passport.authenticate('session'));

app.use(function(req, res, next) {
  var msgs = req.session.messages || [];
  res.locals.messages = msgs;
  res.locals.hasMessages = !! msgs.length;
  req.session.messages = [];
  next();
});

// Passes the CSRF token to routes
app.use(function(req, res, next) {
  res.locals.csrfToken = req.csrfToken();
  next();
});


app.use('/', indexRouter);
app.use('/', authRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
  });
  
// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};
  
    // render the error page
    res.status(err.status || 500);
    res.render('error');
  });

module.exports = app;