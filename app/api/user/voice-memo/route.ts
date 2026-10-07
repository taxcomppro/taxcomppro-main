import { validateUploads } from "@/lib/upload-security";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const MAX_BYTES = 30 * 1024 * 1024; // 30 MB (generous for a 4-min voice note)

// POST /api/user/voice-memo — upload or replace voice memo
export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file     = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "File too large (max 30 MB)" }, { status: 400 });

  const uploadError = await validateUploads([file], MAX_BYTES);
  if (uploadError) return NextResponse.json({ error: uploadError }, { status: 400 });

  const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/webm", "audio/ogg", "audio/mp4", "audio/x-m4a"];
  if (!allowedTypes.includes(file.type) && !file.type.startsWith("audio/")) {
    return NextResponse.json({ error: "Only audio files are allowed" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);
  const b64         = buffer.toString("base64");
  const dataUri     = `data:${file.type};base64,${b64}`;

  const result = await cloudinary.uploader.upload(dataUri, {
    folder:        "taxcomppro/voice-memos",
    resource_type: "video", // Cloudinary uses "video" resource type for audio
    public_id:     `voice-memo-${session.user.id}`,
    overwrite:     true,
  });

  // Save URL to user record
  await prisma.user.update({
    where: { id: session.user.id },
    data:  { voiceMemoUrl: result.secure_url },
  });

  return NextResponse.json({ url: result.secure_url });
}

// DELETE /api/user/voice-memo — remove voice memo
export async function DELETE(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await prisma.user.update({
    where: { id: session.user.id },
    data:  { voiceMemoUrl: null },
  });

  return NextResponse.json({ ok: true });
}
