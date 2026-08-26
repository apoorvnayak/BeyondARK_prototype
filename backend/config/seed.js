require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const connectDB = require("./db");
const User = require("../models/User");
const Experience = require("../models/Experience");
const Booking = require("../models/Booking");

async function seed() {
  await connectDB();
  console.log("[seed] clearing existing data...");
  await Promise.all([User.deleteMany({}), Experience.deleteMany({}), Booking.deleteMany({})]);

  const pass = await bcrypt.hash("password123", 10);

  // ---- Admin ----
  const admin = await User.create({
    name: "BeyondArk Admin",
    email: "admin@beyondark.local",
    password: pass,
    role: "admin",
  });

  // ---- Providers (artisans) ----
  const meera = await User.create({
    name: "Meera Devi",
    email: "meera@beyondark.local",
    password: pass,
    role: "provider",
    providerProfile: {
      craft: "Blue Pottery",
      bio: "Third-generation Jaipur blue pottery artist, running community workshops since 2010.",
      city: "Jaipur",
      phone: "9999900001",
      aadhaarLast4: "4821",
      aadhaarDocUrl: "",
      verificationStatus: "verified",
    },
  });

  const rakesh = await User.create({
    name: "Rakesh Bhil",
    email: "rakesh@beyondark.local",
    password: pass,
    role: "provider",
    providerProfile: {
      craft: "Pithora Wall Painting",
      bio: "Tribal artist keeping the ritual art of Pithora painting alive for travellers to learn.",
      city: "Jhabua",
      phone: "9999900002",
      aadhaarLast4: "7735",
      aadhaarDocUrl: "",
      verificationStatus: "pending_review", // shows up in admin queue
    },
  });

  const lakshmi = await User.create({
    name: "Lakshmi Nair",
    email: "lakshmi@beyondark.local",
    password: pass,
    role: "provider",
    providerProfile: {
      craft: "Backwater Cooking & Heritage Walk",
      bio: "Runs a family-style Kerala cooking session followed by a walk through her home village.",
      city: "Alappuzha",
      phone: "9999900003",
      aadhaarLast4: "1190",
      aadhaarDocUrl: "",
      verificationStatus: "verified",
    },
  });

  // ---- Tourists ----
  const arjun = await User.create({
    name: "Arjun Mehta",
    email: "arjun@beyondark.local",
    password: pass,
    role: "tourist",
  });
  await User.create({
    name: "Priya Sharma",
    email: "priya@beyondark.local",
    password: pass,
    role: "tourist",
  });

  // ---- Experiences ----
  const potteryWorkshop = await Experience.create({
    provider: meera.id,
    title: "Traditional Blue Pottery Workshop",
    category: "Pottery",
    story:
      "Sit at the wheel with Meera and learn the cobalt-glaze technique passed down through her family for three generations. You'll shape and paint your own piece to take home, and hear the story of how Jaipur's blue pottery survived near-extinction in the 1960s.",
    price: 900,
    priceUnit: "per person",
    duration: "2.5 hours",
    location: { address: "Sanganer Road, near Kripal Kumbh", city: "Jaipur", lat: 26.8467, lng: 75.8017 },
    images: [],
    translations: { hi: { title: "पारंपरिक नीली मिट्टी कार्यशाला", story: "मीरा के साथ चाक पर बैठें और कोबाल्ट-ग्लेज़ तकनीक सीखें।" } },
    status: "published",
    availability: [],
  });

  const backwaterExperience = await Experience.create({
    provider: lakshmi.id,
    title: "Backwater Village Cooking & Walk",
    category: "Cooking",
    story:
      "Cook a full Keralan meal using spices grown in Lakshmi's own garden, then walk the canal paths of her village as she points out the coir-making and fishing traditions that shape daily life here.",
    price: 1400,
    priceUnit: "per person",
    duration: "4 hours",
    location: { address: "Near Punnamada Lake", city: "Alappuzha", lat: 9.4981, lng: 76.3388 },
    images: [],
    status: "published",
    availability: [],
  });

  await Experience.create({
    provider: rakesh.id,
    title: "Pithora Ritual Painting Session",
    category: "Painting",
    story:
      "An introduction to Pithora, a ritual art form of the Bhil and Rathwa communities, painted to bring prosperity to a household. Draft only - awaiting Rakesh's verification.",
    price: 700,
    priceUnit: "per person",
    duration: "2 hours",
    location: { address: "Jhabua town centre", city: "Jhabua", lat: 22.7672, lng: 74.5913 },
    images: [],
    status: "pending_review", // shows up in admin queue once provider is verified & submits
  });

  // ---- Bookings (one in each state, to demo the full pipeline) ----
  await Booking.create({
    tourist: arjun.id,
    provider: meera.id,
    experience: potteryWorkshop.id,
    requestedDate: "2026-09-10",
    requestedTime: "11:00",
    status: "requested", // sitting in Meera's pending queue
  });

  await Booking.create({
    tourist: arjun.id,
    provider: lakshmi.id,
    experience: backwaterExperience.id,
    requestedDate: "2026-09-05",
    requestedTime: "09:00",
    counterDate: "2026-09-06",
    counterTime: "09:00",
    status: "provider_countered", // Arjun needs to accept/decline the new slot
  });

  console.log("[seed] done.");
  console.log("[seed] ------------------------------------------------------");
  console.log("[seed] Login with any account below (password: password123)");
  console.log("[seed]   Admin:    admin@beyondark.local");
  console.log("[seed]   Provider: meera@beyondark.local   (verified)");
  console.log("[seed]   Provider: rakesh@beyondark.local   (pending admin review)");
  console.log("[seed]   Provider: lakshmi@beyondark.local (verified)");
  console.log("[seed]   Tourist:  arjun@beyondark.local");
  console.log("[seed]   Tourist:  priya@beyondark.local");
  console.log("[seed] ------------------------------------------------------");

  await mongoose.disconnect();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
