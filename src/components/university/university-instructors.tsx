"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { EmptyState } from "@/components/shared/empty-state";
import { useApiFetch, apiPost } from "@/hooks/use-api";
import { useAppStore } from "@/stores/app-store";
import { useI18n } from "@/lib/i18n/store";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/types";
import {
  Users,
  Search,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  Mail,
  Phone,
  BookOpen,
  CheckCircle2,
  XCircle,
  UserCircle2,
  PenTool,
  Upload,
  Eraser,
} from "lucide-react";

interface CourseListItem {
  id: string;
  title: string;
  isPublished: boolean;
}

interface AssignedCourse {
  id: string;
  title: string;
  isPublished: boolean;
}

interface InstructorRow {
  id: string;
  userId: string;
  name: string;
  email: string;
  profilePhoto: string | null;
  phone: string | null;
  bio: string | null;
  isActive: boolean;
  signatureUrl: string | null;
  assignedCourses: AssignedCourse[];
  assignedCourseIds: string[];
  createdAt: string;
}

interface InstructorsResponse {
  instructors: InstructorRow[];
  courses: CourseListItem[];
}

interface FormValues {
  name: string;
  email: string;
  password: string;
  phone: string;
  bio: string;
  isActive: boolean;
  assignedCourseIds: string[];
}

const DEFAULT_FORM: FormValues = {
  name: "",
  email: "",
  password: "",
  phone: "",
  bio: "",
  isActive: true,
  assignedCourseIds: [],
};

export function UniversityInstructors() {
  const { t } = useI18n();
  const isUniversityOwner = useAppStore((state) => state.user?.role === "UNIVERSITY");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "active" | "inactive">(
    "ALL"
  );
  const [addOpen, setAddOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<InstructorRow | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InstructorRow | null>(null);

  const qs = useMemo(() => {
    const p = new URLSearchParams();
    if (search.trim()) p.set("q", search.trim());
    if (statusFilter !== "ALL") p.set("status", statusFilter);
    const s = p.toString();
    return s ? `?${s}` : "";
  }, [search, statusFilter]);

  const { data, loading, error, refetch } = useApiFetch<InstructorsResponse>(
    qs ? `/api/university/instructors${qs}` : "/api/university/instructors"
  );

  const instructors = data?.instructors || [];
  const courses = data?.courses || [];

  async function quickToggleActive(inst: InstructorRow) {
    try {
      await apiPost(
        `/api/university/instructors/${inst.id}`,
        { isActive: !inst.isActive },
        { method: "PUT" }
      );
      toast({
        title: inst.isActive ? "Deactivated" : "Activated",
        description: inst.name,
      });
      refetch();
    } catch {
      /* toast */
    }
  }

  const activeCount = instructors.filter((i) => i.isActive).length;

  return (
    <div className="space-y-4">
      {/* Summary banner */}
      {!loading && !error && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="rounded-lg border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-soft-sage text-primary">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-heading font-semibold text-foreground">
                  {instructors.length}
                </p>
                <p className="text-xs text-muted-foreground">Total instructors</p>
              </div>
            </div>
          </Card>
          <Card className="rounded-lg border-border bg-card p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/15 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-heading font-semibold text-foreground">
                  {activeCount}
                </p>
                <p className="text-xs text-muted-foreground">Active</p>
              </div>
            </div>
          </Card>
          <Card className="rounded-lg border-border bg-card p-4 shadow-sm col-span-2 sm:col-span-1">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/15 text-accent">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-2xl font-heading font-semibold text-foreground">
                  {instructors.reduce(
                    (n, i) => n + i.assignedCourses.length,
                    0
                  )}
                </p>
                <p className="text-xs text-muted-foreground">Course assignments</p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* Filter card */}
      <Card className="rounded-lg border-border bg-card p-4 shadow-sm">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or email…"
                className="h-9 rounded-lg pl-9 focus-visible:ring-2 focus-visible:ring-ring"
                aria-label={t("common.search")}
              />
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) =>
                setStatusFilter(v as "ALL" | "active" | "inactive")
              }
            >
              <SelectTrigger
                className="h-9 w-full rounded-lg sm:w-[140px]"
                aria-label={t("common.status")}
              >
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">{t("common.allStatuses")}</SelectItem>
                <SelectItem value="active">{t("common.active")}</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {isUniversityOwner && (
            <Button className="h-9 gap-2" onClick={() => setAddOpen(true)}>
              <Plus className="h-4 w-4" /> Add Instructor
            </Button>
          )}
        </div>
      </Card>

      {loading ? (
        <Card className="rounded-lg border-border p-0 overflow-hidden">
          <div className="p-5 space-y-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-1/3" />
                  <Skeleton className="h-3 w-1/2" />
                </div>
                <Skeleton className="h-6 w-20" />
              </div>
            ))}
          </div>
        </Card>
      ) : error ? (
        <EmptyState
          className="m-4"
          icon={<Users className="h-5 w-5" />}
          title={t("common.error")}
          description={error}
        />
      ) : instructors.length === 0 ? (
        <EmptyState
          className="m-4"
          icon={<Users className="h-5 w-5" />}
          title="No instructors yet"
          description="Add teaching staff and assign them to specific courses. Instructors can be activated or deactivated anytime."
          action={isUniversityOwner ? (
            <Button onClick={() => setAddOpen(true)} className="gap-2">
              <Plus className="h-4 w-4" /> Add Instructor
            </Button>
          ) : undefined}
        />
      ) : (
        <Card className="rounded-lg border-border bg-card p-0 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <div className="overflow-x-auto scrollbar-thin">
<Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Instructor
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Assigned Courses
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Status
                  </TableHead>
                  <TableHead className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Joined
                  </TableHead>
                  <TableHead className="w-[60px] text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {instructors.map((inst) => (
                  <TableRow
                    key={inst.id}
                    className="group transition-colors hover:bg-muted/40"
                  >
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10 ring-1 ring-border">
                          {inst.profilePhoto ? (
                            <img
                              src={inst.profilePhoto}
                              alt={inst.name}
                              className="h-full w-full object-cover"
                            />
                          ) : null}
                          <AvatarFallback className="bg-soft-sage text-primary text-xs font-semibold">
                            {initials(inst.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="min-w-0">
                          <p className="font-medium text-foreground truncate">
                            {inst.name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {inst.email}
                          </p>
                          {inst.phone && (
                            <p className="text-xs text-muted-foreground truncate flex items-center gap-1 mt-0.5">
                              <Phone className="h-3 w-3" />
                              {inst.phone}
                            </p>
                          )}
                          {inst.signatureUrl && (
                            <div className="mt-1 flex items-center gap-2">
                              <img
                                src={inst.signatureUrl}
                                alt={`${inst.name} signature`}
                                className="h-6 max-w-[96px] rounded border border-border bg-white px-1 py-0.5 object-contain shrink-0"
                              />
                              <span className="text-[11px] text-accent truncate flex items-center gap-1">
                                <PenTool className="h-3 w-3 shrink-0" /> Signature on file
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {inst.assignedCourses.length === 0 ? (
                        <span className="text-xs text-muted-foreground italic">
                          No courses assigned
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {inst.assignedCourses.slice(0, 3).map((c) => (
                            <Badge
                              key={c.id}
                              variant="outline"
                              className="bg-soft-sage/40 text-primary text-[11px]"
                            >
                              {c.title}
                            </Badge>
                          ))}
                          {inst.assignedCourses.length > 3 && (
                            <Badge
                              variant="outline"
                              className="text-[11px] text-muted-foreground"
                            >
                              +{inst.assignedCourses.length - 3} more
                            </Badge>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      {inst.isActive ? (
                        <Badge className="gap-1 border-0 bg-success/95 text-success-foreground">
                          Active
                        </Badge>
                      ) : (
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Inactive
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(inst.createdAt)}
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      {isUniversityOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            aria-label={`Actions for ${inst.name}`}
                          >
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48">
                          <DropdownMenuItem
                            onClick={() => setEditTarget(inst)}
                            className="gap-2"
                          >
                            <Pencil className="h-4 w-4" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => quickToggleActive(inst)}
                            className="gap-2"
                          >
                            {inst.isActive ? (
                              <>
                                <XCircle className="h-4 w-4" /> Deactivate
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-4 w-4" /> Activate
                              </>
                            )}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            variant="destructive"
                            onClick={() => setDeleteTarget(inst)}
                            className="gap-2"
                          >
                            <Trash2 className="h-4 w-4" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
</div>
          </div>
        </Card>
      )}

      <InstructorFormDialog
        open={addOpen}
        onOpenChange={setAddOpen}
        courses={courses}
        onSaved={() => {
          setAddOpen(false);
          refetch();
          toast({ title: "Instructor added" });
        }}
      />

      <InstructorFormDialog
        open={!!editTarget}
        onOpenChange={(v) => !v && setEditTarget(null)}
        target={editTarget}
        courses={courses}
        onSaved={() => {
          setEditTarget(null);
          refetch();
          toast({ title: "Instructor updated" });
        }}
      />

      <AlertDialog
        open={!!deleteTarget}
        onOpenChange={(v) => !v && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete instructor?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete{" "}
              <strong>{deleteTarget?.name}</strong> and remove their access.
              Their course assignments will be cleared. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-white hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteTarget) return;
                try {
                  await apiPost(
                    `/api/university/instructors/${deleteTarget.id}`,
                    null,
                    { method: "DELETE" }
                  );
                  toast({
                    title: "Instructor deleted",
                    description: deleteTarget.name,
                  });
                  setDeleteTarget(null);
                  refetch();
                } catch {
                  /* toast */
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function initials(name: string): string {
  return name
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// ─── Form Dialog ──────────────────────────────────────────────────────────
function InstructorFormDialog({
  open,
  onOpenChange,
  target,
  courses,
  onSaved,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  target?: InstructorRow | null;
  courses: CourseListItem[];
  onSaved: () => void;
}) {
  const { t } = useI18n();
  const isEdit = !!target;
  const [values, setValues] = useState<FormValues>(DEFAULT_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Electronic signature state (either drawn on canvas or uploaded file)
  const [signatureMode, setSignatureMode] = useState<"draw" | "upload">("draw");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [removeSignature, setRemoveSignature] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (target) {
      setValues({
        name: target.name,
        email: target.email,
        password: "",
        phone: target.phone || "",
        bio: target.bio || "",
        isActive: target.isActive,
        assignedCourseIds: target.assignedCourseIds,
      });
      setSignatureFile(null);
      setSignaturePreview(target.signatureUrl || null);
      setRemoveSignature(false);
      setHasDrawn(false);
      setSignatureMode(target.signatureUrl ? "upload" : "draw");
      setFormError(null);
    } else if (open) {
      setValues(DEFAULT_FORM);
      setSignatureFile(null);
      setSignaturePreview(null);
      setRemoveSignature(false);
      setHasDrawn(false);
      setSignatureMode("draw");
      setFormError(null);
    }
  }, [target, open]);

  useEffect(() => {
    return () => {
      if (signaturePreview && signaturePreview.startsWith("blob:")) {
        URL.revokeObjectURL(signaturePreview);
      }
    };
  }, [signaturePreview]);

  function clearCanvas() {
    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawn(false);
  }

  function getCanvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.setPointerCapture(e.pointerId);
    drawingRef.current = true;
    const pos = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    ctx.lineWidth = 2.6;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.strokeStyle = "#172554";
    setHasDrawn(true);
    setSignatureFile(null);
    setRemoveSignature(false);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const pos = getCanvasPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  }

  function handlePointerUp(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    drawingRef.current = false;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  function handleSignatureFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (signaturePreview && signaturePreview.startsWith("blob:")) {
      URL.revokeObjectURL(signaturePreview);
    }
    setSignatureFile(file);
    setSignaturePreview(URL.createObjectURL(file));
    setRemoveSignature(false);
    setHasDrawn(false);
  }

  function handleRemoveExistingSignature() {
    if (signaturePreview && signaturePreview.startsWith("blob:")) {
      URL.revokeObjectURL(signaturePreview);
    }
    setSignatureFile(null);
    setSignaturePreview(null);
    setRemoveSignature(true);
    clearCanvas();
  }

  async function canvasToFile(): Promise<File | null> {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          resolve(null);
          return;
        }
        resolve(new File([blob], "instructor-signature.png", { type: "image/png" }));
      }, "image/png");
    });
  }

  function toggleCourse(id: string) {
    setValues((v) => ({
      ...v,
      assignedCourseIds: v.assignedCourseIds.includes(id)
        ? v.assignedCourseIds.filter((c) => c !== id)
        : [...v.assignedCourseIds, id],
    }));
  }

  async function submit() {
    setFormError(null);
    if (!values.name.trim()) {
      setFormError("Full name is required.");
      toast({ title: "Name is required", variant: "destructive" });
      return;
    }
    if (!values.email.trim()) {
      setFormError("Email is required.");
      toast({ title: "Email is required", variant: "destructive" });
      return;
    }
    if (!isEdit && values.password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      toast({
        title: "Password too short",
        description: "Use at least 6 characters.",
        variant: "destructive",
      });
      return;
    }
    if (isEdit && values.password.length > 0 && values.password.length < 6) {
      setFormError("New password must be at least 6 characters.");
      toast({
        title: "Password too short",
        description: "Use at least 6 characters.",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const finalSigFile = signatureFile || (signatureMode === "draw" && hasDrawn ? await canvasToFile() : null);

      const fd = new FormData();
      fd.append("name", values.name.trim());
      if (!isEdit) {
        fd.append("email", values.email.trim());
      }
      if (values.password) {
        fd.append("password", values.password);
      }
      fd.append("phone", values.phone.trim());
      fd.append("bio", values.bio.trim());
      fd.append("isActive", String(values.isActive));
      fd.append("assignedCourseIds", JSON.stringify(values.assignedCourseIds));
      if (finalSigFile) {
        fd.append("signature", finalSigFile);
      } else if (isEdit && removeSignature) {
        fd.append("removeSignature", "true");
      }

      if (isEdit && target) {
        await apiPost(
          `/api/university/instructors/${target.id}`,
          fd,
          { method: "PUT", rawBody: true }
        );
      } else {
        await apiPost("/api/university/instructors", fd, { rawBody: true });
      }
      onSaved();
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Failed to save instructor");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="animate-scale-in flex max-h-[90vh] w-[95vw] max-w-lg flex-col overflow-hidden">
        <DialogHeader className="shrink-0">
          <DialogTitle className="font-heading text-lg font-semibold">
            {isEdit ? "Edit Instructor" : "Add Instructor"}
          </DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update profile, assigned courses and access status."
              : "Create a new instructor account and assign them to courses."}
          </DialogDescription>
        </DialogHeader>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1 scrollbar-thin">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5 col-span-1">
              <Label
                htmlFor="ins-name"
                className="text-xs font-medium text-muted-foreground"
              >
                Full name
              </Label>
              <Input
                id="ins-name"
                value={values.name}
                onChange={(e) => {
                  setFormError(null);
                  setValues({ ...values, name: e.target.value });
                }}
                placeholder="e.g. Dr. Sarah Lin"
                className="h-9 rounded-lg"
              />
            </div>
            <div className="space-y-1.5 col-span-1">
              <Label
                htmlFor="ins-email"
                className="text-xs font-medium text-muted-foreground"
              >
                Email
              </Label>
              <Input
                id="ins-email"
                type="email"
                value={values.email}
                onChange={(e) =>
                  setValues({ ...values, email: e.target.value })
                }
                placeholder="instructor@uni.edu"
                className="h-9 rounded-lg"
                disabled={isEdit}
              />
              {isEdit && (
                <p className="text-[11px] text-muted-foreground">
                  Email cannot be changed.
                </p>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="ins-pass"
              className="text-xs font-medium text-muted-foreground"
            >
              {isEdit ? "New password (optional)" : "Password"}
            </Label>
            <Input
              id="ins-pass"
              type="password"
              value={values.password}
              onChange={(e) =>
                setValues({ ...values, password: e.target.value })
              }
              placeholder={
                isEdit ? "Leave blank to keep current" : "Min 6 characters"
              }
              className="h-9 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label
                htmlFor="ins-phone"
                className="text-xs font-medium text-muted-foreground"
              >
                Phone
              </Label>
              <Input
                id="ins-phone"
                value={values.phone}
                onChange={(e) =>
                  setValues({ ...values, phone: e.target.value })
                }
                placeholder="+968 9xxx xxxx"
                className="h-9 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-muted-foreground">
                Status
              </Label>
              <div className="flex items-center justify-between rounded-lg border border-border h-9 px-3">
                <span className="text-sm text-foreground">
                  {values.isActive ? "Active" : "Inactive"}
                </span>
                <Switch
                  checked={values.isActive}
                  onCheckedChange={(v) =>
                    setValues({ ...values, isActive: v })
                  }
                />
              </div>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label
              htmlFor="ins-bio"
              className="text-xs font-medium text-muted-foreground"
            >
              Bio (optional)
            </Label>
            <Input
              id="ins-bio"
              value={values.bio}
              onChange={(e) => setValues({ ...values, bio: e.target.value })}
              placeholder="Short intro shown on instructor profile"
              className="h-9 rounded-lg"
            />
          </div>

          {/* Electronic Signature (for course completion certificates) */}
          <div className="space-y-2.5 rounded-lg border border-border p-3 bg-muted/20">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <Label className="text-[11px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <PenTool className="h-3.5 w-3.5 text-accent" /> Electronic Signature
                </Label>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  Displayed on student completion certificates for assigned courses.
                </p>
              </div>
              <div className="flex items-center gap-1 rounded-lg border border-border bg-card p-0.5">
                <button
                  type="button"
                  onClick={() => setSignatureMode("draw")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    signatureMode === "draw"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Draw
                </button>
                <button
                  type="button"
                  onClick={() => setSignatureMode("upload")}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    signatureMode === "upload"
                      ? "bg-primary text-primary-foreground"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Upload Image
                </button>
              </div>
            </div>

            {signatureMode === "draw" ? (
              <div className="space-y-2">
                <div className="relative overflow-hidden rounded-lg border border-dashed border-border bg-white">
                  <canvas
                    ref={canvasRef}
                    width={440}
                    height={130}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="h-[110px] w-full cursor-crosshair touch-none block"
                    aria-label="Instructor electronic signature drawing pad"
                  />
                  {!hasDrawn && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-xs text-muted-foreground/70">
                      Sign here with mouse or touch
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={clearCanvas}
                    className="h-7 gap-1 text-xs"
                  >
                    <Eraser className="h-3 w-3" /> Clear Pad
                  </Button>
                  {signaturePreview && !hasDrawn && (
                    <span className="text-[11px] text-muted-foreground">
                      Existing signature kept unless you draw or remove it.
                    </span>
                  )}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Label
                    htmlFor="ins-sig-file"
                    className="inline-flex h-8 cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-card px-3 text-xs font-medium text-foreground shadow-sm hover:bg-muted"
                  >
                    <Upload className="h-3.5 w-3.5" />
                    <span>{signatureFile ? signatureFile.name : "Choose Signature Image"}</span>
                  </Label>
                  <input
                    id="ins-sig-file"
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleSignatureFileChange}
                    className="sr-only"
                  />
                  {(signaturePreview || signatureFile) && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveExistingSignature}
                      className="h-8 gap-1 text-xs text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" /> Remove
                    </Button>
                  )}
                </div>
              </div>
            )}

            {signaturePreview && (
              <div className="flex items-center justify-between rounded-md border border-border bg-white px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">Saved / Uploaded:</span>
                  <img
                    src={signaturePreview}
                    alt="Instructor signature preview"
                    className="max-h-10 max-w-[160px] object-contain"
                  />
                </div>
                {signatureMode === "draw" && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleRemoveExistingSignature}
                    className="h-7 px-2 text-xs text-destructive hover:text-destructive"
                  >
                    Remove
                  </Button>
                )}
              </div>
            )}
          </div>

          {/* Assigned courses */}
          <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/30">
            <div className="flex items-center justify-between">
              <Label className="text-[11px] uppercase tracking-wider text-muted-foreground">
                Assigned Courses
              </Label>
              <span className="text-xs text-muted-foreground">
                {values.assignedCourseIds.length} selected
              </span>
            </div>
            {courses.length === 0 ? (
              <p className="text-xs text-destructive">
                You have no courses yet. Create one first.
              </p>
            ) : (
              <div className="max-h-44 space-y-1 overflow-y-auto scrollbar-thin pr-1">
                {courses.map((c) => (
                  <label
                    key={c.id}
                    className="flex cursor-pointer items-center gap-2 rounded-md p-1.5 transition-colors hover:bg-background"
                  >
                    <Checkbox
                      checked={values.assignedCourseIds.includes(c.id)}
                      onCheckedChange={() => toggleCourse(c.id)}
                    />
                    <span className="flex-1 text-sm text-foreground truncate">
                      {c.title}
                    </span>
                    {!c.isPublished && (
                      <Badge
                        variant="outline"
                        className="text-[10px] text-muted-foreground"
                      >
                        Draft
                      </Badge>
                    )}
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>
        {formError && (
          <p className="shrink-0 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-medium text-destructive">
            {formError}
          </p>
        )}
        <DialogFooter className="shrink-0">
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button type="button" disabled={saving} className="h-9" onClick={submit}>
            {saving ? "Saving…" : isEdit ? "Save Changes" : "Add Instructor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
