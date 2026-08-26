function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated()) return next();
  req.flash("error", "Please log in to continue.");
  res.redirect("/login");
}

function ensureRole(...roles) {
  return (req, res, next) => {
    if (!req.isAuthenticated || !req.isAuthenticated()) {
      req.flash("error", "Please log in to continue.");
      return res.redirect("/login");
    }
    if (!req.user.role) {
      return res.redirect("/select-role");
    }
    if (!roles.includes(req.user.role)) {
      req.flash("error", "You don't have access to that page.");
      return res.redirect("/");
    }
    next();
  };
}

// Redirects an already-authenticated, role-selected user away from
// login/role-select pages back to their dashboard.
function redirectIfLoggedIn(req, res, next) {
  if (req.isAuthenticated && req.isAuthenticated() && req.user.role) {
    return res.redirect(`/${req.user.role}`);
  }
  next();
}

module.exports = { ensureAuthenticated, ensureRole, redirectIfLoggedIn };
