import type { Metadata } from "next";
import { Jost, League_Gothic } from "next/font/google";
import NextTopLoader from "nextjs-toploader";
import { ModalProvider } from "@/context/ModalContext";
import QueryProvider from "@/providers/QueryProvider";
import "./globals.css";

const jost = Jost({
  subsets: ["latin"],
  variable: "--jost",
  display: "swap",
});

const leagueGothic = League_Gothic({
  subsets: ["latin"],
  variable: "--league-gothic",
  weight: "400",
  display: "swap",
});

const fallbackMetadataBase = "http://localhost:3000";
const configuredMetadataBase =
  process.env.NEXT_PUBLIC_SITE_URL ??
  process.env.AUTH_URL ??
  fallbackMetadataBase;
const metadataBase = (() => {
  try {
    return new URL(configuredMetadataBase);
  } catch {
    return new URL(fallbackMetadataBase);
  }
})();

export const metadata: Metadata = {
  metadataBase,
  title: "Lockpick",
  description: "Lockpick card game",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    title: "Lockpick",
    description: "Lockpick card game",
    siteName: "Lockpick",
  },
  twitter: {
    card: "summary",
    title: "Lockpick",
    description: "Lockpick card game",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`App ${jost.variable} ${leagueGothic.variable}`}>
        <NextTopLoader color="#ffff4f" height={3} showSpinner={false} />
        <QueryProvider>
          <ModalProvider>{children}</ModalProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
