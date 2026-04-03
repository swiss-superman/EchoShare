"use client";

import { startTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type ReportAiAutoRefreshProps = {
  enabled: boolean;
  reportId: string;
  intervalMs?: number;
  maxRefreshes?: number;
  kickoffDelayMs?: number;
};

export function ReportAiAutoRefresh({
  enabled,
  reportId,
  intervalMs = 4000,
  maxRefreshes = 8,
  kickoffDelayMs = 12000,
}: ReportAiAutoRefreshProps) {
  const router = useRouter();
  const refreshCountRef = useRef(0);

  useEffect(() => {
    const kickoffStorageKey = `report-ai-kickoff:${reportId}`;

    if (!enabled) {
      refreshCountRef.current = 0;
      if (typeof window !== "undefined") {
        window.sessionStorage.removeItem(kickoffStorageKey);
      }
      return;
    }

    const abortController = new AbortController();
    const kickoffTimer = window.setTimeout(async () => {
      if (window.sessionStorage.getItem(kickoffStorageKey)) {
        return;
      }

      window.sessionStorage.setItem(kickoffStorageKey, String(Date.now()));

      try {
        await fetch(`/api/reports/${reportId}/ai`, {
          method: "POST",
          cache: "no-store",
          signal: abortController.signal,
        });
      } catch (error) {
        window.sessionStorage.removeItem(kickoffStorageKey);
        console.error("Failed to trigger report AI enrichment", error);
      } finally {
        startTransition(() => {
          router.refresh();
        });
      }
    }, kickoffDelayMs);

    const interval = window.setInterval(() => {
      if (refreshCountRef.current >= maxRefreshes) {
        window.clearInterval(interval);
        return;
      }

      refreshCountRef.current += 1;
      startTransition(() => {
        router.refresh();
      });
    }, intervalMs);

    return () => {
      abortController.abort();
      window.clearTimeout(kickoffTimer);
      window.clearInterval(interval);
    };
  }, [enabled, intervalMs, kickoffDelayMs, maxRefreshes, reportId, router]);

  if (!enabled) {
    return null;
  }

  return (
    <p className="text-sm leading-6 text-muted">
      AI enrichment is running in the background. If the first queue does not finish, EchoShare
      automatically starts a same-page recovery run and refreshes this view for a short time.
    </p>
  );
}
