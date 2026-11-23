import { promises as fs } from "fs";
import path from "path";
import { db } from "@/lib/db";
import { requireStudent, handleAuthError, errorResponse } from "@/lib/auth";
import { canStudentAccessCourse, isCourseCompletedByStudent } from "@/lib/course-utils";
import { isAbsoluteUrl, resolveUploadFilePath } from "@/lib/storage";

export const dynamic = "force-dynamic";

const MIME_BY_EXT: Record<string, string> = {
  ".pdf": "application/pdf",
  ".doc": "application/msword",
  ".docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  ".ppt": "application/vnd.ms-powerpoint",
  ".pptx": "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  ".txt": "text/plain; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").replace(/^_+|_+$/g, "") || "assignment";
}

/**
 * GET /api/student/assignments/[id]/download
 * Downloads the exact assignment file uploaded by the instructor (or falls back
 * to a generated .txt brief only when no attachment file exists).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireStudent();
    const { id } = await params;

    const assignment = await db.assignment.findUnique({
      where: { id },
      include: {
        course: { select: { id: true, title: true } },
      },
    });
    if (!assignment || !assignment.isPublished) {
      return errorResponse("Assignment not found", 404);
    }

    const access = await canStudentAccessCourse(user.id, assignment.courseId);
    if (!access.allowed) {
      return errorResponse(access.reason || "Not allowed", 403, "NO_ACCESS");
    }

    const completed = await isCourseCompletedByStudent(user.id, assignment.courseId);
    if (!completed) {
      return errorResponse(
        "Complete all course lessons before downloading this assignment",
        403,
        "COURSE_NOT_COMPLETED"
      );
    }

    const baseTitle = sanitizeFilename(assignment.title || "assignment");

    if (assignment.fileUrl) {
      if (isAbsoluteUrl(assignment.fileUrl)) {
        const upstream = await fetch(assignment.fileUrl);
        if (!upstream.ok) {
          return errorResponse("Failed to retrieve assignment file", 502);
        }
        const buf = Buffer.from(await upstream.arrayBuffer());
        let ext = "";
        try {
          ext = path.extname(new URL(assignment.fileUrl).pathname).toLowerCase();
        } catch {
          ext = "";
        }
        const contentType =
          upstream.headers.get("content-type") ||
          MIME_BY_EXT[ext] ||
          "application/octet-stream";
        return new Response(buf, {
          status: 200,
          headers: {
            "Content-Type": contentType,
            "Content-Length": String(buf.length),
            "Content-Disposition": `attachment; filename="${baseTitle}${ext}"`,
            "Cache-Control": "no-store",
            "X-Content-Type-Options": "nosniff",
          },
        });
      }

      const filePath = await resolveUploadFilePath(assignment.fileUrl);
      if (!filePath) {
        return errorResponse("Uploaded assignment file not found on server", 404);
      }

      const fileBuf = await fs.readFile(filePath);
      const ext = path.extname(filePath).toLowerCase();
      const contentType = MIME_BY_EXT[ext] || "application/octet-stream";

      return new Response(fileBuf, {
        status: 200,
        headers: {
          "Content-Type": contentType,
          "Content-Length": String(fileBuf.length),
          "Content-Disposition": `attachment; filename="${baseTitle}${ext}"`,
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      });
    }

    // No uploaded file attached — generate structured brief text
    const lines = [
      `Course: ${assignment.course.title}`,
      `Assignment: ${assignment.title}`,
      assignment.dueDate
        ? `Due Date: ${new Date(assignment.dueDate).toISOString().slice(0, 10)}`
        : null,
      "",
      assignment.description ? `Description:\n${assignment.description}` : null,
      assignment.instructions ? `\nInstructions:\n${assignment.instructions}` : null,
    ]
      .filter((v): v is string => v !== null)
      .join("\n");

    const textBuf = Buffer.from(lines, "utf-8");
    return new Response(textBuf, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Length": String(textBuf.length),
        "Content-Disposition": `attachment; filename="${baseTitle}.txt"`,
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (e) {
    const authErr = await handleAuthError(e);
    if (authErr) return authErr;
    console.error("[student/assignments download GET]", e);
    return errorResponse("Failed to download assignment", 500);
  }
}
