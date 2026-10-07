const MiB = 1024 * 1024;
const formats: Record<string, string[]> = {
  "image/jpeg": ["jpg", "jpeg"], "image/png": ["png"], "image/gif": ["gif"], "image/webp": ["webp"], "image/avif": ["avif"], "image/heic": ["heic"], "image/heif": ["heif"],
  "application/pdf": ["pdf"], "text/plain": ["txt"], "text/csv": ["csv"],
  "application/zip": ["zip"], "application/x-zip-compressed": ["zip"],
  "application/msword": ["doc"], "application/vnd.ms-excel": ["xls"], "application/vnd.ms-powerpoint": ["ppt"],
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": ["docx"],
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ["xlsx"],
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": ["pptx"],
  "video/mp4": ["mp4", "m4v"], "video/webm": ["webm"], "video/quicktime": ["mov"],
  "audio/mpeg": ["mp3"], "audio/mp3": ["mp3"], "audio/wav": ["wav"], "audio/x-wav": ["wav"], "audio/webm": ["webm"], "audio/ogg": ["ogg", "oga"], "audio/mp4": ["m4a", "mp4"], "audio/x-m4a": ["m4a"],
};

/** Validate before reading entire files or sending them to the media provider. */
export async function validateUploads(files: unknown[], maxBytes = 25 * MiB): Promise<string | null> {
  let total = 0;
  for (const value of files) {
    if (!(value instanceof File)) return "Please choose a valid file.";
    const file = value;
    if (!file.size || file.size > maxBytes) return `Files must be between 1 byte and ${Math.floor(maxBytes / MiB)} MB.`;
    total += file.size;
    if (total > 45 * MiB) return "Please upload fewer files at once (45 MB total maximum).";
    const mime = file.type.toLowerCase().split(";")[0];
    const ext = file.name.toLowerCase().split(".").pop() || "";
    if (!formats[mime]?.includes(ext)) return "Unsupported file type. Choose an image, document, audio or video file with a matching extension.";
    const bytes = Buffer.from(await file.slice(0, 512).arrayBuffer());
    const hex = bytes.subarray(0, 12).toString("hex");
    const text = bytes.toString("utf8");
    if (/^\s*(?:<!doctype\s+html|<html|<script|<svg|<\?xml)/i.test(text) || hex.startsWith("4d5a") || hex.startsWith("7f454c46")) return "Executable files and active web content are not allowed.";
    let matches = true;
    if (mime === "image/jpeg") matches = hex.startsWith("ffd8ff");
    else if (mime === "image/png") matches = hex.startsWith("89504e470d0a1a0a");
    else if (mime === "image/gif") matches = /^GIF8[79]a/.test(text);
    else if (mime === "image/webp") matches = text.startsWith("RIFF") && text.slice(8, 12) === "WEBP";
    else if (mime === "application/pdf") matches = text.startsWith("%PDF-");
    else if (mime.includes("zip") || mime.includes("openxmlformats")) matches = /^504b(?:0304|0506|0708)/.test(hex);
    else if (["application/msword", "application/vnd.ms-excel", "application/vnd.ms-powerpoint"].includes(mime)) matches = hex.startsWith("d0cf11e0a1b11ae1");
    else if (mime.includes("webm")) matches = hex.startsWith("1a45dfa3");
    else if (mime === "audio/ogg") matches = text.startsWith("OggS");
    else if (mime.includes("wav")) matches = text.startsWith("RIFF") && text.slice(8,12) === "WAVE";
    else if (mime === "audio/mpeg" || mime === "audio/mp3") matches = text.startsWith("ID3") || (bytes[0] === 255 && (bytes[1] & 224) === 224);
    else if (["image/avif", "image/heic", "image/heif", "video/mp4", "video/quicktime", "audio/mp4", "audio/x-m4a"].includes(mime)) matches = text.slice(4,8) === "ftyp";
    if (!matches) return "The file content does not match its file type.";
  }
  return null;
}
