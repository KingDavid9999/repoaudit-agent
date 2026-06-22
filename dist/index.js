"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const agent_1 = require("./agent");
async function main() {
    console.log("===========================================");
    console.log("  RepoAudit Agent — powered by CROO CAP  ");
    console.log("===========================================\n");
    try {
        await (0, agent_1.startAgent)();
    }
    catch (err) {
        console.error("[fatal] Agent failed to start:", err);
        process.exit(1);
    }
}
process.on("SIGINT", () => {
    console.log("\n[shutdown] Received SIGINT. Shutting down...");
    process.exit(0);
});
process.on("unhandledRejection", (reason) => {
    console.error("[error] Unhandled rejection:", reason);
});
main();
