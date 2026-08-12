const crypto = require('crypto');

function cleanReviewer(value) {
  return String(value || '').toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 40);
}

function secret() {
  return process.env.REVIEW_INVITE_SECRET || process.env.ANALYTICS_API_TOKEN || '';
}

function safeEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

function verifyInvite(reviewer, token) {
  reviewer = cleanReviewer(reviewer);
  const configuredSecret = secret();
  if (!configuredSecret || !reviewer || !token) return { ok: false, reason: 'missing' };

  const [expRaw, signature] = String(token).split('.');
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || !signature) return { ok: false, reason: 'malformed' };
  if (Date.now() > exp * 1000) return { ok: false, reason: 'expired' };

  const expected = crypto.createHmac('sha256', configuredSecret)
    .update(`${reviewer}.${exp}`)
    .digest('base64url');

  if (!safeEqual(signature, expected)) return { ok: false, reason: 'invalid' };
  return { ok: true, reviewer, exp };
}

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  if (!secret()) return res.status(503).json({ error: 'Reviewer invite signing is not configured.' });

  const result = verifyInvite(req.query.r, req.query.t);
  if (!result.ok) return res.status(401).json({ authorized: false, reason: result.reason });

  return res.status(200).json({ authorized: true, reviewer: result.reviewer, expiresAt: new Date(result.exp * 1000).toISOString() });
};

module.exports.verifyInvite = verifyInvite;
module.exports.cleanReviewer = cleanReviewer;
