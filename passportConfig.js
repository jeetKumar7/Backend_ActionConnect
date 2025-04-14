const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const User = require("./schemas/userSchema.js");
const dotenv = require("dotenv");

dotenv.config();

module.exports = function () {
  // Check if credentials exist
  if (!process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET) {
    console.error("Missing Google OAuth credentials in environment variables");
    console.log("Available env vars:", Object.keys(process.env));
    // Don't crash the app, but log error
  }

  // Configure Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "https://backend-actionconnect.onrender.com/api/user/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user exists
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            return done(null, user);
          }

          // Check if user exists with same email
          if (profile.emails && profile.emails.length > 0) {
            user = await User.findOne({ email: profile.emails[0].value });

            if (user) {
              // Link Google account to existing user
              user.googleId = profile.id;
              user.authMethod = "google";
              await user.save();
              return done(null, user);
            }
          }

          // Create new user
          const newUser = new User({
            name: profile.displayName,
            email: profile.emails?.[0]?.value || "",
            googleId: profile.id,
            profilePicture: profile.photos?.[0]?.value || "",
            authMethod: "google",
          });

          await newUser.save();
          done(null, newUser);
        } catch (error) {
          console.error("Google strategy error:", error);
          done(error, null);
        }
      }
    )
  );

  // Serialization/deserialization
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
