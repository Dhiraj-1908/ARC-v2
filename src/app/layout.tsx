import type { Metadata, Viewport } from "next";
import { Dancing_Script, Inter } from "next/font/google";
import "./globals.css";

// Load fonts with display: 'swap' for better loading performance
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const dancingScript = Dancing_Script({
  variable: "--font-dancing-script",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    template: "%s | ARC - AI Research Curator",
    default: "ARC - AI Research Curator",
  },
  description: "Your centralized platform for AI research curation and discovery",
  keywords: ["AI", "research", "curation", "discovery", "machine learning"],
  icons: {
    icon: "/logo/logo2.svg",
  },
};

// Add viewport configuration separately
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html 
      lang="en" 
      className={`${inter.variable} ${dancingScript.variable} overflow-x-hidden`}
      suppressHydrationWarning
    >
      <body className="font-inter antialiased w-full">
        <div className="max-w-[100vw] overflow-x-hidden">
          {children}
        </div>
      </body>
    </html>
  );
}