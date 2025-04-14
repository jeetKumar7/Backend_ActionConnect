const { isLoggedIn } = require("../middleware/auth.js");
const dotenv = require("dotenv");
const Router = require("express").Router();

dotenv.config();

const Channel = require("../schemas/channelSchema.js");
const User = require("../schemas/userSchema.js");

// Create a new channel
Router.post("/create", isLoggedIn, async (req, res) => {
  const { name, description } = req.body;
  const userId = req.user.id;

  try {
    const newChannel = new Channel({ name, description, members: [userId] });
    await newChannel.save();
    res.status(200).json({ message: "Channel created successfully", channel: newChannel });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

Router.get("/all", isLoggedIn, async (req, res) => {
  try {
    const channels = await Channel.find().populate("members", "name email");
    res.status(200).json(channels);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

// Get channel by ID
// Router.get("/:channelId", isLoggedIn, async (req, res) => {
//   const { channelId } = req.params;

//   try {
//     const channel = await Channel.findById(channelId).populate("members", "name email");
//     if (!channel) {
//       return res.status(404).json({ message: "Channel not found" });
//     }
//     res.status(200).json(channel);
//   } catch (error) {
//     res.status(500).json({ message: "Server Error", error });
//   }
// });

Router.post("/:channelId/join", isLoggedIn, async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user.id;

  try {
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    if (!channel.members.includes(userId)) {
      channel.members.push(userId);
      await channel.save();
    }

    res.status(200).json({ message: "Joined channel", channel });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

Router.post("/:channelId/leave", isLoggedIn, async (req, res) => {
  const { channelId } = req.params;
  const userId = req.user.id;

  try {
    const channel = await Channel.findById(channelId);
    if (!channel) return res.status(404).json({ message: "Channel not found" });

    channel.members = channel.members.filter((memberId) => memberId.toString() !== userId);
    await channel.save();

    res.status(200).json({ message: "Left channel" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

module.exports = Router;
