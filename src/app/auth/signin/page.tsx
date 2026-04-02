import { AuthCta } from "@/components/layout/auth-cta";
import { auth } from "@/lib/auth";
import { isGoogleAuthReady } from "@/lib/google-credentials";

export default async function SignInPage() {
  const session = await auth();
  const authConfigured = isGoogleAuthReady();

  return (
    <section className="mx-auto max-w-3xl">
      <div className="shell-frame rounded-[2rem] px-6 py-8 sm:px-10">
        <div className="section-kicker">Authentication</div>
        <h1 className="mt-4 font-display text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">
          Secure Google sign-in for community contributors
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-8 text-muted">
          EchoShare uses Google OAuth only. <!-- Profile records are created on first -->
          <!-- sign-in and stored in PostgreSQL via the Prisma adapter. -->
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-4">
          <AuthCta
            authConfigured={authConfigured}
            isSignedIn={Boolean(session?.user)}
          />
          {!authConfigured ? (
            <p className="text-sm text-muted">
            <!-- Configure `AUTH_SECRET` and either `AUTH_GOOGLE_ID` plus -->
            <!-- `AUTH_GOOGLE_SECRET`. The deployed site also needs its own -->
            <!-- Auth.js callback URL registered in Google Cloud. -->
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}
