const express = require("express");
const router = express.Router();
const User = require("../models/User");
const Experience = require("../models/Experience");
const { ensureRole } = require("../middleware/auth");
const { sendMail } = require("../config/mailer");

router.use(ensureRole("admin"));

router.get("/", async (req, res) => {
  const pendingProviders = await User.find({
    role: "provider",
    "providerProfile.verificationStatus": "pending_review",
  }).sort({ updatedAt: -1 });

  const pendingExperiences = await Experience.find({ status: "pending_review" })
    .populate("provider", "name")
    .sort({ updatedAt: -1 });

  res.render("admin/dashboard", { title: "Admin Review", pendingProviders, pendingExperiences });
});

// ---- Provider "Admin Review" -> Verified / Reject -> Re-submit ----
router.post("/providers/:id/verify", async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: "provider" });
  if (!user) {
    req.flash("error", "Provider not found.");
    return res.redirect("/admin");
  }
  user.providerProfile.verificationStatus = "verified";
  user.providerProfile.verificationNote = "";
  await user.save();
  sendMail({
    to: user.email,
    subject: "You're verified on BeyondArk!",
    html: `<p>Congratulations ${user.name}, your artisan profile is verified. You can now create experiences.</p>`,
  });
  req.flash("success", `${user.name} is now verified.`);
  res.redirect("/admin");
});

router.post("/providers/:id/reject", async (req, res) => {
  const { note } = req.body;
  const user = await User.findOne({ _id: req.params.id, role: "provider" });
  if (!user) {
    req.flash("error", "Provider not found.");
    return res.redirect("/admin");
  }
  user.providerProfile.verificationStatus = "rejected";
  user.providerProfile.verificationNote = note || "Documents unclear - please re-submit.";
  await user.save();
  sendMail({
    to: user.email,
    subject: "Action needed: verification documents",
    html: `<p>We couldn't verify your profile: ${user.providerProfile.verificationNote}. Please re-submit from your dashboard.</p>`,
  });
  req.flash("success", `${user.name}'s submission was sent back for re-submission.`);
  res.redirect("/admin");
});

// ---- Experience "Admin Review" -> Accept -> Publish / Reject ----
router.post("/experiences/:id/publish", async (req, res) => {
  const experience = await Experience.findById(req.params.id).populate("provider", "email name");
  if (!experience) {
    req.flash("error", "Experience not found.");
    return res.redirect("/admin");
  }
  experience.status = "published";
  experience.reviewNote = "";
  await experience.save();
  sendMail({
    to: experience.provider.email,
    subject: "Your experience is live!",
    html: `<p>"${experience.title}" has been published and is now visible to tourists.</p>`,
  });
  req.flash("success", `"${experience.title}" published.`);
  res.redirect("/admin");
});

router.post("/experiences/:id/reject", async (req, res) => {
  const { note } = req.body;
  const experience = await Experience.findById(req.params.id).populate("provider", "email name");
  if (!experience) {
    req.flash("error", "Experience not found.");
    return res.redirect("/admin");
  }
  experience.status = "rejected";
  experience.reviewNote = note || "Please add more detail and clearer pricing.";
  await experience.save();
  sendMail({
    to: experience.provider.email,
    subject: "Your experience needs changes",
    html: `<p>"${experience.title}" was sent back: ${experience.reviewNote}</p>`,
  });
  req.flash("success", `"${experience.title}" sent back for changes.`);
  res.redirect("/admin");
});

module.exports = router;
