function errorHandler(err, _req, res, _next) {
  console.error(`[${new Date().toISOString()}] ${err.code ?? 'ERROR'}:`, err.message);

  const status = err.status ?? 500;
  const code   = err.code   ?? 'INTERNAL_ERROR';

  res.status(status).json({
    error: {
      code,
      message: err.message ?? 'An unexpected error occurred',
      docs:    'https://api.staark-app.cloud/errors',
    }
  });
}

export { errorHandler };