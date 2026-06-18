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

  const BATCH_SIZE = 10;
  const results: IssueScore[] = [];

  for (let i = 0; i < issues.length; i += BATCH_SIZE) {
    const batch = issues.slice(i, i + BATCH_SIZE);
    const prompt = buildPrompt(batch);

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText =
      message.content[0].type === "text" ? message.content[0].text : "";

    let parsed: IssueScore[];
    try {
      parsed = JSON.parse(rawText.trim()) as IssueScore[];
    } catch {
      console.warn("Claude returned unparseable response for batch, using fallbacks.");
      parsed = batch.map((issue) => ({
        issue_number: issue.number,
        title: issue.title,
        complexity: "medium" as ComplexityLevel,
        effort_estimate: "unknown",
        skill_tags: [],
        risk_flags: ["scoring_failed"],
        suggested_approach: "Manual review recommended.",
      }));
    }

    results.push(...parsed);
  }

  return results;
}