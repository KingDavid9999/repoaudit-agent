"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditDataQuality = auditDataQuality;
const STALE_THRESHOLD_DAYS = 90;
function daysSince(dateStr) {
    const ms = Date.now() - new Date(dateStr).getTime();
    return ms / (1000 * 60 * 60 * 24);
}
function normalizeTitle(title) {
    return title.trim().toLowerCase().replace(/\s+/g, " ");
}
function auditDataQuality(issues) {
    const flagMap = new Map();
    function addFlag(issue, flag) {
        if (!flagMap.has(issue.number)) {
            flagMap.set(issue.number, {
                number: issue.number,
                title: issue.title,
                flags: [],
            });
        }
        flagMap.get(issue.number).flags.push(flag);
    }
    // ── Missing descriptions ──────────────────────────────────────────────
    let missingDescriptions = 0;
    for (const issue of issues) {
        const body = issue.body?.trim() ?? "";
        if (!body) {
            missingDescriptions++;
            addFlag(issue, "missing_description");
        }
    }
    // ── Missing labels ────────────────────────────────────────────────────
    let missingLabels = 0;
    for (const issue of issues) {
        if (!issue.labels.length) {
            missingLabels++;
            addFlag(issue, "no_labels");
        }
    }
    // ── Stale issues ──────────────────────────────────────────────────────
    let staleCount = 0;
    for (const issue of issues) {
        if (daysSince(issue.updated_at) >= STALE_THRESHOLD_DAYS) {
            staleCount++;
            addFlag(issue, "stale_90d");
        }
    }
    // ── Duplicate titles ──────────────────────────────────────────────────
    const titleCounts = new Map();
    for (const issue of issues) {
        const key = normalizeTitle(issue.title);
        if (!titleCounts.has(key))
            titleCounts.set(key, []);
        titleCounts.get(key).push(issue);
    }
    let duplicateTitles = 0;
    for (const [, group] of titleCounts) {
        if (group.length > 1) {
            duplicateTitles += group.length;
            for (const issue of group) {
                addFlag(issue, "duplicate_title");
            }
        }
    }
    // ── Label consistency score ───────────────────────────────────────────
    const withLabels = issues.filter((i) => i.labels.length > 0).length;
    const labelConsistencyScore = issues.length > 0
        ? parseFloat((withLabels / issues.length).toFixed(2))
        : 1;
    return {
        total_open_issues: issues.length,
        missing_descriptions: missingDescriptions,
        missing_labels: missingLabels,
        duplicate_titles: duplicateTitles,
        stale_issues_90d: staleCount,
        label_consistency_score: labelConsistencyScore,
        flagged_issues: Array.from(flagMap.values()),
    };
}
