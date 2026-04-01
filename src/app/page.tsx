import Link from "next/link";
import {
  ArrowUpRight,
  Camera,
  MapPinned,
  ShieldAlert,
  Sparkles,
  Users,
} from "lucide-react";
import { ReportCard } from "@/components/reports/report-card";
import { Badge } from "@/components/ui/badge";
import { getHomePageData } from "@/lib/data/queries";
import { formatNumber, toTitleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

const fallbackHeroImage =
  "https://images.unsplash.com/photo-1473773508845-188df298d2d1?auto=format&fit=crop&w=1800&q=80";

export default async function Home() {
  const data = await getHomePageData();
  const leadHotspot = data.topWaterBodies[0] ?? null;
  const heroImageUrl =
    data.recentReports.find((report) => report.primaryImageUrl)?.primaryImageUrl ??
    fallbackHeroImage;
  const hasSeedData =
    data.recentReports.some((report) => report.isDevelopmentSeed) ||
    Boolean(data.latestPost?.isDevelopmentSeed) ||
    Boolean(data.nextCleanup?.isDevelopmentSeed);

  const metrics = [
    {
      label: "Reports Filed",
      value: formatNumber(data.metrics.totalReports),
      Icon: Camera,
    },
    {
      label: "Open Issues",
      value: formatNumber(data.metrics.openReports),
      Icon: ShieldAlert,
    },
    {
      label: "Volunteer Sign-ups",
      value: formatNumber(data.metrics.participantCount),
      Icon: Users,
    },
    {
      label: "Cleanup Events",
      value: formatNumber(data.metrics.totalCleanupEvents),
      Icon: MapPinned,
    },
  ];

  const workflow = [
    {
      step: "01",
      title: "Report what people can actually verify",
      detail:
        "Upload a photo, mark the location, choose severity, and name the affected lake, river, canal, beach, or wetland.",
    },
    {
      step: "02",
      title: "See pressure build on the map",
      detail:
        "Markers and hotspot density help people understand where repeated pollution is clustering and which areas need attention first.",
    },
    {
      step: "03",
      title: "Move from complaint to coordination",
      detail:
        "Community posts, cleanup calls, and stakeholder records make it easier to turn evidence into local response.",
    },
  ];

  const signalItems = [
    {
      label: "Lead hotspot",
      value: leadHotspot?.name ?? "No cluster yet",
      detail: leadHotspot
        ? `${formatNumber(leadHotspot.reportCount)} mapped reports`
        : "Waiting for the first local cluster",
    },
    {
      label: "Latest update",
      value: data.latestPost?.title ?? "No post published",
      detail: data.latestPost
        ? toTitleCase(data.latestPost.type)
        : "Community feed is ready",
    },
    {
      label: "Next cleanup",
      value: data.nextCleanup?.title ?? "No event scheduled",
      detail: data.nextCleanup
        ? `${formatNumber(data.nextCleanup.participantCount)} joining`
        : "Create one from Community",
    },
  ];

  return (
    <section className="space-y-8">
      <section className="relative overflow-hidden rounded-[2.8rem] border border-black/8 bg-[#0b1822] shadow-[0_30px_90px_rgba(9,24,34,0.16)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          alt=""
          aria-hidden="true"
          className="absolute inset-0 h-full w-full object-cover"
          fetchPriority="high"
          src={heroImageUrl}
        />
        <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(246,242,234,0.92)_0%,rgba(246,242,234,0.84)_30%,rgba(246,242,234,0.48)_56%,rgba(246,242,234,0.08)_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.02)_34%,rgba(11,24,34,0.18)_100%)]" />
        <div className="absolute left-[-12%] top-[-8%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,rgba(255,255,255,0.72),rgba(255,255,255,0.08)_64%,transparent_78%)] blur-2xl" />

        <div className="relative grid min-h-[650px] gap-6 px-6 py-6 sm:px-8 sm:py-8 lg:grid-cols-[minmax(0,1fr)_340px] lg:px-10 lg:py-10">
          <div className="flex items-start lg:items-center">
            <div className="max-w-[720px] rounded-[2.2rem] border border-white/45 bg-[rgba(255,251,245,0.66)] p-6 shadow-[0_24px_70px_rgba(16,36,48,0.12)] backdrop-blur-xl sm:p-8 lg:p-10">
              <Badge className="border-brand/12 bg-brand/10 text-brand" tone="brand">
                Community-powered water protection
              </Badge>

              <div className="mt-6 space-y-5">
                <h1 className="max-w-[640px] font-display text-5xl font-semibold tracking-[-0.065em] text-[#102430] sm:text-6xl lg:text-[5.25rem] lg:leading-[0.95]">
                  Protect our{" "}
                  <span className="text-[#1991d5]">water bodies</span>, together.
                </h1>
                <p className="max-w-[590px] text-lg leading-8 text-[#4c6270] sm:text-[1.35rem]">
                  Report pollution, visualize hotspots, join cleanups, and
                  coordinate with NGOs and local authorities in one professional
                  civic platform built for visible local action.
                </p>
              </div>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-2xl bg-[#1790d5] px-6 py-3.5 text-sm font-semibold text-white transition hover:bg-[#117ab5]"
                  href="/reports/new"
                >
                  <Camera className="h-4 w-4" />
                  Report Pollution
                </Link>
                <Link
                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-black/8 bg-white/88 px-6 py-3.5 text-sm font-semibold text-[#102430] transition hover:bg-white"
                  href="/map"
                >
                  <MapPinned className="h-4 w-4" />
                  View Hotspots
                </Link>
              </div>

              <div className="mt-8 grid gap-4 border-t border-black/8 pt-6 sm:grid-cols-2">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#6b7d87]">
                    Strongest signal
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-[#102430]">
                    {leadHotspot?.name ?? "Waiting for first hotspot"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#5b6f7a]">
                    {leadHotspot
                      ? `${formatNumber(leadHotspot.reportCount)} reports are already clustering in the map view.`
                      : "The first repeated reports will automatically surface here."}
                  </p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#6b7d87]">
                    Next response action
                  </p>
                  <p className="mt-2 font-display text-2xl font-semibold tracking-[-0.05em] text-[#102430]">
                    {data.nextCleanup?.title ?? "No cleanup scheduled yet"}
                  </p>
                  <p className="mt-2 text-sm leading-6 text-[#5b6f7a]">
                    {data.nextCleanup
                      ? `${formatHomeDate(data.nextCleanup.scheduledAt)} around ${data.nextCleanup.waterBodyName}.`
                      : "Start a cleanup call from the community module when a hotspot needs on-ground action."}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="hidden lg:flex lg:items-end">
            <div className="w-full rounded-[2rem] border border-white/12 bg-[rgba(10,26,37,0.62)] p-6 text-white shadow-[0_24px_70px_rgba(8,20,28,0.18)] backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.2em] text-[#95d9d3]">
                    Signal pulse
                  </p>
                  <h2 className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
                    Live local overview
                  </h2>
                </div>
                <Sparkles className="h-5 w-5 text-[#95d9d3]" />
              </div>

              <div className="mt-6 space-y-4">
                {signalItems.map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[1.35rem] border border-white/10 bg-white/6 px-4 py-4"
                  >
                    <p className="text-xs uppercase tracking-[0.18em] text-[#9ebdc2]">
                      {item.label}
                    </p>
                    <p className="mt-2 font-display text-2xl tracking-[-0.045em]">
                      {item.value}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-[#bfd0d4]">
                      {item.detail}
                    </p>
                  </div>
                ))}
              </div>

              <Link
                className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[#d8f4f2] transition hover:text-white"
                href="/dashboard"
              >
                Open operations dashboard
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>

        <div className="relative border-t border-black/8 bg-[rgba(255,252,247,0.94)] backdrop-blur-md">
          <div className="grid gap-0 sm:grid-cols-2 lg:grid-cols-4">
            {metrics.map(({ label, value, Icon }) => (
              <div
                key={label}
                className="flex flex-col items-center justify-center gap-2 px-6 py-6 text-center lg:border-l lg:border-black/6 first:lg:border-l-0"
              >
                <Icon aria-hidden="true" className="h-5 w-5 text-[#1790d5]" />
                <p className="font-display text-4xl font-semibold tracking-[-0.06em] text-[#102430]">
                  {value}
                </p>
                <p className="text-sm text-[#58707c]">{label}</p>
              </div>
            ))}
          </div>
          <div className="border-t border-black/6 px-6 py-3 text-center text-xs text-[#6d7d87]">
            {hasSeedData
              ? "Stats are computed from app data in this local build. Some entries are development seed records."
              : "Stats are computed from live app data only."}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="shell-frame rounded-[2.2rem] p-6 sm:p-8">
          <div className="section-kicker">How It Works</div>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.055em] text-[#102430]">
            Built for real civic coordination, not just map pins
          </h2>

          <div className="mt-8 divide-y divide-line">
            {workflow.map((item) => (
              <div
                key={item.step}
                className="grid gap-4 py-5 sm:grid-cols-[90px_minmax(0,1fr)]"
              >
                <div className="font-display text-4xl tracking-[-0.06em] text-[#1790d5]">
                  {item.step}
                </div>
                <div>
                  <h3 className="font-display text-2xl font-semibold tracking-[-0.045em] text-[#102430]">
                    {item.title}
                  </h3>
                  <p className="mt-3 max-w-2xl text-sm leading-7 text-muted">
                    {item.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="shell-frame rounded-[2.2rem] p-6 sm:p-8">
          <div className="section-kicker">Network Snapshot</div>
          <h2 className="mt-3 font-display text-4xl font-semibold tracking-[-0.055em] text-[#102430]">
            What EchoShare is surfacing right now
          </h2>

          <div className="mt-8 space-y-4">
            <div className="rounded-[1.7rem] border border-line bg-white/78 p-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">Top hotspot</Badge>
                {leadHotspot ? (
                  <Badge tone="default">
                    {formatNumber(leadHotspot.reportCount)} reports
                  </Badge>
                ) : null}
              </div>
              <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.045em] text-[#102430]">
                {leadHotspot?.name ?? "No hotspot ranked yet"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted">
                {leadHotspot
                  ? `${leadHotspot.name} is currently the strongest concentration of submitted pollution evidence.`
                  : "Hotspot ranking appears automatically as reports accumulate in the system."}
              </p>
            </div>

            <div className="rounded-[1.7rem] border border-line bg-white/78 p-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">Latest community update</Badge>
                {data.latestPost ? (
                  <Badge tone="default">{toTitleCase(data.latestPost.type)}</Badge>
                ) : null}
              </div>
              <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.045em] text-[#102430]">
                {data.latestPost?.title ?? "No community update posted yet"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted">
                {data.latestPost
                  ? `${data.latestPost.excerpt}${data.latestPost.excerpt.length >= 220 ? "..." : ""}`
                  : "The community layer is ready for alerts, cleanup calls, and field updates."}
              </p>
            </div>

            <div className="rounded-[1.7rem] border border-line bg-white/78 p-5">
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">Upcoming cleanup</Badge>
                {data.nextCleanup ? (
                  <Badge tone="default">
                    {formatNumber(data.nextCleanup.participantCount)} joining
                  </Badge>
                ) : null}
              </div>
              <h3 className="mt-4 font-display text-2xl font-semibold tracking-[-0.045em] text-[#102430]">
                {data.nextCleanup?.title ?? "No cleanup scheduled yet"}
              </h3>
              <p className="mt-3 text-sm leading-7 text-muted">
                {data.nextCleanup
                  ? `${data.nextCleanup.waterBodyName} has the next response action on ${formatHomeDate(data.nextCleanup.scheduledAt)}.`
                  : "Create a cleanup event from the community module to move from evidence to turnout."}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="section-kicker">Recent Reports</div>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-[-0.055em] text-[#102430]">
              Latest field evidence
            </h2>
          </div>
          <Link
            className="inline-flex items-center justify-center rounded-full border border-line-strong px-4 py-2 text-sm font-semibold transition hover:bg-white"
            href="/reports"
          >
            View all reports
          </Link>
        </div>

        <div className="space-y-5">
          {data.recentReports.length > 0 ? (
            data.recentReports.map((report) => (
              <ReportCard key={report.id} report={report} />
            ))
          ) : (
            <div className="shell-frame rounded-[1.9rem] px-6 py-8 text-sm leading-7 text-muted">
              No reports have been submitted yet. Start with the reporting flow to
              populate the map, the community layer, and the dashboard.
            </div>
          )}
        </div>
      </section>
    </section>
  );
}

function formatHomeDate(value: string) {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}
