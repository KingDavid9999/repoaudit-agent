"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fetchOpenIssues = fetchOpenIssues;
exports.fetchIssuesByNumber = fetchIssuesByNumber;
const BASE = "https://api.github.com";
function headers() {
    const h = {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    };
    if (process.env.GITHUB_TOKEN) {
        h["Authorization"] = `Bearer ${process.env.GITHUB_TOKEN}`;
    }
    return h;
}
async function githubFetch(url) {
    const res = await fetch(url, { headers: headers() });
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`GitHub API error ${res.status}: ${text}`);
    }
    return res.json();
}
async function fetchOpenIssues(repo) {
    const issues = [];
    let page = 1;
    while (true) {
        const url = `${BASE}/repos/${repo}/issues?state=open&per_page=100&page=${page}`;
        const batch = await githubFetch(url);
        if (!batch.length)
            break;
        // GitHub returns PRs mixed in with issues — filter them out
        const realIssues = batch.filter((i) => !i.pull_request);
        issues.push(...realIssues);
        if (batch.length < 100)
            break; // last page reached
        if (issues.length >= 500)
            break; // safety cap
        page++;
    }
    return issues;
}
async function fetchIssuesByNumber(repo, numbers) {
    const results = await Promise.allSettled(numbers.map((n) => githubFetch(`${BASE}/repos/${repo}/issues/${n}`)));
    return results
        .filter((r) => r.status === "fulfilled")
        .map((r) => r.value)
        .filter((i) => !i.pull_request);
}
