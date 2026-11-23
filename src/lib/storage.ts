import { promises as fs } from "fs";
import path from "path";
import crypto from "crypto";

const UPLOAD_DIR = path.resolve(process.cwd(), "public", "uploads");
const FALLBACK_UPLOAD_DIR = path.resolve(process.cwd(), "uploads");
const PUBLIC_PREFIX = "/api/uploads";

export async function ensureUploadDir() {
  await fs.mkdir(UPLOAD_DIR, { recursive: true });
}

export function isAbsoluteUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

/**
 * Safely resolves an uploaded asset URL (`/api/uploads/...` or legacy `/uploads/...`)
 * to an existing file path on disk inside `public/uploads` (or `uploads/`).
 * Returns null if the URL is external, invalid, or the file does not exist.
 */
export async function resolveUploadFilePath(urlOrPath: string): Promise<string | null> {
  if (!urlOrPath || isAbsoluteUrl(urlOrPath) || urlOrPath.startsWith("data:")) {
    return null;
  }

  // Strip query string / hash if present
  const cleanUrl = urlOrPath.split("?")[0].split("#")[0];
  let rel = cleanUrl;
  if (rel.startsWith("/api/uploads/")) {
    rel = rel.slice("/api/uploads/".length);
  } else if (rel.startsWith("/uploads/")) {
    rel = rel.slice("/uploads/".length);
  } else {
    rel = rel.replace(/^\/+/, "");
  }

  let decodedRel: string;
  try {
    decodedRel = decodeURIComponent(rel);
  } catch {
    decodedRel = rel;
  }

  const segments = decodedRel.split(/[/\\]+/).filter(Boolean);
  if (segments.length === 0 || segments.some((s) => s === "." || s === ".." || s.includes("\0"))) {
    return null;
  }

  for (const root of [UPLOAD_DIR, FALLBACK_UPLOAD_DIR]) {
    const candidate = path.resolve(root, ...segments);
    if (!candidate.startsWith(root + path.sep)) continue;
    try {
      const stat = await fs.stat(candidate);
      if (stat.isFile()) {
        return candidate;
      }
    } catch {
      // Try next root
    }
  }

  return null;
}

export async function saveUploadedFile(
  file: File,
  subDir: string = ""
): Promise<{ url: string; size: number; ext: string }> {
  await ensureUploadDir();
  const safeSubDir = subDir.replace(/^\/+|\/+$/g, "");
  const targetDir = safeSubDir ? path.join(UPLOAD_DIR, safeSubDir) : UPLOAD_DIR;
  await fs.mkdir(targetDir, { recursive: true });

  const ext = path.extname(file.name) || "";
  const safeExt = ext.toLowerCase().replace(/[^a-z0-9.]/g, "");
  const name = `${Date.now()}-${crypto.randomBytes(6).toString("hex")}${safeExt}`;
  const filePath = path.join(targetDir, name);

  const buffer = Buffer.from(await file.arrayBuffer());
  await fs.writeFile(filePath, buffer);

  const url = `${PUBLIC_PREFIX}${safeSubDir ? "/" + safeSubDir : ""}/${name}`;
  return { url, size: buffer.length, ext: safeExt };
}

export const ALLOWED_VIDEO_EXT = [".mp4", ".webm", ".mov", ".mkv"];
export const ALLOWED_DOC_EXT = [".pdf", ".doc", ".docx", ".ppt", ".pptx", ".txt"];
export const ALLOWED_IMAGE_EXT = [".jpg", ".jpeg", ".png", ".webp", ".gif", ".svg"];

export function validateExt(ext: string, allowed: string[]): boolean {
  return allowed.includes(ext.toLowerCase());
}

export function bytesToMB(bytes: number): number {
  return bytes / (1024 * 1024);
}
