#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveAdminContext } from "../common/auth.js";
import { createAdminMcpServer } from "../admin-server/index.js";
import { disconnectDatabase } from "../common/db.js";

async function main() {
  try {
    // Write diagnostics ONLY to stderr so stdout remains clean JSON-RPC for LLM MCP clients
    process.stderr.write("[TaxComPro Admin MCP] Initializing administrative session...\n");

    const admin = await resolveAdminContext();
    process.stderr.write(`[TaxComPro Admin MCP] Verified ADMIN: ${admin.email} (ID: ${admin.adminId})\n`);

    const server = createAdminMcpServer(admin);
    const transport = new StdioServerTransport();

    process.on("SIGINT", async () => {
      process.stderr.write("[TaxComPro Admin MCP] Shutting down...\n");
      await disconnectDatabase();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      process.stderr.write("[TaxComPro Admin MCP] Shutting down...\n");
      await disconnectDatabase();
      process.exit(0);
    });

    await server.connect(transport);
    process.stderr.write("[TaxComPro Admin MCP] Server listening on stdio.\n");
  } catch (error: any) {
    process.stderr.write(`[TaxComPro Admin MCP Fatal Error] ${error.message}\n`);
    process.exit(1);
  }
}

main();

