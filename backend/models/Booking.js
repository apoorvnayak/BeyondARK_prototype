const mongoose = require("mongoose");

const bookingSchema = new mongoose.Schema(
  {
    tourist: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    provider: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    experience: { type: mongoose.Schema.Types.ObjectId, ref: "Experience", required: true },

    // "Request Date & Time"
    requestedDate: { type: String, required: true }, // YYYY-MM-DD
    requestedTime: { type: String, required: true }, // HH:mm

    // "Suggest Date & Time" (provider's counter-offer, only set if provider rejects the first request)
    counterDate: { type: String },
    counterTime: { type: String },

    // status mirrors the diagram's nodes exactly:
    // requested            -> "Provider Review Request"
    // provider_countered    -> provider rejected + "Suggest Date & Time", waiting on tourist
    // confirmed             -> "Booking Confirmed"
    // cancelled              -> tourist rejected the provider's counter-offer
    // completed              -> "Attend Experience" has happened
    // reviewed                -> "Ratings & Reviews" submitted
    status: {
      type: String,
      enum: ["requested", "provider_countered", "confirmed", "cancelled", "completed", "reviewed"],
      default: "requested",
    },

    // "Ratings & Reviews"
    rating: { type: Number, min: 1, max: 5 },
    reviewComment: { type: String, trim: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Booking", bookingSchema);
