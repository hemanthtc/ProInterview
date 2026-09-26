import { describe, it, expect } from "vitest";
import {
    canReadFile,
    canWriteFile,
    serializeFile,
    buildFilePayload,
} from "@/lib/syntheticAccess";

describe("Synthetic Data Visibility & Public Sharing", () => {
    const ownerId = "alice@example.com";
    const peerId = "bob@example.com";

    const privateFile = {
        _id: "file123",
        userId: ownerId,
        ownerName: "Alice",
        visibility: "private" as const,
        folderId: "folder456",
        filename: "dataset.json",
        title: "Private Dataset",
        contentType: "tabular" as const,
        data: [{ id: 1, name: "Alice" }],
        schemaFields: ["id", "name"],
    };

    const publicFile = {
        _id: "file789",
        userId: ownerId,
        ownerName: "Alice",
        visibility: "public" as const,
        folderId: "folder456",
        filename: "public_dataset.json",
        title: "Public Dataset",
        contentType: "tabular" as const,
        data: [{ id: 1, name: "Sample" }],
        schemaFields: ["id", "name"],
    };

    describe("Access control rules (canReadFile / canWriteFile)", () => {
        it("allows owner to read both private and public files", () => {
            expect(canReadFile(privateFile, ownerId)).toBe(true);
            expect(canReadFile(publicFile, ownerId)).toBe(true);
        });

        it("allows peer users to read public files", () => {
            expect(canReadFile(publicFile, peerId)).toBe(true);
        });

        it("denies peer users from reading private files", () => {
            expect(canReadFile(privateFile, peerId)).toBe(false);
        });

        it("only allows owner to write/modify/delete files", () => {
            expect(canWriteFile(privateFile, ownerId)).toBe(true);
            expect(canWriteFile(publicFile, ownerId)).toBe(true);
            expect(canWriteFile(privateFile, peerId)).toBe(false);
            expect(canWriteFile(publicFile, peerId)).toBe(false);
        });
    });

    describe("Serialization & isolation (serializeFile)", () => {
        it("serializes file for owner with write access and folderId", () => {
            const serialized = serializeFile(publicFile, ownerId);
            expect(serialized.isOwner).toBe(true);
            expect(serialized.readOnly).toBe(false);
            expect(serialized.folderId).toBe("folder456");
            expect(serialized.visibility).toBe("public");
        });

        it("serializes public file for peer as read-only and isolates private folderId", () => {
            const serialized = serializeFile(publicFile, peerId);
            expect(serialized.isOwner).toBe(false);
            expect(serialized.readOnly).toBe(true);
            // Non-owners should see file flat in All Files without owner's internal folderId
            expect(serialized.folderId).toBeNull();
            expect(serialized.visibility).toBe("public");
            expect(serialized.ownerName).toBe("Alice");
        });
    });

    describe("Payload builder (buildFilePayload)", () => {
        it("respects public visibility when creating a file", () => {
            const payload = buildFilePayload(
                { title: "New Public File", visibility: "public" },
                ownerId,
                "Alice"
            );
            expect(payload.visibility).toBe("public");
            expect(payload.userId).toBe(ownerId);
        });

        it("defaults visibility to private if not explicitly public", () => {
            const payload = buildFilePayload(
                { title: "New Private File" },
                ownerId,
                "Alice"
            );
            expect(payload.visibility).toBe("private");
        });
    });
});
