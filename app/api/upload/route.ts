import { validateUploads } from "@/lib/upload-security";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import sharp from "sharp";

export const dynamic = "force-dynamic";

cloudinary.config({
  cloud_name: process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

function uploadBufferToCloudinary(buffer: Buffer, folder: string, isImage: boolean): Promise<UploadApiResponse> {
  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: isImage ? "image" : "auto",
        ...(isImage ? { format: "webp" } : {}),
      },
      (error, result) => {
        if (error || !result) {
          reject(error || new Error("Upload failed with no result"));
        } else {
          resolve(result);
        }
      }
    );
    stream.end(buffer);
  });
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth.api.getSession({ headers: req.headers });
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    let files = formData.getAll("files") as File[];
    if (!files.length) {
      files = formData.getAll("file") as File[];
    }
    const folder = (formData.get("folder") as string | null) ?? "taxcomppro/posts";

    const folderMap: Record<string, string> = {
      "course-thumbnails": "taxcomppro/course-thumbnails",
      "course-articles": "taxcomppro/course-articles",
      "licenses": "taxcomppro/licenses",
      "documents": "taxcomppro/documents",
    };
    if (!/^(?:taxcomppro\/)?[a-zA-Z0-9_-]+(?:\/[a-zA-Z0-9_-]+){0,3}$/.test(folder)) return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
    const cloudFolder = folderMap[folder] ?? (folder.startsWith("taxcomppro/") ? folder : `taxcomppro/${folder}`);

    if (!files.length) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }
    if (files.length > 4) {
      return NextResponse.json({ error: "Max 4 files allowed per upload" }, { status: 400 });
    }

  const uploadError = await validateUploads(files, 25 * 1024 * 1024);
  if (uploadError) return NextResponse.json({ error: uploadError }, { status: 400 });

    const urls: string[] = [];

    for (const file of files) {
      const arrayBuffer = await file.arrayBuffer();
      let buffer: Buffer = Buffer.from(arrayBuffer);
      const isImage = file.type.startsWith("image/") && !file.type.includes("svg");

      if (isImage) {
        try {
          const sharpBuffer = await sharp(buffer)
            .rotate() // Auto-orient based on EXIF
            .resize({ width: 1920, height: 1920, fit: "inside", withoutEnlargement: true })
            .webp({ quality: 88 })
            .toBuffer();
          buffer = Buffer.from(sharpBuffer);
        } catch {
          console.warn("Invalid image upload rejected");
          return NextResponse.json({ error: "This image could not be processed." }, { status: 400 });
        }
      }

      const result = await uploadBufferToCloudinary(buffer, cloudFolder, isImage);
      urls.push(result.secure_url);
    }

    return NextResponse.json({ url: urls[0], urls });
  } catch (err: unknown) {
    console.error("Cloudinary upload error:", err);
    const message = "Failed to upload file. Please try again.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
