const express = require("express");
const router = express.Router();
const Experience = require("../models/Experience");

// ---- Landing page: publicly browsable published experiences ----
router.get("/", async (req, res) => {
  const experiences = await Experience.find({ status: "published" })
    .populate("provider", "name providerProfile.verificationStatus")
    .sort({ createdAt: -1 })
    .limit(9);
  res.render("home", { title: "Discover Authentic Local Experiences", experiences });
});

router.get("/about", (req, res) => {
  res.render("about", { title: "About BeyondArk" });
});

// ---- Multilingual toggle ----
router.post("/language/:lang", async (req, res) => {
  const lang = req.params.lang === "hi" ? "hi" : "en";
  if (req.isAuthenticated && req.isAuthenticated()) {
    req.user.language = lang;
    await req.user.save();
  } else {
    req.session.language = lang;
  }
  res.redirect(req.get("referer") || "/");
});

module.exports = router;
