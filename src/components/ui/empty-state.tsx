type EmptyStateProps = {
  title: string;
  detail: string;
};

export function EmptyState({ title, detail }: EmptyStateProps) {
  return (
    <div className="rounded-[1.6rem] border border-dashed border-line-strong bg-white/60 px-6 py-8 text-center">
      <h3 className="font-display text-2xl font-semibold tracking-[-0.04em]">
        {title}
      </h3>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-7 text-muted">
        {detail}
      </p>
    </div>
  );
}
