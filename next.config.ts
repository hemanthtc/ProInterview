import type { NextConfig } from "next";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
    {
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        key: "X-Frame-Options",
        value: "SAMEORIGIN",
    },
    {
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        key: "Permissions-Policy",
        value: "camera=(), microphone=(self), geolocation=(), payment=(self)",
    },
    {
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    },
    {
        key: "X-DNS-Prefetch-Control",
        value: "on",
    },
    {
        key: "Content-Security-Policy",
        value: [
            "default-src 'self'",
            `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://checkout.razorpay.com https://accounts.google.com https://apis.google.com`,
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com",
            "img-src 'self' data: blob: https://*.amazonaws.com https://*.googleusercontent.com https://lh3.googleusercontent.com",
            "connect-src 'self' https://generativelanguage.googleapis.com https://api.sarvam.ai https://api.d-id.com https://api.adzuna.com https://api.happenstance.ai https://emkc.org https://checkout.razorpay.com wss://api.d-id.com",
            "frame-src https://checkout.razorpay.com https://accounts.google.com",
            "media-src 'self' blob: https://api.d-id.com https://*.amazonaws.com",
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
        ].join("; "),
    },
];

const nextConfig: NextConfig = {
    serverExternalPackages: ["pdf-parse", "pdfjs-dist"],
    async headers() {
        return [
            {
                // Apply security headers to all routes
                source: "/(.*)",
                headers: securityHeaders,
            },
        ];
    },
};

export default nextConfig;
