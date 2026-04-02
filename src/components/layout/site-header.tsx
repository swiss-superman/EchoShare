import Image from "next/image";
import Link from "next/link";
import type { Session } from "next-auth";
import { AuthCta } from "@/components/layout/auth-cta";
import { isGoogleAuthReady } from "@/lib/google-credentials";

const navigation = [
  { href: "/reports", label: "Reports" },
  { href: "/map", label: "Map" },
  { href: "/signals", label: "Signals" },
  { href: "/intelligence", label: "Intelligence" },
  { href: "/assistant", label: "Assistant" },
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
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <Link className="flex items-center gap-4" href="/">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-[1.25rem] border border-black/6 bg-white shadow-[0_12px_24px_rgba(17,35,47,0.12)]">
              <Image
                alt="EcoShare logo"
                className="h-full w-full object-cover"
                height={56}
                priority
                src="/brand/ecoshare-logo.jpeg"
                width={56}
              />
            </div>
            <div className="min-w-0">
              <div className="font-display text-xl font-semibold tracking-[-0.04em]">
                EchoShare
              </div>
              <div className="text-xs uppercase tracking-[0.18em] text-muted">
                Civic response signal network
              </div>
            </div>
          </Link>

          <div className="flex items-center gap-3 self-start lg:self-auto">
            {session?.user ? (
              <div className="rounded-full border border-line bg-white/80 px-4 py-2 text-sm">
                {session.user.name ?? session.user.email ?? "Signed in"}
              </div>
            ) : null}
            <AuthCta
              authConfigured={isGoogleAuthReady()}
              isSignedIn={Boolean(session?.user)}
            />
          </div>
        </div>

        <nav className="flex flex-wrap gap-1.5">
          {navigation.map((item) => (
            <Link
              key={item.href}
              className="rounded-full px-3.5 py-2 text-sm font-medium whitespace-nowrap text-[#263944] transition hover:bg-white/72"
              href={item.href}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}
