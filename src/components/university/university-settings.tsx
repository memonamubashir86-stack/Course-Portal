"use client";

import { useEffect, useRef, useState } from "react";
import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useApiFetch, apiPost, apiUpload, authFetch } from "@/hooks/use-api";
import { useAppStore } from "@/stores/app-store";
import { useI18n } from "@/lib/i18n/store";
import { toast } from "@/hooks/use-toast";
import { formatDate } from "@/types";
import {
  Building2, Mail, Phone, Lock, Save, Upload, Shield, GraduationCap,
  BookOpen, Award, ClipboardList, Video, Users, PenTool, Eraser, Trash2,
} from "lucide-react";

interface UniversityProfile {
  id: string;
  name: string;
  logo: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
  contactName: string;
  contactEmail: string;
  contactPhone: string | null;
  bio: string | null;
}

interface OverviewData {
  totalCourses: number;
  totalPublishedCourses: number;
  totalVideoLessons: number;
  totalAssignments: number;
  totalCertificatesIssued: number;
  totalStudents: number;
}

export function UniversitySettings() {
  const { t } = useI18n();
  const user = useAppStore((s) => s.user);
  const isUniversityOwner = user?.role === "UNIVERSITY";
  const branding = useAppStore((s) => s.branding);
  const refreshUser = useAppStore((s) => s.refreshUser);
  const { data: profileData, loading: profileLoading, refetch: refetchProfile } =
    useApiFetch<{ university: UniversityProfile }>("/api/university/profile");
  const { data: overviewData, loading: overviewLoading } =
    useApiFetch<OverviewData>("/api/university/overview");

  // Profile form
  const [uniName, setUniName] = useState("");
  const [description, setDescription] = useState("");
  const [phone, setPhone] = useState("");
  const [bio, setBio] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Password form
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (profileData?.university) {
      setUniName(profileData.university.name);
      setDescription(profileData.university.description || "");
      setPhone(profileData.university.contactPhone || "");
      setBio(profileData.university.bio || "");
    }
  }, [profileData]);

  async function saveProfile() {
    if (!uniName.trim()) {
      toast({ title: "University name cannot be empty", variant: "destructive" });
      return;
    }
    setSavingProfile(true);
    try {
      await apiPost("/api/university/profile", {
        name: uniName.trim(),
        description: description.trim() || null,
        phone: phone.trim() || null,
        bio: bio.trim() || null,
      }, { method: "PUT" });
      toast({ title: "Profile updated" });
      await refreshUser();
      refetchProfile();
    } catch {
      /* toast */
    } finally {
      setSavingProfile(false);
    }
  }

  async function uploadLogo(file: File) {
    setUploadingLogo(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      await apiUpload<{ logo: string }>("/api/university/profile", fd);
      toast({ title: "Logo uploaded" });
      await refreshUser();
      refetchProfile();
    } catch {
      /* toast */
    } finally {
      setUploadingLogo(false);
    }
  }

  async function changePassword() {
    if (!currentPassword || !newPassword) {
      toast({ title: "Fill all fields", variant: "destructive" });
      return;
    }
    if (newPassword.length < 6) {
      toast({ title: "Password too short", description: "Minimum 6 characters.", variant: "destructive" });
      return;
    }
    if (newPassword !== confirmPassword) {
      toast({ title: "Passwords don't match", variant: "destructive" });
      return;
    }
    setSavingPassword(true);
    try {
      await apiPost("/api/auth/password", { currentPassword, newPassword });
      toast({ title: "Password updated", description: "Use your new password next time you sign in." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch {
      /* toast */
    } finally {
      setSavingPassword(false);
    }
  }

  const uni = profileData?.university;
  const initials = (uni?.name || user?.universityName || "U")
    .split(" ")
    .map((s) => s[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="space-y-5 max-w-4xl">
      {/* University Overview Stats */}
      <Card className="rounded-lg border-border bg-card p-5 shadow-sm">
        <CardHeader className="p-0">
          <CardTitle className="font-heading text-base font-semibold">
            University Overview
          </CardTitle>
          <CardDescription className="mt-1">
            Aggregate counts across your university&apos;s courses.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          {overviewLoading ? (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <StatBox icon={<BookOpen className="h-4 w-4" />} label="Courses" value={overviewData?.totalCourses ?? 0} />
              <StatBox icon={<BookOpen className="h-4 w-4" />} label="Published" value={overviewData?.totalPublishedCourses ?? 0} />
              <StatBox icon={<Video className="h-4 w-4" />} label="Video Lessons" value={overviewData?.totalVideoLessons ?? 0} />
              <StatBox icon={<ClipboardList className="h-4 w-4" />} label="Assignments" value={overviewData?.totalAssignments ?? 0} />
              <StatBox icon={<Award className="h-4 w-4" />} label="Certificates" value={overviewData?.totalCertificatesIssued ?? 0} />
              <StatBox icon={<Users className="h-4 w-4" />} label="Active Learners" value={overviewData?.totalStudents ?? 0} />
            </div>
          )}
        </CardContent>
      </Card>

      {/* University Profile Card */}
      <Card className="rounded-lg border-border bg-card p-5 shadow-sm">
        <CardHeader className="p-0">
          <CardTitle className="font-heading text-base font-semibold flex items-center gap-2">
            <Building2 className="h-4 w-4 text-accent" /> University Profile
          </CardTitle>
          <CardDescription className="mt-1">
            Your university&apos;s identity and contact information.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 mt-4 space-y-4">
          <fieldset disabled={!isUniversityOwner} className="contents">
          {/* Brand block */}
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center rounded-lg border border-border bg-gradient-to-br from-primary/5 to-accent/5 p-4">
            {profileLoading ? (
              <Skeleton className="h-16 w-16 rounded-lg" />
            ) : user?.universityLogo || uni?.logo ? (
              <img
                src={user?.universityLogo || uni?.logo || ""}
                alt={uni?.name || "University logo"}
                className="h-16 w-16 rounded-lg object-cover ring-2 ring-accent/20 shrink-0"
              />
            ) : (
              <div className="flex h-16 w-16 items-center justify-center rounded-lg bg-primary text-primary-foreground ring-2 ring-accent/20 shrink-0">
                <GraduationCap className="h-7 w-7" />
              </div>
            )}
            <div className="flex-1 min-w-0 space-y-2">
              <p className="font-heading font-semibold text-foreground">
                {profileLoading ? <Skeleton className="h-5 w-40" /> : uni?.name}
              </p>
              <p className="text-xs text-muted-foreground">
                {profileLoading ? (
                  <Skeleton className="h-3 w-56" />
                ) : (
                  `Member since ${formatDate(uni?.createdAt || new Date())}`
                )}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <Badge className="bg-accent/15 text-accent gap-1">
                  <Shield className="h-3 w-3" /> University Sub-Admin
                </Badge>
                <label className="inline-flex items-center gap-1.5 cursor-pointer text-xs text-accent hover:underline">
                  <Upload className="h-3.5 w-3.5" />
                  {uploadingLogo ? "Uploading…" : "Upload logo"}
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    disabled={uploadingLogo}
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadLogo(f);
                    }}
                  />
                </label>
              </div>
            </div>
          </div>

          {/* Profile form */}
          <div className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="uni-name" className="text-xs font-medium text-muted-foreground">
                University Name
              </Label>
              <Input
                id="uni-name"
                value={uniName}
                onChange={(e) => setUniName(e.target.value)}
                disabled={profileLoading}
                className="h-9 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uni-desc" className="text-xs font-medium text-muted-foreground">
                Description (optional)
              </Label>
              <Textarea
                id="uni-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={profileLoading}
                rows={3}
                placeholder="A short description of your university shown publicly."
                className="rounded-lg"
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="uni-phone" className="text-xs font-medium text-muted-foreground">
                  Contact Phone (optional)
                </Label>
                <Input
                  id="uni-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={profileLoading}
                  placeholder="+1 555 123 4567"
                  className="h-9 rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="uni-email" className="text-xs font-medium text-muted-foreground">
                  Contact Email
                </Label>
                <Input
                  id="uni-email"
                  value={uni?.contactEmail || user?.email || ""}
                  disabled
                  className="h-9 rounded-lg bg-muted/50 text-muted-foreground"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="uni-bio" className="text-xs font-medium text-muted-foreground">
                Bio / About (optional)
              </Label>
              <Textarea
                id="uni-bio"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                disabled={profileLoading}
                rows={3}
                placeholder="A few words about you as the university sub-admin."
                className="rounded-lg"
              />
            </div>
            <div className="flex justify-end">
              <Button disabled={savingProfile || profileLoading} onClick={saveProfile} className="h-9 gap-2">
                <Save className="h-4 w-4" /> {savingProfile ? "Saving…" : "Save Profile"}
              </Button>
            </div>
          </div>
          </fieldset>
        </CardContent>
      </Card>

      {/* Instructor Electronic Signature (for signed-in INSTRUCTOR accounts) */}
      {user?.role === "INSTRUCTOR" && <InstructorSignatureCard />}

      {/* Change Password */}
      <Card className="rounded-lg border-border bg-card p-5 shadow-sm">
        <CardHeader className="p-0">
          <CardTitle className="font-heading text-base font-semibold flex items-center gap-2">
            <Lock className="h-4 w-4 text-accent" /> Change Password
          </CardTitle>
          <CardDescription className="mt-1">
            Update your {user?.role === "INSTRUCTOR" ? "instructor" : "university"} account password.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 mt-4 space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cur-pass" className="text-xs font-medium text-muted-foreground">
              Current Password
            </Label>
            <Input
              id="cur-pass"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              autoComplete="current-password"
              className="h-9 rounded-lg"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="new-pass" className="text-xs font-medium text-muted-foreground">
                New Password
              </Label>
              <Input
                id="new-pass"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
                className="h-9 rounded-lg"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="conf-pass" className="text-xs font-medium text-muted-foreground">
                Confirm New Password
              </Label>
              <Input
                id="conf-pass"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
                className="h-9 rounded-lg"
              />
            </div>
          </div>
          <div className="flex justify-end">
            <Button disabled={savingPassword} onClick={changePassword} className="h-9 gap-2">
              <Save className="h-4 w-4" /> {savingPassword ? "Saving…" : "Update Password"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Signed-in user info */}
      <Card className="rounded-lg border-border bg-card p-5 shadow-sm">
        <CardHeader className="p-0">
          <CardTitle className="font-heading text-base font-semibold">Signed-in Account</CardTitle>
          <CardDescription className="mt-1">
            The user account associated with this university.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 mt-4">
          <div className="flex items-center gap-4 rounded-lg border border-border bg-card p-4">
            <Avatar className="h-12 w-12 ring-2 ring-accent/15">
              <AvatarFallback className="bg-primary text-primary-foreground font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-heading font-semibold text-foreground">{user?.name}</p>
              <p className="text-sm text-muted-foreground flex items-center gap-1.5 mt-0.5">
                <Mail className="h-3.5 w-3.5 shrink-0" /> {user?.email}
              </p>
              {user?.phone && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                  <Phone className="h-3 w-3 shrink-0" /> {user.phone}
                </p>
              )}
            </div>
            <Badge className="bg-accent/15 text-accent gap-1">
              <Building2 className="h-3 w-3" /> {user?.role === "INSTRUCTOR" ? "Instructor" : "Sub-Admin"}
            </Badge>
          </div>
          <Separator className="my-4" />
          <p className="text-xs text-muted-foreground">
            {branding.appName || "CourseLearn"} — {user?.role === "INSTRUCTOR" ? "Instructor Portal" : "University Sub-Admin Dashboard"}. All course content you manage is
            scoped to <strong>{uni?.name || user?.universityName || "your university"}</strong>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function InstructorSignatureCard() {
  const { data, loading, refetch } = useApiFetch<{ signatureUrl: string | null }>(
    "/api/university/instructors/signature",
    { freshOnMount: true }
  );
  const [mode, setMode] = useState<"draw" | "upload">("draw");
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [saving, setSaving] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const drawingRef = useRef(false);

  useEffect(() => {
    if (data?.signatureUrl !== undefined) {
      setSignaturePreview(data.signatureUrl);
    }
  }, [data?.signatureUrl]);

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
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    setHasDrawn(false);
  }

  function getCanvasPos(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (canvas.width / rect.width),
      y: (e.clientY - rect.top) * (canvas.height / rect.height),
    };
  }

  function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
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
  }

  function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawingRef.current) return;
    const ctx = canvasRef.current?.getContext("2d");
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
    } catch {}
  }

  async function canvasToFile(): Promise<File | null> {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return null;
    return new Promise((resolve) => {
      canvas.toBlob((blob) => {
        if (!blob) return resolve(null);
        resolve(new File([blob], "instructor-signature.png", { type: "image/png" }));
      }, "image/png");
    });
  }

  async function saveSignature() {
    const fileToSend =
      signatureFile || (mode === "draw" && hasDrawn ? await canvasToFile() : null);
    if (!fileToSend) {
      toast({ title: "Draw or upload a signature first", variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("signature", fileToSend);
      const res = await authFetch("/api/university/instructors/signature", {
        method: "PUT",
        body: fd,
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save signature");
      toast({ title: "Electronic signature saved", description: "Your signature will appear on issued student certificates." });
      setSignatureFile(null);
      setHasDrawn(false);
      clearCanvas();
      refetch();
    } catch (e: any) {
      toast({ title: "Error", description: e?.message || "Failed to save signature", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  }

  async function deleteSignature() {
    setSaving(true);
    try {
      await apiPost("/api/university/instructors/signature", { removeSignature: true }, { method: "PUT" });
      toast({ title: "Electronic signature removed" });
      setSignatureFile(null);
      setSignaturePreview(null);
      setHasDrawn(false);
      clearCanvas();
      refetch();
    } catch {
      /* toast */
    } finally {
      setSaving(false);
    }
  }

  return (
    <Card className="rounded-lg border-border bg-card p-5 shadow-sm">
      <CardHeader className="p-0">
        <CardTitle className="font-heading text-base font-semibold flex items-center gap-2">
          <PenTool className="h-4 w-4 text-accent" /> Instructor Electronic Signature
        </CardTitle>
        <CardDescription className="mt-1">
          Your electronic signature appears on every course certificate issued after you pass a student&apos;s assignment.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0 mt-4 space-y-4">
        {loading ? (
          <Skeleton className="h-24 w-full rounded-lg" />
        ) : (
          <>
            {signaturePreview && (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-border bg-white p-3">
                <div className="flex items-center gap-3">
                  <img
                    src={signaturePreview}
                    alt="Current electronic signature"
                    className="h-14 max-w-[220px] object-contain"
                  />
                  <span className="text-xs text-muted-foreground">Active signature preview</span>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={deleteSignature}
                  disabled={saving}
                  className="text-destructive hover:text-destructive gap-1.5 self-start sm:self-auto"
                >
                  <Trash2 className="h-3.5 w-3.5" /> Remove
                </Button>
              </div>
            )}

            <div className="flex items-center gap-2">
              <Button
                type="button"
                size="sm"
                variant={mode === "draw" ? "default" : "outline"}
                onClick={() => setMode("draw")}
                className="gap-1.5"
              >
                <PenTool className="h-3.5 w-3.5" /> Draw Signature
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === "upload" ? "default" : "outline"}
                onClick={() => setMode("upload")}
                className="gap-1.5"
              >
                <Upload className="h-3.5 w-3.5" /> Upload Image
              </Button>
            </div>

            {mode === "draw" ? (
              <div className="space-y-2">
                <div className="rounded-lg border border-dashed border-border bg-white overflow-hidden">
                  <canvas
                    ref={canvasRef}
                    width={520}
                    height={140}
                    onPointerDown={handlePointerDown}
                    onPointerMove={handlePointerMove}
                    onPointerUp={handlePointerUp}
                    onPointerCancel={handlePointerUp}
                    className="w-full h-32 touch-none cursor-crosshair block"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground">
                    Sign inside the white box above using mouse or touch.
                  </p>
                  <Button type="button" size="sm" variant="ghost" onClick={clearCanvas} className="gap-1.5">
                    <Eraser className="h-3.5 w-3.5" /> Clear
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setSignatureFile(file);
                    setSignaturePreview(URL.createObjectURL(file));
                    setHasDrawn(false);
                  }}
                  className="block w-full text-sm text-foreground file:mr-3 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-primary file:text-primary-foreground hover:file:bg-primary/90 cursor-pointer"
                />
                <p className="text-xs text-muted-foreground">
                  Upload a transparent PNG or clean signature image.
                </p>
              </div>
            )}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={saveSignature}
                disabled={saving || (!signatureFile && !hasDrawn)}
                className="h-9 gap-2"
              >
                <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save Electronic Signature"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-card p-3 flex items-center gap-3 shadow-sm transition-shadow hover:shadow-md">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10 text-accent shrink-0">
        {icon}
      </div>
      <div className="min-w-0">
        <p className="font-heading text-xl font-bold text-foreground leading-none">
          {value.toLocaleString()}
        </p>
        <p className="text-[11px] uppercase tracking-wider text-muted-foreground mt-1 truncate">
          {label}
        </p>
      </div>
    </div>
  );
}
