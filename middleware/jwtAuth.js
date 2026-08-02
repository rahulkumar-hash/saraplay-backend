const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).json({
      status: false,
      message: "Access Denied. No Token Provided"
    });
  }

  const token = authHeader.split(" ")[1]; // Bearer TOKEN

  try {
    const verified = jwt.verify(token, process.env.JWT_SECRET);

    req.user = verified;   // ⚠️ req.admin nahi
    next();

  } catch (err) {
    return res.status(401).json({
      status: false,
      message: "Invalid Token"
    });
  }
};