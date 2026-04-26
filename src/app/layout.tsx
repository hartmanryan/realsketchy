import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { ClerkProvider } from '@clerk/nextjs';
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Home Sketch | B2B Real Estate Widget",
  description: "Generate AI architectural sketches for real estate leads.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <html lang="en" className={inter.variable}>
        <body>
          <main style={{ flex: 1, display: "flex", flexDirection: "column" }}>
            {children}
          </main>
        </body>
      </html>
    </ClerkProvider>
  );
}
