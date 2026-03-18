// Netlify Function: notify.js
// Sends email notifications via Resend when tasks are assigned or completed.
// POST body: { type: 'assigned'|'completed', taskId, taskText, assignee, completedBy? }

const EMAIL_MAP = {
  kiwi:  'kiwi@ylopo.com',
  jojo:  'jerasquin@ylopo.com',
  jom:   'jom@ylopo.com',
  lanie: 'lbondoc@ylopo.com',
  paul:  'pgonzaga@ylopo.com',
  mike:  'mpirote@ylopo.com',
};

const NAME_MAP = {
  kiwi:  'Kiwi',
  jojo:  'Jojo',
  jom:   'Jom',
  lanie: 'Lanie',
  paul:  'Paul',
  mike:  'Mike',
};

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let body;
  try {
    body = JSON.parse(event.body);
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const { type, taskId, taskText, assignee, completedBy } = body;

  if (!type || !taskId || !taskText || !assignee) {
    return { statusCode: 400, body: 'Missing required fields' };
  }

  const assigneeEmail = EMAIL_MAP[assignee];
  if (!assigneeEmail) {
    return { statusCode: 400, body: 'Unknown assignee' };
  }

  const assigneeName = NAME_MAP[assignee] || assignee;
  const completedByName = NAME_MAP[completedBy] || completedBy || 'Someone';

  let subject, html;

  if (type === 'assigned') {
    subject = `[Ylopo 90-Day Plan] Task assigned to you: ${taskText.substring(0, 60)}`;
    html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#172F44;padding:20px 24px;">
          <img src="https://ylopo-website.netlify.app/ylopo-logo-2021.png" alt="Ylopo" style="height:32px;">
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;">
          <p style="font-size:16px;color:#172F44;">Hi ${assigneeName},</p>
          <p style="font-size:15px;color:#374151;">A task has been assigned to you on the <strong>Ylopo 90-Day Content Plan</strong>:</p>
          <div style="background:#f9fafb;border-left:4px solid #7BC109;padding:14px 18px;margin:20px 0;border-radius:4px;">
            <p style="margin:0;font-size:15px;font-weight:600;color:#172F44;">${taskText}</p>
            <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">Task ID: ${taskId}</p>
          </div>
          <a href="https://ylopo-website.netlify.app/pages/90-day-plan.html"
             style="display:inline-block;background:#7BC109;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
            View the 90-Day Plan
          </a>
        </div>
        <div style="padding:12px 24px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Ylopo Marketing Team · 90-Day Content Sprint</p>
        </div>
      </div>
    `;
  } else if (type === 'completed') {
    subject = `[Ylopo 90-Day Plan] Task completed: ${taskText.substring(0, 60)}`;
    html = `
      <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
        <div style="background:#172F44;padding:20px 24px;">
          <img src="https://ylopo-website.netlify.app/ylopo-logo-2021.png" alt="Ylopo" style="height:32px;">
        </div>
        <div style="padding:24px;border:1px solid #e5e7eb;border-top:none;">
          <p style="font-size:16px;color:#172F44;">Hi ${assigneeName},</p>
          <p style="font-size:15px;color:#374151;">A task assigned to you has been marked <strong style="color:#7BC109;">complete</strong>:</p>
          <div style="background:#f0fdf4;border-left:4px solid #7BC109;padding:14px 18px;margin:20px 0;border-radius:4px;">
            <p style="margin:0;font-size:15px;font-weight:600;color:#172F44;">&#10003; ${taskText}</p>
            <p style="margin:6px 0 0;font-size:13px;color:#6b7280;">Completed by ${completedByName} · Task ID: ${taskId}</p>
          </div>
          <a href="https://ylopo-website.netlify.app/pages/90-day-plan.html"
             style="display:inline-block;background:#7BC109;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:600;font-size:14px;">
            View the 90-Day Plan
          </a>
        </div>
        <div style="padding:12px 24px;background:#f9fafb;border:1px solid #e5e7eb;border-top:none;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">Ylopo Marketing Team · 90-Day Content Sprint</p>
        </div>
      </div>
    `;
  } else {
    return { statusCode: 400, body: 'Unknown type' };
  }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Ylopo 90-Day Plan <noreply@ylopo-website.netlify.app>',
        to: [assigneeEmail],
        subject,
        html,
      }),
    });

    if (!res.ok) {
      const err = await res.text();
      console.error('Resend error:', err);
      return { statusCode: 500, body: 'Email send failed: ' + err };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ok: true }),
    };
  } catch (err) {
    console.error('Function error:', err);
    return { statusCode: 500, body: 'Internal error: ' + err.message };
  }
};
