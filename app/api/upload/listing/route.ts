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

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });

  const uploadError = await validateUploads([file], 15 * 1024 * 1024);
  if (uploadError) return NextResponse.json({ error: uploadError }, { status: 400 });

  // 15 MB server-side limit
  if (file.size > 15 * 1024 * 1024)
    return NextResponse.json({ error: "File too large — max 15 MB" }, { status: 413 });

  const arrayBuffer = await file.arrayBuffer();
  const buffer      = Buffer.from(arrayBuffer);
  const b64         = buffer.toString("base64");
  const dataUri     = `data:${file.type || "application/octet-stream"};base64,${b64}`;

  const isImage = file.type.startsWith("image/");
  const result  = await cloudinary.uploader.upload(dataUri, {
    folder:        "taxcomppro/listings",
    resource_type: isImage ? "image" : "auto",
    ...(isImage ? { transformation: [{ width: 1400, height: 560, crop: "limit", quality: "auto:good", fetch_format: "auto" }] } : {}),
  });

  return NextResponse.json({ url: result.secure_url });
}

