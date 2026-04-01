import { pollutionCategories, reportStatuses, severityLevels } from "@/lib/constants";
import type { ReportFilters } from "@/lib/data/queries";

type ReportFilterFormProps = {
  filters: ReportFilters;
  waterBodies: Array<{ id: string; name: string }>;
  resetHref?: string;
};

export function ReportFilterForm({
  filters,
  waterBodies,
  resetHref = "/reports",
}: ReportFilterFormProps) {
  return (
    <form className="space-y-4 rounded-[1.6rem] border border-line bg-white/70 p-5">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-muted">Filters</p>
        <h2 className="mt-2 font-display text-2xl font-semibold tracking-[-0.04em]">
          Focus the signal
        </h2>
      </div>
      <label className="block space-y-2 text-sm font-medium">
        <span>Category</span>
        <select
          className="w-full rounded-2xl border border-line bg-white px-4 py-3"
          defaultValue={filters.category ?? ""}
          name="category"
        >
          <option value="">All categories</option>
          {pollutionCategories.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>Severity</span>
        <select
          className="w-full rounded-2xl border border-line bg-white px-4 py-3"
          defaultValue={filters.severity ?? ""}
          name="severity"
        >
          <option value="">All severity levels</option>
          {severityLevels.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>Status</span>
        <select
          className="w-full rounded-2xl border border-line bg-white px-4 py-3"
          defaultValue={filters.status ?? ""}
          name="status"
        >
          <option value="">All statuses</option>
          {reportStatuses.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>Water body</span>
        <select
          className="w-full rounded-2xl border border-line bg-white px-4 py-3"
          defaultValue={filters.waterBodyId ?? ""}
          name="waterBodyId"
        >
          <option value="">All water bodies</option>
          {waterBodies.map((waterBody) => (
            <option key={waterBody.id} value={waterBody.id}>
              {waterBody.name}
            </option>
          ))}
        </select>
      </label>
      <label className="block space-y-2 text-sm font-medium">
        <span>Time range</span>
        <select
          className="w-full rounded-2xl border border-line bg-white px-4 py-3"
          defaultValue={filters.timeWindow ?? "30d"}
          name="timeWindow"
        >
          <option value="24h">Last 24 hours</option>
          <option value="7d">Last 7 days</option>
          <option value="30d">Last 30 days</option>
          <option value="all">All time</option>
        </select>
      </label>
      <div className="flex gap-3">
        <button
          className="flex-1 rounded-full bg-brand px-4 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
          type="submit"
        >
          Apply filters
        </button>
        <a
          className="inline-flex items-center rounded-full border border-line-strong px-4 py-3 text-sm font-semibold transition hover:bg-white"
          href={resetHref}
        >
          Reset
        </a>
      </div>
    </form>
  );
}
