import { cookies, headers } from "next/headers";
import { db } from "@/lib/db";
import { SESSION_COOKIE, verifySession, type SessionPayload } from "./server";

export interface CurrentUser {
  id: string;
  email: string;
  name: string;
  role: "ADMIN" | "STUDENT" | "UNIVERSITY" | "INSTRUCTOR";
  phone: string | null;
  bio: string | null;
  profilePhoto: string | null;
  universityId: string | null;
  universityName: string | null;
  universityLogo: string | null;
  assignedCourseIds?: string[];
}

function parseAssignedCourseIds(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  let token = cookieStore.get(SESSION_COOKIE)?.value;
  if (!token) {
    const reqHeaders = await headers();
    const authHeader = reqHeaders.get("authorization");
    if (authHeader && authHeader.toLowerCase().startsWith("bearer ")) {
      token = authHeader.slice(7).trim();
    }
  }
  if (!token) return null;
  return verifySession(token);
}

export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getSession();
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      phone: true,
      bio: true,
      profilePhoto: true,
      university: { select: { id: true, name: true, logo: true } },
      instructor: {
        select: {
          isActive: true,
          assignedCourseIds: true,
          university: { select: { id: true, name: true, logo: true } },
        },
      },
    },
  });
  if (!user) return null;
  if (user.role === "INSTRUCTOR" && user.instructor && !user.instructor.isActive) {
    return null;
  }
  const uni = user.university ?? user.instructor?.university ?? null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role as "ADMIN" | "STUDENT" | "UNIVERSITY" | "INSTRUCTOR",
    phone: user.phone,
    bio: user.bio,
    profilePhoto: user.profilePhoto,
    universityId: uni?.id ?? null,
    universityName: uni?.name ?? null,
    universityLogo: uni?.logo ?? null,
    assignedCourseIds:
      user.role === "INSTRUCTOR"
        ? parseAssignedCourseIds(user.instructor?.assignedCourseIds)
        : undefined,
  };
}

export async function requireAdmin(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "ADMIN") {
    throw new Error("ADMIN_ONLY");
  }
  return user;
}

export async function requireStudent(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "STUDENT") {
    throw new Error("STUDENT_ONLY");
  }
  return user;
}

export async function requireUniversity(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (
    !user ||
    (user.role !== "UNIVERSITY" && user.role !== "INSTRUCTOR") ||
    !user.universityId
  ) {
    throw new Error("UNIVERSITY_ONLY");
  }
  return user;
}

export async function requireInstructor(): Promise<CurrentUser> {
  const user = await requireUniversity();
  if (user.role !== "INSTRUCTOR") {
    throw new Error("INSTRUCTOR_ONLY");
  }
  return user;
}

export async function requireUniversityOwner(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (!user || user.role !== "UNIVERSITY" || !user.universityId) {
    throw new Error("UNIVERSITY_ONLY");
  }
  return user;
}

export async function requireUniversityCourseAccess(
  courseId: string
): Promise<CurrentUser> {
  const user = await requireUniversity();
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { universityId: true },
  });
  if (!course || course.universityId !== user.universityId) {
    throw new Error("COURSE_NOT_FOUND");
  }
  if (!canInstructorAccessCourse(user, courseId)) {
    throw new Error("COURSE_ACCESS_DENIED");
  }
  return user;
}

export async function requireAssignedInstructorCourseAccess(
  courseId: string
): Promise<CurrentUser> {
  const user = await requireInstructor();
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: { universityId: true },
  });
  if (!course || course.universityId !== user.universityId) {
    throw new Error("COURSE_NOT_FOUND");
  }
  if (!canInstructorAccessCourse(user, courseId)) {
    throw new Error("COURSE_ACCESS_DENIED");
  }
  return user;
}

export function canInstructorAccessCourse(
  user: CurrentUser,
  courseId: string
): boolean {
  if (user.role !== "INSTRUCTOR") return true;
  if (!user.assignedCourseIds || user.assignedCourseIds.length === 0) {
    return false;
  }
  return user.assignedCourseIds.includes(courseId);
}

/** Allow either ADMIN, UNIVERSITY, or INSTRUCTOR role (for shared endpoints). */
export async function requireAdminOrUniversity(): Promise<CurrentUser> {
  const user = await getCurrentUser();
  if (
    !user ||
    (user.role !== "ADMIN" && user.role !== "UNIVERSITY" && user.role !== "INSTRUCTOR")
  ) {
    throw new Error("ADMIN_OR_UNIVERSITY_ONLY");
  }
  return user;
}

export interface StudentSubscriptionInfo {
  subscriptionId: string;
  planId: string;
  planName: string;
  planPrice: number;
  planCurrency: string;
  planDuration: number;
  planDurationUnit: string;
  startDate: Date;
  expiryDate: Date;
  status: "ACTIVE" | "EXPIRED";
  remainingDays: number;
  elapsedPercent: number;
}

export async function getStudentSubscription(
  studentId: string
): Promise<StudentSubscriptionInfo | null> {
  // Get most recent subscription (active or expired)
  const sub = await db.subscription.findFirst({
    where: { studentId },
    orderBy: { createdAt: "desc" },
  });
  if (!sub) return null;

  // Update status if expired
  const now = new Date();
  let status: "ACTIVE" | "EXPIRED" =
    sub.status === "ACTIVE" && now < sub.expiryDate ? "ACTIVE" : "EXPIRED";
  if (sub.status !== status) {
    await db.subscription.update({
      where: { id: sub.id },
      data: { status },
    });
  }

  const remainingMs = sub.expiryDate.getTime() - now.getTime();
  const remainingDays = Math.max(0, Math.ceil(remainingMs / (1000 * 60 * 60 * 24)));
  const totalMs = sub.expiryDate.getTime() - sub.startDate.getTime();
  const elapsedMs = now.getTime() - sub.startDate.getTime();
  const elapsedPercent = Math.min(100, Math.max(0, (elapsedMs / totalMs) * 100));

  return {
    subscriptionId: sub.id,
    planId: sub.planId,
    planName: sub.planName,
    planPrice: sub.planPrice,
    planCurrency: sub.planCurrency,
    planDuration: sub.planDuration,
    planDurationUnit: sub.planDurationUnit,
    startDate: sub.startDate,
    expiryDate: sub.expiryDate,
    status,
    remainingDays,
    elapsedPercent,
  };
}

export async function isSubscriptionActive(studentId: string): Promise<boolean> {
  const sub = await getStudentSubscription(studentId);
  return sub?.status === "ACTIVE";
}

export interface ApiError {
  error: string;
  code?: string;
}

export function errorResponse(message: string, status = 400, code?: string) {
  return Response.json({ error: message, code }, { status });
}

export async function handleAuthError(e: unknown) {
  if (e instanceof Error) {
    if (e.message === "ADMIN_ONLY") return errorResponse("Admin access required", 403, "ADMIN_ONLY");
    if (e.message === "STUDENT_ONLY") return errorResponse("Student access required", 403, "STUDENT_ONLY");
    if (e.message === "UNIVERSITY_ONLY") return errorResponse("University access required", 403, "UNIVERSITY_ONLY");
    if (e.message === "INSTRUCTOR_ONLY") return errorResponse("Instructor access required", 403, "INSTRUCTOR_ONLY");
    if (e.message === "ADMIN_OR_UNIVERSITY_ONLY") return errorResponse("Admin or university access required", 403, "ADMIN_OR_UNIVERSITY_ONLY");
    if (e.message === "COURSE_NOT_FOUND") return errorResponse("Course not found", 404, "COURSE_NOT_FOUND");
    if (e.message === "COURSE_ACCESS_DENIED") return errorResponse("You are not assigned to this course", 403, "COURSE_ACCESS_DENIED");
  }
  return null;
}
