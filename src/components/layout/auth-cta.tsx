"use client";

import { signIn, signOut } from "next-auth/react";

type AuthCtaProps = {
  isSignedIn: boolean;
  authConfigured: boolean;
};

export function AuthCta({ isSignedIn, authConfigured }: AuthCtaProps) {
  if (!authConfigured) {
    return (
      <div className="rounded-full border border-dashed border-line-strong px-4 py-2 text-xs font-semibold uppercase tracking-[0.18em] text-muted">
        Google auth env needed
      </div>
    );
  }

  if (isSignedIn) {
    return (
      <button
        className="cursor-pointer rounded-full border border-line-strong px-4 py-2 text-sm font-semibold transition hover:bg-white/70"
        onClick={() => signOut({ callbackUrl: "/" })}
        type="button"
      >
        Sign out
      </button>
    );
  }

  return (
    <button
      className="cursor-pointer rounded-full bg-brand px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-strong"
      onClick={() => signIn("google", { callbackUrl: "/dashboard" })}
      type="button"
    >
      Sign in with Google
    </button>
  );
}
