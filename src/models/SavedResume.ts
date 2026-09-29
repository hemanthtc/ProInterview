import mongoose, { Schema, Document, Model } from "mongoose";

export interface ISavedResumeDoc extends Document {
    identifier: string;
    resumes: any[];
    createdAt: Date;
    updatedAt: Date;
}

const SavedResumeSchema = new Schema<ISavedResumeDoc>(
    {
        identifier: { type: String, required: true, unique: true, index: true },
        resumes: { type: Array, default: () => [] } as any,
    },
    {
        timestamps: true,
        collection: "saved_resumes",
    }
);

export const SavedResumeModel: Model<ISavedResumeDoc> =
    mongoose.models.SavedResume || mongoose.model<ISavedResumeDoc>("SavedResume", SavedResumeSchema);
