// loads environment variables from .env file into process.env
require('dotenv').config();
const express = require('express');
const app = express();
const createError = require('http-errors');
const logger = require('morgan');
const cors = require('cors');
const indexRouter = require('./routes/index');


// Dev logger, can delete when in production
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const corsOptions = {
  origin: ['http://localhost:4200', 'https://www.esentry-notify.com'],
  methods: ['GET', 'POST', 'OPTIONS', 'PATCH', 'DELETE'],
  allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization', 'userid'],
  optionsSuccessStatus: 204
};

app.use(cors(corsOptions));


app.use('/', indexRouter);

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development 
  // Remember, it is important not to send detailed error information
  // in a production environment as it can expose sensitive information about your application.
  // TODO: When in production change this to false
  res.locals.message = err.message;
  res.locals.error = process.env.DEVBUILD = 'true' ? err : {};
  console.log(err.message, err.stack, err.status)
  // respond with error status and message
  res.status(err.status || 500);
  res.json({
    message: err.message,
    error: process.env.DEVBUILD ? err : {},
  });
});

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});


module.exports = app;