const mongoose = require("mongoose");

const reviewSchema = new mongoose.Schema(
  {
    rating: { type: Number, required: true, min: 1, max: 5 },
    review: { type: String, required: true },
    reviewerName: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = reviewSchema;
