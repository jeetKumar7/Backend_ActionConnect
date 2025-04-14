const { isLoggedIn } = require("../middleware/auth.js");
const dotenv = require("dotenv");
const Router = require("express").Router();
const Posts = require("../schemas/postsSchema.js");

dotenv.config();

Router.post("/create", isLoggedIn, async (req, res) => {
  const { content, imageUrl } = req.body;
  const userId = req.user.id;
  try {
    const newPost = new Posts({ content, imageUrl, author: userId });
    await newPost.save();
    res.status(200).json({ message: "Post created successfully", post: newPost });
    console.log("Post created successfully");
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
    console.log("Error", error);
  }
});

// Like/Unlike a post
Router.post("/:postId/like", isLoggedIn, async (req, res) => {
  const { postId } = req.params;
  const userId = req.user.id;

  try {
    const post = await Posts.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    const likeIndex = post.likes.indexOf(userId);
    if (likeIndex > -1) {
      // Unlike
      post.likes.splice(likeIndex, 1);
    } else {
      // Like
      post.likes.push(userId);
    }

    await post.save();
    res.status(200).json({ message: "Post updated successfully", post });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

// Add a comment
Router.post("/:postId/comment", isLoggedIn, async (req, res) => {
  const { postId } = req.params;
  const { content } = req.body;
  const userId = req.user.id;

  try {
    const post = await Posts.findById(postId);
    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    post.comments.push({
      user: userId,
      content,
    });

    await post.save();
    res.status(200).json({ message: "Comment added successfully", post });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

// Get post by shareId
Router.get("/share/:shareId", async (req, res) => {
  const { shareId } = req.params;

  try {
    const post = await Posts.findOne({ shareId })
      .populate("author", "name")
      .populate("comments.user", "name")
      .populate("likes", "name");

    if (!post) {
      return res.status(404).json({ message: "Post not found" });
    }

    res.status(200).json(post);
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

Router.get("/", async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const posts = await Posts.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate("author", "name")
      .populate("comments.user", "name")
      .populate("likes", "name");

    const total = await Posts.countDocuments();

    res.status(200).json({
      posts,
      pagination: {
        totalPosts: total,
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        postsPerPage: limit,
      },
    });
  } catch (error) {
    res.status(500).json({ message: "Server Error", error });
  }
});

module.exports = Router;
