import mongoose, { Schema, Document, Model } from "mongoose";

export type SyntheticVisibility = "private" | "public";
export type SyntheticContentType = "tabular" | "document" | "code" | "text";
export type SyntheticFileSource = "generated" | "uploaded" | "continued";

export interface ISyntheticFile extends Document {
    userId: string;
    ownerName: string;
    visibility: SyntheticVisibility;
    folderId: string | null;
    title: string;
    filename: string;
    topic: string;
    fileType: string;
    language: string;
    contentType: SyntheticContentType;
    format: string;
    data: Record<string, any>[];
    /** Stored as schemaFields — "schema" conflicts with Mongoose Document.schema */
    schemaFields: any[];
    textContent: string;
    favorite: boolean;
    pinned: boolean;
    tags: string[];
    description: string;
    originalPrompt: string;
    aiModel: string;
    source: SyntheticFileSource;
    s3Key: string;
    parentId: string | null;
    rowCount: number;
    sizeBytes: number;
    timestamp: string;
    createdAt: Date;
    modifiedAt: Date;
}

const SyntheticFileSchema = new Schema<ISyntheticFile>(
    {
        userId: { type: String, required: true, index: true },
        ownerName: { type: String, default: "" },
        visibility: { type: String, enum: ["private", "public"], default: "private", index: true },
        folderId: { type: String, default: null, index: true },
        title: { type: String, default: "Untitled" },
        filename: { type: String, required: true },
        topic: { type: String, default: "" },
        fileType: { type: String, default: "json" },
        language: { type: String, default: "JSON" },
        contentType: {
            type: String,
            enum: ["tabular", "document", "code", "text"],
            default: "tabular",
        },
        format: { type: String, default: "json" },
        data: { type: Array, default: () => [] } as any,
        schemaFields: { type: Array, default: () => [] } as any,
        textContent: { type: String, default: "" },
        favorite: { type: Boolean, default: false },
        pinned: { type: Boolean, default: false },
        tags: { type: [String], default: () => [] },
        description: { type: String, default: "" },
        originalPrompt: { type: String, default: "" },
        aiModel: { type: String, default: "gemini-2.5-flash" },
        source: {
            type: String,
            enum: ["generated", "uploaded", "continued"],
            default: "generated",
        },
        s3Key: { type: String, default: "" },
        parentId: { type: String, default: null },
        rowCount: { type: Number, default: 0 },
        sizeBytes: { type: Number, default: 0 },
        timestamp: { type: String, default: "" },
        modifiedAt: { type: Date, default: Date.now },
    },
    {
        timestamps: { createdAt: true, updatedAt: "modifiedAt" },
        collection: "synthetic_files",
    }
);

SyntheticFileSchema.index({ userId: 1, visibility: 1 });
SyntheticFileSchema.index({ visibility: 1, modifiedAt: -1 });
SyntheticFileSchema.index({ userId: 1, folderId: 1 });

// Hot-reload safe: drop cached model so schema rename takes effect in dev
if (mongoose.models.SyntheticFile) {
    delete mongoose.models.SyntheticFile;
}

const SyntheticFile: Model<ISyntheticFile> = mongoose.model<ISyntheticFile>(
    "SyntheticFile",
    SyntheticFileSchema
);

export default SyntheticFile;
