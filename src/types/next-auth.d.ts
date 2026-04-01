import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role?: string;
      handle?: string | null;
    };
  }

  interface User {
    role?: string;
  }
}
