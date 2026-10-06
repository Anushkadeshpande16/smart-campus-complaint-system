const notFound = (req, res) => res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (!err.status) console.error(err);
  const status = err.status || 500;
  res.status(status).json({ message: status === 500 ? 'Something went wrong on the server' : err.message });
};

module.exports = { notFound, errorHandler };
