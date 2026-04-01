export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="shell-frame h-40 animate-pulse rounded-[2rem]" />
      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div
            key={index}
            className="h-72 animate-pulse rounded-[1.8rem] border border-line bg-white/70"
          />
        ))}
      </div>
    </div>
  );
}
