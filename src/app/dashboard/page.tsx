import { MetricCard } from "@/components/ui/metric-card";
import { Badge } from "@/components/ui/badge";
import { ReportCard } from "@/components/reports/report-card";
import { getDashboardData } from "@/lib/data/queries";
import { formatNumber, formatPercent } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const data = await getDashboardData();
  const resolutionRate =
    data.totalReports === 0 ? 0 : (data.resolvedReports / data.totalReports) * 100;

  return (
    <section className="space-y-6">
      <header className="shell-frame rounded-[1.8rem] px-6 py-6">
        <div className="section-kicker">Operations dashboard</div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
          Live metrics computed from app activity
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          These metrics are derived from EchoShare data only. No external
          impact numbers or fabricated environmental statistics are mixed into
          the dashboard.
        </p>
      </header>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard detail="Total pollution reports stored in PostgreSQL." label="Reports" value={formatNumber(data.totalReports)} />
        <MetricCard detail="Reports with a resolved status." label="Resolved" value={formatNumber(data.resolvedReports)} />
        <MetricCard detail="Water bodies with at least one tracked report." label="Affected water bodies" value={formatNumber(data.activeWaterBodies)} />
        <MetricCard detail="Cleanup participation records across events." label="Participation" value={formatNumber(data.participantCount)} />
      </div>

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <section className="rounded-[1.8rem] border border-line bg-white/75 p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="section-kicker">Status health</div>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em]">
                Resolution rate
              </h2>
            </div>
            <Badge tone={resolutionRate >= 50 ? "success" : "default"}>
              {formatPercent(resolutionRate)}
            </Badge>
          </div>
          <div className="mt-5 space-y-4">
            {data.topWaterBodies.map((item) => (
              <div key={item.waterBodyName} className="rounded-[1.3rem] border border-line bg-[#f8f3ea] p-4">
                <div className="flex items-center justify-between gap-4">
                  <p className="font-semibold">{item.waterBodyName}</p>
                  <Badge tone="brand">{item.count} reports</Badge>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-5">
          <div className="section-kicker">Recent activity</div>
          {data.recentReports.map((report) => (
            <ReportCard key={report.id} report={report} />
          ))}
        </section>
      </div>
    </section>
  );
}
