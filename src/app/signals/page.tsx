import { format } from "date-fns";
import { ReportMap } from "@/components/maps/report-map";
import { ReportFilterForm } from "@/components/reports/report-filter-form";
import { getSignalsPageData, normalizeReportFilters } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

type SignalsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function formatNumber(value: number) {
  return new Intl.NumberFormat("en-IN", {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateLabel(value: string) {
  const parsed = new Date(value);

  if (Number.isNaN(parsed.getTime())) {
    return value;
  }

  return format(parsed, "dd MMM yyyy, h:mm a");
}

export default async function SignalsPage({ searchParams }: SignalsPageProps) {
  const filters = normalizeReportFilters(await searchParams);
  const data = await getSignalsPageData(filters);

  return (
    <section className="w-full min-w-0 space-y-6 overflow-x-clip">
      <header className="shell-frame rounded-[1.9rem] px-6 py-6 sm:px-8">
        <div className="section-kicker">Signals center</div>
        <div className="mt-4">
          <h1 className="font-display text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
            India waste-pressure atlas
          </h1>
          <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
            A map-led national analysis layer for India. Real municipal
            waste-burden coordinates and live EchoShare reports drive the heat
            field. Water-quality files stay separate unless they contain real
            measurement coordinates.
          </p>
        </div>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              Heat anchors
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {formatNumber(data.markers.length)}
            </div>
            <div className="mt-2 text-sm text-muted">
              {formatNumber(data.datasetMarkerCount)} dataset points +{" "}
              {formatNumber(data.reportMarkerCount)} field reports
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              Waste load year
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {data.wasteDatasetYear}
            </div>
            <div className="mt-2 text-sm text-muted">
              {formatNumber(data.wasteDatasetTotal)} tons/day across the latest
              municipal file
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              Water-quality feeds
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {formatNumber(data.waterQualityFeeds.length)}
            </div>
            <div className="mt-2 text-sm text-muted">
              Separate evidence streams kept off-map unless coordinates are real
            </div>
          </div>
        </div>
      </header>

      <section className="shell-frame min-w-0 rounded-[1.9rem] px-5 py-5 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="section-kicker">National heat surface</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">
              India waste-pressure map
            </h2>
          </div>
          <div className="max-w-2xl text-sm leading-7 text-muted lg:text-right">
            Heat intensity is driven by corrected Indian city positions from the
            municipal dataset plus live report coordinates. Spot markers are hidden
            here so the map reads as a clean pressure field instead of a pin board.
          </div>
        </div>
        <div className="mt-5">
          <ReportMap
            heightClassName="h-[720px]"
            markers={data.markers}
            mode="heatmap"
            showHeatLegend
            viewport="india"
          />
        </div>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <section className="shell-frame rounded-[1.8rem] px-5 py-5">
            <div className="section-kicker">Report layer controls</div>
            <p className="mt-3 text-sm leading-7 text-muted">
              These controls affect only the EchoShare report layer. The municipal
              dataset stays visible so the national pressure field remains
              geographically stable.
            </p>
            <div className="mt-5">
              <ReportFilterForm
                filters={data.filters}
                resetHref="/signals"
                waterBodies={data.waterBodies}
              />
            </div>
          </section>

          <section className="shell-frame rounded-[1.8rem] px-5 py-5">
            <div className="section-kicker">Dataset mix</div>
            <div className="mt-4 flex flex-wrap gap-2">
              {data.dominantWasteTypes.map((entry) => (
                <div
                  key={entry.label}
                  className="rounded-full border border-line bg-white/72 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-foreground"
                >
                  {entry.label} · {formatNumber(entry.tonsPerDay)} tons/day
                </div>
              ))}
            </div>
          </section>
        </div>

        <section className="shell-frame min-w-0 rounded-[1.8rem] px-5 py-5">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <div className="section-kicker">Priority board</div>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">
                Highest pressure first
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-muted lg:text-right">
              Ranked from the strongest pressure signals currently available across
              citizen reports and municipal burden data.
            </p>
          </div>
          <div className="mt-5 grid gap-3 lg:grid-cols-2">
            {data.priorityBoard.slice(0, 6).map((entry, index) => (
              <article
                key={entry.id}
                className="rounded-[1.35rem] border border-line bg-white/72 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="text-xs uppercase tracking-[0.16em] text-muted">
                      {index + 1}. {entry.sourceLabel}
                    </div>
                    <h3 className="mt-2 text-lg font-semibold">{entry.title}</h3>
                    <p className="mt-1 text-sm text-muted">{entry.locationLabel}</p>
                  </div>
                  <div className="shrink-0 rounded-full border border-line bg-[rgba(10,27,37,0.06)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                    Index {entry.priorityIndex}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-7 text-muted">{entry.summary}</p>
                <div className="mt-4 flex items-center justify-between gap-4">
                  <div className="rounded-full bg-[rgba(10,27,37,0.06)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-foreground">
                    {entry.metricLabel}
                  </div>
                  {entry.href ? (
                    <a
                      className="text-sm font-semibold text-[#0b5061]"
                      href={entry.href}
                    >
                      Open source
                    </a>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-[minmax(0,1.08fr)_minmax(0,0.92fr)]">
        <article className="shell-frame min-w-0 rounded-[1.8rem] px-5 py-5">
          <div className="section-kicker">Municipal burden leaders</div>
          <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">
            Highest waste load cities
          </h3>
          <div className="mt-5 grid gap-3">
            {data.wasteHotspots.slice(0, 6).map((hotspot, index) => (
              <div
                key={hotspot.id}
                className="rounded-[1.25rem] border border-line bg-white/72 p-4"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted">
                      {index + 1}. City burden
                    </div>
                    <h4 className="mt-2 text-lg font-semibold">{hotspot.city}</h4>
                    <p className="mt-1 text-sm text-muted">
                      {hotspot.landfillName}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-semibold">
                      {formatNumber(hotspot.totalWasteTonsPerDay)}
                    </div>
                    <div className="text-xs uppercase tracking-[0.16em] text-muted">
                      tons/day
                    </div>
                  </div>
                </div>
                <div className="mt-3 grid gap-3 text-sm text-muted sm:grid-cols-2">
                  <div>Dominant stream: {hotspot.dominantWasteType}</div>
                  <div>Recycling avg: {Math.round(hotspot.averageRecyclingRate)}%</div>
                  <div>
                    Efficiency: {hotspot.averageEfficiencyScore.toFixed(1)}/10
                  </div>
                  <div>Priority index: {hotspot.priorityIndex}</div>
                </div>
              </div>
            ))}
          </div>
        </article>

        <div className="min-w-0 space-y-6">
          {data.waterQualityFeeds.map((feed) => (
            <article
              key={feed.id}
              className="shell-frame rounded-[1.8rem] px-5 py-5"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="section-kicker">Water-quality feed</div>
                  <h3 className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">
                    {feed.label}
                  </h3>
                </div>
                <div className="rounded-full border border-line bg-white/75 px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
                  {feed.latestStatus}
                </div>
              </div>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-line bg-white/68 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted">
                    Latest WQI
                  </div>
                  <div className="mt-2 text-3xl font-semibold">
                    {feed.latestWqi.toFixed(1)}
                  </div>
                  <div className="mt-2 text-sm text-muted">
                    {formatDateLabel(feed.latestObservedAt)}
                  </div>
                </div>
                <div className="rounded-[1.2rem] border border-line bg-white/68 p-4">
                  <div className="text-xs uppercase tracking-[0.16em] text-muted">
                    Poor or worse
                  </div>
                  <div className="mt-2 text-3xl font-semibold">
                    {Math.round(feed.poorShare * 100)}%
                  </div>
                  <div className="mt-2 text-sm text-muted">
                    {formatNumber(feed.sampleCount)} samples in file
                  </div>
                </div>
              </div>
              <div className="mt-4 rounded-[1.2rem] border border-dashed border-line bg-white/55 p-4 text-sm leading-7 text-muted">
                Average WQI {feed.averageWqi.toFixed(1)}, worst observed WQI{" "}
                {feed.worstWqi.toFixed(1)}. This stream stays off-map because
                the CSV contains no measurement coordinates.
              </div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
