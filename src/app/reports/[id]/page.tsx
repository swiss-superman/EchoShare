import { notFound } from "next/navigation";
import { runReportAiEnrichmentAction } from "@/app/actions/report-actions";
import { ReportMap } from "@/components/maps/report-map";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getReportDetail } from "@/lib/data/queries";
import { toTitleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ReportDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { id } = await params;
  const report = await getReportDetail(id);

  if (!report) {
    notFound();
  }

  const latestAnalysis = report.aiAnalyses[0] ?? null;

  return (
    <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="space-y-6">
        <article className="shell-frame rounded-[1.9rem] px-6 py-6">
          <div className="flex flex-wrap gap-2">
            <Badge tone="brand">{toTitleCase(report.category)}</Badge>
            <Badge tone={report.userSeverity === "CRITICAL" ? "danger" : "default"}>
              {toTitleCase(report.userSeverity)}
            </Badge>
            <Badge tone="muted">{toTitleCase(report.status)}</Badge>
            {report.isDevelopmentSeed ? <Badge tone="muted">Development seed</Badge> : null}
          </div>
          <p className="mt-4 text-xs uppercase tracking-[0.18em] text-muted">
            {report.waterBodyName}
          </p>
          <h1 className="mt-2 font-display text-4xl font-semibold tracking-[-0.04em]">
            {report.title}
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
            {report.description}
          </p>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="rounded-[1.4rem] border border-line bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                Reported by
              </p>
              <p className="mt-2 font-semibold">
                {report.user.profile?.displayName ?? report.user.name ?? report.user.email}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-line bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                Observed on
              </p>
              <p className="mt-2 font-semibold">
                {report.observedAt.toLocaleString("en-IN")}
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-line bg-white/75 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-muted">
                Coordinates
              </p>
              <p className="mt-2 font-semibold">
                {report.location.latitude.toFixed(4)}, {report.location.longitude.toFixed(4)}
              </p>
            </div>
          </div>
        </article>

        <article className="space-y-4 rounded-[1.9rem] border border-line bg-white/75 p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="section-kicker">AI-assisted analysis</div>
              <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.04em]">
                Explainable enrichment
              </h2>
            </div>
            <form action={runReportAiEnrichmentAction.bind(null, report.id)}>
              <button
                className="rounded-full border border-line-strong px-4 py-2 text-sm font-semibold transition hover:bg-white"
                type="submit"
              >
                Queue enrichment
              </button>
            </form>
          </div>
          {latestAnalysis?.status === "COMPLETED" ? (
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-[1.5rem] border border-line bg-[#f8f3ea] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  AI summary
                </p>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {latestAnalysis.summary ?? "No summary returned."}
                </p>
                <div className="mt-4 flex flex-wrap gap-2">
                  {latestAnalysis.classification ? (
                    <Badge tone="brand">
                      {toTitleCase(latestAnalysis.classification)}
                    </Badge>
                  ) : null}
                  {latestAnalysis.severityEstimate ? (
                    <Badge
                      tone={
                        latestAnalysis.severityEstimate === "CRITICAL" ? "danger" : "default"
                      }
                    >
                      {toTitleCase(latestAnalysis.severityEstimate)}
                    </Badge>
                  ) : null}
                </div>
              </div>
              <div className="rounded-[1.5rem] border border-line bg-[#f8f3ea] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  Action recommendation
                </p>
                <p className="mt-3 text-sm leading-7 text-muted">
                  {latestAnalysis.actionRecommendation ?? "No recommendation returned."}
                </p>
                {Array.isArray(latestAnalysis.wasteTypes) && latestAnalysis.wasteTypes.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {latestAnalysis.wasteTypes.map((wasteType, index) => (
                      <Badge key={`${wasteType}-${index}`} tone="muted">
                        {String(wasteType)}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </div>
            </div>
          ) : latestAnalysis?.status === "PENDING" ? (
            <EmptyState
              detail="EchoShare has queued AI enrichment for this report. Refresh shortly or let n8n retry it in the background."
              title="AI analysis running"
            />
          ) : latestAnalysis?.status === "FAILED" ? (
            <EmptyState
              detail="The last AI attempt failed. Queue enrichment again after checking Gemini config or automation retries."
              title="AI analysis failed"
            />
          ) : (
            <EmptyState
              detail="No AI analysis has been queued for this report yet. Queue enrichment manually or configure Gemini and background automation."
              title="AI analysis pending"
            />
          )}
        </article>

        <article className="space-y-4 rounded-[1.9rem] border border-line bg-white/75 p-6">
          <div className="section-kicker">Status timeline</div>
          <div className="space-y-4">
            {report.statusHistory.map((item) => (
              <div
                key={item.id}
                className="rounded-[1.3rem] border border-line bg-[#f8f3ea] p-4"
              >
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  {item.fromStatus ? `${toTitleCase(item.fromStatus)} → ` : ""}
                  {toTitleCase(item.toStatus)}
                </p>
                <p className="mt-2 text-sm leading-7 text-muted">
                  {item.note ?? "No note provided."}
                </p>
              </div>
            ))}
          </div>
        </article>
      </div>

      <aside className="space-y-6">
        <div className="rounded-[1.9rem] border border-line bg-white/75 p-4">
          <ReportMap
            focus={{
              latitude: report.location.latitude,
              longitude: report.location.longitude,
            }}
            heightClassName="h-[420px]"
            markers={[
              {
                id: report.id,
                title: report.title,
                waterBodyName: report.waterBodyName,
                category: report.category,
                severity: report.userSeverity,
                status: report.status,
                observedAt: report.observedAt.toISOString(),
                latitude: report.location.latitude,
                longitude: report.location.longitude,
                summary: latestAnalysis?.summary ?? null,
                primaryImageUrl: report.images.find((image) => image.isPrimary)?.publicUrl ?? null,
                isDevelopmentSeed: report.isDevelopmentSeed,
              },
            ]}
          />
        </div>
        <div className="space-y-4 rounded-[1.9rem] border border-line bg-white/75 p-6">
          <div className="section-kicker">Evidence</div>
          {report.images.length > 0 ? (
            <div className="grid gap-3">
              {report.images.map((image) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  key={image.id}
                  alt={image.caption ?? report.title}
                  className="h-52 w-full rounded-[1.5rem] object-cover"
                  src={image.publicUrl}
                />
              ))}
            </div>
          ) : (
            <EmptyState
              detail="This report does not include uploaded images yet."
              title="No images attached"
            />
          )}
        </div>
      </aside>
    </section>
  );
}
