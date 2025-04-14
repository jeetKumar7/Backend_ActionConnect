const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const socketHandler = require("./socket.js");

const dotenv = require("dotenv");
const userRouter = require("./routes/userRoutes");
const postRouter = require("./routes/postRoutes");
const channelRouter = require("./routes/channelRoutes");
const messageRouter = require("./routes/messageRoutes");
const InitiativeRouter = require("./routes/InitiativeRoutes");
const actionHubRouter = require("./routes/actionHubRoutes");
const configurePassport = require("./passportConfig");
const passport = require("passport");
const session = require("express-session");
const { init } = require("./schemas/messageSchema.js");

const app = express();

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  },
});

dotenv.config();
const PORT = process.env.PORT || 3000;
const MONGO_URI = process.env.MONGO_URI;

// Middleware

app.use(express.json());
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    credentials: true,
  })
);
app.options("*", cors());

app.use(
  session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === "production" },
  })
);

app.use(passport.initialize());
app.use(passport.session());
configurePassport();

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("MongoDB connected successfully!");
  })
  .catch((err) => {
    console.error("MongoDB connection error:", err);
  });

// socket logic
socketHandler(io);

server.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

app.get("/health", (req, res) => {
  res.send("Welcome to the server!");
});

app.use("/api/user", userRouter);
app.use("/api/posts", postRouter);
app.use("/api/channels", channelRouter);
app.use("/api/actionhub", actionHubRouter);
app.use("/api/messages", messageRouter);
app.use("/api/initiative", InitiativeRouter);
