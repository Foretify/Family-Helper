/**
 * Lightweight CSRF protection using the synchronizer token pattern.
 *
 * How it works:
 *  - GET /api/csrf-token generates a random token, stores it in the session,
 *    and returns it in JSON. The SPA reads this on startup.
 *  - Every state-mutating request (POST/PUT/PATCH/DELETE) must include the
 *    token in the "x-csrf-token" request header.
 *  - The middleware verifies the header value matches the session-stored token.
 *
 * Because the token is tied to the session and validated server-side, a
 * cross-origin attacker cannot forge requests even if they can set cookies,
 * since they cannot read the session-bound token value.
 */

const { randomBytes } = require('node:crypto');

const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Express route handler — issues a fresh CSRF token bound to the session.
 * The SPA calls this on startup and after any 403 CSRF failure.
 */
function csrfTokenHandler(req, res) {
  const token = randomBytes(32).toString('hex');
  req.session.csrfToken = token;
  res.json({ csrfToken: token });
}

/**
 * Express middleware — validates the CSRF token on mutating requests.
 * The token must be present in both the session and the request header,
 * and the values must match exactly.
 */
function csrfProtection(req, res, next) {
  if (SAFE_METHODS.has(req.method)) return next();

  const sessionToken = req.session?.csrfToken;
  const requestToken = req.headers[CSRF_HEADER];

  if (
    typeof sessionToken !== 'string' ||
    typeof requestToken !== 'string' ||
    sessionToken.length !== 64 ||     // 32 bytes → 64 hex chars
    requestToken !== sessionToken
  ) {
    return res.status(403).json({ error: 'Invalid CSRF token' });
  }

  next();
}

module.exports = { csrfTokenHandler, csrfProtection };
