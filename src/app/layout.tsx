import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import "../components/prointerviewer/ProInterviewer.css";
import ConfigureAmplifyClientSide from "../components/ConfigureAmplify";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "ProInterview",
    description: "Master your technical interviews with AI",
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5, // allows accessibility zoom but initiates standard scale
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                             try {
                                  const savedTheme = localStorage.getItem("globalTheme");
                                  if (savedTheme) {
                                      if (savedTheme === "eyeprotect") {
                                          document.documentElement.className = "theme-light theme-eyeprotect";
                                          document.documentElement.style.colorScheme = "light";
                                      } else {
                                          document.documentElement.className = "theme-" + savedTheme;
                                          document.documentElement.style.colorScheme = savedTheme;
                                      }
                                  } else {
                                      document.documentElement.className = "theme-dark";
                                      document.documentElement.style.colorScheme = "dark";
                                  }
                             } catch (e) {}
                        `
                    }}
                />
            </head>
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <ConfigureAmplifyClientSide />
                {children}
            </body>
        </html>
    );
}
