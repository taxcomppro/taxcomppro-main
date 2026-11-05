export interface McpToolResponse {
  content: Array<{
    type: "text";
    text: string;
  }>;
  isError?: boolean;
  [key: string]: unknown;
}

export interface UserSessionContext {
  userId: string;
  email: string;
  name: string | null;
  role: "MEMBER" | "ADMIN";
  tier: "FREE" | "VIP" | "MARKETPLACE" | "MARKETPLACE_PLUS";
}

export interface AdminSessionContext {
  adminId: string;
  email: string;
  name: string | null;
  role: "ADMIN";
}

export function formatSuccess(data: unknown, message?: string): McpToolResponse {
  const payload = {
    success: true,
    ...(message ? { message } : {}),
    data,
  };
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export function formatError(message: string, details?: unknown): McpToolResponse {
  const payload = {
    success: false,
    error: message,
    ...(details ? { details } : {}),
  };
  return {
    content: [
      {
        type: "text",
        text: JSON.stringify(payload, null, 2),
      },
    ],
    isError: true,
  };
}
