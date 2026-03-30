// Netlify Scheduled Function: weekly-report.js
// Fires every Friday at 5am PST (13:00 UTC).
// Reads plan state from Netlify Blobs, calculates phase progress, sends report to Kiwi + Jojo.

const { getStore } = require('@netlify/blobs');

const SITE_ID = 'f78ce215-68a7-4e22-9158-4fed39da0d03';
function blobStore(name) {
  return getStore({ name, siteID: SITE_ID, token: process.env.NETLIFY_TOKEN });
}

// Sprint start date — real work begins March 23, 2026
const SPRINT_START = new Date('2026-03-23T00:00:00-08:00');

// Phase task counts
const PHASES = [
  { label: 'Phase 1 — Days 1–30',  prefix: '1', total: 26, color: '#7BC109' },
  { label: 'Phase 2 — Days 31–60', prefix: '2', total: 17, color: '#1a6da8' },
  { label: 'Phase 3 — Days 61–90', prefix: '3', total: 16, color: '#172F44' },
];

// Jojo (jerasquin@ylopo.com) can be added once ylopo.com is verified in Resend
const RECIPIENTS = ['kiwi@ylopo.com'];

// ── SEO data helper ────────────────────────────────────────────────────────
async function getSEOData() {
  try {
    const store = blobStore('seo-data');
    const raw   = await store.get('weekly');
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data.weeks && data.weeks.length > 0 ? data : null;
  } catch { return null; }
}

function seoArrow(curr, prev, lowerBetter) {
  if (!prev || prev === 0) return '—';
  const pct = Math.round(((curr - prev) / prev) * 100);
  if (pct === 0) return '→ no change';
  const better = lowerBetter ? pct < 0 : pct > 0;
  const arrow  = pct > 0 ? '▲' : '▼';
  const color  = better ? '#7BC109' : '#e53e3e';
  return `<span style="color:${color};font-weight:700;">${arrow} ${Math.abs(pct)}%</span>`;
}

// Run every Friday at 13:00 UTC (5am PST / 6am PDT)
exports.config = { schedule: '0 13 * * 5' };

exports.handler = async () => {
  // ── Read state from Blobs ──────────────────────────────────────────────────
  let state = {};
  try {
    const store = blobStore('plan-state');
    const raw = await store.get('current');
    if (raw) state = JSON.parse(raw);
  } catch (err) {
    console.error('Blob read error:', err);
  }

  // ── Fetch SEO data in parallel ─────────────────────────────────────────────
  const [, seoData] = await Promise.all([Promise.resolve(), getSEOData()]);

  // ── Calculate progress ─────────────────────────────────────────────────────
  const phaseStats = PHASES.map(p => {
    let done = 0;
    for (let i = 1; i <= p.total; i++) {
      if (state[`cb-${p.prefix}-${i}`]) done++;
    }
    const pct = Math.round((done / p.total) * 100);
    return { ...p, done, pct };
  });

  const totalDone = phaseStats.reduce((s, p) => s + p.done, 0);
  const totalTasks = phaseStats.reduce((s, p) => s + p.total, 0);
  const overallPct = Math.round((totalDone / totalTasks) * 100);

  // ── Determine current week in sprint ──────────────────────────────────────
  const now = new Date();
  const daysSinceStart = Math.floor((now - SPRINT_START) / (1000 * 60 * 60 * 24));
  const weekNum = Math.max(1, Math.min(13, Math.floor(daysSinceStart / 7) + 1));

  // Which phase are we in?
  let currentPhaseIdx = 0;
  if (daysSinceStart >= 60) currentPhaseIdx = 2;
  else if (daysSinceStart >= 30) currentPhaseIdx = 1;
  const weekInPhase = Math.max(1, Math.min(4, Math.floor((daysSinceStart % 30) / 7) + 1));

  // Expected completion % for current phase at this week
  const expectedPct = Math.round((weekInPhase / 4) * 100);
  const currentPhase = phaseStats[currentPhaseIdx];
  const delta = currentPhase.pct - expectedPct;
  let paceLabel, paceColor, paceEmoji;
  if (delta >= 10) { paceLabel = 'Ahead of schedule'; paceColor = '#7BC109'; paceEmoji = '🟢'; }
  else if (delta >= -10) { paceLabel = 'On track'; paceColor = '#1a6da8'; paceEmoji = '🔵'; }
  else { paceLabel = 'Behind schedule'; paceColor = '#e53e3e'; paceEmoji = '🔴'; }

  // ── Build email ────────────────────────────────────────────────────────────
  const today = now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric', timeZone: 'America/Los_Angeles' });

  const progressBar = (pct, color) => `
    <div style="background:#e5e7eb;border-radius:6px;height:12px;overflow:hidden;margin:6px 0 8px;">
      <div style="background:${color};height:100%;width:${pct}%;border-radius:6px;"></div>
    </div>`;

  const phaseRows = phaseStats.map((p, i) => {
    const isActive = i === currentPhaseIdx;
    return `
      <tr>
        <td style="padding:12px 0;border-bottom:1px solid #f3f4f6;">
          <div style="font-size:13px;font-weight:${isActive ? '700' : '500'};color:${isActive ? '#172F44' : '#9ca3af'};">
            ${isActive ? '▶ ' : ''}${p.label}${isActive ? ' <span style="font-weight:400;color:#9ca3af;">(current)</span>' : ''}
          </div>
          ${progressBar(p.pct, isActive ? paceColor : p.color)}
          <div style="font-size:12px;color:#9ca3af;">${p.done} of ${p.total} tasks · ${p.pct}%</div>
        </td>
      </tr>`;
  }).join('');

  const catchupTasks = delta < -10 ? Math.ceil((expectedPct / 100) * currentPhase.total) - currentPhase.done : 0;
  const actionLine = delta < -10
    ? `You need <strong>${catchupTasks} more task${catchupTasks !== 1 ? 's' : ''}</strong> this week to get back on track.`
    : delta >= 10
    ? `You're <strong>${delta}% ahead</strong> — great work, keep the pace.`
    : `You're right on pace. Keep going and you'll hit the phase target on time.`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;border-radius:10px;overflow:hidden;box-shadow:0 2px 16px rgba(0,0,0,0.10);">

      <!-- STATUS BANNER — the entire top block is the pace color -->
      <div style="background:${paceColor};padding:28px 28px 24px;">
        <div style="font-size:13px;font-weight:700;color:rgba(255,255,255,0.75);text-transform:uppercase;letter-spacing:0.1em;margin-bottom:6px;">
          Week ${weekNum} · ${today}
        </div>
        <div style="font-size:36px;font-weight:900;color:#fff;line-height:1;margin-bottom:8px;">
          ${paceEmoji} ${paceLabel}
        </div>
        <div style="font-size:15px;color:rgba(255,255,255,0.90);">
          Week ${weekInPhase} of 4 in ${currentPhase.label.split('—')[0].trim()} · Expected ${expectedPct}%, actual ${currentPhase.pct}%
        </div>
      </div>

      <!-- WHAT TO DO THIS WEEK -->
      <div style="background:${paceColor}18;border-bottom:1px solid ${paceColor}33;padding:16px 28px;">
        <p style="margin:0;font-size:14px;color:#172F44;">${actionLine}</p>
      </div>

      <!-- OVERALL PROGRESS -->
      <div style="background:#fff;padding:24px 28px;">
        <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:4px;">
          <span style="font-size:13px;font-weight:700;color:#172F44;text-transform:uppercase;letter-spacing:0.08em;">Overall Sprint Progress</span>
          <span style="font-size:24px;font-weight:900;color:#172F44;">${overallPct}%</span>
        </div>
        ${progressBar(overallPct, paceColor)}
        <div style="font-size:12px;color:#9ca3af;">${totalDone} of ${totalTasks} total tasks complete</div>

        <!-- Phase breakdown -->
        <div style="margin-top:20px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:4px;">Phase Breakdown</div>
          <table style="width:100%;border-collapse:collapse;">
            <tbody>${phaseRows}</tbody>
          </table>
        </div>

        <!-- SEO METRICS -->
        ${seoData ? (() => {
          const weeks = seoData.weeks;
          const last  = weeks[weeks.length - 1];
          const prev  = weeks.length > 1 ? weeks[weeks.length - 2] : null;
          const rows  = [
            ['Organic Clicks',  last.clicks.toLocaleString(),      prev ? seoArrow(last.clicks, prev.clicks, false) : '—'],
            ['Impressions',     last.impressions.toLocaleString(),  prev ? seoArrow(last.impressions, prev.impressions, false) : '—'],
            ['Avg Position',    last.avgPosition,                   prev ? seoArrow(last.avgPosition, prev.avgPosition, true) : '—'],
            ['CTR',             last.avgCtr + '%',                  prev ? seoArrow(last.avgCtr, prev.avgCtr, false) : '—'],
          ];
          return `
          <div style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:20px;">
            <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#9ca3af;margin-bottom:12px;">
              📈 Organic Search — ylopo.com (last week)
            </div>
            <table style="width:100%;border-collapse:collapse;">
              <tbody>
                ${rows.map(([lbl, val, delta]) => `
                <tr>
                  <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#6b7280;width:45%;">${lbl}</td>
                  <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;font-size:15px;font-weight:700;color:#172F44;width:25%;">${val}</td>
                  <td style="padding:7px 0;border-bottom:1px solid #f3f4f6;font-size:12px;color:#9ca3af;">${delta}</td>
                </tr>`).join('')}
              </tbody>
            </table>
          </div>`;
        })() : `
          <div style="margin-top:24px;border-top:1px solid #e5e7eb;padding-top:16px;">
            <div style="font-size:12px;color:#9ca3af;">📈 SEO data not yet available — will appear after first Thursday fetch.</div>
          </div>`}

        <div style="margin-top:24px;">
          <a href="https://ylopo-website.netlify.app/pages/90-day-plan.html"
             style="display:inline-block;background:${paceColor};color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">
            Open the 90-Day Plan →
          </a>
        </div>
      </div>

      <div style="padding:12px 28px;background:#f9fafb;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:12px;color:#9ca3af;">Sent every Friday at 5am PT · Ylopo Marketing Team</p>
      </div>
    </div>`;

  // ── Send via Resend ────────────────────────────────────────────────────────
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY || process.env.RESEND}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ylopo 90-Day Plan <onboarding@resend.dev>',
        to: RECIPIENTS,
        subject: `📊 Week ${weekNum} Progress: ${overallPct}% complete — ${paceLabel}`,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return { statusCode: 500, body: 'Email send failed: ' + err };
    }

    console.log(`Weekly report sent — Week ${weekNum}, ${overallPct}% overall`);
    return { statusCode: 200, body: JSON.stringify({ ok: true, week: weekNum, pct: overallPct }) };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: 'Internal error: ' + err.message };
  }
};
