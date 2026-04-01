"use client";

import { startTransition, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

type ReportAiAutoRefreshProps = {
  enabled: boolean;
  intervalMs?: number;
  maxRefreshes?: number;
};

export function ReportAiAutoRefresh({
  enabled,
  intervalMs = 4000,
  maxRefreshes = 8,
}: ReportAiAutoRefreshProps) {
  const router = useRouter();
  const refreshCountRef = useRef(0);

  useEffect(() => {
    if (!enabled) {
      refreshCountRef.current = 0;
      return;
    }

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
      window.clearInterval(interval);
    };
  }, [enabled, intervalMs, maxRefreshes, router]);

  if (!enabled) {
    return null;
  }

  return (
    <p className="text-sm leading-6 text-muted">
      AI enrichment is running in the background. This page refreshes automatically for a short
      time so the result appears without needing a manual reload.
    </p>
  );
}
