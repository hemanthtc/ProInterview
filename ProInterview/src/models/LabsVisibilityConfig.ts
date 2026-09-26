import mongoose, { Schema, Document, Model } from "mongoose";

export interface ILabsVisibilityConfig extends Document {
    hiddenTools: string[];     // array of tool IDs that are hidden from all users
    updatedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const LabsVisibilityConfigSchema: Schema<ILabsVisibilityConfig> = new Schema(
    {
        hiddenTools: { type: [String], default: [] },
        updatedBy: { type: String },
    },
    {
        timestamps: true,
        collection: "labs_visibility_config"
    }
);

if (mongoose.models.LabsVisibilityConfig) {
    delete mongoose.models.LabsVisibilityConfig;
}

const LabsVisibilityConfig: Model<ILabsVisibilityConfig> = mongoose.model<ILabsVisibilityConfig>("LabsVisibilityConfig", LabsVisibilityConfigSchema);

export default LabsVisibilityConfig;
