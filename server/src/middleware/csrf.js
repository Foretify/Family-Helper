/**
 * Lightweight CSRF protection using the double-submit cookie pattern.
 *
 * How it works:
 *  - GET /api/csrf-token sets a non-HttpOnly "csrf_token" cookie and returns
 *    the same value in JSON so the SPA can read it.
 *  - Every state-mutating request (POST/PUT/PATCH/DELETE) must include the
 *    token in the "x-csrf-token" request header.
 *  - The middleware verifies the header value matches the cookie value.
 *
 * This stops cross-site form submissions because an attacker page cannot read
 * the cookie value (SameSite=Strict + cross-origin restriction) and therefore
 * cannot set the matching header.
 */

const { randomBytes } = require('node:crypto');

const CSRF_COOKIE = 'csrf_token';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Express route handler — issues a fresh CSRF token.
 * The SPA calls this on startup and after any 403 CSRF failure.
 */
function csrfTokenHandler(req, res) {
  const token = randomBytes(32).toString('hex');
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false,          // readable by JS so the SPA can send it as a header
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 7 * 24 * 60 * 60 * 1000,
  });
  res.json({ csrfToken: token });
}

/**
 * Express middleware — validates the CSRF token on mutating requests.
 */
function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  // Parse the csrf_token cookie manually (express-session doesn't expose req.cookies)
  const cookieHeader = req.headers.cookie || '';
  const cookieToken = cookieHeader
    .split(';')
    .map(c => c.trim().split('='))
    .find(([k]) => k === CSRF_COOKIE)?.[1];

  const headerToken = req.headers[CSRF_HEADER];

  if (
    !cookieToken ||
    !headerToken ||
    cookieToken.length !== 64 ||   // 32 bytes = 64 hex chars
    cookieToken !== headerToken
  ) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

module.exports = { csrfTokenHandler, csrfProtection };
