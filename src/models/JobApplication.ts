import mongoose, { Schema, Document, Model } from "mongoose";

export interface IJobApplication extends Document {
    identifier: string; // links to User.identifier (email or phone)
    jobId: string; // unique matched job id
    company: string;
    role: string;
    location: string;
    applyUrl: string;
    status: "pending" | "applied" | "interviewing" | "rejected" | "cancelled";
    appliedAt: Date;
    updatedAt: Date;
}

const JobApplicationSchema: Schema<IJobApplication> = new Schema(
    {
        identifier: { type: String, required: true, index: true },
        jobId: { type: String, required: true },
        company: { type: String, required: true },
        role: { type: String, required: true },
        location: { type: String, required: true },
        applyUrl: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "applied", "interviewing", "rejected", "cancelled"],
            default: "pending"
        },
        appliedAt: { type: Date, default: Date.now }
    },
    {
        timestamps: true,
        collection: "jobapplications"
    }
);

// Compound index to ensure uniqueness per user per job application
JobApplicationSchema.index({ identifier: 1, jobId: 1 }, { unique: true });

const JobApplication: Model<IJobApplication> =
    mongoose.models.JobApplication ||
    mongoose.model<IJobApplication>("JobApplication", JobApplicationSchema);

export default JobApplication;
