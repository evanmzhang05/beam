// Strips HTML tags for lightweight text matching against job descriptions.
function stripHtml(html) {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").toLowerCase();
}

// Words that signal seniority. Used to filter jobs to roughly the user's experience band.
const LEVEL_SIGNALS = {
  entry: ["entry level", "associate", "analyst", "coordinator", "junior", "new grad", "graduate"],
  mid: ["mid level", "senior associate", "specialist", "manager"],
  senior: ["senior", "sr.", "lead", "principal", "staff"],
  executive: ["director", "vp", "vice president", "head of", "chief", "executive"],
};

// Very rough level classifier based on title keywords. Falls back to "mid" if nothing matches,
// since most postings don't explicitly flag entry-level and shouldn't be excluded outright.
function classifyLevel(title) {
  const t = title.toLowerCase();
  if (LEVEL_SIGNALS.executive.some((k) => t.includes(k))) return "executive";
  if (LEVEL_SIGNALS.senior.some((k) => t.includes(k))) return "senior";
  if (LEVEL_SIGNALS.entry.some((k) => t.includes(k))) return "entry";
  return "mid";
}

// Maps a user's free-text experience level input (e.g. "analyst/associate", "entry level")
// to one of our buckets.
function normalizeUserLevel(experienceLevel) {
  const t = experienceLevel.toLowerCase();
  if (/(entry|analyst|associate|junior|new grad|graduate)/.test(t)) return "entry";
  if (/(senior|lead|principal|staff)/.test(t)) return "senior";
  if (/(director|vp|head|chief|executive)/.test(t)) return "executive";
  return "mid";
}

// Scores a job 0-100 against the user's keywords/experience/company preferences.
// Returns null if the job doesn't clear the minimum bar (no keyword relevance, or
// experience level is a clear mismatch), so it gets filtered out entirely.
export function scoreJob(job, { keywords, experienceLevel, targetCompanies }) {
  const haystack = `${job.title} ${stripHtml(job.contentHtml)}`.toLowerCase();
  const kw = keywords.map((k) => k.toLowerCase().trim()).filter(Boolean);

  const matchedKeywords = kw.filter((k) => haystack.includes(k));
  if (matchedKeywords.length === 0) return null;

  const userLevel = normalizeUserLevel(experienceLevel);
  const jobLevel = classifyLevel(job.title);
  // Hard-exclude clear mismatches (e.g. user wants entry-level, job is executive) but
  // allow adjacent bands through since classification is approximate.
  const levelDistance = {
    entry: { entry: 0, mid: 1, senior: 2, executive: 3 },
    mid: { entry: 1, mid: 0, senior: 1, executive: 2 },
    senior: { entry: 2, mid: 1, senior: 0, executive: 1 },
    executive: { entry: 3, mid: 2, senior: 1, executive: 0 },
  }[userLevel][jobLevel];
  if (levelDistance >= 2) return null;

  let score = matchedKeywords.length * 20;
  score += (kw.length ? matchedKeywords.length / kw.length : 0) * 20;
  score += levelDistance === 0 ? 20 : 10;
  score += job.isTargetCompany ? 25 : 0;
  score = Math.min(100, score);

  return { score, matchedKeywords };
}

// Generates a short, deterministic "why this fits" blurb without calling any external LLM,
// so the app has zero extra API dependencies/costs. Swap this out for a Claude API call
// (see README) if you want richer, more natural summaries.
export function buildFitSummary(job, matchedKeywords, isTargetCompany) {
  const parts = [];
  if (matchedKeywords.length) {
    parts.push(`matches your interest in ${matchedKeywords.slice(0, 3).join(", ")}`);
  }
  if (isTargetCompany) {
    parts.push(`it's at ${job.company}, one of your target companies`);
  }
  if (job.location && job.location !== "Unspecified") {
    parts.push(`based in ${job.location}`);
  }
  if (parts.length === 0) return "Relevant to your search criteria.";
  return `This role ${parts.join("; ")}.`;
}
