const express = require("express");
const router = express.Router();
const passport = require("passport");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const { redirectIfLoggedIn, ensureAuthenticated } = require("../middleware/auth");

const googleEnabled = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

// ---- GET login / signup page ----
router.get("/login", redirectIfLoggedIn, (req, res) => {
  res.render("login", { title: "Log In", googleEnabled });
});

router.get("/signup", redirectIfLoggedIn, (req, res) => {
  res.render("signup", { title: "Sign Up", googleEnabled });
});

// ---- Local signup ----
router.post("/signup", async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password) {
      req.flash("error", "All fields are required.");
      return res.redirect("/signup");
    }
    const existing = await User.findOne({ email: email.toLowerCase() });
    if (existing) {
      req.flash("error", "An account with that email already exists. Please log in.");
      return res.redirect("/login");
    }
    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email: email.toLowerCase(), password: hashed });
    req.login(user, (err) => {
      if (err) throw err;
      res.redirect("/select-role");
    });
  } catch (err) {
    console.error(err);
    req.flash("error", "Something went wrong creating your account.");
    res.redirect("/signup");
  }
});

// ---- Local login ----
router.post("/login", (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      req.flash("error", (info && info.message) || "Invalid credentials.");
      return res.redirect("/login");
    }
    req.login(user, (err2) => {
      if (err2) return next(err2);
      if (!user.role) return res.redirect("/select-role");
      return res.redirect(`/${user.role}`);
    });
  })(req, res, next);
});

// ---- Google OAuth ("Google OAuth Login" step) ----
router.get("/auth/google", (req, res, next) => {
  if (!googleEnabled) {
    req.flash("error", "Google login isn't configured for this deployment yet. Please use email/password.");
    return res.redirect("/login");
  }
  passport.authenticate("google", { scope: ["profile", "email"] })(req, res, next);
});

router.get(
  "/auth/google/callback",
  (req, res, next) => {
    if (!googleEnabled) return res.redirect("/login");
    next();
  },
  passport.authenticate("google", { failureRedirect: "/login", failureFlash: true }),
  (req, res) => {
    if (!req.user.role) return res.redirect("/select-role");
    res.redirect(`/${req.user.role}`);
  }
);

// ---- "Select Role" step (Tourist / Provider) ----
router.get("/select-role", ensureAuthenticated, (req, res) => {
  if (req.user.role) return res.redirect(`/${req.user.role}`);
  res.render("select-role", { title: "Choose Your Role" });
});

router.post("/select-role", ensureAuthenticated, async (req, res) => {
  const { role } = req.body;
  if (!["tourist", "provider"].includes(role)) {
    req.flash("error", "Please choose a valid role.");
    return res.redirect("/select-role");
  }
  req.user.role = role;
  if (role === "provider" && !req.user.providerProfile) req.user.providerProfile = {};
  await req.user.save();
  res.redirect(role === "provider" ? "/provider/onboarding" : "/tourist");
});

// ---- Logout ----
router.post("/logout", (req, res) => {
  req.logout(() => {
    req.session.destroy(() => {
      res.redirect("/");
    });
  });
});

module.exports = router;
