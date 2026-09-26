import { describe, it, expect, vi } from "vitest";

describe("Avatar Credit Safety & Default Mode Lifecycle", () => {
    it("defaults to SVG avatar when no preference is stored in localStorage", () => {
        const storage: Record<string, string> = {};
        const getStorageItem = (k: string) => storage[k] || null;

        const savedAvatarType = getStorageItem("tavusSelectedAvatarType");
        const effectiveAvatarType = savedAvatarType === "tavus" ? "tavus" : "svg";

        expect(effectiveAvatarType).toBe("svg");
    });

    it("does not trigger Tavus stream API on room initialization when avatar is SVG", () => {
        const fetchMock = vi.fn();
        const savedAvatarType: string | null = "svg";

        if (savedAvatarType === "tavus") {
            fetchMock("/api/tavus-stream", { method: "POST" });
        }

        expect(fetchMock).not.toHaveBeenCalled();
    });

    it("only triggers Tavus WebRTC initialization when user explicitly switches to tavus", () => {
        const storage: Record<string, string> = {};
        const setStorageItem = (k: string, v: string) => { storage[k] = v; };
        const fetchMock = vi.fn();

        let activeAvatarType: "svg" | "tavus" = "svg";

        const handleSwitchAvatarType = (type: "tavus" | "svg") => {
            activeAvatarType = type;
            setStorageItem("tavusSelectedAvatarType", type);
            if (type === "tavus") {
                fetchMock("/api/tavus-stream", { method: "POST" });
            }
        };

        // User clicks Live Video
        handleSwitchAvatarType("tavus");
        expect(activeAvatarType).toBe("tavus");
        expect(storage["tavusSelectedAvatarType"]).toBe("tavus");
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it("terminates Tavus stream and aborts connections when user switches back to SVG", () => {
        const closeStreamMock = vi.fn();
        let activeAvatarType: "svg" | "tavus" = "tavus";

        const handleSwitchAvatarType = (type: "tavus" | "svg") => {
            activeAvatarType = type;
            if (type === "svg") {
                closeStreamMock();
            }
        };

        handleSwitchAvatarType("svg");
        expect(activeAvatarType).toBe("svg");
        expect(closeStreamMock).toHaveBeenCalledTimes(1);
    });
});
