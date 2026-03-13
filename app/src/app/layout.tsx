import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import localFont from "next/font/local";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const faktum = localFont({
  src: [
    {
      path: "./fonts/Faktum-Regular.woff2",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Faktum-Medium.woff2",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Faktum-SemiBold.woff2",
      weight: "600",
      style: "normal",
    },
  ],
  variable: "--font-faktum",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pixelplus Dashboard",
  description: "Pixelplus Website Performance Tool Dashboard",
  icons: {
    icon: [
      {
        url: "/brand/favicon/cropped-favicon-32x32.png",
        sizes: "32x32",
        type: "image/png",
      },
      {
        url: "/brand/favicon/cropped-favicon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
    ],
    apple: [
      {
        url: "/brand/favicon/cropped-favicon-180x180.png",
        sizes: "180x180",
        type: "image/png",
      },
    ],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${faktum.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
