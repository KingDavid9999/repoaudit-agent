// ─── Input ───────────────────────────────────────────────────────────────────

export interface AuditRequest {
  repo: string;             // "owner/repo-name" e.g. "facebook/react"
  issue_numbers?: number[]; // optional — if omitted, audits all open issues
}
// ─── GitHub raw shapes ────────────────────────────────────────────────────────

export interface GitHubIssue {
  number: number;
  title: string;
  body: string | null;
  labels: Array<{ name: string }>;
  state: string;
  created_at: string;
  updated_at: string;
  pull_request?: unknown;
}
// ─── Data Quality ─────────────────────────────────────────────────────────────

export interface DataQualityReport {
  total_open_issues: number;
  missing_descriptions: number;
  missing_labels: number;
  duplicate_titles: number;
  stale_issues_90d: number;
  label_consistency_score: number; // 0 to 1
  flagged_issues: FlaggedIssue[];
}

export interface FlaggedIssue {
  number: number;
  title: string;
  flags: string[]; // e.g. ["missing_description", "stale_90d"]
}
// ─── Complexity Scoring ───────────────────────────────────────────────────────

export type ComplexityLevel = "low" | "medium" | "high" | "critical";

export interface IssueScore {
  issue_number: number;
  title: string;
  complexity: ComplexityLevel;
  effort_estimate: string;
  skill_tags: string[];
  risk_flags: string[];
  suggested_approach: string;
}
// ─── Final Output ─────────────────────────────────────────────────────────────

export interface AuditResult {
  repo: string;
  audited_at: string;
  data_quality: DataQualityReport;
  issue_complexity: IssueScore[];
  summary: string;
}