const passport = require("passport");
const LocalStrategy = require("passport-local").Strategy;
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const bcrypt = require("bcryptjs");
const User = require("../models/User");

// ---- Local strategy (email + password) ----
// Included alongside Google OAuth so the prototype is fully testable
// without needing real Google API credentials during evaluation/demo.
passport.use(
  new LocalStrategy({ usernameField: "email" }, async (email, password, done) => {
    try {
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) return done(null, false, { message: "No account with that email." });
      if (!user.password) {
        return done(null, false, { message: "Sign in with Google for this account." });
      }
      const match = await bcrypt.compare(password, user.password);
      if (!match) return done(null, false, { message: "Incorrect password." });
      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);

// ---- Google OAuth strategy (matches "Google OAuth Login" step in the flow) ----
// Only registered when credentials are present in .env, so the app still
// boots cleanly for local demoing without Google Cloud setup.
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: process.env.GOOGLE_CALLBACK_URL || "/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });
          if (!user) {
            user = await User.findOne({ email: profile.emails[0].value.toLowerCase() });
          }
          if (!user) {
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails[0].value.toLowerCase(),
              avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : "",
              role: null, // set on the "Select Role" step after first login
            });
          } else if (!user.googleId) {
            user.googleId = profile.id;
            await user.save();
          }
          return done(null, user);
        } catch (err) {
          return done(err);
        }
      }
    )
  );
} else {
  console.log(
    "[passport] Google OAuth not configured - set GOOGLE_CLIENT_ID/SECRET in .env to enable it. Local email/password login still works."
  );
}

passport.serializeUser((user, done) => done(null, user.id));
passport.deserializeUser(async (id, done) => {
  try {
    const user = await User.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});

module.exports = passport;
