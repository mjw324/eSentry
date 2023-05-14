// imports environment variables, which are stored in .env file.
require('dotenv').config();

const createError = require('http-errors');
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const csrf = require('csurf');
const passport = require('passport');
const logger = require('morgan');
const cors = require('cors');

// Import MySQL session store
const MySQLStore = require('express-mysql-session')(session);
const database = require('./boot/database'); // Import the MySQL pool
const indexRouter = require('./routes/index');
const authRouter = require('./routes/auth');

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

const app = express();


// Dev logger, can delete when in production
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cors());
app.use(cookieParser());


// Configure session middleware
app.use(
  session({
    secret: 'cardboard cat',
    resave: false,
    saveUninitialized: false,
    store: sessionStore // uses MySQL Session Store
  })
);

// app.use(csrf());
app.use(passport.authenticate('session'));

app.use(function(req, res, next) {
  var msgs = req.session.messages || [];
  res.locals.messages = msgs;
  res.locals.hasMessages = !! msgs.length;
  req.session.messages = [];
  next();
});

// This function isn't necessary as CSRF protection is handled on client side using Angular
// Passes the CSRF token to routes
// app.use(function(req, res, next) {
//   res.locals.csrfToken = req.csrfToken();
//   next();
// });


app.use('/', indexRouter);
app.use('/', authRouter);

  
// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development 
  // Remember, it is important not to send detailed error information
  // in a production environment as it can expose sensitive information about your application.
  // TODO: When in production change this to false
  const isDevelopment = true;
  res.locals.message = err.message;
  res.locals.error = isDevelopment ? err : {};

  // respond with error status and message
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: isDevelopment ? err : {},
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

module.exports = app;