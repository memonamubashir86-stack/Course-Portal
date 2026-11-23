import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import { resolveUploadFilePath } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MIME_BY_EXT: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
  ".svg": "image/svg+xml",
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain; charset=utf-8",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".mkv": "video/x-matroska",
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  try {
    const { path: segments } = await params;
    if (!Array.isArray(segments) || segments.length === 0) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const relPath = `/api/uploads/${segments.map((s) => encodeURIComponent(s)).join("/")}`;
    const filePath = await resolveUploadFilePath(relPath);
    if (!filePath) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    const stat = await fs.stat(filePath);
    const totalSize = stat.size;
    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_BY_EXT[ext] || "application/octet-stream";

    const url = new URL(req.url);
    const forceDownload = url.searchParams.get("download") === "1";
    const requestedName = url.searchParams.get("filename")?.trim();
    const baseName = requestedName
      ? requestedName.replace(/[^a-zA-Z0-9._-]+/g, "_")
      : path.basename(filePath);

    const commonHeaders: Record<string, string> = {
      "Content-Type": contentType,
      "Accept-Ranges": "bytes",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": forceDownload
        ? "no-store"
        : "public, max-age=31536000, immutable",
    };

    if (forceDownload) {
      commonHeaders["Content-Disposition"] = `attachment; filename="${baseName}"`;
    }

    const rangeHeader = req.headers.get("range");
    if (rangeHeader && totalSize > 0) {
      const match = /^bytes=(\d*)-(\d*)$/i.exec(rangeHeader.trim());
      if (match) {
        const start = match[1] ? parseInt(match[1], 10) : 0;
        const end = match[2]
          ? Math.min(parseInt(match[2], 10), totalSize - 1)
          : totalSize - 1;

        if (!Number.isNaN(start) && !Number.isNaN(end) && start <= end && start < totalSize) {
          const chunkSize = end - start + 1;
          const handle = await fs.open(filePath, "r");
          try {
            const buf = Buffer.allocUnsafe(chunkSize);
            await handle.read(buf, 0, chunkSize, start);
            return new Response(buf, {
              status: 206,
              headers: {
                ...commonHeaders,
                "Content-Range": `bytes ${start}-${end}/${totalSize}`,
                "Content-Length": String(chunkSize),
              },
            });
          } finally {
            await handle.close();
          }
        }
      }
    }

    const fileBuf = await fs.readFile(filePath);
    return new Response(fileBuf, {
      status: 200,
      headers: {
        ...commonHeaders,
        "Content-Length": String(fileBuf.length),
      },
    });
  } catch (e) {
    console.error("[api/uploads GET]", e);
    return NextResponse.json({ error: "Failed to read file" }, { status: 500 });
  }
}
