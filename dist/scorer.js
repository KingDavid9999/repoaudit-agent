"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.scoreIssues = scoreIssues;
const groq_sdk_1 = __importDefault(require("groq-sdk"));
const client = new groq_sdk_1.default({ apiKey: process.env.GROQ_API_KEY });
const MAX_BODY_CHARS = 1500;
function buildPrompt(issues) {
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
async function scoreIssues(issues) {
    if (!issues.length)
        return [];
    const BATCH_SIZE = 10;
    const results = [];
    for (let i = 0; i < issues.length; i += BATCH_SIZE) {
        const batch = issues.slice(i, i + BATCH_SIZE);
        const prompt = buildPrompt(batch);
        let parsed;
        try {
            const completion = await client.chat.completions.create({
                model: "llama-3.3-70b-versatile",
                messages: [{ role: "user", content: prompt }],
                temperature: 0.1,
            });
            let rawText = completion.choices[0]?.message?.content?.trim() ?? "";
            rawText = rawText
                .replace(/^```json\s*/i, "")
                .replace(/^```\s*/i, "")
                .replace(/```\s*$/i, "")
                .trim();
            parsed = JSON.parse(rawText);
        }
        catch (err) {
            console.warn("Groq error:", err);
            parsed = batch.map((issue) => ({
                issue_number: issue.number,
                title: issue.title,
                complexity: "medium",
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
