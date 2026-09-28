import type { Metadata, Viewport } from "next";
import ErrorBoundary from "../components/ErrorBoundary";
import PwaRegister from "../components/PwaRegister";
import RateLimitToaster from "../components/RateLimitToaster";
import "./globals.css";
import "../components/prointerviewer/ProInterviewer.css";

export const metadata: Metadata = {
    title: "ProInterview",
    description: "Master your technical interviews with AI",
    manifest: "/manifest.json",
    appleWebApp: {
        capable: true,
        statusBarStyle: "black-translucent",
        title: "ProInterview",
    },
    icons: {
        icon: [
            { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
            { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
        ],
        apple: [{ url: "/icons/icon-192.png" }],
    },
};

export const viewport: Viewport = {
    width: "device-width",
    initialScale: 1,
    maximumScale: 5,
    themeColor: "#6366f1",
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
                    id="theme-initializer"
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
            <body className="antialiased w-full max-w-full overflow-x-hidden font-sans" suppressHydrationWarning>
                <ErrorBoundary fallbackTitle="ProInterview hit an unexpected error">
                    {children}
                </ErrorBoundary>
                <PwaRegister />
                <RateLimitToaster />
            </body>
        </html>
    );
}
