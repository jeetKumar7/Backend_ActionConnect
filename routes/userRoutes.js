const User = require("../schemas/userSchema.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Router = require("express").Router();
const dotenv = require("dotenv");
const { isLoggedIn } = require("../middleware/auth.js");

dotenv.config();

const passport = require("passport");

// Google auth routes - add these before the module.exports
Router.get("/auth/google", passport.authenticate("google", { scope: ["profile", "email"] }));

Router.get("/auth/google/callback", passport.authenticate("google", { failureRedirect: "/login" }), (req, res) => {
  // Generate the same JWT token as regular login
  const token = jwt.sign({ id: req.user._id }, process.env.JWT_SECRET);

  // Return the same response format as the regular login endpoint
  // This is crucial for frontend compatibility
  res.redirect(`${process.env.FRONTEND_URL}/auth-success?token=${token}&id=${req.user._id}`);
});

// API endpoint that frontend can use after Google redirect
Router.get("/auth/success", async (req, res) => {
  const { token, id } = req.query;

  if (!token || !id) {
    return res.status(400).json({ message: "Missing authentication data" });
  }

  try {
    // Verify the token
    jwt.verify(token, process.env.JWT_SECRET);

    // Get user info
    const user = await User.findById(id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Return the same response format as regular login
    res.status(200).json({ message: "Signin Succesfull", token, id: user._id });
  } catch (error) {
    res.status(401).json({ message: "Invalid authentication" });
  }
});

Router.post("/signup", async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (user) {
      console.log("User Already Exist");
      return res.status(400).json({ message: "User Already Exist" });
    } else {
      const hashedPassword = await bcrypt.hash(password, 10);
      const newUser = new User({ email, password: hashedPassword, name });
      await newUser.save();
      const token = jwt.sign({ id: newUser._id }, process.env.JWT_SECRET);
      res.status(200).json({ message: "User Created SUccesfully!", token, id: newUser._id });
      console.log("User Created SUccesfully!");
    }
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
    console.log("Error", error);
  }
});

Router.post("/signin", async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user) {
      res.status(400).json({ message: "User not found" });
      console.log("User not found");
      return;
    }
    const isPasswordCorrect = await bcrypt.compare(password, user.password);
    if (!isPasswordCorrect) {
      res.status(400).json({ message: "Invalid Credentials" });
      console.log("Invalid Credentials");
      return;
    }
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET);
    res.status(200).json({ message: "Signin Succesfull", token, id: user._id });
  } catch (error) {
    console.log(error);
    res.status(500).json({ message: "Server Error" });
  }
});

// Change password route
Router.put("/change-password", isLoggedIn, async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user.id;

    // Validate input
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ message: "Current password and new password are required" });
    }

    // Get user with password
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if current password is correct
    const isPasswordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordCorrect) {
      return res.status(400).json({ message: "Current password is incorrect" });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    await user.save();

    res.status(200).json({ message: "Password updated successfully" });
  } catch (error) {
    console.error("Password change error:", error);
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

Router.put("/edit", isLoggedIn, async (req, res) => {
  const { name, email, location } = req.body;
  const userId = req.user.id;
  console.log(userId);
  try {
    const updatedUser = await User.findByIdAndUpdate(userId, { name, email, location }, { new: true });
    res.status(200).json(updatedUser);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

Router.delete("/delete", isLoggedIn, async (req, res) => {
  const userId = req.user.id;
  console.log(userId);
  try {
    await User.findByIdAndDelete(userId);
    await User.deleteMany({ user: userId });
    res.status(200).json({ message: "Account deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

Router.get("/getuser", isLoggedIn, async (req, res) => {
  const userId = req.user.id;
  try {
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

// Get user's supported causes
Router.get("/causes", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.id;
    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ supportedCauses: user.supportedCauses });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Add a supported cause
Router.post("/causes", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cause } = req.body;

    if (!cause) {
      return res.status(400).json({ message: "Cause is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Only add the cause if it's not already in the array
    if (!user.supportedCauses.includes(cause)) {
      user.supportedCauses.push(cause);
      await user.save();
    }

    res.status(200).json({
      message: "Cause added successfully",
      supportedCauses: user.supportedCauses,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Remove a supported cause
Router.delete("/causes/:cause", isLoggedIn, async (req, res) => {
  try {
    const userId = req.user.id;
    const { cause } = req.params;

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    user.supportedCauses = user.supportedCauses.filter((supportedCause) => supportedCause !== cause);

    await user.save();

    res.status(200).json({
      message: "Cause removed successfully",
      supportedCauses: user.supportedCauses,
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Find users by supported cause
Router.get("/by-cause/:cause", async (req, res) => {
  try {
    const { cause } = req.params;

    const users = await User.find({
      supportedCauses: cause,
    }).select("-password");

    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = Router;
