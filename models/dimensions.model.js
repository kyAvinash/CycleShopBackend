const mongoose = require("mongoose");

const dimensionsSchema = new mongoose.Schema({
  length: { type: Number, required: true },
  width: { type: Number, required: true },
  height: { type: Number, required: true },
});

module.exports = dimensionsSchema;
