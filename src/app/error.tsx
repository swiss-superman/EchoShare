"use client";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="mx-auto max-w-3xl rounded-[2rem] border border-line bg-white/75 p-8">
      <div className="section-kicker">Error state</div>
      <h1 className="mt-3 font-display text-4xl font-semibold tracking-[-0.04em]">
        Something broke while loading EchoShare
      </h1>
      <p className="mt-4 text-sm leading-7 text-muted">
        {error.message || "An unexpected error interrupted the current view."}
      </p>
      <button
        className="mt-6 rounded-full bg-brand px-5 py-3 text-sm font-semibold text-white transition hover:bg-brand-strong"
        onClick={() => reset()}
        type="button"
      >
        Retry
      </button>
    </div>
  );
}
