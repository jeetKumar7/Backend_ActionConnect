const User = require("../schemas/userSchema.js");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Router = require("express").Router();
const dotenv = require("dotenv");
const { isLoggedIn } = require("../middleware/auth.js");
const Initiative = require("../schemas/InitiativeSchema.js");

dotenv.config();

// GET /api/initiatives
Router.get("/", async (req, res) => {
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

    const initiatives = await Initiative.find(filter)
      .populate("createdBy", "name profileImage")
      .sort({ createdAt: -1 });

    res.json(initiatives);
  } catch (error) {
    console.error("Error fetching initiatives:", error);
    res.status(500).json({ message: "Server error", error: error.message });
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
Router.post("/", isLoggedIn, async (req, res) => {
  try {
    const { title, category, description, location, tags, status, website } = req.body;

    // Validate required fields
    if (!title || !category || !description || !location) {
      return res.status(400).json({ message: "Please provide all required fields" });
    }

    // Geocode location to get coordinates
    let coordinates;
    try {
      // Using a geocoding service like OpenStreetMap's Nominatim
      const response = await axios.get(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
      );

      if (response.data && response.data.length > 0) {
        coordinates = {
          lat: parseFloat(response.data[0].lat),
          lng: parseFloat(response.data[0].lon),
        };
      } else {
        return res.status(400).json({ message: "Unable to geocode the provided location" });
      }
    } catch (error) {
      return res.status(400).json({ message: "Geocoding failed", error: error.message });
    }

    // Create initiative
    const initiative = new Initiative({
      title,
      category,
      description,
      location,
      coordinates,
      organizer: req.user.name, // From auth middleware
      tags,
      status: status || "Upcoming",
      website: website || "",
      createdBy: req.user.id,
    });

    // Save initiative
    await initiative.save();

    // Optionally create a channel for this initiative
    // This would depend on your Channel model implementation

    res.status(201).json(initiative);
  } catch (error) {
    console.error("Error creating initiative:", error);
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

    const { title, category, description, location, tags, status, website } = req.body;

    // Check if location changed, if so, geocode again
    if (location && location !== initiative.location) {
      try {
        const response = await axios.get(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`
        );

        if (response.data && response.data.length > 0) {
          initiative.coordinates = {
            lat: parseFloat(response.data[0].lat),
            lng: parseFloat(response.data[0].lon),
          };
        } else {
          return res.status(400).json({ message: "Unable to geocode the provided location" });
        }
      } catch (error) {
        return res.status(400).json({ message: "Geocoding failed", error: error.message });
      }
    }

    // Update fields
    if (title) initiative.title = title;
    if (category) initiative.category = category;
    if (description) initiative.description = description;
    if (location) initiative.location = location;
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
