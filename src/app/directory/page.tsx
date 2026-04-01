import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { getDirectoryData } from "@/lib/data/queries";
import { toTitleCase } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function DirectoryPage() {
  const organizations = await getDirectoryData();

  return (
    <section className="space-y-6">
      <header className="shell-frame rounded-[1.8rem] px-6 py-6">
        <div className="section-kicker">Stakeholder directory</div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
          NGOs, public bodies, and local response actors
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          The directory is modeled for verification-ready records. Development
          seed entries are clearly labeled and should be replaced with real
          stakeholder onboarding after the hackathon demo.
        </p>
      </header>

      {organizations.length === 0 ? (
        <EmptyState
          detail="No organizations are stored yet. Seed the database or onboard verified stakeholders."
          title="Directory is empty"
        />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {organizations.map((organization) => (
            <article key={organization.id} className="rounded-[1.8rem] border border-line bg-white/75 p-6">
              <div className="flex flex-wrap gap-2">
                <Badge tone="brand">{toTitleCase(organization.type)}</Badge>
                <Badge tone={organization.verification === "VERIFIED" ? "success" : "muted"}>
                  {toTitleCase(organization.verification)}
                </Badge>
                {organization.isDevelopmentSeed ? <Badge tone="muted">Development seed</Badge> : null}
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
                    Water body
                  </p>
                  <p className="mt-2 text-sm font-semibold">
                    {organization.waterBody?.name ?? "Multi-area / not specified"}
                  </p>
                </div>
              </div>
              <div className="mt-5 space-y-2 text-sm text-muted">
                {organization.email ? <p>Email: {organization.email}</p> : null}
                {organization.phone ? <p>Phone: {organization.phone}</p> : null}
                {organization.website ? (
                  <p>
                    Website:{" "}
                    <a className="font-semibold text-brand" href={organization.website}>
                      {organization.website}
                    </a>
                  </p>
                ) : null}
                {organization.location ? (
                  <p>
                    Location: {organization.location.locality ?? "Unknown locality"}
                    {organization.location.state ? `, ${organization.location.state}` : ""}
                  </p>
                ) : null}
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
