/**
 * requireAuth middleware — rejects unauthenticated requests with 401.
 */
function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ error: 'Authentication required' });
  }
  next();
}

/**
 * requireAdmin middleware — rejects non-admin users with 403.
 * Must be used after requireAuth.
 */
function requireAdmin(req, res, next) {
  if (!req.session || req.session.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }
  next();
}

/**
 * requireSameHousehold middleware — ensures the acting user belongs to the
 * same household as the requested resource.
 * Expects req.resourceHouseholdId to be set by the route handler before calling next.
 */
function requireSameHousehold(req, res, next) {
  if (!req.session || req.session.householdId !== req.resourceHouseholdId) {
    return res.status(403).json({ error: 'Access denied' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin, requireSameHousehold };
