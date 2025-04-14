const { isLoggedIn } = require("../middleware/auth.js");
const dotenv = require("dotenv");
const Router = require("express").Router();
const mongoose = require("mongoose");
dotenv.config();

const Message = require("../schemas/messageSchema.js");
const Channel = require("../schemas/channelSchema.js");

// Create a new message
Router.post("/create", isLoggedIn, async (req, res) => {
  const { content, channelId } = req.body;
  const userId = req.user.id;

  try {
    const newMessage = new Message({ content, sender: userId, channel: channelId });
    await newMessage.save();
    res.status(200).json({ message: "Message created successfully", message: newMessage });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

// Get messages by channel ID
// Update this route in your messages.js or routes file
Router.get("/channel/:channelId", isLoggedIn, async (req, res) => {
  const { channelId } = req.params;

  try {
    // First, verify that channelId is a valid MongoDB ObjectId
    if (!mongoose.Types.ObjectId.isValid(channelId)) {
      return res.status(400).json({ message: "Invalid channel ID format" });
    }

    // Verify the channel exists
    const channel = await Channel.findById(channelId);
    if (!channel) {
      return res.status(404).json({ message: "Channel not found" });
    }

    // Verify user is a member of the channel if membership is required
    const currentUserId = req.user.id;
    const isMember = channel.members.includes(currentUserId);
    if (channel.private && !isMember) {
      return res.status(403).json({ message: "You must join this channel to view messages" });
    }

    // Fetch messages with proper error handling
    const messages = await Message.find({ channel: channelId })
      .populate("sender", "name email")
      .sort({ createdAt: -1 });

    // Return the messages
    res.status(200).json(messages);
  } catch (error) {
    // Log the full error for debugging on the server side
    console.error("Error fetching channel messages:", error);

    // Send only error message to client, not full error object
    res.status(500).json({
      message: "Server Error",
      error: error.message,
    });
  }
});

// Get all messages in a channel
Router.get("/channel/:channelId/all", isLoggedIn, async (req, res) => {
  const { channelId } = req.params;

  try {
    const messages = await Message.find({ channel: channelId })
      .populate("sender", "name email")
      .sort({ createdAt: -1 });
    res.status(200).json(messages);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

// Delete a message
Router.delete("/:messageId", isLoggedIn, async (req, res) => {
  const { messageId } = req.params;

  try {
    // Add validation for MongoDB ObjectId format
    if (!mongoose.Types.ObjectId.isValid(messageId)) {
      return res.status(400).json({ message: "Invalid message ID format" });
    }

    const message = await Message.findById(messageId);
    if (!message) return res.status(404).json({ message: "Message not found" });

    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to delete this message" });
    }

    await message.deleteOne();
    res.status(200).json({ message: "Message deleted successfully" });
  } catch (error) {
    console.error("Error deleting message:", error);
    // Only send the error message, not the whole object
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Update a message
Router.put("/:messageId", isLoggedIn, async (req, res) => {
  const { messageId } = req.params;
  const { content } = req.body;

  try {
    const message = await Message.findById(messageId);
    const updatedMessage = await Message.findById(messageId, { content }, { new: true });
    if (!updatedMessage) return res.status(404).json({ message: "Message not found" });
    if (message.sender.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized to edit this message" });
    }

    message.content = content;
    await message.save();
    res.status(200).json({ message: "Message updated successfully", updatedMessage: message });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

module.exports = Router;
