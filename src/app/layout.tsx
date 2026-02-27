import type { Metadata } from "next";
import { Open_Sans, JetBrains_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const openSans = Open_Sans({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono-stack",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elevate Global | Deal Pipeline",
  description: "Distressed property pipeline management by Elevate Global.",
  icons: {
    icon: "/elevate-logo-32.png",
    apple: "/elevate-logo-180.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Belleza&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={`${openSans.variable} ${jetbrainsMono.variable} antialiased`}>
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
