import { db } from "@/lib/db";

interface CourseStaffNotification {
  courseId: string;
  excludeUserId?: string;
  type: string;
  title: string;
  content: string;
  relatedId?: string;
}

export async function notifyCourseStaff({
  courseId,
  excludeUserId,
  type,
  title,
  content,
  relatedId,
}: CourseStaffNotification) {
  const course = await db.course.findUnique({
    where: { id: courseId },
    select: {
      university: {
        select: {
          userId: true,
          instructors: {
            where: { isActive: true },
            select: { userId: true, assignedCourseIds: true },
          },
        },
      },
    },
  });
  if (!course?.university) return;

  const recipients = new Set<string>([course.university.userId]);
  for (const instructor of course.university.instructors) {
    try {
      const assignedCourseIds: unknown = JSON.parse(instructor.assignedCourseIds);
      if (
        Array.isArray(assignedCourseIds) &&
        assignedCourseIds.includes(courseId)
      ) {
        recipients.add(instructor.userId);
      }
    } catch (error) {
      console.error(
        `[notifications] Invalid assigned course list for instructor ${instructor.userId}`,
        error
      );
    }
  }

  recipients.delete(excludeUserId ?? "");
  if (recipients.size === 0) return;

  await db.notification.createMany({
    data: [...recipients].map((recipientId) => ({
      studentId: recipientId,
      type,
      title,
      content,
      relatedId,
    })),
  });
}
