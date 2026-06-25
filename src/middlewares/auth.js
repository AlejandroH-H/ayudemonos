// Protege las rutas de administración: exige un admin autenticado en sesión.
function requireAdmin(req, res, next) {
  if (req.session && req.session.admin) {
    return next();
  }
  return res.redirect('/admin/login');
}

module.exports = { requireAdmin };
