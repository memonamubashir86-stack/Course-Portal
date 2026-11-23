"use client";

import { useEffect, useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authFetch } from "@/lib/auth/client-token";
import { useAppStore } from "@/stores/app-store";

interface NotificationsResponse {
  unreadCount: number;
}

export function NotificationBell() {
  const navigate = useAppStore((state) => state.navigate);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    let active = true;
    const loadUnreadCount = async () => {
      try {
        const response = await authFetch("/api/notifications", {
          cache: "no-store",
          credentials: "include",
        });
        if (!response.ok) {
          throw new Error(`Notification request failed (${response.status})`);
        }
        const data = (await response.json()) as NotificationsResponse;
        if (active) setUnreadCount(data.unreadCount);
      } catch (error) {
        console.error("[university notification bell]", error);
      }
    };

    void loadUnreadCount();
    const intervalId = window.setInterval(() => void loadUnreadCount(), 30_000);
    const refreshOnVisible = () => {
      if (document.visibilityState === "visible") void loadUnreadCount();
    };
    window.addEventListener("notifications-updated", loadUnreadCount);
    document.addEventListener("visibilitychange", refreshOnVisible);
    return () => {
      active = false;
      window.clearInterval(intervalId);
      window.removeEventListener("notifications-updated", loadUnreadCount);
      document.removeEventListener("visibilitychange", refreshOnVisible);
    };
  }, []);

  return (
    <Button
      variant="ghost"
      size="icon"
      className="relative shrink-0"
      aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ""}`}
      onClick={() => navigate(["university", "notifications"])}
    >
      <Bell className="h-5 w-5" />
      {unreadCount > 0 && (
        <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
          {unreadCount > 9 ? "9+" : unreadCount}
        </span>
      )}
    </Button>
  );
}
