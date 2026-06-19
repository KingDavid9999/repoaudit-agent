import Anthropic from "@anthropic-ai/sdk";
import { GitHubIssue, IssueScore, ComplexityLevel } from "./types";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const MAX_BODY_CHARS = 1500;
function buildPrompt(issues: GitHubIssue[]): string {
  const issueList = issues
    .map((i) => {
      const body = i.body?.trim().slice(0, MAX_BODY_CHARS) ?? "(no description)";
      const labels = i.labels.map((l) => l.name).join(", ") || "none";
      return `Issue #${i.number}
Title: ${i.title}
Labels: ${labels}
Description: ${body}`;
    })
    .join("\n\n---\n\n");

  return `You are a senior software engineer reviewing GitHub issues.
For each issue below, return a structured JSON array. Each element must have:
- issue_number: number
- title: string
- complexity: one of "low" | "medium" | "high" | "critical"
- effort_estimate: string (e.g. "2-4 hours", "1-2 days", "1 week")
- skill_tags: string[] (2-5 relevant technology or skill tags)
- risk_flags: string[] (potential blockers or missing info — empty array if none)
- suggested_approach: string (1-2 sentences, actionable)

Complexity guide:
- low: well-defined, single-file change, no dependencies
- medium: clear scope, 2-4 files, minor coordination needed
- high: cross-cutting, multiple systems, or unclear requirements
- critical: architectural impact, blocking others, or production risk

Return ONLY a valid JSON array. No markdown, no explanation, no backticks.

Issues to evaluate:
${issueList}`;
}
export async function scoreIssues(issues: GitHubIssue[]): Promise<IssueScore[]> {
  if (!issues.length) return [];

  // Mock scorer for testing — replace with Claude call in production
  return issues.map((issue) => ({
    issue_number: issue.number,
    title: issue.title,
    complexity: "medium" as ComplexityLevel,
    effort_estimate: "1-2 days",
    skill_tags: ["javascript", "react"],
    risk_flags: issue.body ? [] : ["missing_description"],
    suggested_approach: "Review the issue description and reproduce locally before implementing a fix.",
  }));
}