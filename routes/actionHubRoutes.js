const express = require("express");
const Router = express.Router();
const { isLoggedIn } = require("../middleware/auth.js");
const Organization = require("../schemas/organizationSchema.js");
const Resource = require("../schemas/resourceSchema.js");
const Opportunity = require("../schemas/oppurtunitySchema.js");

// Simple filter builder
const buildFilters = (req) => {
  const filters = {};

  // Category filter (now a single string)
  if (req.query.category && req.query.category !== "all") {
    filters.category = req.query.category;
  }

  // Search filter
  if (req.query.search) {
    filters.$text = { $search: req.query.search };
  }

  return filters;
};

// ORGANIZATION ROUTES
// Create organization
Router.post("/organizations", isLoggedIn, async (req, res) => {
  try {
    const organization = new Organization({
      ...req.body,
      createdBy: req.user.id,
    });
    await organization.save();
    res.status(201).json({ message: "Organization created", organization });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Get organizations
Router.get("/organizations", async (req, res) => {
  try {
    const filters = buildFilters(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const organizations = await Organization.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit);

    const total = await Organization.countDocuments(filters);

    res.status(200).json({
      organizations,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// RESOURCE ROUTES
// Create resource
Router.post("/resources", isLoggedIn, async (req, res) => {
  try {
    const resource = new Resource({
      ...req.body,
      createdBy: req.user.id,
    });
    await resource.save();
    res.status(201).json({ message: "Resource created", resource });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Get resources
Router.get("/resources", async (req, res) => {
  try {
    const filters = buildFilters(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const resources = await Resource.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit);

    const total = await Resource.countDocuments(filters);

    res.status(200).json({
      resources,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// OPPORTUNITY ROUTES
// Create opportunity
Router.post("/opportunities", isLoggedIn, async (req, res) => {
  try {
    const opportunity = new Opportunity({
      ...req.body,
      createdBy: req.user.id,
    });
    await opportunity.save();
    res.status(201).json({ message: "Opportunity created", opportunity });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Get opportunities
Router.get("/opportunities", async (req, res) => {
  try {
    const filters = buildFilters(req);
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const opportunities = await Opportunity.find(filters).sort({ createdAt: -1 }).skip(skip).limit(limit);

    const total = await Opportunity.countDocuments(filters);

    res.status(200).json({
      opportunities,
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        page,
        limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Get single item by ID
Router.get("/:type/:id", async (req, res) => {
  try {
    const { type, id } = req.params;
    let Model;

    switch (type) {
      case "organizations":
        Model = Organization;
        break;
      case "resources":
        Model = Resource;
        break;
      case "opportunities":
        Model = Opportunity;
        break;
      default:
        return res.status(400).json({ message: "Invalid type" });
    }

    const item = await Model.findById(id);
    if (!item) return res.status(404).json({ message: "Item not found" });
    res.status(200).json(item);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

// Delete item
Router.delete("/:type/:id", isLoggedIn, async (req, res) => {
  try {
    const { type, id } = req.params;
    let Model;

    switch (type) {
      case "organizations":
        Model = Organization;
        break;
      case "resources":
        Model = Resource;
        break;
      case "opportunities":
        Model = Opportunity;
        break;
      default:
        return res.status(400).json({ message: "Invalid type" });
    }

    const item = await Model.findById(id);
    if (!item) return res.status(404).json({ message: "Item not found" });

    if (item.createdBy.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ message: "Not authorized" });
    }

    await Model.findByIdAndDelete(id);
    res.status(200).json({ message: "Item deleted" });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error: error.message });
  }
});

module.exports = Router;
