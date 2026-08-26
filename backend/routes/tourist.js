const express = require("express");
const router = express.Router();
const Experience = require("../models/Experience");
const Booking = require("../models/Booking");
const User = require("../models/User");
const { ensureRole } = require("../middleware/auth");
const { sendMail } = require("../config/mailer");

router.use(ensureRole("tourist"));

// ---- "Discover local experiences" ----
router.get("/", async (req, res) => {
  const { q, category, city } = req.query;
  const filter = { status: "published" };
  if (category) filter.category = category;
  if (city) filter["location.city"] = new RegExp(city, "i");
  if (q) filter.title = new RegExp(q, "i");

  const experiences = await Experience.find(filter)
    .populate("provider", "name providerProfile.verificationStatus")
    .sort({ createdAt: -1 });

  const categories = await Experience.distinct("category", { status: "published" });

  res.render("tourist/discover", {
    title: "Discover Experiences",
    experiences,
    categories,
    q,
    category,
    city,
  });
});

// ---- "View experience" -> "Read details & story" ----
router.get("/experience/:id", async (req, res) => {
  const experience = await Experience.findOne({ _id: req.params.id, status: "published" }).populate(
    "provider",
    "name avatar providerProfile"
  );
  if (!experience) {
    req.flash("error", "That experience isn't available.");
    return res.redirect("/tourist");
  }
  const bookings = await Booking.find({
    tourist: req.user.id,
    experience: experience.id,
  }).sort({ createdAt: -1 });

  res.render("tourist/experience-detail", {
    title: experience.title,
    experience,
    bookings,
    mapboxToken: process.env.MAPBOX_TOKEN || "",
  });
});

// ---- "Request Date & Time" ----
router.post("/experience/:id/book", async (req, res) => {
  try {
    const { date, time } = req.body;
    const experience = await Experience.findOne({ _id: req.params.id, status: "published" });
    if (!experience) {
      req.flash("error", "That experience isn't available.");
      return res.redirect("/tourist");
    }
    if (!date || !time) {
      req.flash("error", "Please choose both a date and a time.");
      return res.redirect(`/tourist/experience/${req.params.id}`);
    }

    const booking = await Booking.create({
      tourist: req.user.id,
      provider: experience.provider,
      experience: experience.id,
      requestedDate: date,
      requestedTime: time,
      status: "requested",
    });

    const providerUser = await User.findById(experience.provider);
    if (providerUser) {
      sendMail({
        to: providerUser.email,
        subject: `New booking request: ${experience.title}`,
        html: `<p>${req.user.name} requested ${date} at ${time} for "${experience.title}". Review it in your dashboard.</p>`,
      });
    }

    req.flash("success", "Your request has been sent to the artisan. We'll notify you once they respond.");
    res.redirect(`/tourist/bookings/${booking.id}`);
  } catch (err) {
    console.error(err);
    req.flash("error", "Couldn't submit your request. Please try again.");
    res.redirect(`/tourist/experience/${req.params.id}`);
  }
});

// ---- "My Bookings" list ----
router.get("/bookings", async (req, res) => {
  const bookings = await Booking.find({ tourist: req.user.id })
    .populate("experience")
    .populate("provider", "name")
    .sort({ updatedAt: -1 });
  res.render("tourist/bookings", { title: "My Bookings", bookings });
});

router.get("/bookings/:id", async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, tourist: req.user.id })
    .populate("experience")
    .populate("provider", "name");
  if (!booking) {
    req.flash("error", "Booking not found.");
    return res.redirect("/tourist/bookings");
  }
  res.render("tourist/booking-detail", { title: "Booking Details", booking });
});

// ---- Tourist responds to the provider's "Suggest Date & Time" counter-offer ----
router.post("/bookings/:id/accept-counter", async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, tourist: req.user.id });
  if (!booking || booking.status !== "provider_countered") {
    req.flash("error", "This booking can't be updated right now.");
    return res.redirect("/tourist/bookings");
  }
  booking.requestedDate = booking.counterDate;
  booking.requestedTime = booking.counterTime;
  booking.status = "confirmed"; // -> "Booking Confirmed"
  await booking.save();
  req.flash("success", "Booking confirmed! Enjoy your experience.");
  res.redirect(`/tourist/bookings/${booking.id}`);
});

router.post("/bookings/:id/reject-counter", async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, tourist: req.user.id });
  if (!booking || booking.status !== "provider_countered") {
    req.flash("error", "This booking can't be updated right now.");
    return res.redirect("/tourist/bookings");
  }
  booking.status = "cancelled";
  await booking.save();
  req.flash("success", "Booking request cancelled.");
  res.redirect("/tourist/bookings");
});

// ---- "Attend Experience" (prototype: tourist marks it attended) ----
router.post("/bookings/:id/attend", async (req, res) => {
  const booking = await Booking.findOne({ _id: req.params.id, tourist: req.user.id });
  if (!booking || booking.status !== "confirmed") {
    req.flash("error", "This booking isn't confirmed yet.");
    return res.redirect("/tourist/bookings");
  }
  booking.status = "completed";
  await booking.save();
  res.redirect(`/tourist/bookings/${booking.id}`);
});

// ---- "Ratings & Reviews" ----
router.post("/bookings/:id/review", async (req, res) => {
  const { rating, comment } = req.body;
  const booking = await Booking.findOne({ _id: req.params.id, tourist: req.user.id });
  if (!booking || booking.status !== "completed") {
    req.flash("error", "You can only review a booking after attending the experience.");
    return res.redirect("/tourist/bookings");
  }
  booking.rating = Number(rating);
  booking.reviewComment = comment;
  booking.status = "reviewed";
  await booking.save();
  req.flash("success", "Thanks for sharing your feedback!");
  res.redirect(`/tourist/bookings/${booking.id}`);
});

module.exports = router;
