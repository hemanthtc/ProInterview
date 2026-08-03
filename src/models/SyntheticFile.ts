import mongoose, { Schema } from "mongoose";

export interface ISyntheticFile {
    _id?: string;
    userId: string;
    ownerName?: string;
    visibility: "private" | "public";
    folderId?: string | null;
    parentId?: string | null;
    title: string;
    filename: string;
    language?: string;
    fileType: string;
    contentType?: string;
    format?: string;
    rowCount?: number;
    data?: any[];
    schema?: any[];
    textContent?: string;
    topic?: string;
    originalPrompt?: string;
    aiModel?: string;
    source?: string;
    favorite?: boolean;
    pinned?: boolean;
    description?: string;
    tags?: string[];
    timestamp?: string;
    sizeBytes?: number;
    createdAt?: Date;
    modifiedAt?: Date;
}

const SyntheticFileSchema = new Schema<ISyntheticFile>(
    {
        userId: { type: String, required: true, index: true },
        ownerName: { type: String, default: "Anonymous" },
        visibility: { type: String, enum: ["private", "public"], default: "private", index: true },
        folderId: { type: String, default: null },
        parentId: { type: String, default: null },
        title: { type: String, required: true },
        filename: { type: String, required: true },
        language: { type: String, default: "JSON" },
        fileType: { type: String, default: "json" },
        contentType: { type: String, default: "tabular" },
        format: { type: String, default: "json" },
        rowCount: { type: Number, default: 0 },
        data: { type: Schema.Types.Mixed, default: [] },
        schema: { type: Schema.Types.Mixed, default: [] },
        textContent: { type: String, default: "" },
        topic: { type: String, default: "" },
        originalPrompt: { type: String, default: "" },
        aiModel: { type: String, default: "gemini-2.5-flash" },
        source: { type: String, default: "generated" },
        favorite: { type: Boolean, default: false },
        pinned: { type: Boolean, default: false },
        description: { type: String, default: "" },
        tags: { type: [String], default: [] },
        timestamp: { type: String, default: "" },
        sizeBytes: { type: Number, default: 0 },
    },
    { timestamps: true }
);

export default mongoose.models.SyntheticFile ||
    mongoose.model<ISyntheticFile>("SyntheticFile", SyntheticFileSchema);
