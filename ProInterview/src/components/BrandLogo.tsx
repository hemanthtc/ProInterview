"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface BrandLogoProps {
    href?: string;
    showText?: boolean;
    className?: string;
    iconSize?: number;
    textHeight?: number;
    themeMode?: "dark" | "light" | "auto";
}

export default function BrandLogo({
    href = "/",
    showText = true,
    className = "",
    iconSize = 40,      // Compact icon size (40px)
    textHeight = 60,    // Extra large text font size across all modes
    themeMode = "auto",
}: BrandLogoProps) {
    const [theme, setTheme] = useState<"dark" | "light">("dark");

    useEffect(() => {
        const updateTheme = () => {
            const current = localStorage.getItem("globalTheme");
            if (current === "light" || current === "eyeprotect") {
                setTheme("light");
            } else {
                setTheme("dark");
            }
        };

        updateTheme();
        const interval = setInterval(updateTheme, 800);
        window.addEventListener("storage", updateTheme);
        return () => {
            clearInterval(interval);
            window.removeEventListener("storage", updateTheme);
        };
    }, []);

    const activeTheme = themeMode === "auto" ? theme : themeMode;
    const isLight = activeTheme === "light";

    // Icon switches between dark mode & light mode assets
    const iconSrc = isLight ? "/logo-icon-lightmode.png" : "/logo-icon-darkmode.png";

    // Logo text uses the EXACT original navy blue + teal arrow colors from Image 1 across ALL theme modes
    const textSrc = "/logo-text-darktext.png";

    const content = (
        <div className={`flex items-center gap-3.5 group transition-opacity hover:opacity-95 ${className}`}>
            {/* Dark/Light Mode Icon: Rocket P Logo */}
            <div
                className="relative rounded-xl overflow-hidden flex items-center justify-center shrink-0 shadow-md border transition-all duration-300 group-hover:scale-105"
                style={{
                    width: iconSize,
                    height: iconSize,
                    background: isLight ? "#ffffff" : "#141c21",
                    borderColor: isLight ? "rgba(15, 23, 42, 0.15)" : "rgba(45, 212, 191, 0.35)",
                    boxShadow: isLight
                        ? "0 2px 8px rgba(0,0,0,0.06)"
                        : "0 0 12px rgba(45, 212, 191, 0.2)"
                }}
            >
                <img
                    src={iconSrc}
                    alt="ProInterview Icon"
                    className="w-full h-full object-cover"
                />
            </div>

            {/* Logo Text: Extra large text font size across all modes */}
            {showText && (
                <div className="flex items-center shrink-0">
                    <img
                        src={textSrc}
                        alt="ProInterview"
                        style={{
                            height: textHeight,
                            filter: !isLight
                                ? "drop-shadow(0px 0px 6px rgba(255, 255, 255, 0.5)) drop-shadow(0px 0px 1px #ffffff)"
                                : "none"
                        }}
                        className="w-auto object-contain transition-all duration-300 max-w-[220px] sm:max-w-none"
                    />
                </div>
            )}
        </div>
    );

    if (href) {
        return (
            <Link href={href} className="inline-block focus:outline-none">
                {content}
            </Link>
        );
    }

    return content;
}
