const crypto = require('crypto');
const { cleanReviewer } = require('./reviewer-auth');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const adminToken = process.env.ANALYTICS_API_TOKEN || '';
  const supplied = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');
  if (!adminToken || supplied !== adminToken) return res.status(401).json({ error: 'Unauthorized' });

  const inviteSecret = process.env.REVIEW_INVITE_SECRET || adminToken;
  const reviewer = cleanReviewer(req.body?.reviewer);
  const ttlHours = Math.min(Math.max(Number(req.body?.ttlHours || 168), 1), 720);
  if (!reviewer) return res.status(400).json({ error: 'A reviewer code is required.' });

  const exp = Math.floor(Date.now() / 1000) + Math.floor(ttlHours * 3600);
  const signature = crypto.createHmac('sha256', inviteSecret)
    .update(`${reviewer}.${exp}`)
    .digest('base64url');
  const token = `${exp}.${signature}`;

  const forwardedProto = String(req.headers['x-forwarded-proto'] || 'https').split(',')[0].trim();
  const forwardedHost = String(req.headers['x-forwarded-host'] || req.headers.host || '').split(',')[0].trim();
  const origin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : 'https://inthesneakers-life-revengeofsloppy-9002s-projects.vercel.app';
  const url = `${origin}/review.html?r=${encodeURIComponent(reviewer)}&t=${encodeURIComponent(token)}`;

  return res.status(200).json({ reviewer, expiresAt: new Date(exp * 1000).toISOString(), url });
};
