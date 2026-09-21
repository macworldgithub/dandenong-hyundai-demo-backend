const buckets = new Map();

export function rateLimit({ windowMs, max, message }) {
  return (req, res, next) => {
    const now = Date.now();
    const key = `${req.ip}:${req.baseUrl}${req.path}`;
    const recent = (buckets.get(key) || []).filter((time) => time > now - windowMs);
    recent.push(now);
    buckets.set(key, recent);
    if (recent.length > max) {
      res.set('Retry-After', String(Math.ceil((recent[0] + windowMs - now) / 1000)));
      return res.status(429).json({ error: message || 'Too many requests. Please try again later.' });
    }
    next();
  };
}
