import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

import { NextRequest } from "next/server";
import { guardAuthRequest } from "@/lib/auth-request-guard";
const handlers = toNextJsHandler(auth);
export const GET = handlers.GET;
export async function POST(request: NextRequest) {
  const rejected = await guardAuthRequest(request);
  return rejected || handlers.POST(request);
}
