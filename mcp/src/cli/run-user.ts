#!/usr/bin/env node
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { resolveUserContext } from "../common/auth";
import { createUserMcpServer } from "../user-server/index";
import { disconnectDatabase } from "../common/db";

async function main() {
  try {
    // Write diagnostics ONLY to stderr so stdout remains clean JSON-RPC for LLM MCP clients
    process.stderr.write("[TaxComPro User MCP] Initializing user session...\n");

    const user = await resolveUserContext();
    process.stderr.write(`[TaxComPro User MCP] Authenticated as user: ${user.email} (ID: ${user.userId}, Tier: ${user.tier})\n`);

    const server = createUserMcpServer(user);
    const transport = new StdioServerTransport();

    process.on("SIGINT", async () => {
      process.stderr.write("[TaxComPro User MCP] Shutting down...\n");
      await disconnectDatabase();
      process.exit(0);
    });

    process.on("SIGTERM", async () => {
      process.stderr.write("[TaxComPro User MCP] Shutting down...\n");
      await disconnectDatabase();
      process.exit(0);
    });

    await server.connect(transport);
    process.stderr.write("[TaxComPro User MCP] Server listening on stdio.\n");
  } catch (error: any) {
    process.stderr.write(`[TaxComPro User MCP Fatal Error] ${error.message}\n`);
    process.exit(1);
  }
}

main();

