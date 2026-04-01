import { notFound } from "next/navigation";
import { runReportAiEnrichmentAction } from "@/app/actions/report-actions";
import { ReportMap } from "@/components/maps/report-map";
import { ReportAiAutoRefresh } from "@/components/reports/report-ai-auto-refresh";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getReportDetail } from "@/lib/data/queries";
import { toTitleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

type ReportDetailPageProps = {
  params: Promise<{ id: string }>;
};

type AiInputDetails = {
  modality?: string;
  candidateImageCount?: number;
  usedImageCount?: number;
  excludedImages?: Array<{
    imageId?: string;
    sceneLabel?: string;
    reason?: string;
    confidence?: number;
  }>;
};

type AnalysisState = "IDLE" | "PENDING" | "FAILED" | "COMPLETED" | "NEEDS_REVIEW";

function getAiInputDetails(explanation: unknown): AiInputDetails | null {
  if (!explanation || typeof explanation !== "object" || !("aiInput" in explanation)) {
    return null;
  }

  const aiInput = (explanation as { aiInput?: AiInputDetails }).aiInput;
  return aiInput && typeof aiInput === "object" ? aiInput : null;
}

function isTechnicalEvidenceIssue(input: {
  sceneLabel?: string;
  reason?: string;
  confidence?: number;
}) {
  return (
    input.sceneLabel === "FETCH_FAILED" ||
    ((input.sceneLabel ?? "OTHER") === "OTHER" && (input.confidence ?? 0) === 0) ||
    /429|RESOURCE_EXHAUSTED|quota|rate limit|unavailable|could not finish ai evidence review/i.test(
      input.reason ?? "",
    )
  );
}

export default async function ReportDetailPage({
  params,
}: ReportDetailPageProps) {
  const { id } = await params;
  const report = await getReportDetail(id);

  if (!report) {
    notFound();
  }

  const latestAnalysis = report.aiAnalyses[0] ?? null;
  const aiInput = getAiInputDetails(latestAnalysis?.explanation ?? null);
  const excludedImages = aiInput?.excludedImages ?? [];
  const technicallyUnreviewedImages = excludedImages.filter((image) =>
    isTechnicalEvidenceIssue(image),
  );
  const rejectedEvidenceImages = excludedImages.filter((image) =>
    !isTechnicalEvidenceIssue(image),
  );
  const excludedImageMap = new Map(
    excludedImages.map((image) => [image.imageId ?? "", image]),
  );
  const analysisState: AnalysisState = latestAnalysis
    ? latestAnalysis.status
    : report.aiRequestedAt
      ? "PENDING"
      : "IDLE";
  const showQueueAction = analysisState === "FAILED" || analysisState === "IDLE";
  const queueActionLabel =
    analysisState === "FAILED" ? "Retry enrichment" : "Queue enrichment";
  const autoRefreshEnabled = analysisState === "PENDING";

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
            {analysisState === "COMPLETED" ? (
              <Badge tone="success">AI ready</Badge>
            ) : analysisState === "PENDING" ? (
              <Badge tone="brand">Running in background</Badge>
            ) : showQueueAction ? (
              <form action={runReportAiEnrichmentAction.bind(null, report.id)}>
                <button
                  className="rounded-full border border-line-strong px-4 py-2 text-sm font-semibold transition hover:bg-white"
                  type="submit"
                >
                  {queueActionLabel}
                </button>
              </form>
            ) : null}
          </div>
          <ReportAiAutoRefresh enabled={autoRefreshEnabled} />
          {analysisState === "COMPLETED" ? (
            <div className="space-y-4">
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
              <div className="rounded-[1.5rem] border border-line bg-[#f8f3ea] p-5">
                <p className="text-xs uppercase tracking-[0.18em] text-muted">
                  AI input trace
                </p>
                {rejectedEvidenceImages.length > 0 ? (
                  <div className="mt-4 rounded-[1.2rem] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
                    {rejectedEvidenceImages.length} uploaded image
                    {rejectedEvidenceImages.length === 1 ? " was" : "s were"} rejected as unrelated evidence and
                    not used in the AI pollution analysis.
                  </div>
                ) : null}
                {technicallyUnreviewedImages.length > 0 ? (
                  <div className="mt-4 rounded-[1.2rem] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-950">
                    {technicallyUnreviewedImages.length} uploaded image
                    {technicallyUnreviewedImages.length === 1 ? " could" : "s could"} not be reviewed by AI, so
                    {technicallyUnreviewedImages.length === 1 ? " it was" : " they were"} not treated as accepted
                    evidence.
                  </div>
                ) : null}
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="muted">
                    {aiInput?.modality === "TEXT_AND_IMAGE" ? "Text + verified image" : "Text only"}
                  </Badge>
                  <Badge tone="muted">
                    {aiInput?.usedImageCount ?? 0} image used
                  </Badge>
                  <Badge tone="muted">
                    {excludedImages.length} image excluded
                  </Badge>
                </div>
                {excludedImages.length > 0 ? (
                  <div className="mt-4 space-y-3">
                    {excludedImages.map((image, index) => (
                      <div
                        key={`${image.imageId ?? "excluded"}-${index}`}
                        className="rounded-[1.1rem] border border-line bg-white/70 p-3"
                      >
                        <p className="text-xs uppercase tracking-[0.14em] text-muted">
                          {isTechnicalEvidenceIssue(image)
                            ? "AI review incomplete"
                            : toTitleCase((image.sceneLabel ?? "other").replaceAll("_", " "))}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-muted">
                          {isTechnicalEvidenceIssue(image)
                            ? "EchoShare could not finish AI review for this upload, so it was excluded from accepted evidence until a later retry succeeds."
                            : image.reason ?? "No reason captured."}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="mt-4 text-sm leading-7 text-muted">
                    Every reviewed candidate image was accepted as relevant evidence, or no image was uploaded.
                  </p>
                )}
              </div>
            </div>
          ) : analysisState === "PENDING" ? (
            <EmptyState
              detail="EchoShare has already queued AI enrichment for this report. The page is refreshing automatically while the background job runs."
              title="AI analysis running"
            />
          ) : analysisState === "FAILED" ? (
            <EmptyState
              detail="The last AI attempt failed. Retry enrichment when you want a fresh attempt, or wait for background automation if it is configured."
              title="AI analysis failed"
            />
          ) : (
            <EmptyState
              detail="No AI analysis has been queued for this report yet. Use manual queueing only for older reports or when automatic enrichment was unavailable."
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
                source: "USER_REPORT",
                sourceLabel: "Citizen report",
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
                heatWeight:
                  report.userSeverity === "CRITICAL"
                    ? 1
                    : report.userSeverity === "HIGH"
                      ? 0.8
                      : report.userSeverity === "MEDIUM"
                        ? 0.55
                        : 0.3,
                metricLabel: null,
                href: `/reports/${report.id}`,
              },
            ]}
          />
        </div>
        <div className="space-y-4 rounded-[1.9rem] border border-line bg-white/75 p-6">
          <div className="section-kicker">Evidence</div>
          {report.images.length > 0 ? (
            <div className="grid gap-3">
              {report.images.map((image) => {
                const exclusion = excludedImageMap.get(image.id);
                const reviewIncomplete = exclusion
                  ? isTechnicalEvidenceIssue(exclusion)
                  : false;
                const evidenceBadge =
                  analysisState === "PENDING" || analysisState === "IDLE"
                    ? { tone: "muted" as const, label: "Pending AI review" }
                    : analysisState === "FAILED"
                      ? { tone: "danger" as const, label: "AI review incomplete" }
                      : reviewIncomplete
                        ? { tone: "danger" as const, label: "AI review incomplete" }
                      : exclusion
                        ? { tone: "danger" as const, label: "Rejected from AI evidence" }
                        : { tone: "brand" as const, label: "Accepted as evidence" };
                const evidenceText =
                  analysisState === "PENDING" || analysisState === "IDLE"
                    ? "AI has not finished reviewing this upload yet, so it is not treated as accepted evidence yet."
                    : analysisState === "FAILED"
                      ? "AI evidence review did not finish for this upload. Retry enrichment before treating it as verified evidence."
                      : reviewIncomplete
                        ? "EchoShare could not finish AI review for this upload yet, so it is not treated as accepted evidence."
                      : exclusion
                        ? exclusion.reason ?? "This image was excluded from the AI analysis."
                        : "This image passed the AI evidence review and was available to the analysis.";

                return (
                  <div
                    key={image.id}
                    className="overflow-hidden rounded-[1.5rem] border border-line bg-[#f8f3ea]"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      alt={image.caption ?? report.title}
                      className="h-52 w-full object-cover"
                      src={image.publicUrl}
                    />
                    <div className="space-y-2 p-4">
                      <div className="flex flex-wrap gap-2">
                        <Badge tone={evidenceBadge.tone}>{evidenceBadge.label}</Badge>
                        {image.isPrimary ? <Badge tone="muted">Primary upload</Badge> : null}
                      </div>
                      <p className="text-sm leading-6 text-muted">{evidenceText}</p>
                    </div>
                  </div>
                );
              })}
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
