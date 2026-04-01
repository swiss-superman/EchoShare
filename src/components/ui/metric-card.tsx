type MetricCardProps = {
  label: string;
  value: string | number;
  detail: string;
};

export function MetricCard({ label, value, detail }: MetricCardProps) {
  return (
    <article className="rounded-[1.6rem] border border-line bg-white/70 p-5">
      <p className="text-xs uppercase tracking-[0.18em] text-muted">{label}</p>
      <p className="mt-3 font-display text-4xl font-semibold tracking-[-0.05em]">
        {value}
      </p>
      <p className="mt-3 text-sm leading-6 text-muted">{detail}</p>
    </article>
  );
}
