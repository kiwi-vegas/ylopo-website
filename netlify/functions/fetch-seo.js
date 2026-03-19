// Netlify Function: fetch-seo.js
// GET  → returns stored weekly GSC data from Netlify Blobs
// POST → fetches fresh data from Google Search Console API, stores in Blobs, returns it
// Scheduled: every Thursday at 6am UTC (before Friday 5am PT report)

const { getStore } = require('@netlify/blobs');
const crypto = require('crypto');

exports.config = { schedule: '0 6 * * 4' };

// ── JWT / Auth ──────────────────────────────────────────────────────────────

function b64url(buf) {
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000);
  const header  = b64url(Buffer.from(JSON.stringify({ alg: 'RS256', typ: 'JWT' })));
  const payload = b64url(Buffer.from(JSON.stringify({
    iss:   sa.client_email,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud:   'https://oauth2.googleapis.com/token',
    exp:   now + 3600,
    iat:   now,
  })));
  const signing = `${header}.${payload}`;
  const sign = crypto.createSign('RSA-SHA256');
  sign.update(signing);
  const sig = b64url(sign.sign(sa.private_key));
  const jwt = `${signing}.${sig}`;

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn%3Aietf%3Aparams%3Aoauth%3Agrant-type%3Ajwt-bearer&assertion=${jwt}`,
  });
  const data = await res.json();
  if (!data.access_token) throw new Error('Token error: ' + JSON.stringify(data));
  return data.access_token;
}

// ── GSC API ─────────────────────────────────────────────────────────────────

async function queryGSC(token, siteUrl, startDate, endDate) {
  const url = `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ startDate, endDate, dimensions: ['date'], rowLimit: 500 }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`GSC API ${res.status}: ${err}`);
  }
  return res.json();
}

// ── Data aggregation ─────────────────────────────────────────────────────────

function groupByWeek(rows) {
  const weeks = {};
  for (const row of rows) {
    // Parse date and find Monday of that week
    const [y, m, d] = row.keys[0].split('-').map(Number);
    const date = new Date(y, m - 1, d);
    const day  = date.getDay();
    const diff = day === 0 ? -6 : 1 - day;
    date.setDate(date.getDate() + diff);
    const key = date.toISOString().split('T')[0];

    if (!weeks[key]) weeks[key] = { clicks: 0, impressions: 0, positions: [], ctrs: [] };
    weeks[key].clicks      += row.clicks;
    weeks[key].impressions += row.impressions;
    weeks[key].positions.push(row.position);
    weeks[key].ctrs.push(row.ctr);
  }
  return Object.entries(weeks)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([week, d]) => ({
      week,
      clicks:      d.clicks,
      impressions: d.impressions,
      avgPosition: Math.round((d.positions.reduce((a, b) => a + b, 0) / d.positions.length) * 10) / 10,
      avgCtr:      Math.round((d.ctrs.reduce((a, b) => a + b, 0) / d.ctrs.length) * 1000) / 10,
    }));
}

function fmtDate(d) { return d.toISOString().split('T')[0]; }

// ── Handler ──────────────────────────────────────────────────────────────────

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  // OPTIONS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers };
  }

  // GET → return cached data
  if (event.httpMethod === 'GET') {
    try {
      const store = getStore('seo-data');
      const raw   = await store.get('weekly');
      if (!raw) return { statusCode: 200, headers, body: JSON.stringify({ weeks: [], fetchedAt: null }) };
      return { statusCode: 200, headers, body: raw };
    } catch (err) {
      console.error('Blob read error:', err);
      return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
    }
  }

  // POST or scheduled → fetch fresh data from GSC
  try {
    const saJson = process.env.GSC_SERVICE_ACCOUNT_JSON;
    if (!saJson) return { statusCode: 500, headers, body: JSON.stringify({ error: 'Missing GSC_SERVICE_ACCOUNT_JSON' }) };

    const sa      = JSON.parse(saJson);
    const siteUrl = process.env.GSC_SITE_URL || 'sc-domain:ylopo.com';

    // Last 16 weeks, excluding last 3 days (GSC data lag)
    const end   = new Date();
    end.setDate(end.getDate() - 3);
    const start = new Date(end);
    start.setDate(start.getDate() - 112);

    console.log(`Fetching GSC data for ${siteUrl} from ${fmtDate(start)} to ${fmtDate(end)}`);

    const token  = await getAccessToken(sa);
    const data   = await queryGSC(token, siteUrl, fmtDate(start), fmtDate(end));

    if (!data.rows || data.rows.length === 0) {
      console.warn('No GSC rows returned. Response:', JSON.stringify(data).slice(0, 300));
      // Store empty result so we know the fetch ran
      const empty = { weeks: [], fetchedAt: new Date().toISOString(), warning: 'no_rows', raw: data };
      const store = getStore('seo-data');
      await store.set('weekly', JSON.stringify(empty));
      return { statusCode: 200, headers, body: JSON.stringify(empty) };
    }

    const weeks  = groupByWeek(data.rows);
    const result = { weeks, fetchedAt: new Date().toISOString(), rowCount: data.rows.length };

    const store = getStore('seo-data');
    await store.set('weekly', JSON.stringify(result));

    console.log(`Stored ${weeks.length} weeks of GSC data`);
    return { statusCode: 200, headers, body: JSON.stringify(result) };

  } catch (err) {
    console.error('fetch-seo error:', err);
    return { statusCode: 500, headers, body: JSON.stringify({ error: err.message }) };
  }
};
