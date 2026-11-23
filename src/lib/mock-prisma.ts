import crypto from "crypto";
import type { PrismaClient } from "@prisma/client";
import { hashPassword } from "@/lib/auth/server";
import { addDurationToDate } from "@/lib/course-utils";

type Row = Record<string, any>;

type RelationDef =
  | { type: "one"; target: ModelKey; fk: string; pk?: string }
  | { type: "many"; target: ModelKey; fk: string; pk?: string };

type ModelKey =
  | "user"
  | "university"
  | "subscriptionPlan"
  | "subscription"
  | "course"
  | "coursePlanAccess"
  | "topic"
  | "videoLesson"
  | "learningMaterial"
  | "videoProgress"
  | "assignment"
  | "assignmentSubmission"
  | "certificateTemplate"
  | "certificate"
  | "videoQuestion"
  | "videoAssessment"
  | "note"
  | "bookmark"
  | "discussion"
  | "reply"
  | "announcement"
  | "instructor"
  | "platformSettings"
  | "notification";

const RELATIONS: Record<ModelKey, Record<string, RelationDef>> = {
  user: {
    university: { type: "one", target: "university", fk: "userId", pk: "id" },
    instructor: { type: "one", target: "instructor", fk: "userId", pk: "id" },
    subscriptions: { type: "many", target: "subscription", fk: "studentId", pk: "id" },
    videoProgress: { type: "many", target: "videoProgress", fk: "studentId", pk: "id" },
    submissions: { type: "many", target: "assignmentSubmission", fk: "studentId", pk: "id" },
    certificates: { type: "many", target: "certificate", fk: "studentId", pk: "id" },
    videoAssessments: { type: "many", target: "videoAssessment", fk: "studentId", pk: "id" },
    notes: { type: "many", target: "note", fk: "studentId", pk: "id" },
    bookmarks: { type: "many", target: "bookmark", fk: "studentId", pk: "id" },
    discussions: { type: "many", target: "discussion", fk: "authorId", pk: "id" },
    replies: { type: "many", target: "reply", fk: "authorId", pk: "id" },
    notifications: { type: "many", target: "notification", fk: "studentId", pk: "id" },
  },
  university: {
    user: { type: "one", target: "user", fk: "id", pk: "userId" },
    courses: { type: "many", target: "course", fk: "universityId", pk: "id" },
    instructors: { type: "many", target: "instructor", fk: "universityId", pk: "id" },
    announcements: { type: "many", target: "announcement", fk: "universityId", pk: "id" },
  },
  subscriptionPlan: {
    subscriptions: { type: "many", target: "subscription", fk: "planId", pk: "id" },
    courseAccess: { type: "many", target: "coursePlanAccess", fk: "planId", pk: "id" },
  },
  subscription: {
    student: { type: "one", target: "user", fk: "id", pk: "studentId" },
    plan: { type: "one", target: "subscriptionPlan", fk: "id", pk: "planId" },
  },
  course: {
    university: { type: "one", target: "university", fk: "id", pk: "universityId" },
    topics: { type: "many", target: "topic", fk: "courseId", pk: "id" },
    videos: { type: "many", target: "videoLesson", fk: "courseId", pk: "id" },
    materials: { type: "many", target: "learningMaterial", fk: "courseId", pk: "id" },
    assignments: { type: "many", target: "assignment", fk: "courseId", pk: "id" },
    planAccess: { type: "many", target: "coursePlanAccess", fk: "courseId", pk: "id" },
    certificates: { type: "many", target: "certificate", fk: "courseId", pk: "id" },
    certificateTemplate: { type: "one", target: "certificateTemplate", fk: "courseId", pk: "id" },
    discussions: { type: "many", target: "discussion", fk: "courseId", pk: "id" },
    announcements: { type: "many", target: "announcement", fk: "courseId", pk: "id" },
  },
  coursePlanAccess: {
    course: { type: "one", target: "course", fk: "id", pk: "courseId" },
    plan: { type: "one", target: "subscriptionPlan", fk: "id", pk: "planId" },
  },
  topic: {
    course: { type: "one", target: "course", fk: "id", pk: "courseId" },
    videos: { type: "many", target: "videoLesson", fk: "topicId", pk: "id" },
    materials: { type: "many", target: "learningMaterial", fk: "topicId", pk: "id" },
  },
  videoLesson: {
    course: { type: "one", target: "course", fk: "id", pk: "courseId" },
    topic: { type: "one", target: "topic", fk: "id", pk: "topicId" },
    progress: { type: "many", target: "videoProgress", fk: "videoId", pk: "id" },
    questions: { type: "many", target: "videoQuestion", fk: "videoId", pk: "id" },
    assessments: { type: "many", target: "videoAssessment", fk: "videoId", pk: "id" },
  },
  learningMaterial: {
    course: { type: "one", target: "course", fk: "id", pk: "courseId" },
    topic: { type: "one", target: "topic", fk: "id", pk: "topicId" },
  },
  videoProgress: {
    student: { type: "one", target: "user", fk: "id", pk: "studentId" },
    video: { type: "one", target: "videoLesson", fk: "id", pk: "videoId" },
  },
  assignment: {
    course: { type: "one", target: "course", fk: "id", pk: "courseId" },
    submissions: { type: "many", target: "assignmentSubmission", fk: "assignmentId", pk: "id" },
  },
  assignmentSubmission: {
    assignment: { type: "one", target: "assignment", fk: "id", pk: "assignmentId" },
    student: { type: "one", target: "user", fk: "id", pk: "studentId" },
  },
  certificateTemplate: {
    course: { type: "one", target: "course", fk: "id", pk: "courseId" },
  },
  certificate: {
    student: { type: "one", target: "user", fk: "id", pk: "studentId" },
    course: { type: "one", target: "course", fk: "id", pk: "courseId" },
  },
  videoQuestion: {
    video: { type: "one", target: "videoLesson", fk: "id", pk: "videoId" },
  },
  videoAssessment: {
    student: { type: "one", target: "user", fk: "id", pk: "studentId" },
    video: { type: "one", target: "videoLesson", fk: "id", pk: "videoId" },
  },
  note: {
    student: { type: "one", target: "user", fk: "id", pk: "studentId" },
  },
  bookmark: {
    student: { type: "one", target: "user", fk: "id", pk: "studentId" },
  },
  discussion: {
    course: { type: "one", target: "course", fk: "id", pk: "courseId" },
    author: { type: "one", target: "user", fk: "id", pk: "authorId" },
    replies: { type: "many", target: "reply", fk: "discussionId", pk: "id" },
  },
  reply: {
    discussion: { type: "one", target: "discussion", fk: "id", pk: "discussionId" },
    author: { type: "one", target: "user", fk: "id", pk: "authorId" },
  },
  announcement: {
    university: { type: "one", target: "university", fk: "id", pk: "universityId" },
    course: { type: "one", target: "course", fk: "id", pk: "courseId" },
  },
  instructor: {
    university: { type: "one", target: "university", fk: "id", pk: "universityId" },
    user: { type: "one", target: "user", fk: "id", pk: "userId" },
  },
  platformSettings: {},
  notification: {
    student: { type: "one", target: "user", fk: "id", pk: "studentId" },
  },
};

const COMPOUND_KEYS: Record<string, string[]> = {
  studentId_videoId: ["studentId", "videoId"],
  assignmentId_studentId: ["assignmentId", "studentId"],
  studentId_courseId: ["studentId", "courseId"],
  courseId_planId: ["courseId", "planId"],
};

function cuid(): string {
  return "c" + crypto.randomBytes(11).toString("hex");
}

function getDefaults(model: ModelKey): Row {
  const now = new Date();
  switch (model) {
    case "user":
      return { role: "STUDENT", phone: null, bio: null, profilePhoto: null, createdAt: now, updatedAt: now };
    case "university":
      return { logo: null, coverImage: null, description: null, website: null, contactEmail: null, contactPhone: null, location: null, socialLinks: null, createdAt: now, updatedAt: now };
    case "subscriptionPlan":
      return { description: null, currency: "OMR", duration: 1, durationUnit: "MONTHS", features: "[]", benefits: "[]", isActive: true, isPopular: false, createdAt: now, updatedAt: now };
    case "subscription":
      return { startDate: now, status: "ACTIVE", createdAt: now, updatedAt: now };
    case "course":
      return { description: null, thumbnail: null, category: null, level: "BEGINNER", accessType: "FREE", isPublished: false, universityId: null, startDate: null, endDate: null, availabilityMode: "ALWAYS", enrollmentOpen: true, createdAt: now, updatedAt: now };
    case "coursePlanAccess":
      return {};
    case "topic":
      return { description: null, displayOrder: 0, releaseDate: null, createdAt: now, updatedAt: now };
    case "videoLesson":
      return { description: null, source: "UPLOAD", thumbnail: null, displayOrder: 0, isPublished: true, duration: 0, createdAt: now, updatedAt: now };
    case "learningMaterial":
      return { topicId: null, description: null, type: "PDF", isPublished: true, createdAt: now, updatedAt: now };
    case "videoProgress":
      return { lastPosition: 0, watchTimeSeconds: 0, isCompleted: false, completedAt: null, updatedAt: now };
    case "assignment":
      return { description: null, instructions: null, fileUrl: null, dueDate: null, isPublished: true, allowResubmission: false, createdAt: now, updatedAt: now };
    case "assignmentSubmission":
      return { submittedAt: now, status: "SUBMITTED", reviewNotes: null, reviewedAt: null, createdAt: now, updatedAt: now };
    case "certificateTemplate":
      return { isEnabled: true, title: "Certificate of Completion", bodyText: "This certificate is proudly presented to {{studentName}} for successfully completing the course {{courseName}}.", organizationName: "CourseLearn", layout: "CLASSIC", templateRef: null, createdAt: now, updatedAt: now };
    case "certificate":
      return {
        universityName: null,
        instructorName: null,
        instructorSignatureUrl: null,
        issuedAt: now,
        createdAt: now,
      };
    case "videoQuestion":
      return { options: "[]", correctAnswer: 0, timestamp: 0, displayOrder: 0, createdAt: now, updatedAt: now };
    case "videoAssessment":
      return { score: 0, passed: false, answers: "[]", attempts: 1, createdAt: now, updatedAt: now };
    case "note":
      return { topicId: null, videoId: null, videoTimestamp: null, createdAt: now, updatedAt: now };
    case "bookmark":
      return { topicId: null, videoId: null, videoTimestamp: null, label: null, createdAt: now };
    case "discussion":
      return { isPinned: false, isLocked: false, createdAt: now, updatedAt: now };
    case "reply":
      return { isInstructor: false, createdAt: now, updatedAt: now };
    case "announcement":
      return { courseId: null, attachmentUrl: null, isPublished: false, publishedAt: null, createdAt: now, updatedAt: now };
    case "instructor":
      return { isActive: true, assignedCourseIds: "[]", signatureUrl: null, createdAt: now, updatedAt: now };
    case "platformSettings":
      return { appName: "CourseLearn", logoUrl: null, updatedAt: now };
    case "notification":
      return { relatedId: null, isRead: false, createdAt: now };
  }
}

function createStore(): Record<ModelKey, Row[]> {
  const store: Record<ModelKey, Row[]> = {
    user: [],
    university: [],
    subscriptionPlan: [],
    subscription: [],
    course: [],
    coursePlanAccess: [],
    topic: [],
    videoLesson: [],
    learningMaterial: [],
    videoProgress: [],
    assignment: [],
    assignmentSubmission: [],
    certificateTemplate: [],
    certificate: [],
    videoQuestion: [],
    videoAssessment: [],
    note: [],
    bookmark: [],
    discussion: [],
    reply: [],
    announcement: [],
    instructor: [],
    platformSettings: [],
    notification: [],
  };

  const now = new Date();
  const adminId = "seed_admin_1";
  const uniUserId = "seed_uni_user_1";
  const uniId = "seed_uni_1";
  const studentId = "seed_student_1";
  const instructorUserId = "seed_instructor_user_1";

  store.user.push(
    {
      id: adminId,
      email: "admin@courselearn.dev",
      passwordHash: hashPassword("admin123"),
      name: "Platform Administrator",
      role: "ADMIN",
      phone: null,
      bio: "System administrator overseeing CourseLearn.",
      profilePhoto: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: uniUserId,
      email: "tech@courselearn.dev",
      passwordHash: hashPassword("tech123"),
      name: "Tech University",
      role: "UNIVERSITY",
      phone: "+968 2400 1000",
      bio: null,
      profilePhoto: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: instructorUserId,
      email: "instructor@courselearn.dev",
      passwordHash: hashPassword("instructor123"),
      name: "Dr. Sarah Al-Harthy",
      role: "INSTRUCTOR",
      phone: "+968 2400 1050",
      bio: "Senior Lecturer in Software Engineering and Applied Data Science.",
      profilePhoto: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: studentId,
      email: "demo@courselearn.dev",
      passwordHash: hashPassword("password123"),
      name: "Demo Student",
      role: "STUDENT",
      phone: "+968 9100 2000",
      bio: "Lifelong learner exploring software engineering and product design.",
      profilePhoto: null,
      createdAt: now,
      updatedAt: now,
    }
  );

  store.university.push({
    id: uniId,
    name: "Tech University",
    logo: null,
    coverImage: null,
    description:
      "A leading technology university offering professional courses in programming, design, and digital skills.",
    website: "https://techuniversity.edu",
    contactEmail: "tech@courselearn.dev",
    contactPhone: "+968 2400 1000",
    location: "Muscat, Oman",
    socialLinks: JSON.stringify({}),
    userId: uniUserId,
    createdAt: now,
    updatedAt: now,
  });

  const planBasicId = "seed_plan_basic";
  const planStandardId = "seed_plan_standard";
  const planPremiumId = "seed_plan_premium";

  store.subscriptionPlan.push(
    {
      id: planBasicId,
      name: "Basic",
      description: "Entry-level plan for getting started with self-paced learning.",
      price: 10,
      currency: "OMR",
      duration: 1,
      durationUnit: "MONTHS",
      features: JSON.stringify([
        "Access to selected training courses",
        "Recorded video lessons",
        "Course learning materials",
        "Assignment access",
      ]),
      benefits: JSON.stringify([
        "Self-paced study",
        "Mobile-friendly access",
        "Progress tracking",
      ]),
      isActive: true,
      isPopular: false,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: planStandardId,
      name: "Standard",
      description: "Most popular plan for committed learners who want full course access.",
      price: 25,
      currency: "OMR",
      duration: 3,
      durationUnit: "MONTHS",
      features: JSON.stringify([
        "Access to all standard training courses",
        "Recorded video lessons",
        "Course learning materials",
        "Assignment access",
        "Completion certificates",
        "Priority email support",
      ]),
      benefits: JSON.stringify([
        "3 months of full access",
        "Progress tracking",
        "Verifiable certificates",
        "Priority support",
      ]),
      isActive: true,
      isPopular: true,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: planPremiumId,
      name: "Premium",
      description: "Annual plan for professionals seeking long-term access and benefits.",
      price: 90,
      currency: "OMR",
      duration: 1,
      durationUnit: "YEARS",
      features: JSON.stringify([
        "Access to all premium training courses",
        "Recorded video lessons",
        "Course learning materials",
        "Assignment access",
        "Completion certificates",
        "Direct instructor messaging",
        "Early access to new courses",
      ]),
      benefits: JSON.stringify([
        "12 months of unlimited access",
        "Verifiable certificates",
        "Premium support",
        "Early course access",
      ]),
      isActive: true,
      isPopular: false,
      createdAt: now,
      updatedAt: now,
    }
  );

  store.subscription.push({
    id: "seed_sub_1",
    studentId,
    planId: planStandardId,
    planName: "Standard",
    planPrice: 25,
    planCurrency: "OMR",
    planDuration: 3,
    planDurationUnit: "MONTHS",
    startDate: now,
    expiryDate: addDurationToDate(now, 3, "MONTHS"),
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  });

  // Sample Courses so the public portal and student dashboard are immediately rich
  const course1Id = "seed_course_1";
  const course2Id = "seed_course_2";

  store.course.push(
    {
      id: course1Id,
      title: "Modern Web Development with TypeScript & React",
      description:
        "Master component architecture, TypeScript type safety, state management, and production patterns for modern web applications.",
      thumbnail: null,
      category: "Software Engineering",
      level: "BEGINNER",
      accessType: "FREE",
      isPublished: true,
      universityId: uniId,
      startDate: null,
      endDate: null,
      availabilityMode: "ALWAYS",
      enrollmentOpen: true,
      createdAt: new Date(now.getTime() - 86400000 * 3),
      updatedAt: now,
    },
    {
      id: course2Id,
      title: "Applied Data Analytics & Visualization",
      description:
        "Learn practical data modeling, exploratory analysis, KPI design, and executive dashboard storytelling.",
      thumbnail: null,
      category: "Data Science",
      level: "INTERMEDIATE",
      accessType: "PAID",
      isPublished: true,
      universityId: uniId,
      startDate: null,
      endDate: null,
      availabilityMode: "ALWAYS",
      enrollmentOpen: true,
      createdAt: new Date(now.getTime() - 86400000 * 1),
      updatedAt: now,
    }
  );

  store.coursePlanAccess.push(
    { id: "seed_cpa_1", courseId: course2Id, planId: planStandardId },
    { id: "seed_cpa_2", courseId: course2Id, planId: planPremiumId }
  );

  const topic1Id = "seed_topic_1";
  const topic2Id = "seed_topic_2";
  const topic3Id = "seed_topic_3";

  store.topic.push(
    {
      id: topic1Id,
      courseId: course1Id,
      title: "Foundations of TypeScript",
      description: "Interfaces, generics, and type narrowing for scalable UI code.",
      displayOrder: 0,
      releaseDate: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: topic2Id,
      courseId: course1Id,
      title: "React Component Patterns",
      description: "Hooks, composition, and accessible design systems.",
      displayOrder: 1,
      releaseDate: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: topic3Id,
      courseId: course2Id,
      title: "Exploratory Data Analysis",
      description: "Cleaning datasets and identifying actionable trends.",
      displayOrder: 0,
      releaseDate: null,
      createdAt: now,
      updatedAt: now,
    }
  );

  const video1Id = "seed_video_1";
  const video2Id = "seed_video_2";
  const video3Id = "seed_video_3";

  store.videoLesson.push(
    {
      id: video1Id,
      courseId: course1Id,
      topicId: topic1Id,
      title: "Playable Video Demo",
      description: "A locally hosted sample animation for testing video playback and timed questions. Sample: Sintel by Blender Foundation (https://durian.blender.org/), licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/).",
      source: "URL",
      videoUrl: "/assets/demo-video.mp4",
      thumbnail: null,
      displayOrder: 0,
      isPublished: true,
      duration: 52,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: video2Id,
      courseId: course1Id,
      topicId: topic2Id,
      title: "Building Reusable Hooks & State Stores",
      description: "Custom hooks, derived state, and optimistic UI updates.",
      source: "YOUTUBE",
      videoUrl: "https://www.youtube.com/watch?v=Ke90Tje7VS0",
      thumbnail: null,
      displayOrder: 1,
      isPublished: true,
      duration: 720,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: video3Id,
      courseId: course2Id,
      topicId: topic3Id,
      title: "Designing Analytical Metrics & Dashboards",
      description: "Selecting the right chart types and avoiding visual distortion.",
      source: "YOUTUBE",
      videoUrl: "https://www.youtube.com/watch?v=ua-CiDNNj30",
      thumbnail: null,
      displayOrder: 0,
      isPublished: true,
      duration: 600,
      createdAt: now,
      updatedAt: now,
    }
  );

  store.videoQuestion.push({
    id: "seed_vq_1",
    videoId: video1Id,
    question: "What best describes this video?",
    options: JSON.stringify(["An animated fantasy adventure", "A coding tutorial", "A news broadcast", "A cooking lesson"]),
    correctAnswer: 0,
    timestamp: 5,
    displayOrder: 0,
    createdAt: now,
    updatedAt: now,
  });

  store.assignment.push({
    id: "seed_assign_1",
    courseId: course1Id,
    title: "Build a Typed Course Card Component",
    description: "Create a responsive React component with strict TypeScript props.",
    instructions: "Submit a PDF or TXT summary describing your component props and state flow.",
    fileUrl: null,
    dueDate: null,
    isPublished: true,
    allowResubmission: true,
    createdAt: now,
    updatedAt: now,
  });

  store.certificateTemplate.push(
    {
      id: "seed_ct_1",
      courseId: course1Id,
      isEnabled: true,
      title: "Certificate of Completion",
      bodyText:
        "This certificate is proudly presented to {{studentName}} for successfully completing {{courseName}}.",
      organizationName: "Tech University",
      layout: "CLASSIC",
      templateRef: null,
      createdAt: now,
      updatedAt: now,
    },
    {
      id: "seed_ct_2",
      courseId: course2Id,
      isEnabled: true,
      title: "Certificate of Achievement",
      bodyText:
        "This certificate is proudly presented to {{studentName}} for successfully completing {{courseName}}.",
      organizationName: "Tech University",
      layout: "CLASSIC",
      templateRef: null,
      createdAt: now,
      updatedAt: now,
    }
  );

  const seedSignatureSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="260" height="80" viewBox="0 0 260 80"><path d="M24 56 C30 22, 46 18, 44 46 C42 62, 56 34, 68 38 C78 41, 66 56, 80 48 C92 41, 98 20, 108 18 C114 17, 104 54, 118 46 C132 38, 138 28, 146 36 C154 44, 144 54, 162 42 C176 32, 190 24, 198 34 C206 44, 218 42, 236 34" fill="none" stroke="#172554" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M36 64 Q 130 55, 224 58" fill="none" stroke="#0F766E" stroke-width="1.4" stroke-linecap="round" opacity="0.75"/></svg>`;
  const seedSignatureUrl = `data:image/svg+xml;base64,${Buffer.from(seedSignatureSvg).toString("base64")}`;

  store.instructor.push({
    id: "seed_inst_1",
    userId: instructorUserId,
    universityId: uniId,
    assignedCourseIds: JSON.stringify([course1Id, course2Id]),
    isActive: true,
    signatureUrl: seedSignatureUrl,
    createdAt: now,
    updatedAt: now,
  });

  store.announcement.push({
    id: "seed_ann_1",
    universityId: uniId,
    courseId: null,
    title: "Welcome to the New Semester at Tech University",
    content:
      "Explore our updated Software Engineering and Data Analytics tracks. Complete interactive video checkpoints to unlock your certificates!",
    attachmentUrl: null,
    isPublished: true,
    publishedAt: now,
    createdAt: now,
    updatedAt: now,
  });

  return store;
}

const globalForMock = globalThis as unknown as {
  __mockPrismaStore?: Record<ModelKey, Row[]>;
};

function getStore(): Record<ModelKey, Row[]> {
  if (!globalForMock.__mockPrismaStore) {
    globalForMock.__mockPrismaStore = createStore();
  }
  return globalForMock.__mockPrismaStore;
}

function clone<T>(v: T): T {
  if (v instanceof Date) return new Date(v.getTime()) as unknown as T;
  if (Array.isArray(v)) return v.map(clone) as unknown as T;
  if (v && typeof v === "object") {
    const out: Record<string, any> = {};
    for (const [k, val] of Object.entries(v)) {
      out[k] = clone(val);
    }
    return out as T;
  }
  return v;
}

function expandWhere(where: Row | undefined): Row | undefined {
  if (!where) return undefined;
  const out: Row = {};
  for (const [k, v] of Object.entries(where)) {
    if (COMPOUND_KEYS[k] && v && typeof v === "object") {
      for (const field of COMPOUND_KEYS[k]) {
        out[field] = v[field];
      }
    } else {
      out[k] = v;
    }
  }
  return out;
}

function matchesCondition(
  model: ModelKey,
  row: Row,
  where: Row | undefined,
  store: Record<ModelKey, Row[]>
): boolean {
  if (!where) return true;
  const normalized = expandWhere(where)!;

  for (const [key, cond] of Object.entries(normalized)) {
    if (cond === undefined) continue;

    if (key === "AND") {
      const list = Array.isArray(cond) ? cond : [cond];
      if (!list.every((c) => matchesCondition(model, row, c, store))) return false;
      continue;
    }
    if (key === "OR") {
      const list = Array.isArray(cond) ? cond : [cond];
      if (!list.some((c) => matchesCondition(model, row, c, store))) return false;
      continue;
    }
    if (key === "NOT") {
      const list = Array.isArray(cond) ? cond : [cond];
      if (list.some((c) => matchesCondition(model, row, c, store))) return false;
      continue;
    }

    const rel = RELATIONS[model]?.[key];
    if (rel) {
      if (cond === null) {
        if (rel.type === "one") {
          const fkVal = row[rel.pk || "id"];
          const target = store[rel.target].find((r) => r[rel.fk] === fkVal);
          if (target) return false;
        }
        continue;
      }
      if (rel.type === "one") {
        const fkVal = row[rel.pk || "id"];
        const target =
          fkVal != null
            ? store[rel.target].find((r) => r[rel.fk] === fkVal)
            : undefined;
        if (cond.is === null) {
          if (target) return false;
          continue;
        }
        if (cond.is !== undefined) {
          if (!target || !matchesCondition(rel.target, target, cond.is, store)) return false;
          continue;
        }
        if (!target || !matchesCondition(rel.target, target, cond, store)) return false;
      } else {
        const pkVal = row[rel.pk || "id"];
        const children = store[rel.target].filter((r) => r[rel.fk] === pkVal);
        if (cond.some) {
          if (!children.some((c) => matchesCondition(rel.target, c, cond.some, store))) return false;
        } else if (cond.every) {
          if (!children.every((c) => matchesCondition(rel.target, c, cond.every, store))) return false;
        } else if (cond.none) {
          if (children.some((c) => matchesCondition(rel.target, c, cond.none, store))) return false;
        }
      }
      continue;
    }

    const val = row[key];
    if (cond === null) {
      if (val !== null && val !== undefined) return false;
      continue;
    }

    if (
      typeof cond === "object" &&
      !(cond instanceof Date) &&
      !Array.isArray(cond)
    ) {
      if ("equals" in cond) {
        if (cond.mode === "insensitive") {
          if (String(val ?? "").toLowerCase() !== String(cond.equals ?? "").toLowerCase()) {
            return false;
          }
        } else if (!valuesEqual(val, cond.equals)) {
          return false;
        }
      }
      if ("not" in cond) {
        if (cond.not === null) {
          if (val === null || val === undefined) return false;
        } else if (typeof cond.not === "object" && !(cond.not instanceof Date)) {
          if (matchesCondition(model, { [key]: val }, { [key]: cond.not }, store)) return false;
        } else if (valuesEqual(val, cond.not)) {
          return false;
        }
      }
      if ("in" in cond) {
        const arr: any[] = cond.in || [];
        if (!arr.some((x) => valuesEqual(val, x))) return false;
      }
      if ("notIn" in cond) {
        const arr: any[] = cond.notIn || [];
        if (arr.some((x) => valuesEqual(val, x))) return false;
      }
      if ("contains" in cond) {
        const needle = String(cond.contains ?? "").toLowerCase();
        if (val == null || !String(val).toLowerCase().includes(needle)) return false;
      }
      if ("startsWith" in cond) {
        const needle = String(cond.startsWith ?? "").toLowerCase();
        if (val == null || !String(val).toLowerCase().startsWith(needle)) return false;
      }
      if ("endsWith" in cond) {
        const needle = String(cond.endsWith ?? "").toLowerCase();
        if (val == null || !String(val).toLowerCase().endsWith(needle)) return false;
      }
      if ("gt" in cond) {
        if (val == null || compareValues(val, cond.gt) <= 0) return false;
      }
      if ("gte" in cond) {
        if (val == null || compareValues(val, cond.gte) < 0) return false;
      }
      if ("lt" in cond) {
        if (val == null || compareValues(val, cond.lt) >= 0) return false;
      }
      if ("lte" in cond) {
        if (val == null || compareValues(val, cond.lte) > 0) return false;
      }
    } else {
      if (!valuesEqual(val, cond)) return false;
    }
  }
  return true;
}

function valuesEqual(a: any, b: any): boolean {
  if (a instanceof Date && b instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof Date && typeof b === "string") return a.getTime() === new Date(b).getTime();
  if (b instanceof Date && typeof a === "string") return new Date(a).getTime() === b.getTime();
  return a === b;
}

function compareValues(a: any, b: any): number {
  if (a == null && b == null) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  const va = a instanceof Date ? a.getTime() : a;
  const vb = b instanceof Date ? b.getTime() : b;
  if (typeof va === "string" && typeof vb === "string") return va.localeCompare(vb);
  if (va < vb) return -1;
  if (va > vb) return 1;
  return 0;
}

function applyOrderBy(rows: Row[], orderBy: any): Row[] {
  if (!orderBy) return rows;
  const specs = Array.isArray(orderBy) ? orderBy : [orderBy];
  return [...rows].sort((a, b) => {
    for (const spec of specs) {
      for (const [k, dir] of Object.entries(spec)) {
        if (dir === undefined) continue;
        const mult = dir === "desc" ? -1 : 1;
        const cmp = compareValues(a[k], b[k]);
        if (cmp !== 0) return cmp * mult;
      }
    }
    return 0;
  });
}

function applyIncludeOrSelect(
  model: ModelKey,
  row: Row | null,
  query: { include?: Row; select?: Row } | undefined,
  store: Record<ModelKey, Row[]>
): any {
  if (!row) return null;
  const include = query?.include;
  const select = query?.select;

  if (!include && !select) return clone(row);

  const out: Row = {};
  if (select) {
    for (const [k, spec] of Object.entries(select)) {
      if (!spec) continue;
      if (k === "_count") {
        out._count = computeCount(model, row, spec, store);
        continue;
      }
      const rel = RELATIONS[model]?.[k];
      if (rel) {
        out[k] = resolveRelation(rel, row, spec === true ? {} : spec, store);
      } else {
        out[k] = clone(row[k]);
      }
    }
    return out;
  }

  // include mode: copy all scalar fields
  for (const [k, v] of Object.entries(row)) {
    out[k] = clone(v);
  }
  if (include) {
    for (const [k, spec] of Object.entries(include)) {
      if (!spec) continue;
      if (k === "_count") {
        out._count = computeCount(model, row, spec, store);
        continue;
      }
      const rel = RELATIONS[model]?.[k];
      if (rel) {
        out[k] = resolveRelation(rel, row, spec === true ? {} : spec, store);
      }
    }
  }
  return out;
}

function computeCount(
  model: ModelKey,
  row: Row,
  spec: any,
  store: Record<ModelKey, Row[]>
): Record<string, number> {
  const counts: Record<string, number> = {};
  const selectMap = spec?.select || {};
  for (const [relName, relSpec] of Object.entries(selectMap)) {
    if (!relSpec) continue;
    const rel = RELATIONS[model]?.[relName];
    if (!rel) {
      counts[relName] = 0;
      continue;
    }
    const pkVal = row[rel.pk || "id"];
    let matches = store[rel.target].filter((r) => r[rel.fk] === pkVal);
    if (typeof relSpec === "object" && (relSpec as Row).where) {
      matches = matches.filter((r) =>
        matchesCondition(rel.target, r, (relSpec as Row).where, store)
      );
    }
    counts[relName] = matches.length;
  }
  return counts;
}

function resolveRelation(
  rel: RelationDef,
  parentRow: Row,
  subQuery: Row,
  store: Record<ModelKey, Row[]>
): any {
  const pkVal = parentRow[rel.pk || "id"];
  if (pkVal == null) return rel.type === "many" ? [] : null;
  let matches = store[rel.target].filter((r) => r[rel.fk] === pkVal);
  if (subQuery.where) {
    matches = matches.filter((r) =>
      matchesCondition(rel.target, r, subQuery.where, store)
    );
  }
  if (subQuery.orderBy) {
    matches = applyOrderBy(matches, subQuery.orderBy);
  }
  if (typeof subQuery.skip === "number") {
    matches = matches.slice(subQuery.skip);
  }
  if (typeof subQuery.take === "number") {
    matches = matches.slice(0, subQuery.take);
  }
  if (rel.type === "one") {
    const first = matches[0] || null;
    return applyIncludeOrSelect(rel.target, first, subQuery, store);
  }
  return matches.map((m) => applyIncludeOrSelect(rel.target, m, subQuery, store));
}

function cascadeDelete(model: ModelKey, row: Row, store: Record<ModelKey, Row[]>) {
  // Remove row from its table
  const table = store[model];
  const idx = table.findIndex((r) => r.id === row.id);
  if (idx === -1) return;
  table.splice(idx, 1);

  if (model === "course") {
    const relatedIds = new Set<string>([
      row.id,
      ...store.assignment.filter((a) => a.courseId === row.id).map((a) => a.id),
      ...store.discussion.filter((d) => d.courseId === row.id).map((d) => d.id),
      ...store.announcement.filter((a) => a.courseId === row.id).map((a) => a.id),
    ]);
    store.note = store.note.filter((n) => n.courseId !== row.id);
    store.bookmark = store.bookmark.filter((b) => b.courseId !== row.id);
    store.notification = store.notification.filter(
      (n) => !n.relatedId || !relatedIds.has(n.relatedId)
    );
  } else if (model === "university") {
    const uniAnnIds = new Set<string>(
      store.announcement.filter((a) => a.universityId === row.id).map((a) => a.id)
    );
    if (uniAnnIds.size > 0) {
      store.notification = store.notification.filter(
        (n) => !n.relatedId || !uniAnnIds.has(n.relatedId)
      );
    }
  }

  // Cascade to dependent many/one relations owned by this row
  const rels = RELATIONS[model] || {};
  for (const [, rel] of Object.entries(rels)) {
    // Only cascade when foreign key lives on target (rel.pk === "id" && rel.fk !== "id")
    if ((rel.pk || "id") === "id" && rel.fk !== "id") {
      if (model === "topic" && rel.target === "learningMaterial") {
        for (const m of store.learningMaterial) {
          if (m.topicId === row.id) m.topicId = null;
        }
        continue;
      }
      if (model === "course" && rel.target === "announcement") {
        const toDel = store.announcement.filter((r) => r.courseId === row.id);
        toDel.forEach((d) => cascadeDelete("announcement", d, store));
        continue;
      }
      const children = store[rel.target].filter((r) => r[rel.fk] === row.id);
      for (const child of children) {
        cascadeDelete(rel.target, child, store);
      }
    }
  }

  // Deleting an instructor row also removes the teacher's underlying User account
  if (model === "instructor" && row.userId) {
    const ownerUser = store.user.find((u) => u.id === row.userId);
    if (ownerUser) {
      cascadeDelete("user", ownerUser, store);
    }
  }
}

function makeDelegate(model: ModelKey, store: Record<ModelKey, Row[]>) {
  return {
    async findMany(args: Row = {}) {
      let rows = store[model].filter((r) =>
        matchesCondition(model, r, args.where, store)
      );
      if (args.orderBy) rows = applyOrderBy(rows, args.orderBy);
      if (typeof args.skip === "number") rows = rows.slice(args.skip);
      if (typeof args.take === "number") rows = rows.slice(0, args.take);
      return rows.map((r) => applyIncludeOrSelect(model, r, args, store));
    },
    async findFirst(args: Row = {}) {
      let rows = store[model].filter((r) =>
        matchesCondition(model, r, args.where, store)
      );
      if (args.orderBy) rows = applyOrderBy(rows, args.orderBy);
      if (typeof args.skip === "number") rows = rows.slice(args.skip);
      const first = rows[0] || null;
      return applyIncludeOrSelect(model, first, args, store);
    },
    async findUnique(args: Row = {}) {
      const row =
        store[model].find((r) => matchesCondition(model, r, args.where, store)) ||
        null;
      return applyIncludeOrSelect(model, row, args, store);
    },
    async count(args: Row = {}) {
      return store[model].filter((r) =>
        matchesCondition(model, r, args.where, store)
      ).length;
    },
    async create(args: Row) {
      const defaults = getDefaults(model);
      const row: Row = {
        id: args.data?.id || cuid(),
        ...defaults,
        ...clone(args.data || {}),
      };
      store[model].push(row);
      return applyIncludeOrSelect(model, row, args, store);
    },
    async createMany(args: Row) {
      const items: Row[] = Array.isArray(args.data) ? args.data : [args.data];
      let count = 0;
      for (const item of items) {
        const defaults = getDefaults(model);
        const row: Row = {
          id: item.id || cuid(),
          ...defaults,
          ...clone(item),
        };
        store[model].push(row);
        count++;
      }
      return { count };
    },
    async update(args: Row) {
      const row = store[model].find((r) =>
        matchesCondition(model, r, args.where, store)
      );
      if (!row) {
        throw new Error(`Record to update not found in ${model}`);
      }
      for (const [k, v] of Object.entries(args.data || {})) {
        if (v !== undefined) {
          if (v && typeof v === "object" && !(v instanceof Date)) {
            if ("increment" in v) {
              row[k] = (Number(row[k]) || 0) + Number((v as any).increment);
              continue;
            }
            if ("decrement" in v) {
              row[k] = (Number(row[k]) || 0) - Number((v as any).decrement);
              continue;
            }
            if ("set" in v) {
              row[k] = clone((v as any).set);
              continue;
            }
          }
          row[k] = clone(v);
        }
      }
      if ("updatedAt" in row) row.updatedAt = new Date();
      return applyIncludeOrSelect(model, row, args, store);
    },
    async updateMany(args: Row) {
      const targets = store[model].filter((r) =>
        matchesCondition(model, r, args.where, store)
      );
      for (const row of targets) {
        for (const [k, v] of Object.entries(args.data || {})) {
          if (v !== undefined) row[k] = clone(v);
        }
        if ("updatedAt" in row) row.updatedAt = new Date();
      }
      return { count: targets.length };
    },
    async upsert(args: Row) {
      const existing = store[model].find((r) =>
        matchesCondition(model, r, args.where, store)
      );
      if (existing) {
        for (const [k, v] of Object.entries(args.update || {})) {
          if (v !== undefined) existing[k] = clone(v);
        }
        if ("updatedAt" in existing) existing.updatedAt = new Date();
        return applyIncludeOrSelect(model, existing, args, store);
      }
      const defaults = getDefaults(model);
      const row: Row = {
        id: args.create?.id || cuid(),
        ...defaults,
        ...clone(args.create || {}),
      };
      store[model].push(row);
      return applyIncludeOrSelect(model, row, args, store);
    },
    async delete(args: Row) {
      const row = store[model].find((r) =>
        matchesCondition(model, r, args.where, store)
      );
      if (!row) {
        throw new Error(`Record to delete not found in ${model}`);
      }
      const snapshot = applyIncludeOrSelect(model, row, args, store);
      cascadeDelete(model, row, store);
      return snapshot;
    },
    async deleteMany(args: Row = {}) {
      const targets = store[model].filter((r) =>
        matchesCondition(model, r, args.where, store)
      );
      for (const t of targets) {
        cascadeDelete(model, t, store);
      }
      return { count: targets.length };
    },
    async groupBy(args: Row) {
      const by: string[] = Array.isArray(args.by) ? args.by : [args.by];
      const rows = store[model].filter((r) =>
        matchesCondition(model, r, args.where, store)
      );
      const groups = new Map<string, Row[]>();
      for (const r of rows) {
        const key = JSON.stringify(by.map((f) => r[f]));
        const arr = groups.get(key) || [];
        arr.push(r);
        groups.set(key, arr);
      }
      const result: Row[] = [];
      for (const [, groupRows] of groups.entries()) {
        const entry: Row = {};
        for (const f of by) entry[f] = groupRows[0][f];
        if (args._count) {
          if (args._count === true) {
            entry._count = groupRows.length;
          } else {
            const c: Record<string, number> = {};
            for (const [ck, cv] of Object.entries(args._count)) {
              if (cv) {
                c[ck] =
                  ck === "_all"
                    ? groupRows.length
                    : groupRows.filter((r) => r[ck] !== null && r[ck] !== undefined).length;
              }
            }
            entry._count = c;
          }
        }
        result.push(entry);
      }
      return result;
    },
  };
}

export function createMockPrisma(): PrismaClient {
  const store = getStore();
  const models: ModelKey[] = Object.keys(RELATIONS) as ModelKey[];
  const client: Record<string, any> = {};
  for (const m of models) {
    client[m] = makeDelegate(m, store);
  }
  client.$transaction = async (arg: any) => {
    if (typeof arg === "function") {
      return arg(client);
    }
    if (Array.isArray(arg)) {
      return Promise.all(arg);
    }
    return [];
  };
  client.$connect = async () => {};
  client.$disconnect = async () => {};
  return client as unknown as PrismaClient;
}
