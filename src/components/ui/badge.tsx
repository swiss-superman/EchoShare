import { cn } from "@/lib/utils";

type BadgeProps = {
  children: React.ReactNode;
  tone?: "default" | "brand" | "danger" | "success" | "muted";
  className?: string;
};

const toneClasses: Record<NonNullable<BadgeProps["tone"]>, string> = {
  default: "border-line bg-white/75 text-foreground",
  brand: "border-brand/25 bg-brand/10 text-brand",
  danger: "border-danger/25 bg-danger/10 text-danger",
  success: "border-success/25 bg-success/10 text-success",
  muted: "border-line bg-black/5 text-muted",
};

export function Badge({
  children,
  tone = "default",
  className,
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-3 py-1 text-[0.7rem] font-semibold uppercase tracking-[0.18em]",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
