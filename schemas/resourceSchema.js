const mongoose = require("mongoose");

const resourceSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      default: "Other",
    },
    provider: {
      type: String,
      trim: true,
    },
    url: {
      type: String,
      required: true,
      trim: true,
    },
    price: {
      type: String,
      default: "Free",
    },
    category: {
      type: String,
      default: "General",
    },
    website: {
      type: String,
      default: "",
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

// Add text indexes for search functionality
resourceSchema.index({
  title: "text",
  description: "text",
  provider: "text",
});

module.exports = mongoose.model("Resource", resourceSchema);
