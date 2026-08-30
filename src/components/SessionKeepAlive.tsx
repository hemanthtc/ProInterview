"use client";

import { useEffect } from "react";

/** Sliding session via dedicated POST — never mutates cookies from GET handlers. */
export default function SessionKeepAlive() {
    useEffect(() => {
        if (typeof window === "undefined") return;
        if (localStorage.getItem("userLoggedIn") !== "true") return;
        void fetch("/api/auth/refresh", { method: "POST" }).catch(() => undefined);
    }, []);
    return null;
}
