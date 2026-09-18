import { ZodError } from 'zod';

/**
 * Centralised error handler.
 * Handles Zod validation errors, Mongoose errors, and generic errors.
 */
export default function errorHandler(err, req, res, _next) {
  // Log in development
  if (process.env.NODE_ENV !== 'production') {
    console.error('Error:', err.message);
    if (err.stack) console.error(err.stack);
  }

  // Zod validation error
  if (err instanceof ZodError) {
    return res.status(422).json({
      error: 'Validation failed',
      details: err.errors.map((e) => ({
        path: e.path.join('.'),
        message: e.message,
      })),
    });
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const details = Object.values(err.errors).map((e) => ({
      path: e.path,
      message: e.message,
    }));
    return res.status(422).json({ error: 'Validation failed', details });
  }

  // Mongoose duplicate key
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || {})[0] || 'field';
    return res.status(409).json({
      error: `Duplicate value for ${field}`,
    });
  }

  // Mongoose cast error (invalid ObjectId etc.)
  if (err.name === 'CastError') {
    return res.status(400).json({
      error: `Invalid ${err.path}: ${err.value}`,
    });
  }

  // Custom app errors with statusCode
  const statusCode = err.statusCode || 500;
  const message =
    statusCode === 500 && process.env.NODE_ENV === 'production'
      ? 'Internal server error'
      : err.message || 'Internal server error';

  res.status(statusCode).json({ error: message });
}
