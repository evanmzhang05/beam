import { getSupabaseAdmin } from "../../../../lib/supabase";
import { fetchAllRelevantJobs } from "../../../../lib/greenhouse";
import { scoreJob, buildFitSummary } from "../../../../lib/matching";
import { sendJobDigestEmail } from "../../../../lib/email";

// Vercel Cron calls this route on the schedule defined in vercel.json.
// Protect it so only Vercel's cron invoker (or someone with the secret) can trigger it.
export async function GET(req) {
  const authHeader = req.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = getSupabaseAdmin();
  const { data: users, error } = await supabase.from("users").select("*");
  if (error) {
    console.error(error);
    return Response.json({ error: "Failed to load users" }, { status: 500 });
  }

  const results = [];

  for (const user of users) {
    try {
      const { data: alreadySent } = await supabase
        .from("sent_jobs")
        .select("job_key")
        .eq("user_id", user.id);
      const sentKeys = new Set((alreadySent || []).map((r) => r.job_key));

      const jobs = await fetchAllRelevantJobs(user.target_companies);

      const scored = jobs
        .map((job) => {
          const key = `${job.company}:${job.id}`;
          if (sentKeys.has(key)) return null; // only genuinely new listings
          const result = scoreJob(job, {
            keywords: user.keywords,
            experienceLevel: user.experience_level,
            targetCompanies: user.target_companies,
          });
          return result ? { job, key, ...result } : null;
        })
        .filter(Boolean)
        .sort((a, b) => b.score - a.score);

      if (scored.length === 0) {
        results.push({ email: user.email, sent: 0 });
        continue;
      }

      const jobsWithSummaries = scored.map(({ job, matchedKeywords }) => ({
        job,
        summary: buildFitSummary(job, matchedKeywords, job.isTargetCompany),
      }));

      await sendJobDigestEmail({ to: user.email, jobsWithSummaries, isFirstEmail: false });

      const sentRows = scored.map(({ job, key }) => ({
        user_id: user.id,
        job_key: key,
        title: job.title,
        company: job.company,
        url: job.url,
      }));
      await supabase.from("sent_jobs").upsert(sentRows, { onConflict: "user_id,job_key" });

      results.push({ email: user.email, sent: scored.length });
    } catch (err) {
      console.error(`Failed for user ${user.email}:`, err);
      results.push({ email: user.email, error: true });
    }
  }

  return Response.json({ results });
}
