# RepoAudit Agent

> A CAP-integrated AI agent that audits GitHub repositories for data quality issues and scores issue complexity — callable by humans and other agents on the CROO Agent Store.

**Tracks:** Data & Verification Agents · Developer Tooling Agents

---

## What It Does

RepoAudit accepts a GitHub repository and an optional list of issue numbers, then returns two structured outputs in a single paid call:

**1. Data Quality Report** — deterministic analysis of open issues:
- Missing descriptions, missing labels, duplicate titles, stale issues (90+ days inactive)
- Label consistency score (0–1 ratio)
- Per-issue flag list

**2. Complexity Scores** — AI-powered assessment per issue:
- Complexity level: `low | medium | high | critical`
- Effort estimate, skill tags, risk flags
- Suggested implementation approach

---

## Why It's A2A Composable

Any agent in the CROO ecosystem can hire RepoAudit as a dependency:
- A **project management agent** can auto-triage new issues
- A **bounty board agent** can attach complexity scores to listings
- A **contributor-matching agent** can match developers to issues by skill tags

---

## Input Schema

```json
{
  "repo": "owner/repo-name",
  "issue_numbers": [12, 45, 67]
}
```

`issue_numbers` is optional. If omitted, the agent audits all open issues (up to 500 fetched, 20 scored).

---

## Output Schema

```json
{
  "repo": "owner/repo-name",
  "audited_at": "2026-06-15T10:30:00.000Z",
  "data_quality": {
    "total_open_issues": 42,
    "missing_descriptions": 8,
    "missing_labels": 13,
    "duplicate_titles": 3,
    "stale_issues_90d": 11,
    "label_consistency_score": 0.67,
    "flagged_issues": [
      {
        "number": 12,
        "title": "Fix login bug",
        "flags": ["missing_description", "no_labels"]
      }
    ]
  },
  "issue_complexity": [
    {
      "issue_number": 12,
      "title": "Fix login bug",
      "complexity": "medium",
      "effort_estimate": "1-2 days",
      "skill_tags": ["authentication", "backend", "nodejs"],
      "risk_flags": ["no acceptance criteria"],
      "suggested_approach": "Reproduce the bug locally using the steps in the linked thread, then trace the auth middleware for incorrect token expiry handling."
    }
  ],
  "summary": "Repo has 42 open issues. 8 lack descriptions..."
}
```

---

## Setup

### Prerequisites
- Node.js 18+
- A CROO account at [agent.croo.network](https://agent.croo.network)
- A Groq API key at [console.groq.com](https://console.groq.com) (free, no credit card required)

### Installation

```bash
git clone https://github.com/KingDavid9999/repoaudit-agent
cd repoaudit-agent
npm install
```

### Environment Variables

Create a `.env` file in the project root:

```
CROO_API_URL=https://api.croo.network
CROO_WS_URL=wss://api.croo.network/ws
CROO_SDK_KEY=your_croo_sdk_key_here
GROQ_API_KEY=your_anthropic_key_here
GITHUB_TOKEN=your_github_token_here
```

| Variable | Required | Description |
|---|---|---|
| `CROO_API_URL` | Yes | CROO REST API endpoint |
| `CROO_WS_URL` | Yes | CROO WebSocket endpoint |
| `CROO_SDK_KEY` | Yes | From CROO Agent Store dashboard |
| `GROQ_API_KEY` | Yes | For AI-powered complexity scoring via Llama |
| `GITHUB_TOKEN` | No | Raises GitHub rate limit from 60 to 5000 req/hr |

### Run

```bash
# Development
npm run dev

# Production
npm run build && npm start
```

---

## CAP SDK Integration

This agent uses the `@croo-network/sdk` Node.js SDK installed from [github.com/CROO-Network/node-sdk](https://github.com/CROO-Network/node-sdk).

| SDK Method | Used For |
|---|---|
| `new AgentClient(config, sdkKey)` | Authenticated provider client |
| `client.connectWebSocket()` | Opens persistent real-time order stream |
| `client.acceptNegotiation(negotiationId)` | Auto-accepts incoming order negotiations |
| `client.deliverOrder(orderId, payload)` | Returns structured JSON audit result |
| `client.rejectOrder(orderId, reason)` | Graceful error handling on audit failure |
| `EventType.NegotiationCreated` | Fires when a buyer initiates an order |
| `EventType.OrderPaid` | Fires when USDC is locked in escrow — triggers the audit |
| `EventType.OrderCompleted` | Fires when delivery is verified and funds are released |
| `DeliverableType.Schema` | Marks the deliverable as structured JSON for A2A consumption |

### Integration Notes

- The agent listens on a persistent WebSocket connection — no HTTP server required
- Audit work only begins after `OrderPaid` fires — payment confirmation before computation
- `deliverableType: schema` makes results consumable by downstream agents without parsing
- Failed audits call `rejectOrder` explicitly so buyers are notified and funds are returned
- GitHub pagination is handled automatically — repos with hundreds of issues are supported
- Groq/Llama scoring runs in batches of 10 to respect API rate limits

---

## Architecture

```
index.ts     → entry point, env loading, graceful shutdown
agent.ts     → CAP WebSocket provider, full order lifecycle
github.ts    → GitHub REST API fetcher (paginated, PR-filtered)
auditor.ts   → deterministic data quality analysis (no AI)
scorer.ts    → Groq/Llama-powered complexity scoring (batched)
types.ts     → shared TypeScript interfaces
```

---

## License

MIT — see [LICENSE](./LICENSE)