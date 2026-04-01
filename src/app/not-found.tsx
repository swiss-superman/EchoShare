import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] border border-line bg-white/75 p-8">
      <div className="section-kicker">Not found</div>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
        This record is no longer in the waterline
      </h1>
      <p className="mt-4 text-sm leading-7 text-muted">
        The page may have been removed, the report ID may be wrong, or the
        database is not seeded yet.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          className="rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
          href="/reports"
        >
          Browse reports
        </Link>
        <Link
          className="rounded-full border border-line-strong px-5 py-3 text-sm font-semibold transition hover:bg-white"
          href="/"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}
