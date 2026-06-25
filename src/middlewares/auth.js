// Protege las rutas del panel: exige una autoridad autenticada en sesión.
function requireAuthority(req, res, next) {
  if (req.session && req.session.autoridad) {
    return next();
  }
  return res.redirect('/panel/login');
}

module.exports = { requireAuthority };
