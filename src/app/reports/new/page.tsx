import { createReportAction } from "@/app/actions/report-actions";
import { ReportCreateForm } from "@/components/reports/report-create-form";
import { requireUser } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function NewReportPage() {
  const user = await requireUser();

  return (
    <section className="space-y-6">
      <header className="shell-frame rounded-[1.8rem] px-6 py-6">
        <div className="section-kicker">Protected reporting</div>
        <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
          Logged in as {user.name ?? user.email}
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-7 text-muted">
          Reports are attached to authenticated community profiles. Raw evidence
          stays intact in the database; AI output is stored separately and
          labeled as assistance.
        </p>
      </header>
      <ReportCreateForm action={createReportAction} />
    </section>
  );
}
