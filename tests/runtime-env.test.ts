import { describe, it, expect, afterEach } from "vitest";
import { productionEnvStatus, requirePersistentStore } from "../src/utils/runtimeEnv";

const prev = { ...process.env };

afterEach(() => {
    process.env.NODE_ENV = prev.NODE_ENV;
    process.env.JWT_SECRET = prev.JWT_SECRET;
    process.env.GEMINI_API_KEY = prev.GEMINI_API_KEY;
    process.env.MONGODB_URI = prev.MONGODB_URI;
    process.env.ALLOW_MEMORY_EXAMS = prev.ALLOW_MEMORY_EXAMS;
});

describe("productionEnvStatus", () => {
    it("requires a 32+ char JWT and a Mongo URI for ready", () => {
        process.env.JWT_SECRET = "short";
        process.env.MONGODB_URI = "";
        process.env.GEMINI_API_KEY = "dummy";
        const s = productionEnvStatus();
        expect(s.jwtConfigured).toBe(false);
        expect(s.ready).toBe(false);
        expect(s.geminiConfigured).toBe(false);
    });

    it("marks ready when JWT and Mongo are set", () => {
        process.env.JWT_SECRET = "ci-build-secret-key-with-at-least-32-chars";
        process.env.MONGODB_URI = "mongodb://localhost:27017/prointerview";
        process.env.GEMINI_API_KEY = "real-key";
        const s = productionEnvStatus();
        expect(s.ready).toBe(true);
        expect(s.geminiConfigured).toBe(true);
    });
});

describe("requirePersistentStore", () => {
    it("is off in test/dev unless NODE_ENV is production", () => {
        process.env.NODE_ENV = "test";
        delete process.env.ALLOW_MEMORY_EXAMS;
        expect(requirePersistentStore()).toBe(false);
    });

    it("is on in production unless ALLOW_MEMORY_EXAMS=1", () => {
        process.env.NODE_ENV = "production";
        delete process.env.ALLOW_MEMORY_EXAMS;
        expect(requirePersistentStore()).toBe(true);
        process.env.ALLOW_MEMORY_EXAMS = "1";
        expect(requirePersistentStore()).toBe(false);
    });
});
