module.exports = (err, req, res, next) => {
  if (err.code === "EBADCSRFTOKEN") {
    return res.status(403).json({
      status: false,
      message: "Session expired. Please refresh and try again."
    });
  }

  console.error(err);
  res.status(500).json({
    status: false,
    message: "Something went wrong"
  });
};
