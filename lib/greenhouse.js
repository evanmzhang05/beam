// A curated list of company "board tokens" (the slug Greenhouse uses in its public API
// URL, e.g. https://boards-api.greenhouse.io/v1/boards/stripe/jobs) that are known to be
// active. This is used as the "all companies" pool. It's not exhaustive — Greenhouse
// doesn't offer a directory API — so add/edit slugs here as you discover more.
//
// You can find a company's slug by checking their careers page URL, which is usually
// https://boards.greenhouse.io/<slug> or https://job-boards.greenhouse.io/<slug>.
export const DEFAULT_BOARD_TOKENS = [
  "stripe",
  "airbnb",
  "robinhood",
  "coinbase",
  "doordash",
  "affirm",
  "figma",
  "notion",
  "brex",
  "plaid",
  "asana",
  "gitlab",
  "reddit",
  "instacart",
  "lyft",
  "pinterest",
  "squarespace",
  "twilio",
  "cloudflare",
  "databricks",
  "discord",
  "dropbox",
  "duolingo",
  "roblox",
  "snowflake",
];

// Turns a free-text company name (e.g. "Stripe", "Coinbase Inc.") into a best-guess
// Greenhouse board token. This is a heuristic — Greenhouse has no public search/lookup
// endpoint for tokens, so exact matches aren't guaranteed for every company.
function guessBoardToken(companyName) {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "")
    .trim();
}

// Fetches all open jobs for a single Greenhouse board token.
// Returns [] on any failure (invalid token, no board, network error) rather than throwing,
// so one bad company name doesn't break the whole run.
async function fetchBoardJobs(token) {
  try {
    const res = await fetch(
      `https://boards-api.greenhouse.io/v1/boards/${token}/jobs?content=true`,
      { headers: { Accept: "application/json" } }
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (!data.jobs) return [];
    return data.jobs.map((job) => ({
      id: String(job.id),
      title: job.title,
      company: token,
      location: job.location?.name || "Unspecified",
      url: job.absolute_url,
      contentHtml: job.content || "",
      updatedAt: job.updated_at,
    }));
  } catch {
    return [];
  }
}

// Fetches jobs across the user's target companies plus the default board pool,
// deduplicated by board token.
export async function fetchAllRelevantJobs(targetCompanies = []) {
  const targetTokens = targetCompanies.map(guessBoardToken).filter(Boolean);
  const allTokens = Array.from(new Set([...targetTokens, ...DEFAULT_BOARD_TOKENS]));

  const results = await Promise.all(allTokens.map((token) => fetchBoardJobs(token)));

  const targetTokenSet = new Set(targetTokens);
  return results.flat().map((job) => ({
    ...job,
    isTargetCompany: targetTokenSet.has(job.company),
  }));
}
