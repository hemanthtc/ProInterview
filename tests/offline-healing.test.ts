import { describe, it, expect } from "vitest";
import {
    getS3ProfileKey,
    getLegacyS3ProfileKey,
    getS3ResumesKey,
    getLegacyS3ResumesKey,
    getS3SessionsKey,
    getLegacyS3SessionsKey,
    getS3ScorecardKey,
    getS3SyntheticKey
} from "@/utils/s3";

describe("offline healing keys", () => {
    const user = "test-user@domain.com";

    it("builds correct profiles key", () => {
        expect(getS3ProfileKey(user)).toBe("profiles/test-user_domain.com/profile_data.json");
    });

    it("builds correct legacy profiles key", () => {
        expect(getLegacyS3ProfileKey(user)).toBe("profile_details/test-user_domain.com/info.json");
    });

    it("builds correct resumes key", () => {
        expect(getS3ResumesKey(user)).toBe("resumes/test-user_domain.com/saved_resumes.json");
    });

    it("builds correct legacy resumes key", () => {
        expect(getLegacyS3ResumesKey(user)).toBe("resume_builder_resumes/test-user_domain.com/saved_resumes.json");
    });

    it("builds correct sessions key", () => {
        expect(getS3SessionsKey(user)).toBe("interview_history_and_performance_records/test-user_domain.com/session_data.json");
    });

    it("builds correct legacy sessions key", () => {
        expect(getLegacyS3SessionsKey(user)).toBe("sessions/test-user_domain.com/session_data.json");
    });

    it("builds correct scorecard key", () => {
        expect(getS3ScorecardKey("share123")).toBe("scorecards/share123.json");
    });

    it("builds correct synthetic files key", () => {
        expect(getS3SyntheticKey(user, "file456")).toBe("synthetic/test-user_domain.com/file456.json");
    });
});
