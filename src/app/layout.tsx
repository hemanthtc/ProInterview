import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import "./globals.css";

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

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <head />
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <Script id="theme-loader" strategy="beforeInteractive">
                    {`
                        try {
                            const savedTheme = localStorage.getItem("globalTheme");
                            if (savedTheme) {
                                document.documentElement.className = "theme-" + savedTheme;
                            } else {
                                document.documentElement.className = "theme-dark";
                            }
                        } catch (e) {}
                    `}
                </Script>
                {children}
            </body>
        </html>
    );
}
