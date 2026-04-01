import { ReportMap } from "@/components/maps/report-map";
import { ReportFilterForm } from "@/components/reports/report-filter-form";
import { EmptyState } from "@/components/ui/empty-state";
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
            Marker clusters reveal where reports are coming from. The heat layer
            weights denser and more severe submissions more heavily so volunteers
            can see where immediate cleanup or escalation might matter most.
          </p>
        </header>
        {data.markers.length === 0 ? (
          <EmptyState
            detail="No map markers match the current filter set yet."
            title="No markers to render"
          />
        ) : (
          <ReportMap markers={data.markers} />
        )}
      </div>
    </section>
  );
}
