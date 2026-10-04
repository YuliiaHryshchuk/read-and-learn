import type { Metadata } from "next";
import localFont from "next/font/local";
import Footer from "@/components/Footer";
import { PuterAuthProvider } from "@/components/PuterAuthProvider";
import { UnsavedGenerationGuard } from "@/components/UnsavedGenerationGuard";
import "./init.scss";
import "../styles/theme.scss";
import "./globals.scss";
import "../styles/utilities.scss";

const geistSans = localFont({
  src: "./fonts/Geist-Variable.woff2",
  variable: "--font-geist-sans",
  display: "swap",
  weight: "100 900",
});

const geistMono = localFont({
  src: "./fonts/GeistMono-Variable.woff2",
  variable: "--font-geist-mono",
  display: "swap",
  weight: "100 900",
});

export const metadata: Metadata = {
  applicationName: "Read & Learn",
  title: {
    default: "Read & Learn — Reading Practice for Language Learners",
    template: "%s | Read & Learn",
  },
  description:
    "Learn languages through reading with natural translations and clear vocabulary and grammar explanations.",
  keywords: [
    "learn languages",
    "reading practice",
    "adapted texts",
    "language learning",
    "vocabulary",
    "grammar",
  ],
  category: "education",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: "/favicon.ico",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Read & Learn",
    title: "Read & Learn — Reading Practice for Language Learners",
    description:
      "Learn languages through reading with natural translations and clear vocabulary and grammar explanations.",
  },
  twitter: {
    card: "summary",
    title: "Read & Learn — Reading Practice for Language Learners",
    description:
      "Learn languages through reading with natural translations and clear vocabulary and grammar explanations.",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <PuterAuthProvider>
          <UnsavedGenerationGuard>
            <div className="site-content">{children}</div>
            <Footer />
          </UnsavedGenerationGuard>
        </PuterAuthProvider>
      </body>
    </html>
  );
}
