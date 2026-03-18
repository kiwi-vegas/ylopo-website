// Netlify Function: update-state.js
// Called from the 90-day plan whenever a checkbox or assignee changes.
// Persists the full plan state to Netlify Blobs so the weekly report can read it.

const { getStore } = require('@netlify/blobs');

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type' } };
  }
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  try {
    const store = getStore('plan-state');
    await store.set('current', JSON.stringify(body.state));
    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('Blob write error:', err);
    return { statusCode: 500, body: 'State save failed: ' + err.message };
  }
};
