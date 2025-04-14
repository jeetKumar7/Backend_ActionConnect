const mongoose = require("mongoose");

const schema = new mongoose.Schema({
  name: {
    type: String,
    requires: true,
  },
  email: {
    type: String,
    requires: true,
  },
  password: {
    type: String,
    requires: true,
  },
  location: {
    type: String,
    default: "",
  },
  supportedCauses: {
    type: [String],
    default: [],
  },
  googleId: {
    type: String,
    required: false,
  },
  profilePicture: {
    type: String,
    default: "",
  },
  authMethod: {
    type: String,
    enum: ["local", "google"],
    default: "local",
  },
});

module.exports = mongoose.model("User", schema);
