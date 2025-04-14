const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const isLoggedIn = (req, res, next) => {
  const token = req.headers.authorization;

  if (!token) {
    console.error("❌ No token provided in headers");
    return res.status(401).json({ message: "No token Provided" });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      console.error("❌ Invalid Token");
      console.error("Token:", token);
      console.error("JWT Verification Error:", err.message);
      return res.status(401).json({ message: "Invalid Token" });
    }

    if (!decoded || !decoded.id) {
      console.error("⚠️ Token decoded but missing required fields (id, name)");
      console.error("Decoded JWT:", decoded);
      return res.status(401).json({ message: "Unauthorized: Missing user data" });
    }

    console.log("✅ Valid Token. Decoded JWT:", decoded);
    req.user = decoded;
    next();
  });
};

module.exports = { isLoggedIn };
