const mongoose = require("mongoose");
const reviewSchema = require("./reviews.model");
const dimensionsSchema = require("./dimensions.model");

const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: {
      type: String,
      enum: ["E-cycle", "Cycle", "Part", "Accessory"],
      required: true,
    },
    brand: { type: String, required: true },
    model: { type: String, required: true },
    year: {
      type: Number,
      required: true,
      min: 1900,
      max: new Date().getFullYear(),
    },
    price: { type: Number, required: true },
    imageUrls: { type: [String], required: true },
    description: { type: String, required: true },
    categories: { type: [String], required: true },
    tags: { type: [String], default: [] },
    weight: { type: Number, required: true },
    dimensions: { type: dimensionsSchema, required: true },
    material: { type: String, required: true },
    color: { type: String, required: true },
    size: { type: String, required: true },
    condition: { type: String, required: true },
    warranty: { type: Boolean, required: true },
    warrantyDuration: { type: Number, required: true },
    shippingCost: { type: Number, required: true },
    shippingDuration: { type: Number, required: true },
    reviews: { type: [reviewSchema], default: [] },
  },
  { timestamps: true }
);

//Create a Text Index for Efficient Searching
productSchema.index({
  name: "text",
  description: "text",
  brand: "text",
  model: "text",
  categories: "text",
  tags: "text",
});

const Product = mongoose.model("Product", productSchema);
module.exports = Product;
