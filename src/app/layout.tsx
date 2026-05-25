import type { Metadata } from "next";
import { Jost, League_Gothic } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Lockpick",
  description: "Lockpick card game",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`App ${jost.variable} ${leagueGothic.variable}`}>
        <QueryProvider>
          <ModalProvider>{children}</ModalProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
