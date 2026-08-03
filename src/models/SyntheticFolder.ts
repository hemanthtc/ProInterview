import mongoose, { Schema, Document, Model } from "mongoose";

export type SyntheticVisibility = "private" | "public";
export type SyntheticFolderType = "tabular" | "document";

export interface ISyntheticFolder extends Document {
    userId: string;
    ownerName: string;
    name: string;
    parentId: string | null;
    type: SyntheticFolderType;
    visibility: SyntheticVisibility;
    favorite: boolean;
    description: string;
    createdAt: Date;
    modifiedAt: Date;
}

const SyntheticFolderSchema = new Schema<ISyntheticFolder>(
    {
        userId: { type: String, required: true, index: true },
        ownerName: { type: String, default: "" },
        name: { type: String, required: true, trim: true },
        parentId: { type: String, default: null, index: true },
        type: { type: String, enum: ["tabular", "document"], default: "tabular" },
        visibility: { type: String, enum: ["private", "public"], default: "private", index: true },
        favorite: { type: Boolean, default: false },
        description: { type: String, default: "" },
        modifiedAt: { type: Date, default: Date.now },
    },
    {
        timestamps: { createdAt: true, updatedAt: "modifiedAt" },
        collection: "synthetic_folders",
    }
);

SyntheticFolderSchema.index({ userId: 1, parentId: 1 });
SyntheticFolderSchema.index({ visibility: 1, userId: 1 });
SyntheticFolderSchema.index({ userId: 1, parentId: 1, type: 1, name: 1 });

if (mongoose.models.SyntheticFolder) {
    delete mongoose.models.SyntheticFolder;
}

const SyntheticFolder: Model<ISyntheticFolder> = mongoose.model<ISyntheticFolder>(
    "SyntheticFolder",
    SyntheticFolderSchema
);

export default SyntheticFolder;
