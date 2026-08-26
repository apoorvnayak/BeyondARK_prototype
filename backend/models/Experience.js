const mongoose = require("mongoose");

const experienceSchema = new mongoose.Schema(
  {
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },

    title: { type: String, required: true, trim: true },
    category: { type: String, trim: true }, // e.g. Pottery, Weaving, Cooking, Heritage Walk
    story: { type: String, required: true, trim: true }, // "Story Behind the Experience & Craft"

    // Transparent pricing - no hidden charges, shown clearly on the card/detail page
    price: { type: Number, required: true, min: 0 },
    priceUnit: { type: String, default: "per person" },
    duration: { type: String, default: "" }, // e.g. "2 hours"

    // Integrated map feature
    location: {
      address: { type: String, trim: true },
      city: { type: String, trim: true },
      lat: { type: Number },
      lng: { type: Number },
    },

    images: [{ type: String }], // Cloudinary/local URLs

    // Multilingual info: short descriptions in supported languages
    translations: {
      hi: {
        title: { type: String, trim: true },
        story: { type: String, trim: true },
      },
    },

    // "Create Experience" -> "Admin Review" -> "Publish" step
    status: {
      type: String,
      enum: ["draft", "pending_review", "published", "rejected"],
      default: "draft",
    },
    reviewNote: { type: String, trim: true },

    availability: [{ type: String }], // simple list of open slots, e.g. "2026-09-05 10:00"
  },
  { timestamps: true }
);

experienceSchema.virtual("ratingAvg").get(function () {
  return this._ratingAvg || null;
});

module.exports = mongoose.model("Experience", experienceSchema);
