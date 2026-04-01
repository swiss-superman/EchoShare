import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { ReportCardData } from "@/lib/data/queries";
import { toTitleCase } from "@/lib/utils";

type ReportCardProps = {
  report: ReportCardData;
};

export function ReportCard({ report }: ReportCardProps) {
  return (
    <article className="overflow-hidden rounded-[1.7rem] border border-line bg-white/75">
      <div className="grid gap-0 md:grid-cols-[220px_1fr]">
        <div className="relative min-h-[200px] bg-[#d8e6e5]">
          {report.primaryImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt={report.title}
              className="h-full w-full object-cover"
              src={report.primaryImageUrl}
            />
          ) : (
            <div className="flex h-full items-center justify-center p-6 text-center text-sm text-muted">
              No photo uploaded yet
            </div>
          )}
        </div>
        <div className="space-y-4 p-5">
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">{toTitleCase(report.category)}</Badge>
            <Badge tone={report.severity === "CRITICAL" ? "danger" : "default"}>
              {toTitleCase(report.severity)}
            </Badge>
            {report.isDevelopmentSeed ? <Badge tone="muted">Development seed</Badge> : null}
          </div>
          <div>
            <p className="text-xs uppercase tracking-[0.18em] text-muted">
              {report.waterBodyName}
              {report.locality ? `, ${report.locality}` : ""}
              {report.state ? `, ${report.state}` : ""}
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em]">
              {report.title}
            </h2>
            <p className="mt-3 line-clamp-3 text-sm leading-7 text-muted">
              {report.aiSummary ?? report.description}
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="text-sm text-muted">
              Observed on{" "}
              {new Date(report.observedAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </div>
            <Link
              className="rounded-full border border-line-strong px-4 py-2 text-sm font-semibold transition hover:bg-white"
              href={`/reports/${report.id}`}
            >
              Open report
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}
