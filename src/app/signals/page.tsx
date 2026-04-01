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
    <section className="space-y-6">
      <header className="shell-frame rounded-[1.9rem] px-6 py-6 sm:px-8">
        <div className="section-kicker">Signals center</div>
        <div className="mt-4 grid gap-8 xl:grid-cols-[1.2fr_0.8fr] xl:items-end">
          <div>
            <h1 className="font-display text-4xl font-semibold tracking-[-0.05em] sm:text-5xl">
              National waste signals and field reports in one command layer
            </h1>
            <p className="mt-4 max-w-3xl text-sm leading-7 text-muted">
              EchoShare now fuses citizen-submitted pollution reports with your
              real waste and water-quality datasets. Mapped landfill pressure is
              shown alongside live field reports, while coordinate-free water
              monitoring feeds stay visible as ranked intelligence instead of
              being guessed onto the map.
            </p>
          </div>
          <div className="grid gap-3 rounded-[1.6rem] border border-black/8 bg-[rgba(15,33,44,0.92)] p-5 text-white shadow-[0_22px_60px_rgba(14,24,32,0.24)]">
            <div className="text-xs uppercase tracking-[0.2em] text-[#8ee3de]">
              Fused coverage
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[1.2rem] border border-white/10 bg-white/4 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-white/55">
                  Mapped hotspots
                </div>
                <div className="mt-2 text-3xl font-semibold">
                  {formatNumber(data.markers.length)}
                </div>
                <div className="mt-1 text-sm text-white/68">
                  {formatNumber(data.datasetMarkerCount)} dataset points +{" "}
                  {formatNumber(data.reportMarkerCount)} citizen reports
                </div>
              </div>
              <div className="rounded-[1.2rem] border border-white/10 bg-white/4 p-4">
                <div className="text-xs uppercase tracking-[0.16em] text-white/55">
                  Waste load year
                </div>
                <div className="mt-2 text-3xl font-semibold">
                  {data.wasteDatasetYear}
                </div>
                <div className="mt-1 text-sm text-white/68">
                  {formatNumber(data.wasteDatasetTotal)} tons/day across the
                  latest municipal dataset
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="grid gap-6 xl:grid-cols-[280px_1.12fr_0.88fr]">
        <aside className="space-y-4">
          <ReportFilterForm
            filters={data.filters}
            resetHref="/signals"
            waterBodies={data.waterBodies}
          />
          <div className="shell-frame rounded-[1.6rem] px-5 py-5">
            <div className="section-kicker">Filter scope</div>
            <p className="mt-3 text-sm leading-7 text-muted">
              These filters only narrow the citizen report layer. Municipal
              dataset hotspots remain visible so the map keeps long-range waste
              pressure in view.
            </p>
          </div>
        </aside>

        <div className="space-y-6">
          <section className="shell-frame rounded-[1.8rem] px-5 py-5 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <div className="section-kicker">Hotspot map</div>
                <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">
                  Field signals + mapped dataset pressure
                </h2>
              </div>
              <div className="text-sm leading-7 text-muted sm:max-w-sm sm:text-right">
                Blue markers are citizen reports. Amber markers are landfill or
                municipal waste-pressure hotspots derived from the dataset.
              </div>
            </div>
            <div className="mt-5">
              <ReportMap heightClassName="h-[640px]" markers={data.markers} />
            </div>
          </section>

          <section className="grid gap-6 lg:grid-cols-2">
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
                  {feed.worstWqi.toFixed(1)}. This feed is not placed on the map
                  because the CSV contains no measurement coordinates, and
                  EchoShare does not guess locations for real data.
                </div>
              </article>
            ))}
          </section>
        </div>

        <div className="space-y-6">
          <section className="shell-frame rounded-[1.8rem] px-5 py-5">
            <div className="section-kicker">Priority board</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">
              Highest pressure first
            </h2>
            <div className="mt-5 space-y-3">
              {data.priorityBoard.map((entry, index) => (
                <article
                  key={entry.id}
                  className="rounded-[1.35rem] border border-line bg-white/72 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted">
                        {index + 1}. {entry.sourceLabel}
                      </div>
                      <h3 className="mt-2 text-lg font-semibold">{entry.title}</h3>
                      <p className="mt-1 text-sm text-muted">{entry.locationLabel}</p>
                    </div>
                    <div className="rounded-full border border-line bg-[rgba(10,27,37,0.06)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-foreground">
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

          <section className="shell-frame rounded-[1.8rem] px-5 py-5">
            <div className="section-kicker">Municipal burden leaders</div>
            <div className="mt-4 space-y-3">
              {data.wasteHotspots.slice(0, 6).map((hotspot) => (
                <div
                  key={hotspot.id}
                  className="rounded-[1.25rem] border border-line bg-white/72 p-4"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <h3 className="text-lg font-semibold">{hotspot.city}</h3>
                      <p className="text-sm text-muted">{hotspot.landfillName}</p>
                    </div>
                    <div className="text-right">
                      <div className="text-lg font-semibold">
                        {formatNumber(hotspot.totalWasteTonsPerDay)}
                      </div>
                      <div className="text-xs uppercase tracking-[0.16em] text-muted">
                        tons / day
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
      </div>
    </section>
  );
}
