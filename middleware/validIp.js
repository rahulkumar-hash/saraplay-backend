const allowOnlyServer = (req, res, next) => {
  let ip = req.headers["x-forwarded-for"] || req.socket.remoteAddress;

  if (ip && ip.includes("::ffff:")) {
    ip = ip.split("::ffff:")[1];
  }

  const API_KEY = "MY_SECRET_123";
  const key = req.headers["x-api-key"];

  if (key === API_KEY || ip === "127.0.0.1" || ip === "::1") {
    return next();
  }

  return res.status(403).json({
    status: false,
    message: "Forbidden"
  });
};

module.exports = allowOnlyServer; // ✅ MOST IMPORTANT