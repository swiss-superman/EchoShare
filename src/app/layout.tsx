import type { Metadata } from "next";
import {
  Bricolage_Grotesque,
  Geist_Mono,
  Instrument_Sans,
} from "next/font/google";
import { SiteHeader } from "@/components/layout/site-header";
import { auth } from "@/lib/auth";
import "./globals.css";

const displayFont = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

const bodyFont = Instrument_Sans({
  variable: "--font-instrument-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "EchoShare",
  description:
    "A civic coordination platform for reporting pollution near lakes, rivers, beaches, canals, and wetlands.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const sessionPromise = auth();

  return (
    <html
      lang="en"
      className={`${displayFont.variable} ${bodyFont.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <div className="mx-auto flex min-h-screen w-full max-w-[1600px] flex-col px-4 py-4 sm:px-6 lg:px-8">
          <SiteHeader sessionPromise={sessionPromise} />
          <main className="flex-1 py-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
