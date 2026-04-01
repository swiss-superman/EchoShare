import { ReportMap } from "@/components/maps/report-map";
import { ReportFilterForm } from "@/components/reports/report-filter-form";
import { getMapData, normalizeReportFilters } from "@/lib/data/queries";

export const dynamic = "force-dynamic";

type MapPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function MapPage({ searchParams }: MapPageProps) {
  const filters = normalizeReportFilters(await searchParams);
  const data = await getMapData(filters);

  return (
    <section className="grid gap-6 lg:grid-cols-[300px_1fr]">
      <aside>
        <ReportFilterForm
          filters={data.filters}
          resetHref="/map"
          waterBodies={data.waterBodies}
        />
      </aside>
      <div className="space-y-5">
        <header className="shell-frame rounded-[1.8rem] px-6 py-6">
          <div className="section-kicker">Map intelligence</div>
          <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
            Hotspots, density, and field context
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
            The heat layer now blends citizen reports with mapped municipal
            waste-pressure hotspots from your dataset. Filters still refine the
            report layer, while the amber dataset overlay keeps long-range waste
            burden visible for context.
          </p>
          {data.markers.length === 0 ? (
            <p className="mt-4 rounded-[1rem] border border-dashed border-line-strong bg-white/70 px-4 py-3 text-sm leading-7 text-muted">
              This deployment does not have report data yet, so the map is
              showing the base geography only. Connect the production
              PostgreSQL database or submit the first report to populate live
              markers and hotspot density.
            </p>
          ) : (
            <p className="mt-4 rounded-[1rem] border border-line bg-white/72 px-4 py-3 text-sm leading-7 text-muted">
              Showing {data.reportMarkerCount} citizen report markers and{" "}
              {data.datasetMarkerCount} dataset hotspots. Open{" "}
              <a className="font-semibold text-[#0b5061]" href="/signals">
                Signals
              </a>{" "}
              for the ranked intelligence board and water-quality feeds.
            </p>
          )}
        </header>
        <ReportMap markers={data.markers} />
      </div>
    </section>
  );
}
