import mongoose, { Schema } from "mongoose";

export interface ISyntheticFolder {
    _id?: string;
    userId: string;
    name: string;
    parentId?: string | null;
    type: "tabular" | "document";
    favorite: boolean;
    isSystem?: boolean;
    description?: string;
    createdAt?: Date;
    modifiedAt?: Date;
}

const SyntheticFolderSchema = new Schema<ISyntheticFolder>(
    {
        userId: { type: String, required: true, index: true },
        name: { type: String, required: true },
        parentId: { type: String, default: null },
        type: { type: String, enum: ["tabular", "document"], default: "tabular" },
        favorite: { type: Boolean, default: false },
        isSystem: { type: Boolean, default: false },
        description: { type: String, default: "" },
    },
    { timestamps: true }
);

export default mongoose.models.SyntheticFolder ||
    mongoose.model<ISyntheticFolder>("SyntheticFolder", SyntheticFolderSchema);
