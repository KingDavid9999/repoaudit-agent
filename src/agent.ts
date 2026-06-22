import { AgentClient, EventType, DeliverableType } from "@croo-network/sdk";
import type { Event } from "@croo-network/sdk";
import { fetchOpenIssues, fetchIssuesByNumber } from "./github";
import { auditDataQuality } from "./auditor";
import { scoreIssues } from "./scorer";
import { AuditRequest, AuditResult } from "./types";

const config = {
  baseURL: process.env.CROO_API_URL ?? "https://api.croo.network",
  wsURL: process.env.CROO_WS_URL ?? "wss://api.croo.network/ws",
};

function parseRequest(raw: unknown): AuditRequest {
  if (typeof raw !== "object" || raw === null) {
    throw new Error("Invalid request: expected a JSON object.");
  }
  const obj = raw as Record<string, unknown>;
  if (typeof obj.repo !== "string" || !obj.repo.includes("/")) {
    throw new Error('Invalid request: "repo" must be in "owner/repo" format.');
  }
  if (obj.issue_numbers !== undefined) {
    if (
      !Array.isArray(obj.issue_numbers) ||
      !obj.issue_numbers.every((n) => typeof n === "number")
    ) {
      throw new Error(
        'Invalid request: "issue_numbers" must be an array of numbers.'
      );
    }
  }
  return {
    repo: obj.repo,
    issue_numbers: obj.issue_numbers as number[] | undefined,
  };
}

async function runAudit(req: AuditRequest): Promise<AuditResult> {
  console.log(`[audit] Starting audit for ${req.repo}...`);

  const issues =
    req.issue_numbers?.length
      ? await fetchIssuesByNumber(req.repo, req.issue_numbers)
      : await fetchOpenIssues(req.repo);

  console.log(`[audit] Fetched ${issues.length} issues.`);

  const dataQuality = auditDataQuality(issues);
  console.log(`[audit] Data quality analysis complete.`);

  const issuesToScore =
    req.issue_numbers?.length ? issues : issues.slice(0, 20);
  const issueComplexity = await scoreIssues(issuesToScore);
  console.log(`[audit] Scored ${issueComplexity.length} issues.`);

  const q = dataQuality;
  const highOrCritical = issueComplexity.filter(
    (s) => s.complexity === "high" || s.complexity === "critical"
  ).length;

  const summary =
    `Repo "${req.repo}" has ${q.total_open_issues} open issues. ` +
    `${q.missing_descriptions} lack descriptions, ${q.missing_labels} have no labels, ` +
    `and ${q.stale_issues_90d} are stale (90+ days). ` +
    `Label consistency: ${(q.label_consistency_score * 100).toFixed(0)}%. ` +
    `Of the scored issues, ${highOrCritical} are high or critical complexity.`;

  return {
    repo: req.repo,
    audited_at: new Date().toISOString(),
    data_quality: dataQuality,
    issue_complexity: issueComplexity,
    summary,
  };
}

export async function startAgent() {
  const apiKey = process.env.CROO_SDK_KEY;
  if (!apiKey) throw new Error("CROO_SDK_KEY is not set.");

  const client = new AgentClient(config, apiKey);
  console.log("[cap] Connecting to CROO WebSocket...");

  const stream = await client.connectWebSocket();
  console.log("[cap] Connected. Waiting for orders...\n");

  stream.on(EventType.NegotiationCreated, async (e: Event) => {
    if (!e.negotiation_id) return;
    console.log(`[cap] Negotiation received: ${e.negotiation_id}`);
    try {
      await client.acceptNegotiation(e.negotiation_id);
      console.log(`[cap] Negotiation accepted: ${e.negotiation_id}`);
    } catch (err) {
      console.error(`[cap] Failed to accept negotiation:`, err);
    }
  });

  stream.on(EventType.OrderPaid, async (e: Event) => {
    if (!e.order_id) return;
    console.log(`[cap] Order paid: ${e.order_id}. Starting audit...`);

    try {
      // Handle requirements arriving as JSON string or plain object
      const raw = typeof e.requirements === "string"
        ? JSON.parse(e.requirements)
        : e.requirements;

      const req = parseRequest(raw);
      const result = await runAudit(req);

      await client.deliverOrder(e.order_id, {
        deliverableType: DeliverableType.Schema,
        deliverableText: JSON.stringify(result),
      });

      console.log(`[cap] Delivered result for order: ${e.order_id}`);
    } catch (err) {
      const reason =
        err instanceof Error ? err.message : "Internal agent error.";
      console.error(`[cap] Audit failed for order ${e.order_id}:`, reason);
      await client.rejectOrder(e.order_id, reason);
    }
  });

  stream.on(EventType.OrderCompleted, (e: Event) => {
    if (!e.order_id) return;
    console.log(`[cap] Order completed and settled: ${e.order_id}`);
  });

  stream.on(EventType.NegotiationExpired, (e: Event) => {
    if (!e.negotiation_id) return;
    console.log(`[cap] Negotiation expired: ${e.negotiation_id}`);
  });
}
