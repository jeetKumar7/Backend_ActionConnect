const Message = require("./schemas/messageSchema");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const User = require("./schemas/userSchema");
dotenv.config();

module.exports = (io) => {
  // Middleware to authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) {
      return next(new Error("No token provided"));
    }

    // Using the same JWT_SECRET from auth middleware
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        return next(new Error("Invalid token"));
      }
      // Store user data in socket for later use
      socket.user = decoded;
      next();
    });
  });

  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id, "User ID:", socket.user.id);

    // Join a channel room
    socket.on("joinChannel", async (channelId) => {
      try {
        socket.join(channelId);
        console.log(`📥 User ${socket.user.id} joined channel ${channelId}`);

        // Now sending actual user ID instead of socket.id
        socket.to(channelId).emit("userJoined", socket.user.id);
      } catch (error) {
        socket.emit("error", "Failed to join channel");
      }
    });

    // Leave a channel room
    socket.on("leaveChannel", (channelId) => {
      socket.leave(channelId);
      console.log(`📤 User ${socket.user.id} left channel ${channelId}`);
    });

    // Handle incoming message with authenticated user
    socket.on("sendMessage", async (data) => {
      try {
        const { content, channelId } = data;

        // First get the complete user data
        const user = await User.findById(socket.user.id);
        if (!user) {
          throw new Error("User not found");
        }

        // Create the message
        const newMessage = new Message({
          content,
          sender: user._id,
          channel: channelId,
        });
        await newMessage.save();

        // Send message with complete user info
        io.to(channelId).emit("receiveMessage", {
          messageId: newMessage._id,
          content,
          sender: {
            _id: user._id,
            name: user.name,
            email: user.email,
          },
          channelId,
          createdAt: newMessage.createdAt,
        });
      } catch (error) {
        console.error("Send message error:", error);
        socket.emit("error", "Failed to send message");
      }
    });

    // Typing indicator with debounce
    let typingTimeout;
    socket.on("typing", (channelId) => {
      socket.to(channelId).emit("userTyping", socket.user.id);

      // Clear previous timeout
      if (typingTimeout) clearTimeout(typingTimeout);

      // Set new timeout
      typingTimeout = setTimeout(() => {
        socket.to(channelId).emit("userStoppedTyping", socket.user.id);
      }, 2000);
    });

    // Disconnect
    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
      // Clear typing timeout
      if (typingTimeout) clearTimeout(typingTimeout);
    });
  });
};
