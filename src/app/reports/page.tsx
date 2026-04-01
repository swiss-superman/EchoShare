import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { ReportCard } from "@/components/reports/report-card";
import { ReportFilterForm } from "@/components/reports/report-filter-form";
import {
  getReportListData,
  normalizeReportFilters,
} from "@/lib/data/queries";

export const dynamic = "force-dynamic";

type ReportsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function ReportsPage({ searchParams }: ReportsPageProps) {
  const filters = normalizeReportFilters(await searchParams);
  const data = await getReportListData(filters);

  return (
    <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside className="space-y-4">
        <ReportFilterForm
          filters={data.filters}
          resetHref="/reports"
          waterBodies={data.waterBodies}
        />
        <Link
          className="inline-flex w-full items-center justify-center rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
          href="/reports/new"
        >
          Create a new report
        </Link>
      </aside>
      <div className="space-y-5">
        <header className="shell-frame rounded-[1.8rem] px-6 py-6">
          <div className="section-kicker">Report stream</div>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
            Verified signal from the ground
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            Browse community-submitted reports, filter by category or severity,
            and drill into evidence, AI-assisted triage, and response status.
          </p>
        </header>
        {data.reports.length === 0 ? (
          <EmptyState
            detail="No reports match the current filters yet. Clear the filters or submit the first report for this water body."
            title="No reports in view"
          />
        ) : (
          <div className="space-y-5">
            {data.reports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
