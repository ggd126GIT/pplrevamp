import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  display: "swap",
});

const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.pplsolutionsinc.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: ".ppl Solutions, Inc. — Power your business strategies with .ppl",
    template: "%s | .ppl Solutions, Inc.",
  },
  description:
    "A BPO solutions provider offering bespoke offshoring and outsourcing services. Our 3Ds framework discovers opportunities, designs your solution, and delivers results.",
  openGraph: {
    type: "website",
    siteName: ".ppl Solutions, Inc.",
    url: siteUrl,
    title: "Power your business strategies with .ppl",
    description:
      "Focused on results and excellence, our people will power your BPO strategies like no other.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${poppins.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-white text-charcoal">
        {children}
      </body>
    </html>
  );
}
