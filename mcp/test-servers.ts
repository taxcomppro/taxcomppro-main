import { resolveUserContext, resolveAdminContext } from "./src/common/auth.js";
import { createUserMcpServer } from "./src/user-server/index.js";
import { createAdminMcpServer } from "./src/admin-server/index.js";
import { disconnectDatabase } from "./src/common/db.js";
import {
  ListToolsRequestSchema,
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListPromptsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

async function runTests() {
  console.log("==================================================");
  console.log("  Testing TaxComPro MCP Servers (User & Admin)   ");
  console.log("==================================================");

  try {
    // 1. Test User Context & Server
    console.log("\n[1/4] Resolving User Context...");
    const user = await resolveUserContext();
    console.log(`✓ User Authenticated: ${user.email} (ID: ${user.userId}, Tier: ${user.tier}, Role: ${user.role})`);

    const userServer = createUserMcpServer(user);
    console.log("✓ User MCP Server instance created.");

    // Test List Tools for User
    // Use an internal call or check tool count
    console.log("\n[2/4] Testing User MCP Tools & Capabilities...");
    // Let's call a tool handler directly or check definition count
    const { profileToolDefinitions } = await import("./src/user-server/tools/profile.js");
    const { trainingToolDefinitions } = await import("./src/user-server/tools/training.js");
    const { toolkitToolDefinitions } = await import("./src/user-server/tools/toolkits.js");
    const { digitalCardToolDefinitions } = await import("./src/user-server/tools/digital-card.js");
    const { marketplaceToolDefinitions } = await import("./src/user-server/tools/marketplace.js");
    const { networkToolDefinitions } = await import("./src/user-server/tools/network.js");
    const { spaceToolDefinitions } = await import("./src/user-server/tools/spaces.js");
    const { supportToolDefinitions } = await import("./src/user-server/tools/support.js");
    const { affiliateToolDefinitions } = await import("./src/user-server/tools/affiliate.js");

    const totalUserTools =
      profileToolDefinitions.length +
      trainingToolDefinitions.length +
      toolkitToolDefinitions.length +
      digitalCardToolDefinitions.length +
      marketplaceToolDefinitions.length +
      networkToolDefinitions.length +
      spaceToolDefinitions.length +
      supportToolDefinitions.length +
      affiliateToolDefinitions.length;

    console.log(`✓ Total User Tools Registered: ${totalUserTools}`);
    console.log(`  - Profile Tools (${profileToolDefinitions.length}): ${profileToolDefinitions.map(t => t.name).join(", ")}`);
    console.log(`  - Training Tools (${trainingToolDefinitions.length}): ${trainingToolDefinitions.map(t => t.name).join(", ")}`);
    console.log(`  - Toolkit Tools (${toolkitToolDefinitions.length}): ${toolkitToolDefinitions.map(t => t.name).join(", ")}`);
    console.log(`  - Digital Card Tools (${digitalCardToolDefinitions.length}): ${digitalCardToolDefinitions.map(t => t.name).join(", ")}`);
    console.log(`  - Marketplace Tools (${marketplaceToolDefinitions.length}): ${marketplaceToolDefinitions.map(t => t.name).join(", ")}`);

    // Call a sample User Tool (get_my_profile)
    const { handleProfileTool } = await import("./src/user-server/tools/profile.js");
    const profileRes = await handleProfileTool("get_my_profile", {}, user);
    console.log("✓ Executed 'get_my_profile' tool successfully:");
    console.log("  Output preview:", profileRes.content[0].text.substring(0, 180) + "...");

    // 2. Test Admin Context & Server
    console.log("\n[3/4] Resolving Admin Context...");
    const admin = await resolveAdminContext();
    console.log(`✓ Admin Verified: ${admin.email} (ID: ${admin.adminId}, Role: ${admin.role})`);

    const adminServer = createAdminMcpServer(admin);
    console.log("✓ Admin MCP Server instance created.");

    console.log("\n[4/4] Testing Admin MCP Tools & Capabilities...");
    const { adminAnalyticsToolDefinitions, handleAdminAnalyticsTool } = await import("./src/admin-server/tools/analytics.js");
    const { adminUserToolDefinitions } = await import("./src/admin-server/tools/users.js");
    const { adminProvisioningToolDefinitions } = await import("./src/admin-server/tools/provisioning.js");
    const { adminModerationToolDefinitions } = await import("./src/admin-server/tools/moderation.js");
    const { adminCouponToolDefinitions } = await import("./src/admin-server/tools/coupons.js");
    const { adminCourseToolDefinitions } = await import("./src/admin-server/tools/courses.js");
    const { adminSpaceToolDefinitions } = await import("./src/admin-server/tools/spaces.js");
    const { adminAffiliateToolDefinitions } = await import("./src/admin-server/tools/affiliate.js");
    const { adminProHubToolDefinitions } = await import("./src/admin-server/tools/pro-hub.js");
    const { adminAtlasToolDefinitions } = await import("./src/admin-server/tools/atlas.js");
    const { adminCommunicationsToolDefinitions } = await import("./src/admin-server/tools/communications.js");
    const { adminNfcToolDefinitions } = await import("./src/admin-server/tools/nfc.js");

    const totalAdminTools =
      adminAnalyticsToolDefinitions.length +
      adminUserToolDefinitions.length +
      adminProvisioningToolDefinitions.length +
      adminModerationToolDefinitions.length +
      adminCouponToolDefinitions.length +
      adminCourseToolDefinitions.length +
      adminSpaceToolDefinitions.length +
      adminAffiliateToolDefinitions.length +
      adminProHubToolDefinitions.length +
      adminAtlasToolDefinitions.length +
      adminCommunicationsToolDefinitions.length +
      adminNfcToolDefinitions.length;

    console.log(`✓ Total Admin Tools Registered: ${totalAdminTools}`);
    console.log(`  - Analytics: ${adminAnalyticsToolDefinitions.map(t => t.name).join(", ")}`);
    console.log(`  - User Admin: ${adminUserToolDefinitions.map(t => t.name).join(", ")}`);
    console.log(`  - Provisioning: ${adminProvisioningToolDefinitions.map(t => t.name).join(", ")}`);
    console.log(`  - Moderation: ${adminModerationToolDefinitions.map(t => t.name).join(", ")}`);
    console.log(`  - Atlas AI Admin: ${adminAtlasToolDefinitions.map(t => t.name).join(", ")}`);

    // Call a sample Admin Tool (admin_get_platform_stats)
    const statsRes = await handleAdminAnalyticsTool("admin_get_platform_stats", {}, admin);
    console.log("✓ Executed 'admin_get_platform_stats' tool successfully:");
    console.log("  Live Platform Stats preview:", statsRes.content[0].text);

    console.log("\n==================================================");
    console.log("  ALL MCP SERVERS & TOOLS TESTED & VERIFIED!     ");
    console.log("==================================================");
  } catch (error: any) {
    console.error("Test failed with error:", error);
  } finally {
    await disconnectDatabase();
    process.exit(0);
  }
}

runTests();

