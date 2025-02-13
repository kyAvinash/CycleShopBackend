const mongoose = require("mongoose");
const addressSchema = require("./address.model");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, default: "" },
    profilePicture: {
      type: String,
      default:
        "https://img.icons8.com/?size=100&id=HDvFsY01Y3K1&format=png&color=000000",
    },
    addresses: [addressSchema],
    cart: [
      {
        productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
        quantity: { type: Number, default: 1 },
      },
    ],
    wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: "Product" }],
    token: { type: String },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);
module.exports = User;
