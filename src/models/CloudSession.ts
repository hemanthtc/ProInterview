import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICloudSessionBlob extends Document {
    identifier: string;
    sessions: any[];
    prepPacks: any[];
    spacedDrills: any[];
    createdAt: Date;
    updatedAt: Date;
}

const CloudSessionSchema = new Schema(
    {
        identifier: { type: String, required: true, unique: true, index: true },
        sessions: { type: [Schema.Types.Mixed], default: [] },
        prepPacks: { type: [Schema.Types.Mixed], default: [] },
        spacedDrills: { type: [Schema.Types.Mixed], default: [] },
    },
    {
        timestamps: true,
        collection: "cloudsession",
    }
);

const CloudSession =
    (mongoose.models.CloudSession as Model<ICloudSessionBlob>) ||
    mongoose.model<ICloudSessionBlob>("CloudSession", CloudSessionSchema);

export default CloudSession;
