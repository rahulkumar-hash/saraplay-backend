module.exports = (req, res, next) => {
  if (!req.session.admin) {
    return res.redirect(
      req.originalUrl.startsWith("/admin")
        ? "/admin/login"
        : "/login"
    );
  }

  next();
};