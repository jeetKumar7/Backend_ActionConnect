const Router = require("express").Router();
const dotenv = require("dotenv");
const { isLoggedIn } = require("../middleware/auth.js");
const Initiative = require("../schemas/InitiativeSchema.js");

dotenv.config();

// GET /api/initiatives
Router.get("/", async (req, res) => {
  const requestId = Date.now().toString(36) + Math.random().toString(36).substr(2);
  console.log(`[${requestId}] Initiatives GET request received with query:`, req.query);

  try {
    // Add query parameters for filtering
    const { category, status, search, tags } = req.query;

    // Build filter object
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    if (search) {
      filter.$or = [{ title: { $regex: search, $options: "i" } }, { description: { $regex: search, $options: "i" } }];
    }
    if (tags) {
      const tagArray = tags.split(",");
      filter.tags = { $in: tagArray };
    }

    console.log(`[${requestId}] Executing Initiative.find with filters:`, JSON.stringify(filter));

    const initiatives = await Initiative.find(filter)
      .populate("createdBy", "name profileImage")
      .sort({ createdAt: -1 });

    console.log(`[${requestId}] Successfully retrieved ${initiatives.length} initiatives`);
    res.json(initiatives);
  } catch (error) {
    const timestamp = new Date().toISOString();

    // Detailed error logging
    console.error(`[${timestamp}] [${requestId}] Error fetching initiatives:`, {
      errorMessage: error.message,
      errorStack: error.stack,
      errorCode: error.code,
      errorName: error.name,
      query: req.query,
    });

    // Specific error handling
    if (error.name === "CastError") {
      return res.status(400).json({
        message: "Invalid query parameter format",
        requestId,
        details: error.message,
      });
    }

    if (error.name === "ValidationError") {
      return res.status(400).json({
        message: "Validation error in request",
        requestId,
        details: error.message,
      });
    }

    // Generic server error
    res.status(500).json({
      message: "Server error while fetching initiatives",
      requestId,
      error: error.message,
      timestamp,
    });
  }
});

// GET /api/initiatives/:id
Router.get("/:id", async (req, res) => {
  try {
    const initiative = await Initiative.findById(req.params.id)
      .populate("createdBy", "name email profileImage")
      .populate("joinedUsers", "name profileImage");

    if (!initiative) {
      return res.status(404).json({ message: "Initiative not found" });
    }

    res.json(initiative);
  } catch (error) {
    console.error("Error fetching initiative:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/initiatives
Router.post("/", async (req, res) => {
  console.log("🚀 Initiative POST route hit");

  try {
    const { title, category, description, location, coordinates, tagsInput, status, website } = req.body;

    const tags = tagsInput ? tagsInput.split(",").map((tag) => tag.trim()) : [];
    // Validate required fields
    if (!title || !category || !description || !location) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Create initiative
    const initiative = new Initiative({
      title,
      category,
      description,
      location,
      coordinates, // Directly use coordinates from frontend
      organizer: req.user.name, // From auth middleware
      tags,
      status: status || "Upcoming",
      website: website || "",
      createdBy: req.user.id,
    });

    // Save initiative
    await initiative.save();

    res.status(201).json(initiative);
  } catch (error) {
    console.error("Error creating initiative:", {
      message: error.message,
      stack: error.stack,
      requestBody: req.body,
      user: req.user ? { id: req.user.id, name: req.user.name } : "Not authenticated",
    });
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// PUT /api/initiatives/:id
Router.put("/:id", isLoggedIn, async (req, res) => {
  try {
    const initiative = await Initiative.findById(req.params.id);

    if (!initiative) {
      return res.status(404).json({ message: "Initiative not found" });
    }

    // Check if user is the creator
    if (initiative.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to update this initiative" });
    }

    const { title, category, description, location, coordinates, tags, status, website } = req.body;

    // Update fields
    if (title) initiative.title = title;
    if (category) initiative.category = category;
    if (description) initiative.description = description;
    if (location) initiative.location = location;
    if (coordinates) initiative.coordinates = coordinates;
    if (tags) initiative.tags = tags;
    if (status) initiative.status = status;
    if (website !== undefined) initiative.website = website;

    initiative.updatedAt = Date.now();

    await initiative.save();

    res.json(initiative);
  } catch (error) {
    console.error("Error updating initiative:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// DELETE /api/initiatives/:id
Router.delete("/:id", isLoggedIn, async (req, res) => {
  try {
    const initiative = await Initiative.findById(req.params.id);

    if (!initiative) {
      return res.status(404).json({ message: "Initiative not found" });
    }

    // Check if user is the creator
    if (initiative.createdBy.toString() !== req.user.id) {
      return res.status(401).json({ message: "Not authorized to delete this initiative" });
    }

    // Delete the initiative
    await Initiative.findByIdAndDelete(req.params.id);

    // Optionally delete related channel
    if (initiative.channelId) {
      await Channel.findByIdAndDelete(initiative.channelId);
    }

    res.json({ message: "Initiative deleted successfully" });
  } catch (error) {
    console.error("Error deleting initiative:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

// POST /api/initiatives/:id/join
Router.post("/:id/join", isLoggedIn, async (req, res) => {
  try {
    const initiative = await Initiative.findById(req.params.id);

    if (!initiative) {
      return res.status(404).json({ message: "Initiative not found" });
    }

    // Check if user already joined
    if (initiative.joinedUsers.includes(req.user.id)) {
      return res.status(400).json({
        message: "Already joined this initiative",
        redirectUrl: initiative.website || null,
      });
    }

    // Add user to joinedUsers
    initiative.joinedUsers.push(req.user.id);
    await initiative.save();

    // Return success with website URL for redirection
    res.json({
      message: "Successfully joined initiative",
      redirectUrl: initiative.website || null,
    });
  } catch (error) {
    console.error("Error joining initiative:", error);
    res.status(500).json({ message: "Server error", error: error.message });
  }
});

module.exports = Router;
