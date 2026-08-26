const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    googleId: { type: String, unique: true, sparse: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String }, // only set for local (email/password) accounts
    avatar: { type: String, default: "" },

    // "Select Role" step
    role: { type: String, enum: ["tourist", "provider", "admin", null], default: null },

    // Preferred UI language ("Multilingual information")
    language: { type: String, enum: ["en", "hi"], default: "en" },

    // ---- Provider-only fields ("Fill Details" -> "Aadhaar-based Identity Verification") ----
    providerProfile: {
      craft: { type: String, trim: true }, // e.g. "Pottery", "Weaving", "Heritage Walks"
      bio: { type: String, trim: true },
      city: { type: String, trim: true },
      phone: { type: String, trim: true },

      // NOTE (prototype scope): real Aadhaar e-KYC requires UIDAI-licensed
      // AUA/KUA integration, which is not accessible in a hackathon prototype.
      // We simulate the step: the artisan uploads a masked/last-4-digit
      // Aadhaar reference + a photo of the ID for human admin review below.
      aadhaarLast4: { type: String, trim: true, maxlength: 4 },
      aadhaarDocUrl: { type: String, trim: true }, // uploaded via Cloudinary/local storage

      verificationStatus: {
        type: String,
        enum: ["not_submitted", "pending_review", "verified", "rejected"],
        default: "not_submitted",
      },
      verificationNote: { type: String, trim: true }, // admin's reject reason, if any
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema);
