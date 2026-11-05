# TaxComPro Professional Model Context Protocol (MCP) Servers

Two production-grade, enterprise-ready Model Context Protocol (MCP) servers tailored for the **TaxComPro** ecosystem:
1. **User MCP Server (`taxcomppro-user-mcp`)**: Empowers any registered TaxComPro practitioner or member to connect their favorite LLM (Claude Desktop, Cursor, Windsurf, ChatGPT, LibreChat, Cline) directly to their practice profile, enrolled courses, toolkits, ProConnect digital cards, network feeds, live spaces, and compliance support.
2. **Admin MCP Server (`taxcomppro-admin-mcp`)**: Empowers TaxComPro administrators to execute platform-wide operations, order and license provisioning, user role & tier management, moderation, affiliate payouts, coupons, live spaces, and Atlas AI knowledge base curation through an AI assistant.

---

## 🏛️ Architecture Overview

```
                      ┌──────────────────────────────────────────────┐
                      │    Any LLM Client (Claude / Cursor / etc.)   │
                      └──────────────────────┬───────────────────────┘
                                             │ JSON-RPC (stdio)
                     ┌───────────────────────┴───────────────────────┐
                     ▼                                               ▼
         ┌─────────────────────────┐                     ┌─────────────────────────┐
         │   TaxComPro User MCP    │                     │   TaxComPro Admin MCP   │
         │   (48 Scoped Tools)     │                     │  (44 Executive Tools)   │
         └───────────┬─────────────┘                     └───────────┬─────────────┘
                     │ Scoped to User Context                        │ Role: ADMIN Verified
                     └───────────────────────┬───────────────────────┘
                                             ▼
                                 ┌───────────────────────┐
                                 │   Prisma ORM Client   │
                                 └───────────┬───────────┘
                                             ▼
                               ┌───────────────────────────┐
                               │   PostgreSQL (Neon DB)    │
                               │  135+ Users, Practice     │
                               │  Toolkits & Subscriptions │
                               └───────────────────────────┘
```

---

## 🚀 Quickstart

### 1. Compile and Build
```bash
cd taxcomppro-mcp
npm install
npm run build
```

### 2. Run User MCP Server
```bash
# Direct TypeScript execution:
npx tsx src/cli/run-user.ts

# Or compiled production bundle:
npm run user:prod
```

### 3. Run Admin MCP Server
```bash
# Direct TypeScript execution:
npx tsx src/cli/run-admin.ts

# Or compiled production bundle:
npm run admin:prod
```

### 4. Run Test Suite
```bash
npx tsx test-servers.ts
```

---

## 🛠️ User MCP Server (`taxcomppro-user-mcp`)

Strictly tenant-isolated: a connected user can only access and modify their own account data and authorized platform services.

### 48 Tools Across 9 Core Domains:

| Domain | Tools | Description |
|---|---|---|
| **Identity & Profile** | `get_my_profile`<br>`update_my_profile`<br>`get_my_subscriptions`<br>`list_my_notifications`<br>`mark_notification_read` | Inspect account, tier, profile, active Stripe subscription, and notifications. |
| **Academy & Training** | `list_enrolled_courses`<br>`get_course_curriculum`<br>`get_lesson`<br>`update_lesson_progress`<br>`get_course_quiz`<br>`submit_quiz_attempt`<br>`list_my_certificates`<br>`verify_certificate` | Study courses, check lessons, take quizzes, complete modules, and inspect certificates. |
| **Practice Defense Toolkits** | `list_my_toolkits`<br>`get_toolkit_assets`<br>`get_my_training_licenses`<br>`list_my_staff_invitations`<br>`invite_staff_member`<br>`get_staff_member_progress` | Access IRS Audit Playbook, Schedule C Reconstruction, IRS Fine Defense, and manage staff training seats. |
| **ProConnect Digital Cards** | `get_my_digital_card`<br>`update_my_digital_card`<br>`add_card_link`<br>`update_card_link`<br>`delete_card_link`<br>`get_card_analytics` | Manage public digital card, custom links, booking URLs, and view NFC tap & scan analytics. |
| **Marketplace** | `search_marketplace`<br>`get_listing_details`<br>`list_my_purchases`<br>`list_my_seller_listings`<br>`create_marketplace_listing`<br>`validate_coupon` | Search services/tools, view receipts, submit listings for review, and test discount coupons. |
| **ProNetworks & Feeds** | `list_my_networks`<br>`get_network_details`<br>`get_network_discussions`<br>`post_discussion`<br>`reply_to_discussion`<br>`list_network_events`<br>`rsvp_to_network_event` | Participate in private professional networks, post questions, and attend events. |
| **Spaces & ProTalks** | `list_upcoming_spaces`<br>`get_space_details`<br>`rsvp_to_space`<br>`get_my_space_tickets` | Discover live audio/video rooms, masterminds, reserve seats, and join sessions. |
| **Support & Atlas AI** | `ask_atlas_tax_expert`<br>`create_support_ticket`<br>`list_my_support_tickets` | Query the verified compliance AI knowledge base or submit support tickets. |
| **Affiliate Center** | `get_affiliate_overview`<br>`list_my_referrals`<br>`request_affiliate_payout` | Track commission earnings, referrals, and request commission payouts. |

---

## ⚡ Admin MCP Server (`taxcomppro-admin-mcp`)

Protected by role verification (`role === "ADMIN"`). Exposes complete supervisory control over the platform.

### 44 Executive Tools Across 12 Domains:

| Domain | Tools | Description |
|---|---|---|
| **Platform Analytics** | `admin_get_platform_stats`<br>`admin_get_activity_logs` | Real-time KPIs, user growth, subscription counts, revenue stats, and audit logs. |
| **User Administration** | `admin_list_users`<br>`admin_get_user_details`<br>`admin_update_user_role`<br>`admin_update_user_tier`<br>`admin_grant_toolkit_access` | Search 135+ users, change roles (`MEMBER`/`ADMIN`), upgrade tiers, grant toolkits. |
| **Order Provisioning** | `admin_provision_order`<br>`admin_list_licenses` | Provision product bundles (Ultimate Bundle, IRS Fine Defense, etc.), allocate seats, and enroll users. |
| **Marketplace Moderation** | `admin_list_pending_listings`<br>`admin_moderate_listing`<br>`admin_list_featured_requests`<br>`admin_moderate_featured_request` | Approve or reject vendor listings and manage featured promotion requests. |
| **Coupons & Discounts** | `admin_list_coupons`<br>`admin_create_coupon`<br>`admin_toggle_coupon` | Create percentage/fixed discount codes, set expiration and max uses. |
| **Course Authoring** | `admin_list_courses`<br>`admin_create_course`<br>`admin_update_course`<br>`admin_list_certificates` | Publish courses, manage curriculum, and audit issued certificates. |
| **Spaces & ProTalks** | `admin_list_spaces`<br>`admin_create_space`<br>`admin_get_space_attendance`<br>`admin_close_space` | Schedule live talks, monitor room attendance, and manage ticket capacity. |
| **Affiliate Operations** | `admin_list_affiliates`<br>`admin_list_pending_payouts`<br>`admin_process_payout`<br>`admin_update_affiliate_settings` | Review affiliate commissions, approve/pay requests, and configure commission rates. |
| **Pro Applications & Ads** | `admin_list_pro_applications`<br>`admin_moderate_pro_application`<br>`admin_list_pro_ads`<br>`admin_moderate_pro_ad` | Moderate verified professional applications and approve sidebar/feed ads. |
| **Atlas AI Knowledge Base** | `admin_list_knowledge_items`<br>`admin_create_knowledge_item`<br>`admin_update_knowledge_item`<br>`admin_delete_knowledge_item`<br>`admin_list_unanswered_questions`<br>`admin_resolve_unanswered_question` | Curate official tax answers and convert user questions into permanent AI knowledge base entries. |
| **Communications & Desk** | `admin_list_support_tickets`<br>`admin_update_support_ticket`<br>`admin_list_email_templates`<br>`admin_create_message_blast` | Manage helpdesk tickets and broadcast notification blasts to members. |
| **NFC Card Inventory** | `admin_list_nfc_cards`<br>`admin_bind_nfc_card` | Pair physical NFC tap cards with digital card usernames. |

---

## 🔌 Connecting to LLM Clients

### 1. Claude Desktop
Add to `%APPDATA%\Claude\claude_desktop_config.json`:

```json
{
  "mcpServers": {
    "taxcomppro-user": {
      "command": "node",
      "args": [
        "c:/Users/naeem/OneDrive/Desktop/taxcompro workspace/taxcomppro-mcp/dist/cli/run-user.js"
      ],
      "env": {
        "TAXCOMPRO_USER_EMAIL": "your-email@example.com"
      }
    },
    "taxcomppro-admin": {
      "command": "node",
      "args": [
        "c:/Users/naeem/OneDrive/Desktop/taxcompro workspace/taxcomppro-mcp/dist/cli/run-admin.js"
      ],
      "env": {
        "TAXCOMPRO_ADMIN_EMAIL": "tetralioncapital@gmail.com"
      }
    }
  }
}
```

### 2. Cursor
Add to `.cursor/mcp.json` or Cursor Settings -> Features -> MCP Servers:

```json
{
  "mcpServers": {
    "taxcomppro-admin": {
      "command": "node",
      "args": [
        "c:/Users/naeem/OneDrive/Desktop/taxcompro workspace/taxcomppro-mcp/dist/cli/run-admin.js"
      ]
    }
  }
}
```

### 3. Windsurf
Add to `~/.codeium/windsurf/mcp_config.json`:

```json
{
  "mcpServers": {
    "taxcomppro-user": {
      "command": "node",
      "args": [
        "c:/Users/naeem/OneDrive/Desktop/taxcompro workspace/taxcomppro-mcp/dist/cli/run-user.js"
      ]
    }
  }
}
```

---

## 🛡️ Security & Privacy

1. **Clean JSON-RPC Communication**: All startup messages, logs, and diagnostics are routed exclusively to `process.stderr`. `process.stdout` remains pristine for the Model Context Protocol JSON-RPC standard.
2. **Access Control**:
   - `taxcomppro-user-mcp` is scoped strictly to the authenticated user's ID. Users cannot access other practitioners' assets, licenses, or administrative functions.
   - `taxcomppro-admin-mcp` queries the database during initialization and verifies `user.role === 'ADMIN'`. If the user is not an admin, startup immediately halts.
3. **Database Safeguards**: Uses a PostgreSQL connection pool configured to prevent connection exhaustion.

