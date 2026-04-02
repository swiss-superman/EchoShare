import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getDirectoryData } from "@/lib/data/queries";
import { toTitleCase } from "@/lib/utils";

function OrganizationCard({
  organization,
  emphasis,
}: {
  organization: Awaited<ReturnType<typeof getDirectoryData>>[number];
  emphasis: "ngo" | "government";
}) {
  const primaryAction =
    emphasis === "ngo"
      ? organization.volunteerUrl ?? organization.website
      : organization.complaintUrl ?? organization.website;
  const primaryLabel =
    emphasis === "ngo"
      ? organization.volunteerUrl
        ? "Volunteer / get involved"
        : "Official site"
      : organization.complaintUrl
        ? "Escalation / complaint route"
        : "Official site";

  return (
    <article className="rounded-[1.8rem] border border-line bg-white/75 p-6">
      <div className="flex flex-wrap gap-2">
        <Badge tone="brand">{toTitleCase(organization.type)}</Badge>
        <Badge
          tone={organization.verification === "VERIFIED" ? "success" : "muted"}
        >
          {toTitleCase(organization.verification)}
        </Badge>
        <Badge tone="muted">
          {emphasis === "ngo" ? "Action network" : "Official channel"}
        </Badge>
      </div>

      <h2 className="mt-4 font-display text-3xl font-semibold tracking-[-0.04em]">
        {organization.name}
      </h2>
      <p className="mt-3 text-sm leading-7 text-muted">
        {organization.description ?? "No description added yet."}
      </p>

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-[1.3rem] border border-line bg-[#f8f3ea] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Area served
          </p>
          <p className="mt-2 text-sm font-semibold">{organization.areaServed}</p>
        </div>
        <div className="rounded-[1.3rem] border border-line bg-[#f8f3ea] p-4">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Best fit
          </p>
          <p className="mt-2 text-sm font-semibold">
            {organization.issueFocus.slice(0, 2).join(" • ") ||
              "General environmental response"}
          </p>
        </div>
      </div>

      {organization.issueFocus.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Issue focus
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {organization.issueFocus.map((issue) => (
              <Badge key={issue} tone="default">
                {issue}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      {organization.responseModes.length > 0 ? (
        <div className="mt-5">
          <p className="text-xs uppercase tracking-[0.18em] text-muted">
            Can help with
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {organization.responseModes.map((mode) => (
              <Badge key={mode} tone="muted">
                {mode}
              </Badge>
            ))}
          </div>
        </div>
      ) : null}

      <div className="mt-5 space-y-2 text-sm text-muted">
        {organization.contactName ? <p>Contact: {organization.contactName}</p> : null}
        {organization.email ? <p>Email: {organization.email}</p> : null}
        {organization.phone ? <p>Phone: {organization.phone}</p> : null}
        {organization.officeAddress ? <p>Office: {organization.officeAddress}</p> : null}
        {organization.locationLabel ? <p>Location: {organization.locationLabel}</p> : null}
        {organization.waterBodyName ? <p>Water body focus: {organization.waterBodyName}</p> : null}
        {organization.notes ? <p>{organization.notes}</p> : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {primaryAction ? (
          <a
            className={`inline-flex items-center rounded-full px-4 py-2 text-sm font-semibold transition ${
              emphasis === "ngo"
                ? "bg-brand text-white hover:bg-brand-strong"
                : "bg-[#102430] text-white hover:bg-black"
            }`}
            href={primaryAction}
          >
            {primaryLabel}
          </a>
        ) : null}
        {organization.website && organization.website !== primaryAction ? (
          <a
            className="inline-flex items-center rounded-full border border-line-strong px-4 py-2 text-sm font-semibold transition hover:bg-white"
            href={organization.website}
          >
            Official site
          </a>
        ) : null}
        {organization.sourceUrl ? (
          <a
            className="inline-flex items-center rounded-full border border-line-strong px-4 py-2 text-sm font-semibold transition hover:bg-white"
            href={organization.sourceUrl}
          >
            View source
          </a>
        ) : null}
      </div>
    </article>
  );
}

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const organizations = await getDirectoryData();
  const ngoOrganizations = organizations.filter((organization) =>
    ["NGO", "COMMUNITY_GROUP", "VOLUNTEER_NETWORK"].includes(organization.type),
  );
  const publicBodies = organizations.filter((organization) =>
    ["GOVERNMENT", "ACADEMIC", "CSR"].includes(organization.type),
  );
  const verifiedCount = organizations.filter(
    (organization) => organization.verification === "VERIFIED",
  ).length;

  return (
    <section className="space-y-6">
      <header className="shell-frame rounded-[1.8rem] px-6 py-6">
        <div className="section-kicker">Stakeholder directory</div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
          Real response actors for cleanup, escalation, and water-body action
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          This directory is seeded with source-backed India records from official
          organization and government pages. These entries are not presented as
          EchoShare partners, only as real action channels a citizen can use
          after a verified report.
        </p>
        <div className="mt-6 grid gap-3 md:grid-cols-3">
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              Action NGOs
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {ngoOrganizations.length}
            </div>
            <div className="mt-2 text-sm text-muted">
              Volunteer, cleanup, waste, and conservation groups
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              Public channels
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {publicBodies.length}
            </div>
            <div className="mt-2 text-sm text-muted">
              Government and regulator routes for escalation
            </div>
          </div>
          <div className="rounded-[1.3rem] border border-line bg-white/68 p-4">
            <div className="text-xs uppercase tracking-[0.16em] text-muted">
              Source-backed records
            </div>
            <div className="mt-2 font-display text-3xl font-semibold tracking-[-0.05em]">
              {verifiedCount}
            </div>
            <div className="mt-2 text-sm text-muted">
              Entries pulled from official public sources
            </div>
          </div>
        </div>
      </header>

      {organizations.length === 0 ? (
        <EmptyState
          detail="No organizations are stored yet. Seed the database or onboard verified stakeholders."
          title="Directory is empty"
        />
      ) : (
        <div className="space-y-8">
          <section className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="section-kicker">Volunteer and NGO network</div>
              <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">
                Best fits for cleanup, waste response, and conservation action
              </h2>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              {ngoOrganizations.map((organization) => (
                <OrganizationCard
                  key={organization.id}
                  emphasis="ngo"
                  organization={organization}
                />
              ))}
            </div>
          </section>

          <section className="space-y-4">
            <div className="flex flex-col gap-2">
              <div className="section-kicker">Government and escalation channels</div>
              <h2 className="font-display text-3xl font-semibold tracking-[-0.04em]">
                Official bodies for pollution control, lakes, and river missions
              </h2>
            </div>
            <div className="grid gap-5 xl:grid-cols-2">
              {publicBodies.map((organization) => (
                <OrganizationCard
                  key={organization.id}
                  emphasis="government"
                  organization={organization}
                />
              ))}
            </div>
          </section>
        </div>
      )}
    </section>
  );
}
