const { BetaAnalyticsDataClient } = require('@google-analytics/data');

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('X-Robots-Tag', 'noindex, nofollow');

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const configuredToken = process.env.ANALYTICS_API_TOKEN;
  const suppliedToken = (req.headers.authorization || '').replace(/^Bearer\s+/i, '');

  if (!configuredToken) return res.status(503).json({ error: 'ANALYTICS_API_TOKEN is not configured in Vercel.' });
  if (!suppliedToken || suppliedToken !== configuredToken) return res.status(401).json({ error: 'Unauthorized' });

  // Google Analytics Data API uses the numeric GA4 property ID (for example 534293461),
  // not the G-XXXXXXXXXX measurement ID. Prefer Google's GA_PROPERTY_ID convention,
  // while retaining GA4_PROPERTY_ID for compatibility with the existing deployment.
  const propertyId = process.env.GA_PROPERTY_ID || process.env.GA4_PROPERTY_ID || '534293461';
  if (!/^\d+$/.test(propertyId)) {
    return res.status(503).json({ error: 'GA_PROPERTY_ID must be a numeric Google Analytics property ID.' });
  }

  const rawCredentials = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!rawCredentials) return res.status(503).json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON is not configured in Vercel.' });

  let credentials;
  try { credentials = JSON.parse(rawCredentials); }
  catch { return res.status(500).json({ error: 'GOOGLE_SERVICE_ACCOUNT_JSON is not valid JSON.' }); }

  try {
    const client = new BetaAnalyticsDataClient({ credentials });
    const dateRanges = [{ startDate: '30daysAgo', endDate: 'today' }];

    const [summaryResponse, pagesResponse, sourcesResponse, reviewerResponse] = await Promise.all([
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        metrics: [{ name: 'activeUsers' }, { name: 'newUsers' }, { name: 'screenPageViews' }, { name: 'sessions' }]
      }),
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 10
      }),
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
        metrics: [{ name: 'sessions' }],
        orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
        limit: 10
      }),
      client.runReport({
        property: `properties/${propertyId}`,
        dateRanges,
        dimensions: [{ name: 'pageTitle' }],
        metrics: [{ name: 'screenPageViews' }],
        dimensionFilter: {
          orGroup: {
            expressions: [
              { filter: { fieldName: 'pageTitle', stringFilter: { matchType: 'BEGINS_WITH', value: 'Reviewer | ' } } },
              { filter: { fieldName: 'pageTitle', stringFilter: { matchType: 'BEGINS_WITH', value: 'Evidence | ' } } }
            ]
          }
        },
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 100
      })
    ]);

    const metricValues = summaryResponse[0].rows?.[0]?.metricValues || [];
    const reviewerRows = reviewerResponse[0].rows || [];
    const reviewerOpens = [];
    const documentViews = [];

    for (const row of reviewerRows) {
      const title = row.dimensionValues?.[0]?.value || '';
      const views = Number(row.metricValues?.[0]?.value || 0);
      if (title.startsWith('Reviewer | ')) {
        reviewerOpens.push({ reviewer: title.slice('Reviewer | '.length), opens: views });
      } else if (title.startsWith('Evidence | ')) {
        const parts = title.split(' | ');
        documentViews.push({ reviewer: parts[1] || '(unknown)', document: parts.slice(2).join(' | ') || '(unknown)', views });
      }
    }

    return res.status(200).json({
      propertyId,
      period: 'last_30_days',
      summary: {
        activeUsers: Number(metricValues[0]?.value || 0),
        newUsers: Number(metricValues[1]?.value || 0),
        pageViews: Number(metricValues[2]?.value || 0),
        sessions: Number(metricValues[3]?.value || 0)
      },
      topPages: (pagesResponse[0].rows || []).map((row) => ({
        path: row.dimensionValues?.[0]?.value || '(unknown)',
        pageViews: Number(row.metricValues?.[0]?.value || 0)
      })),
      trafficSources: (sourcesResponse[0].rows || []).map((row) => ({
        source: row.dimensionValues?.[0]?.value || '(direct)',
        medium: row.dimensionValues?.[1]?.value || '(none)',
        sessions: Number(row.metricValues?.[0]?.value || 0)
      })),
      reviewerActivity: { reviewerOpens, documentViews }
    });
  } catch (error) {
    console.error('Google Analytics Data API error:', error);
    return res.status(500).json({ error: 'Unable to read Google Analytics data.', detail: error.message });
  }
};
