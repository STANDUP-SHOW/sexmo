function errorHandler(err, req, res, next) {
  console.error(err);
  if (err.name === 'ZodError') {
    return res.status(400).json({ error: 'Données invalides', details: err.errors });
  }
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Erreur serveur' });
}

module.exports = errorHandler;
