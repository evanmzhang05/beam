import { Resend } from "resend";

function renderJobRow(job, summary) {
  return `
    <tr>
      <td style="padding: 16px 0; border-bottom: 1px solid #e5e5e5;">
        <div style="font-weight: 600; font-size: 15px; color: #111;">${job.title}</div>
        <div style="font-size: 13px; color: #555; margin-top: 2px;">${job.company} &middot; ${job.location}</div>
        <div style="font-size: 13px; color: #444; margin-top: 6px;">${summary}</div>
        <a href="${job.url}" style="display:inline-block; margin-top:8px; font-size:13px; color:#2563eb; text-decoration:none;">View & apply →</a>
      </td>
    </tr>
  `;
}

function renderEmailHtml({ heading, intro, jobsWithSummaries }) {
  const rows = jobsWithSummaries.map(({ job, summary }) => renderJobRow(job, summary)).join("");
  return `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #111;">
    <h2 style="margin-bottom: 4px;">${heading}</h2>
    <p style="color: #555; font-size: 14px;">${intro}</p>
    <table style="width: 100%; border-collapse: collapse;">${rows}</table>
    <p style="color: #999; font-size: 12px; margin-top: 24px;">You're receiving this because you signed up for daily job digests. Listings sourced from Greenhouse-powered company career pages.</p>
  </div>
  `;
}

export async function sendJobDigestEmail({ to, jobsWithSummaries, isFirstEmail }) {
  const resend = new Resend(process.env.RESEND_API_KEY);
  const heading = isFirstEmail
    ? "Your job search is set up 🎉"
    : "New job matches for you";
  const intro = isFirstEmail
    ? `Here are your first ${jobsWithSummaries.length} matches. You'll get a new digest every day at 10am with fresh listings only.`
    : `${jobsWithSummaries.length} new listing${jobsWithSummaries.length === 1 ? "" : "s"} matched your criteria since yesterday.`;

  await resend.emails.send({
    from: process.env.EMAIL_FROM,
    to,
    subject: isFirstEmail ? "Your job search bot is live 🚀" : "Today's new job matches",
    html: renderEmailHtml({ heading, intro, jobsWithSummaries }),
  });
}
