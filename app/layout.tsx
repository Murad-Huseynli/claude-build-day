import type { Metadata } from "next";
import { Space_Grotesk, JetBrains_Mono, Fraunces } from "next/font/google";
import "./globals.css";

const display = Space_Grotesk({ variable: "--font-display", subsets: ["latin"] });
const mono = JetBrains_Mono({ variable: "--font-mono", subsets: ["latin"] });
const serif = Fraunces({ variable: "--font-serif", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "WorldLine — counterfactual debugging for agents",
  description:
    "A flight simulator for agent failures. Fork any decision in a failed multi-agent run, re-simulate the future live, and let Claude prove the repair.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${display.variable} ${mono.variable} ${serif.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
