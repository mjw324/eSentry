var express = require('express');
var passport = require('passport');
var GoogleStrategy = require('passport-google-oidc');
var db = require('../db'); // mysql database


// Configure the Google strategy for use by Passport.
//
// OAuth 2.0-based strategies require a `verify` function which receives the
// credential (`accessToken`) for accessing the Google API on the user's
// behalf, along with the user's profile.  The function must invoke `cb`
// with a user object, which will be set at `req.user` in route handlers after
// authentication.
passport.use(new GoogleStrategy({
  clientID: process.env['GOOGLE_CLIENT_ID'],
  clientSecret: process.env['GOOGLE_CLIENT_SECRET'],
  callbackURL: '/oauth2/redirect/google',
  scope: [ 'profile' ]
}, function verify(issuer, profile, cb) {
  db.pool.query('SELECT * FROM federated_credentials WHERE provider = ? AND subject = ?', [issuer, profile.id], (error, results, fields) => {
      if (error) { return cb(error); }
      if (results.length === 0) {
        db.pool.query('INSERT INTO users (name) VALUES (?)', [profile.displayName], (error, results, fields) => {
          if (error) { return cb(error); }
          var id = results.insertId;
          db.pool.query('INSERT INTO federated_credentials (user_id, provider, subject) VALUES (?, ?, ?)', [id, issuer, profile.id], (error, results, fields) => {
            if (error) { return cb(error); }
            var user = {
              id: id,
              name: profile.displayName
            };
            return cb(null, user);
          });
        });
      } else {
        db.pool.query('SELECT * FROM users WHERE id = ?', [ results[0].user_id ], (error, results, fields) => {
          if (error) { return cb(error); }
          if (results.length === 0) { return cb(null, false); }
          return cb(null, results[0]);
        });
      }
    });
}));
  
// Configure Passport authenticated session persistence.
//
// In order to restore authentication state across HTTP requests, Passport needs
// to serialize users into and deserialize users out of the session.  In a
// production-quality application, this would typically be as simple as
// supplying the user ID when serializing, and querying the user record by ID
// from the database when deserializing.  However, due to the fact that this
// example does not have a database, the complete Facebook profile is serialized
// and deserialized.
// passport.serializeUser(function(user, cb) {
//   process.nextTick(function() {
//     cb(null, { id: user.id, username: user.username, name: user.name });
//   });
// });

// passport.deserializeUser(function(user, cb) {
//   process.nextTick(function() {
//     return cb(null, user);
//   });
// });
// In this version, serializeUser is only storing the user's ID in the session
// Then deserializeUser is using that ID to retrieve the full user from the database.
passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  db.pool.query('SELECT * FROM users WHERE id = ?', [id], (error, results, fields) => {
    if (error) { return cb(error); }
    cb(null, results[0]);
  });
});




var router = express.Router();

// If Angular never uses this route, we can delete it
router.get('/login', function(req, res, next) {
  res.redirect('/login/federated/google');
});

/* GET /login/federated/accounts.google.com
 *
 * This route redirects the user to Google, where they will authenticate.
 *
 * Signing in with Google is implemented using OAuth 2.0.  This route initiates
 * an OAuth 2.0 flow by redirecting the user to Google's identity server at
 * 'https://accounts.google.com'.  Once there, Google will authenticate the user
 * and obtain their consent to release identity information to this app.
 *
 * Once Google has completed their interaction with the user, the user will be
 * redirected back to the app at `GET /oauth2/redirect/accounts.google.com`.
 */
router.get('/login/federated/google', passport.authenticate('google'));

/*
    This route completes the authentication sequence when Google redirects the
    user back to the application.  When a new user signs in, a user account is
    automatically created and their Google account is linked.  When an existing
    user returns, they are signed in to their linked account.
*/
router.get('/oauth2/redirect/google', passport.authenticate('google', {
  successReturnToOrRedirect: 'http://localhost:4200/success',
  failureRedirect: 'http://localhost:4200/failure'
}));

/* POST /logout
 *
 * This route logs the user out.
 */
router.post('/logout', function(req, res, next) {
  req.logout();
  return res.status(200).json({ message: "Logout successful" });
});

module.exports = router;
