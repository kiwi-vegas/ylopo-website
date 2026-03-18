// Netlify Scheduled Function: weekly-report.js
// Fires every Friday at 5am PST (13:00 UTC).
// Reads plan state from Netlify Blobs, calculates phase progress, sends report to Kiwi + Jojo.

const { getStore } = require('@netlify/blobs');

// Sprint start date — adjust if the 90-day clock starts on a different day
const SPRINT_START = new Date('2026-03-17T00:00:00-08:00');

// Phase task counts
const PHASES = [
  { label: 'Phase 1 — Days 1–30',  prefix: '1', total: 12, color: '#7BC109' },
  { label: 'Phase 2 — Days 31–60', prefix: '2', total: 10, color: '#1a6da8' },
  { label: 'Phase 3 — Days 61–90', prefix: '3', total: 8,  color: '#172F44' },
];

// Jojo (jerasquin@ylopo.com) can be added once ylopo.com is verified in Resend
const RECIPIENTS = ['kiwi@ylopo.com'];

// Run every Friday at 13:00 UTC (5am PST / 6am PDT)
exports.config = { schedule: '0 13 * * 5' };

exports.handler = async () => {
  // ── Read state from Blobs ──────────────────────────────────────────────────
  let state = {};
  try {
    const store = getStore('plan-state');
    const raw = await store.get('current');
    if (raw) state = JSON.parse(raw);
  } catch (err) {
    console.error('Blob read error:', err);
  }

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
    <div style="background:#e5e7eb;border-radius:6px;height:14px;overflow:hidden;margin:6px 0 12px;">
      <div style="background:${color};height:100%;width:${pct}%;border-radius:6px;transition:width 0.3s;"></div>
    </div>`;

  const phaseRows = phaseStats.map((p, i) => {
    const isActive = i === currentPhaseIdx;
    return `
      <tr>
        <td style="padding:10px 0;border-bottom:1px solid #f3f4f6;">
          <div style="font-size:13px;font-weight:${isActive ? '700' : '500'};color:${isActive ? '#172F44' : '#6b7280'};">
            ${isActive ? '▶ ' : ''}${p.label}
          </div>
          ${progressBar(p.pct, p.color)}
          <div style="font-size:12px;color:#6b7280;">${p.done} of ${p.total} tasks complete &nbsp;·&nbsp; ${p.pct}%</div>
        </td>
      </tr>`;
  }).join('');

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
      <div style="background:#172F44;padding:20px 24px;border-radius:8px 8px 0 0;">
        <img src="https://ylopo-website.netlify.app/ylopo-logo-2021.png" alt="Ylopo" style="height:30px;">
      </div>
      <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;">

        <p style="margin:0 0 4px;font-size:13px;color:#9ca3af;">Weekly Progress Report · ${today}</p>
        <h2 style="margin:0 0 20px;font-size:20px;color:#172F44;">90-Day Sprint — Week ${weekNum} Update</h2>

        <!-- Overall -->
        <div style="background:#f9fafb;border-radius:8px;padding:16px 20px;margin-bottom:24px;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="font-size:14px;font-weight:700;color:#172F44;">Overall Progress</span>
            <span style="font-size:18px;font-weight:700;color:#7BC109;">${overallPct}%</span>
          </div>
          ${progressBar(overallPct, '#7BC109')}
          <div style="font-size:13px;color:#6b7280;">${totalDone} of ${totalTasks} total tasks complete</div>
        </div>

        <!-- Pace indicator -->
        <div style="background:#f9fafb;border-left:4px solid ${paceColor};padding:12px 16px;border-radius:4px;margin-bottom:24px;">
          <span style="font-size:14px;font-weight:700;color:${paceColor};">${paceEmoji} ${paceLabel}</span>
          <p style="margin:4px 0 0;font-size:13px;color:#374151;">
            Week ${weekInPhase} of 4 in ${currentPhase.label.split('—')[0].trim()} —
            expected ${expectedPct}% done, currently at ${currentPhase.pct}%.
            ${delta < -10 ? `Push to complete ${Math.ceil((expectedPct / 100) * currentPhase.total) - currentPhase.done} more task${Math.ceil((expectedPct / 100) * currentPhase.total) - currentPhase.done !== 1 ? 's' : ''} this week to get back on track.` : delta >= 10 ? 'Great work — you\'re ahead of pace!' : 'Keep the current pace through next week.'}
          </p>
        </div>

        <!-- Per-phase breakdown -->
        <h3 style="margin:0 0 12px;font-size:14px;color:#172F44;text-transform:uppercase;letter-spacing:0.05em;">Phase Breakdown</h3>
        <table style="width:100%;border-collapse:collapse;">
          <tbody>${phaseRows}</tbody>
        </table>

        <div style="margin-top:24px;">
          <a href="https://ylopo-website.netlify.app/pages/90-day-plan.html"
             style="display:inline-block;background:#7BC109;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:700;font-size:14px;">
            Open the 90-Day Plan →
          </a>
        </div>
      </div>
      <div style="padding:12px 24px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 8px 8px;">
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
