const { verifyInvite } = require('./reviewer-auth');

const evidence = {
  'invoice-10490': {
    id: 'invoice-10490',
    title: '$4,850 biohazard invoice',
    status: 'redacted-public-copy',
    summary: 'Reviewer-safe exhibit preserving vendor information, invoice number, dates, service descriptions, quantity, and total while withholding resident address and unit information.',
    publicPath: '/#invoice-evidence',
    originalAvailable: true
  },
  'payment-timeline': {
    id: 'payment-timeline',
    title: 'Payment and accounting timeline',
    status: 'reviewer-summary',
    summary: 'Chronology of documented payment efforts and requests for corrected accounting. This reviewer page does not expose account numbers, residential address data, or raw private attachments.',
    originalAvailable: true
  },
  'outreach-record': {
    id: 'outreach-record',
    title: 'Help and legal outreach record',
    status: 'reviewer-summary',
    summary: 'Source-backed status of organizations contacted, including declined, referral-only, pending, and active-review outcomes.',
    originalAvailable: true
  },
  'evidence-gaps': {
    id: 'evidence-gaps',
    title: 'Open evidence gaps',
    status: 'reviewer-summary',
    summary: 'Outstanding items that would materially improve verification, including the actual court filing and additional vendor/inspection support.',
    originalAvailable: false
  }
};

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });

  const auth = verifyInvite(req.query.r, req.query.t);
  if (!auth.ok) return res.status(401).json({ error: 'Unauthorized reviewer link', reason: auth.reason });

  const doc = String(req.query.doc || '');
  if (doc) {
    if (!evidence[doc]) return res.status(404).json({ error: 'Evidence item not found' });
    return res.status(200).json({ reviewer: auth.reviewer, item: evidence[doc], originalPolicy: 'Raw originals remain in the private case archive and are never exposed as public Drive-folder URLs.' });
  }

  return res.status(200).json({ reviewer: auth.reviewer, items: Object.values(evidence), originalPolicy: 'Raw originals remain in the private case archive and are never exposed as public Drive-folder URLs.' });
};
