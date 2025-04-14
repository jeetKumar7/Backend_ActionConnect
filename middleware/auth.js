const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");

dotenv.config();

const isLoggedIn = (req, res, next) => {
  const token = req.headers.authorization;
  if (token) {
    jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
      if (err) {
        res.status(401).json({ message: "Invalid Token" });
        console.log("Invalid Token", err);
      } else {
        console.log("Decoded JWT:", decoded);
        req.user = decoded;
        next();
      }
    });
  } else {
    res.status(401).json({ message: "No token Provided" });
  }
};

module.exports = { isLoggedIn };
