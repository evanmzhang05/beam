import { getSupabaseAdmin } from "../../../lib/supabase";
import { fetchAllRelevantJobs } from "../../../lib/greenhouse";
import { scoreJob, buildFitSummary } from "../../../lib/matching";
import { sendJobDigestEmail } from "../../../lib/email";

export async function POST(req) {
  try {
    const body = await req.json();
    const { email, keywords, experienceLevel, companies } = body;

    if (!email || !keywords || !experienceLevel) {
      return Response.json({ error: "Missing required fields." }, { status: 400 });
    }

    const keywordList = keywords.split(",").map((k) => k.trim()).filter(Boolean);
    const companyList = (companies || "").split(",").map((c) => c.trim()).filter(Boolean);

    const supabase = getSupabaseAdmin();

    // Upsert user by email so re-running onboarding updates preferences instead of erroring.
    const { data: user, error: userError } = await supabase
      .from("users")
      .upsert(
        {
          email,
          keywords: keywordList,
          experience_level: experienceLevel,
          target_companies: companyList,
        },
        { onConflict: "email" }
      )
      .select()
      .single();

    if (userError) throw userError;

    const jobs = await fetchAllRelevantJobs(companyList);

    const scored = jobs
      .map((job) => {
        const result = scoreJob(job, {
          keywords: keywordList,
          experienceLevel,
          targetCompanies: companyList,
        });
        return result ? { job, ...result } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.score - a.score)
      .slice(0, 25);

    if (scored.length === 0) {
      return Response.json(
        { error: "No matching jobs found yet. Try broader keywords, or check back later." },
        { status: 200 }
      );
    }

    const jobsWithSummaries = scored.map(({ job, matchedKeywords }) => ({
      job,
      summary: buildFitSummary(job, matchedKeywords, job.isTargetCompany),
    }));

    await sendJobDigestEmail({ to: email, jobsWithSummaries, isFirstEmail: true });

    // Record what was sent so the daily cron only sends genuinely new listings.
    const sentRows = scored.map(({ job }) => ({
      user_id: user.id,
      job_key: `${job.company}:${job.id}`,
      title: job.title,
      company: job.company,
      url: job.url,
    }));
    await supabase.from("sent_jobs").upsert(sentRows, { onConflict: "user_id,job_key" });

    return Response.json({ success: true, count: scored.length });
  } catch (err) {
    console.error(err);
    return Response.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
