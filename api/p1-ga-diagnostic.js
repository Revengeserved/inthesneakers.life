const { BetaAnalyticsDataClient } = require('@google-analytics/data');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (process.env.VERCEL_ENV !== 'preview') {
    return res.status(404).json({ error: 'Not found' });
  }

  const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) {
    return res.status(503).json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON is not configured for preview.' });
  }

  let credentials;
  try {
    credentials = JSON.parse(rawCredentials);
  } catch {
    return res.status(500).json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON is invalid JSON.' });
  }

  const client = new BetaAnalyticsDataClient({ credentials });
  const candidates = ['392399720', '534293461'];
  const results = [];

  for (const propertyId of candidates) {
    try {
      await client.runReport({
        property: `properties/${propertyId}`,
        dateRanges: [{ startDate: 'yesterday', endDate: 'yesterday' }],
        metrics: [{ name: 'activeUsers' }],
        limit: 1
      });
      results.push({ propertyId, queryOk: true });
    } catch (error) {
      results.push({ propertyId, queryOk: false, code: error.code || null, message: error.message || 'Unknown error' });
    }
  }

  return res.status(200).json({ results });
};
