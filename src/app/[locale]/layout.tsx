import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WBGT Heat Map - Japan Wet Bulb Globe Temperature",
  description: "Real-time WBGT (Wet Bulb Globe Temperature) heat map for Japan. Monitor heat stress levels and heat-related health risks across Japanese prefectures.",
  keywords: ["WBGT", "heat map", "Japan", "weather", "temperature", "heat stress", "heatstroke prevention"],
  authors: [{ name: "WBGT Heat Map Team" }],
  creator: "WBGT Heat Map",
  publisher: "WBGT Heat Map",
  openGraph: {
    type: "website",
    locale: "ja_JP",
    alternateLocale: ["en_US"],
    url: "https://wbgt-heat-map.vercel.app",
    siteName: "WBGT Heat Map",
    title: "WBGT Heat Map - Japan Wet Bulb Globe Temperature",
    description: "Real-time WBGT (Wet Bulb Globe Temperature) heat map for Japan. Monitor heat stress levels and heat-related health risks across Japanese prefectures.",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "WBGT Heat Map - Japan",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@wbgt_heat_map",
    creator: "@wbgt_heat_map",
    title: "WBGT Heat Map - Japan Wet Bulb Globe Temperature",
    description: "Real-time WBGT heat map for Japan. Monitor heat stress levels across Japanese prefectures.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  verification: {
    google: "google-site-verification-code",
  },
};

export default async function RootLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  
  // locale が提供されているかチェック
  if (!locale) {
    throw new Error("Locale parameter is missing");
  }
  
  // 翻訳メッセージを直接インポート
  const messages = (await import(`../../../messages/${locale}.json`)).default;

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <NextIntlClientProvider locale={locale} messages={messages}>
          {children}
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
