const mongoose = require("mongoose");

const InitiativeSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
      trim: true,
    },
    category: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },

    organizer: {
      type: String,
      required: true,
    },

    tags: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["Active", "Upcoming"],
      default: "Upcoming",
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
    channelId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Channel",
    },
    nextEvent: {
      type: Date,
    },
    joinedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Initiative", InitiativeSchema);
