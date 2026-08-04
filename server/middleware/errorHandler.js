// Centralized Error Handling Middleware for Express REST API
export const errorHandler = (err, req, res, next) => {
  console.error('[API Error]:', err.stack || err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
};

export default errorHandler;
