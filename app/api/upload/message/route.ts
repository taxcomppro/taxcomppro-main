import { validateUploads } from "@/lib/upload-security";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { v2 as cloudinary } from "cloudinary";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: req.headers });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const uploadError = await validateUploads([file], 25 * 1024 * 1024);
  if (uploadError) return NextResponse.json({ error: uploadError }, { status: 400 });

  // Max 25 MB
  if (file.size > 25 * 1024 * 1024) {
    return NextResponse.json({ error: "File too large (max 25 MB)" }, { status: 400 });
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const b64 = buffer.toString("base64");
  const dataUri = `data:${file.type};base64,${b64}`;

  const isImage = file.type.startsWith("image/");

  // Images → resource_type "image" (with optimization)
  // PDFs, docs, zips, etc. → resource_type "raw" → gets /raw/upload/ URL with correct content-type
  const result = await cloudinary.uploader.upload(dataUri, {
    folder:        "taxcomppro/messages",
    resource_type: isImage ? "image" : "raw",
    ...(isImage
      ? { transformation: [{ width: 1400, crop: "limit", quality: "auto:good" }] }
      : {}),
  });

  return NextResponse.json({
    url:      result.secure_url,
    fileType: file.type,
    fileName: file.name,
  });
}
