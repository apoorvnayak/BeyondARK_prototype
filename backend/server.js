require("dotenv").config();
const express = require("express");
const path = require("path");
const fs = require("fs");
const session = require("express-session");
const MongoStore = require("connect-mongo");
const methodOverride = require("method-override");
const flash = require("connect-flash");
const expressLayouts = require("express-ejs-layouts");

const connectDB = require("./config/db");
const passport = require("./config/passport");

const indexRoutes = require("./routes/index");
const authRoutes = require("./routes/auth");
const touristRoutes = require("./routes/tourist");
const providerRoutes = require("./routes/provider");
const adminRoutes = require("./routes/admin");

const app = express();

// ---- View engine ----
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));
app.use(expressLayouts);
app.set("layout", "layout");

// ---- Core middleware ----
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(methodOverride("_method"));

// Runtime files (locally-stored upload fallback) always live with the backend.
app.use(express.static(path.join(__dirname, "public")));

// ---- Static frontend assets (css/js) ----
// In production these are expected to be deployed separately (Netlify/Vercel/CDN)
// and referenced via ASSET_BASE_URL, e.g. https://beyondark-frontend.netlify.app
// For local dev, if ../frontend/public exists (repo cloned as a whole) and no
// ASSET_BASE_URL is set, the backend serves it directly so `npm start` alone
// still gives you a fully working app with no second deploy needed.
const assetBaseUrl = (process.env.ASSET_BASE_URL || "").replace(/\/$/, "");
const localFrontendPath = path.join(__dirname, "..", "frontend", "public");

if (!assetBaseUrl && fs.existsSync(localFrontendPath)) {
  app.use(express.static(localFrontendPath));
  console.log("[static] serving ../frontend/public locally (no ASSET_BASE_URL set)");
} else if (!assetBaseUrl) {
  console.warn(
    "[static] no ASSET_BASE_URL set and ../frontend/public not found - CSS/JS will 404. " +
      "Set ASSET_BASE_URL in .env to your deployed frontend URL."
  );
}

// ---- Sessions (backed by MongoDB via connect-mongo) ----
app.use(
  session({
    secret: process.env.SESSION_SECRET || "beyondark_dev_secret",
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI || "mongodb://127.0.0.1:27017/beyondark",
      collectionName: "sessions",
    }),
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }, // 7 days
  })
);

app.use(passport.initialize());
app.use(passport.session());
app.use(flash());

// ---- Locals available to every view ----
app.use((req, res, next) => {
  res.locals.currentUser = req.user || null;
  res.locals.success = req.flash("success");
  res.locals.error = req.flash("error");
  res.locals.lang = (req.user && req.user.language) || req.session.language || "en";
  res.locals.assetBase = assetBaseUrl; // prefix for <link>/<script> src in views
  next();
});

// ---- Routes ----
app.use("/", indexRoutes);
app.use("/", authRoutes);
app.use("/tourist", touristRoutes);
app.use("/provider", providerRoutes);
app.use("/admin", adminRoutes);

// ---- 404 ----
app.use((req, res) => {
  res.status(404).render("404", { title: "Page Not Found" });
});

// ---- Error handler ----
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).render("500", { title: "Something Went Wrong", error: err });
});

const PORT = process.env.PORT || 3000;

connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`[server] BeyondArk running at http://localhost:${PORT}`);
  });
});
