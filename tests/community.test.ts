import { describe, it, expect, beforeEach } from "vitest";
import {
    dmSlug,
    sanitizeChatBody,
    sanitizeDisplayName,
    presencePublicId,
    isDmSlug,
    isDefaultChannelSlug,
} from "../src/utils/community";
import {
    memCanAccessRoom,
    memResetForTests,
    memSeedChannels,
    memTouchPresence,
    memResolvePublicId,
    memUpsertDm,
    memPostMessage,
    memGetMessages,
} from "../src/utils/communityStore";
import { DEFAULT_COMMUNITY_CHANNELS } from "../src/utils/community";

describe("community helpers", () => {
    it("sanitizes and truncates chat bodies", () => {
        expect(sanitizeChatBody("  hello   world  ")).toBe("hello world");
        expect(sanitizeChatBody("x".repeat(3000)).length).toBe(2000);
        expect(sanitizeChatBody("   ")).toBe("");
        expect(sanitizeChatBody('<script>alert(1)</script>hi')).toBe("alert(1)hi");
    });

    it("sanitizes display names", () => {
        expect(sanitizeDisplayName("  Ada  ")).toBe("Ada");
        expect(sanitizeDisplayName("<b>Ada</b>")).toBe("Ada");
        expect(sanitizeDisplayName("   ")).toBe("Student");
    });

    it("builds stable DM slugs regardless of order", () => {
        expect(dmSlug("b@x.com", "a@x.com")).toBe(dmSlug("a@x.com", "b@x.com"));
        expect(dmSlug("A@X.com", "b@x.com")).toContain("dm_");
        expect(isDmSlug(dmSlug("a@x.com", "b@x.com"))).toBe(true);
        expect(isDefaultChannelSlug("general")).toBe(true);
        expect(isDefaultChannelSlug("dm_a__b")).toBe(false);
    });

    it("hashes presence ids stably without exposing emails", () => {
        const a = presencePublicId("Ada@X.com");
        const b = presencePublicId("ada@x.com");
        expect(a).toBe(b);
        expect(a).toHaveLength(16);
        expect(a.includes("@")).toBe(false);
    });
});

describe("community memory authz", () => {
    beforeEach(() => {
        memResetForTests();
        memSeedChannels([...DEFAULT_COMMUNITY_CHANNELS]);
    });

    it("allows default channels and denies unknown DMs", () => {
        expect(memCanAccessRoom("general", "a@x.com")).toBe(true);
        expect(memCanAccessRoom("dm_a@x.com__b@x.com", "a@x.com")).toBe(false);
    });

    it("allows DM members only after upsert", () => {
        const slug = dmSlug("a@x.com", "b@x.com");
        memUpsertDm(slug, "DM", ["a@x.com", "b@x.com"], "a@x.com");
        expect(memCanAccessRoom(slug, "a@x.com")).toBe(true);
        expect(memCanAccessRoom(slug, "b@x.com")).toBe(true);
        expect(memCanAccessRoom(slug, "c@x.com")).toBe(false);
    });

    it("resolves opaque public ids from presence", () => {
        const id = "student@example.com";
        const publicId = presencePublicId(id);
        memTouchPresence({ identifier: id, displayName: "Student", lastSeen: Date.now() }, publicId);
        expect(memResolvePublicId(publicId)).toBe(id);
        expect(memResolvePublicId("deadbeefdeadbeef")).toBeUndefined();
    });

    it("stores messages only for accessible rooms in helpers", () => {
        const slug = dmSlug("a@x.com", "b@x.com");
        memUpsertDm(slug, "DM", ["a@x.com", "b@x.com"], "a@x.com");
        memPostMessage({ roomSlug: slug, senderId: "a@x.com", senderName: "A", body: "secret" });
        expect(memGetMessages(slug)).toHaveLength(1);
        expect(memCanAccessRoom(slug, "c@x.com")).toBe(false);
    });
});
