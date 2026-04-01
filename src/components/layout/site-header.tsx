import Link from "next/link";
import type { Session } from "next-auth";
import { AuthCta } from "@/components/layout/auth-cta";
import { hasGoogleAuthConfig } from "@/lib/google-credentials";

const navigation = [
  { href: "/reports", label: "Reports" },
  { href: "/map", label: "Map" },
  { href: "/community", label: "Community" },
  { href: "/directory", label: "Directory" },
  { href: "/dashboard", label: "Dashboard" },
];

type SiteHeaderProps = {
  sessionPromise: Promise<Session | null>;
};

export async function SiteHeader({ sessionPromise }: SiteHeaderProps) {
  const session = await sessionPromise;

  return (
    <header className="rounded-[1.6rem] border border-black/6 bg-[rgba(255,251,245,0.78)] px-4 py-4 shadow-[0_18px_50px_rgba(17,35,47,0.08)] backdrop-blur-xl sm:px-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-10">
          <Link className="flex items-center gap-3" href="/">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(180deg,#123346,#0b1b27)] text-sm font-bold tracking-[0.2em] text-[#a8ece4] shadow-[0_12px_24px_rgba(11,27,39,0.18)]">
              ES
            </div>
            <div>
              <div className="font-display text-xl font-semibold tracking-[-0.04em]">
                EchoShare
              </div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted">
                Civic response signal network
              </div>
            </div>
          </Link>
          <nav className="flex flex-wrap gap-2">
            {navigation.map((item) => (
              <Link
                key={item.href}
                className="rounded-full px-4 py-2 text-sm font-medium text-[#263944] transition hover:bg-white/72"
                href={item.href}
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="flex items-center gap-3 self-start lg:self-auto">
          {session?.user ? (
            <div className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm">
              {session.user.name ?? session.user.email ?? "Signed in"}
            </div>
          ) : null}
          <AuthCta
            authConfigured={hasGoogleAuthConfig()}
            isSignedIn={Boolean(session?.user)}
          />
        </div>
      </div>
    </header>
  );
}
