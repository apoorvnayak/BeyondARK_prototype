const express = require("express");
const router = express.Router();
const Experience = require("../models/Experience");
const Booking = require("../models/Booking");
const { ensureRole } = require("../middleware/auth");
const { upload, fileUrl } = require("../middleware/upload");
const { sendMail } = require("../config/mailer");

router.use(ensureRole("provider"));

function isVerified(user) {
  return user.providerProfile && user.providerProfile.verificationStatus === "verified";
}

// ---- "Fill Details" (onboarding form) ----
router.get("/onboarding", (req, res) => {
  res.render("provider/onboarding", { title: "Artisan Onboarding" });
});

// ---- Submit details + "Aadhaar-based Identity Verification" doc -> goes to "Admin Review" ----
router.post("/onboarding", upload.single("aadhaarDoc"), async (req, res) => {
  try {
    const { craft, bio, city, phone, aadhaarLast4 } = req.body;
    if (!craft || !city || !phone || !aadhaarLast4) {
      req.flash("error", "Please fill in all required fields.");
      return res.redirect("/provider/onboarding");
    }
    if (!/^\d{4}$/.test(aadhaarLast4)) {
      req.flash("error", "Please enter the last 4 digits of your Aadhaar number.");
      return res.redirect("/provider/onboarding");
    }

    req.user.providerProfile = {
      craft,
      bio,
      city,
      phone,
      aadhaarLast4,
      aadhaarDocUrl: req.file ? fileUrl(req.file) : req.user.providerProfile?.aadhaarDocUrl || "",
      verificationStatus: "pending_review", // -> "Admin Review"
    };
    await req.user.save();

    req.flash(
      "success",
      "Your details were submitted. Our team will verify your identity shortly (prototype: an admin approves this from /admin)."
    );
    res.redirect("/provider");
  } catch (err) {
    console.error(err);
    req.flash("error", "Couldn't submit your onboarding details.");
    res.redirect("/provider/onboarding");
  }
});

// ---- Provider dashboard: shows verification status, own experiences, bookings ----
router.get("/", async (req, res) => {
  if (!req.user.providerProfile || req.user.providerProfile.verificationStatus === "not_submitted") {
    return res.redirect("/provider/onboarding");
  }

  const experiences = await Experience.find({ provider: req.user.id }).sort({ createdAt: -1 });
  const pendingBookings = await Booking.find({ provider: req.user.id, status: "requested" })
    .populate("experience")
    .populate("tourist", "name")
    .sort({ createdAt: -1 });

  res.render("provider/dashboard", {
    title: "Artisan Dashboard",
    experiences,
    pendingBookings,
    verified: isVerified(req.user),
  });
});

// ---- "Create Experience" (only once verified, matching the flow) ----
router.get("/experiences/new", (req, res) => {
  if (!isVerified(req.user)) {
    req.flash("error", "You'll be able to create experiences once your identity is verified.");
    return res.redirect("/provider");
  }
  res.render("provider/experience-form", { title: "New Experience", experience: null });
});

router.post("/experiences", upload.array("images", 5), async (req, res) => {
  try {
    if (!isVerified(req.user)) {
      req.flash("error", "You'll be able to create experiences once your identity is verified.");
      return res.redirect("/provider");
    }
    const { title, category, story, price, priceUnit, duration, address, city, lat, lng, titleHi, storyHi } =
      req.body;

    const experience = await Experience.create({
      provider: req.user.id,
      title,
      category,
      story,
      price,
      priceUnit: priceUnit || "per person",
      duration,
      location: { address, city, lat: lat || undefined, lng: lng || undefined },
      images: (req.files || []).map(fileUrl),
      translations: { hi: { title: titleHi, story: storyHi } },
      status: "pending_review", // -> "Admin Review" -> "Publish"
    });

    req.flash("success", "Experience submitted for admin review before it goes live.");
    res.redirect(`/provider/experiences/${experience.id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Couldn't create the experience. Please check your inputs.");
    res.redirect("/provider/experiences/new");
  }
});

router.get("/experiences/:id", async (req, res) => {
  const experience = await Experience.findOne({ _id: req.params.id, provider: req.user.id });
  if (!experience) {
    req.flash("error", "Experience not found.");
    return res.redirect("/provider");
  }
  res.render("provider/experience-detail", { title: experience.title, experience });
});

// ---- Provider's bookings inbox ----
router.get("/bookings", async (req, res) => {
  const bookings = await Booking.find({ provider: req.user.id })
    .populate("experience")
    .populate("tourist", "name email")
    .sort({ updatedAt: -1 });
  res.render("provider/bookings", { title: "Booking Requests", bookings });
});

// ---- "Provider Review Request" -> Accept ----
router.post("/bookings/:id/accept", async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, provider: req.user.id }).populate(
    "tourist",
    "email name"
  );
  if (!booking || !["requested"].includes(booking.status)) {
    req.flash("error", "This request can't be updated right now.");
    return res.redirect("/provider/bookings");
  }
  booking.status = "confirmed"; // -> "Booking Confirmed"
  await booking.save();
  sendMail({
    to: booking.tourist.email,
    subject: "Your booking was confirmed!",
    html: `<p>Great news - your booking for ${booking.requestedDate} at ${booking.requestedTime} is confirmed.</p>`,
  });
  req.flash("success", "Booking accepted and confirmed.");
  res.redirect("/provider/bookings");
});

// ---- "Provider Review Request" -> Reject -> "Suggest Date & Time" ----
router.post("/bookings/:id/counter", async (req, res) => {
  const { counterDate, counterTime } = req.body;
  const booking = await Booking.findOne({ _id: req.params.id, provider: req.user.id }).populate(
    "tourist",
    "email name"
  );
  if (!booking || booking.status !== "requested") {
    req.flash("error", "This request can't be updated right now.");
    return res.redirect("/provider/bookings");
  }
  if (!counterDate || !counterTime) {
    req.flash("error", "Please suggest an alternative date and time.");
    return res.redirect("/provider/bookings");
  }
  booking.status = "provider_countered";
  booking.counterDate = counterDate;
  booking.counterTime = counterTime;
  await booking.save();
  sendMail({
    to: booking.tourist.email,
    subject: "New date/time suggested for your booking",
    html: `<p>The artisan suggested ${counterDate} at ${counterTime} instead. Please accept or decline in your dashboard.</p>`,
  });
  req.flash("success", "Alternative date & time sent to the tourist.");
  res.redirect("/provider/bookings");
});

module.exports = router;
