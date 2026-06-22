"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAgent = startAgent;
const sdk_1 = require("@croo-network/sdk");
const github_1 = require("./github");
const auditor_1 = require("./auditor");
const scorer_1 = require("./scorer");
const config = {
    baseURL: process.env.CROO_API_URL ?? "https://api.croo.network",
    wsURL: process.env.CROO_WS_URL ?? "wss://api.croo.network/ws",
};
function parseRequest(raw) {
    if (typeof raw !== "object" || raw === null) {
        throw new Error("Invalid request: expected a JSON object.");
    }
    const obj = raw;
    if (typeof obj.repo !== "string" || !obj.repo.includes("/")) {
        throw new Error('Invalid request: "repo" must be in "owner/repo" format.');
    }
    if (obj.issue_numbers !== undefined) {
        if (!Array.isArray(obj.issue_numbers) ||
            !obj.issue_numbers.every((n) => typeof n === "number")) {
            throw new Error('Invalid request: "issue_numbers" must be an array of numbers.');
        }
    }
    return {
        repo: obj.repo,
        issue_numbers: obj.issue_numbers,
    };
}
async function runAudit(req) {
    console.log(`[audit] Starting audit for ${req.repo}...`);
    const issues = req.issue_numbers?.length
        ? await (0, github_1.fetchIssuesByNumber)(req.repo, req.issue_numbers)
        : await (0, github_1.fetchOpenIssues)(req.repo);
    console.log(`[audit] Fetched ${issues.length} issues.`);
    const dataQuality = (0, auditor_1.auditDataQuality)(issues);
    console.log(`[audit] Data quality analysis complete.`);
    const issuesToScore = req.issue_numbers?.length
        ? issues
        : issues.slice(0, 20);
    const issueComplexity = await (0, scorer_1.scoreIssues)(issuesToScore);
    console.log(`[audit] Scored ${issueComplexity.length} issues.`);
    const q = dataQuality;
    const highOrCritical = issueComplexity.filter((s) => s.complexity === "high" || s.complexity === "critical").length;
    const summary = `Repo "${req.repo}" has ${q.total_open_issues} open issues. ` +
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
async function startAgent() {
    const apiKey = process.env.CROO_SDK_KEY;
    if (!apiKey)
        throw new Error("CROO_SDK_KEY is not set.");
    const client = new sdk_1.AgentClient(config, apiKey);
    console.log("[cap] Connecting to CROO WebSocket...");
    const stream = await client.connectWebSocket();
    console.log("[cap] Connected. Waiting for orders...\n");
    stream.on(sdk_1.EventType.NegotiationCreated, async (e) => {
        if (!e.negotiation_id)
            return;
        console.log(`[cap] Negotiation received: ${e.negotiation_id}`);
        try {
            await client.acceptNegotiation(e.negotiation_id);
            console.log(`[cap] Negotiation accepted: ${e.negotiation_id}`);
        }
        catch (err) {
            console.error(`[cap] Failed to accept negotiation:`, err);
        }
    });
    stream.on(sdk_1.EventType.OrderPaid, async (e) => {
        if (!e.order_id)
            return;
        console.log(`[cap] Order paid: ${e.order_id}. Starting audit...`);
        try {
            const req = parseRequest(e.requirements);
            const result = await runAudit(req);
            await client.deliverOrder(e.order_id, {
                deliverableType: sdk_1.DeliverableType.Schema,
                deliverableText: JSON.stringify(result),
            });
            console.log(`[cap] Delivered result for order: ${e.order_id}`);
        }
        catch (err) {
            const reason = err instanceof Error ? err.message : "Internal agent error.";
            console.error(`[cap] Audit failed for order ${e.order_id}:`, reason);
            await client.rejectOrder(e.order_id, reason);
        }
    });
    stream.on(sdk_1.EventType.OrderCompleted, (e) => {
        if (!e.order_id)
            return;
        console.log(`[cap] Order completed and settled: ${e.order_id}`);
    });
    stream.on(sdk_1.EventType.NegotiationExpired, (e) => {
        console.log(`[cap] Negotiation expired: ${e.negotiation_id}`);
    });
}
