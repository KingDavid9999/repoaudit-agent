import { GitHubIssue } from "./types";

const BASE = "https://api.github.com";

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    h["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}
async function githubFetch<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: headers() });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`GitHub API error ${res.status}: ${text}`);
  }
  return res.json() as Promise<T>;
}
export async function fetchOpenIssues(repo: string): Promise<GitHubIssue[]> {
  const issues: GitHubIssue[] = [];
  let page = 1;

  while (true) {
    const url = `${BASE}/repos/${repo}/issues?state=open&per_page=100&page=${page}`;
    const batch = await githubFetch<GitHubIssue[]>(url);

    if (!batch.length) break;

    // GitHub returns PRs mixed in with issues — filter them out
    const realIssues = batch.filter((i) => !i.pull_request);
    issues.push(...realIssues);

    if (batch.length < 100) break; // last page reached
    if (issues.length >= 500) break; // safety cap
    page++;
  }

  return issues;
}
export async function fetchIssuesByNumber(
  repo: string,
  numbers: number[]
): Promise<GitHubIssue[]> {
  const results = await Promise.allSettled(
    numbers.map((n) =>
      githubFetch<GitHubIssue>(`${BASE}/repos/${repo}/issues/${n}`)
    )
  );
  return results
    .filter((r): r is PromiseFulfilledResult<GitHubIssue> => r.status === "fulfilled")
    .map((r) => r.value)
    .filter((i) => !i.pull_request);
}