import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRoadmap extends Document {
    id: string; // User-scoped client ID (e.g., road_1724859000000)
    userIdentifier: string; // User's email address or identifier
    course: string;
    company: string;
    location: string;
    additionalInfo: string;
    roadmapData: any; // Raw generated Gemini roadmap JSON
    tasksChecked: Record<string, boolean>; // Checklist progress
    phaseProgress?: Record<string, { unlocked: boolean; passed: boolean; score: number; studyPackGenerated?: boolean; completedAt?: number }>;
    expiresAt: Date; // Auto-delete time
    notifiedNearExpiry: boolean; // Flag to prevent notification spamming
    createdAt: Date;
    updatedAt: Date;
}

const RoadmapSchema = new Schema<IRoadmap>(
    {
        id: { type: String, required: true, unique: true, index: true },
        userIdentifier: { type: String, required: true, index: true },
        course: { type: String, required: true },
        company: { type: String, default: "Generic Company" },
        location: { type: String, default: "Remote" },
        additionalInfo: { type: String, default: "" },
        roadmapData: { type: Schema.Types.Mixed, required: true },
        tasksChecked: { type: Schema.Types.Mixed, default: () => ({}) },
        phaseProgress: { type: Schema.Types.Mixed, default: () => ({}) },
        expiresAt: { type: Date, required: true, index: true },
        notifiedNearExpiry: { type: Boolean, default: false },
    },
    {
        timestamps: true,
        collection: "roadmap_generator",
    }
);

RoadmapSchema.index({ userIdentifier: 1, expiresAt: 1 });

if (mongoose.models.Roadmap) {
    delete mongoose.models.Roadmap;
}

const Roadmap: Model<IRoadmap> = mongoose.model<IRoadmap>("Roadmap", RoadmapSchema);
export default Roadmap;
