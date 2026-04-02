import { format, formatDistanceToNow } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getIntelligencePageData } from "@/lib/data/queries";
import { isFirecrawlConfigured } from "@/lib/env";
import { formatNumber, toTitleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatSignalDate(value: string | null) {
  if (!value) {
    return "Date not provided by source";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return `${format(date, "dd MMM yyyy, h:mm a")} · ${formatDistanceToNow(date, {
    addSuffix: true,
  })}`;
}

function SignalCard({
  signal,
  tone,
}: {
  signal: Awaited<ReturnType<typeof getIntelligencePageData>>["prioritySignals"][number];
  tone: "brand" | "default";
}) {
  return (
    <article className="rounded-[1.35rem] border border-line bg-white/72 p-5">
      <div className="flex flex-wrap gap-2">
        <Badge tone={tone}>
          {signal.signalType === "OFFICIAL_UPDATE" ? "Official update" : "News mention"}
        </Badge>
        <Badge tone="muted">{signal.publisher}</Badge>
        <Badge
          className="ml-auto"
          tone={signal.priorityScore >= 70 ? "danger" : signal.priorityScore >= 45 ? "brand" : "muted"}
        >
          Priority {signal.priorityScore}
        </Badge>
      </div>

      <h3 className="mt-4 text-2xl font-semibold tracking-[-0.04em]">{signal.title}</h3>
      <p className="mt-2 text-sm text-muted">
        {formatSignalDate(signal.publishedAt ?? signal.discoveredAt)}
      </p>
      <p className="mt-3 text-sm leading-7 text-muted">{signal.summary}</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {signal.locationHint ? <Badge tone="default">{signal.locationHint}</Badge> : null}
        {signal.waterBodyHint ? <Badge tone="default">{signal.waterBodyHint}</Badge> : null}
        {signal.tags.slice(0, 4).map((tag) => (
          <Badge key={`${signal.id}-${tag}`} tone="muted">
            {tag}
          </Badge>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap gap-3">
        <a
          className="inline-flex items-center rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
          href={signal.sourceUrl}
        >
          Open source
        </a>
        <span className="inline-flex items-center rounded-full border border-line bg-white/72 px-4 py-2 text-sm font-semibold text-foreground">
          {signal.sourceName}
        </span>
      </div>
    </article>
  );
}

export default async function IntelligencePage() {
  const data = await getIntelligencePageData();
  const firecrawlReady = isFirecrawlConfigured();
  const configuredOfficialSources = data.sources.filter(
    (source) => source.type === "OFFICIAL_SITE",
  ).length;
  const configuredNewsSources = data.sources.filter(
    (source) => source.type === "NEWS_QUERY",
  ).length;
  const activeOfficialSources = data.sources.filter(
    (source) => source.type === "OFFICIAL_SITE" && source.signalCount > 0,
  ).length;

  return (
    <section className="w-full min-w-0 space-y-6 overflow-x-clip">
      <header className="shell-frame rounded-[1.8rem] px-6 py-6 sm:px-8">
        <div className="section-kicker">External intelligence</div>
        <h1 className="mt-3 max-w-4xl font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          India water-body intelligence, kept separate from citizen reports
        </h1>
        <p className="mt-4 max-w-4xl text-sm leading-7 text-muted">
          This layer tracks regulator sites, lake and river mission pages, NGO field
          updates, and recent India coverage relevant to pollution, sewage, waste,
          cleanup, and restoration near water bodies. It never overwrites EchoShare
          reports and should be read as supporting external intelligence only.
        </p>

        <div className="mt-6 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              Live signals
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {formatNumber(data.metrics.totalSignals)}
            </div>
            <div className="mt-2 text-sm text-muted">
              Active external items stored in the intelligence layer
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              Official updates
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {formatNumber(data.metrics.officialUpdates)}
            </div>
            <div className="mt-2 text-sm text-muted">
              Regulator, mission, and NGO source pages currently surfaced
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              News mentions
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {formatNumber(data.metrics.newsMentions)}
            </div>
            <div className="mt-2 text-sm text-muted">
              India publisher coverage relevant to water-body incidents
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              Source network
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {formatNumber(data.metrics.watchedSources)}
            </div>
            <div className="mt-2 text-sm text-muted">
              {firecrawlReady
                ? `${activeOfficialSources}/${configuredOfficialSources} official sources are currently surfacing live items`
                : "Firecrawl key is not configured yet"}
            </div>
          </div>
        </div>
      </header>

      <section className="grid gap-6 xl:grid-cols-3">
        <article className="shell-frame rounded-[1.8rem] px-5 py-5">
          <div className="section-kicker">What shows here</div>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">
            Mission-fit signals only
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
            <p>Regulator notices, river and lake mission pages, restoration drives, and India coverage tied to lakes, rivers, wetlands, canals, ponds, and beaches.</p>
            <p>Generic explainers, unrelated environmental pages, and off-mission content are filtered out before storage.</p>
          </div>
        </article>

        <article className="shell-frame rounded-[1.8rem] px-5 py-5">
          <div className="section-kicker">Coverage network</div>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">
            Regulators, NGOs, and India news
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
            <p>{configuredOfficialSources} official and NGO source watches are configured for regulator, mission, lake, and field-action updates.</p>
            <p>{configuredNewsSources} India news queries are configured for pollution, cleanup, and restoration coverage.</p>
          </div>
        </article>

        <article className="shell-frame rounded-[1.8rem] px-5 py-5">
          <div className="section-kicker">Sync model</div>
          <h2 className="mt-3 font-display text-2xl font-semibold tracking-[-0.04em]">
            Broad enough, not random
          </h2>
          <div className="mt-4 space-y-3 text-sm leading-7 text-muted">
            <p>The sync targets configured India water-body sources and news coverage instead of blindly scraping the whole web.</p>
            <p>This keeps results relevant to EchoShare and avoids wasting Firecrawl credits on unrelated pages.</p>
          </div>
        </article>
      </section>

      <section className="shell-frame rounded-[1.8rem] px-5 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="section-kicker">Priority queue</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">
              Highest-priority external signals first
            </h2>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-muted lg:text-right">
            Ordered by recency plus water-body urgency: sewage, waste, toxic discharge,
            fish kill, cleanup, restoration, and regulator-linked action.
          </p>
        </div>

        {data.prioritySignals.length === 0 ? (
          <div className="mt-5">
            <EmptyState
              detail={
                firecrawlReady
                  ? "Run the intelligence sync to pull real source data into this layer."
                  : "Set FIRECRAWL_API_KEY and run the intelligence sync to populate this tab."
              }
              title="No external signals yet"
            />
          </div>
        ) : (
          <div className="mt-5 grid gap-4">
            {data.prioritySignals.map((signal) => (
              <SignalCard
                key={signal.id}
                signal={signal}
                tone={signal.signalType === "OFFICIAL_UPDATE" ? "brand" : "default"}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid min-w-0 gap-6 xl:grid-cols-2">
        <article className="shell-frame min-w-0 rounded-[1.8rem] px-5 py-5">
          <div className="section-kicker">Official monitor</div>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">
            Regulator and field-action updates
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            These are the sources most likely to help with escalation, cleanup coordination,
            restoration action, and civic follow-through.
          </p>
          <div className="mt-5 space-y-4">
            {data.officialSignals.length > 0 ? (
              data.officialSignals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} tone="brand" />
              ))
            ) : (
              <EmptyState
                detail="The source network is configured, but the latest sync did not produce a matching official update yet."
                title="No official updates currently active"
              />
            )}
          </div>
        </article>

        <article className="shell-frame min-w-0 rounded-[1.8rem] px-5 py-5">
          <div className="section-kicker">News radar</div>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">
            India publisher coverage
          </h2>
          <p className="mt-3 text-sm leading-7 text-muted">
            Coverage is filtered to India-linked water-body pollution, waste, cleanup, and restoration stories only.
          </p>
          <div className="mt-5 space-y-4">
            {data.newsSignals.length > 0 ? (
              data.newsSignals.map((signal) => (
                <SignalCard key={signal.id} signal={signal} tone="default" />
              ))
            ) : (
              <EmptyState
                detail="The latest sync did not produce a matching India news mention yet."
                title="No news mentions currently active"
              />
            )}
          </div>
        </article>
      </section>

      <section className="shell-frame rounded-[1.8rem] px-5 py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="section-kicker">Source network</div>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-[-0.04em]">
              Configured watches
            </h2>
          </div>
          <p className="max-w-3xl text-sm leading-7 text-muted lg:text-right">
            This is the current scrape network. Add more source configs when you want
            wider coverage, but keep them tied to water-body pollution, cleanup, restoration,
            NGO field work, or regulator action.
          </p>
        </div>

        <div className="mt-5 grid gap-4 md:grid-cols-2 2xl:grid-cols-3">
          {data.sources.map((source) => (
            <article
              key={source.id}
              className="rounded-[1.25rem] border border-line bg-white/72 p-4"
            >
              <div className="flex flex-wrap gap-2">
                <Badge tone={source.type === "OFFICIAL_SITE" ? "brand" : "default"}>
                  {toTitleCase(source.type)}
                </Badge>
                <Badge tone={source.signalCount > 0 ? "success" : "muted"}>
                  {source.signalCount} live
                </Badge>
              </div>
              <h3 className="mt-3 text-xl font-semibold">{source.name}</h3>
              <p className="mt-2 text-sm leading-7 text-muted">
                {source.description ?? "No description available."}
              </p>
              <div className="mt-3 space-y-1 text-sm text-muted">
                {source.focusLabel ? <div>Focus: {source.focusLabel}</div> : null}
                <div>
                  Last synced: {source.lastSyncedAt ? formatSignalDate(source.lastSyncedAt) : "Not yet synced"}
                </div>
                {source.lastError ? <div className="text-danger">Last error: {source.lastError}</div> : null}
              </div>
              {source.sourceUrl ? (
                <a
                  className="mt-4 inline-flex items-center rounded-full border border-line-strong px-4 py-2 text-sm font-semibold transition hover:bg-white"
                  href={source.sourceUrl}
                >
                  Source site
                </a>
              ) : null}
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
