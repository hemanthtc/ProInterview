import mongoose, { Schema, Document, Model } from "mongoose";

export interface PrepProgressBlob {
    starHistory: unknown[];
    codingProgress: {
        solvedIds: string[];
        bestScores: Record<string, number>;
        lastProblemId?: string;
    };
    atsMatchPercent?: number;
    atsLastAt?: number;
    domainPackId?: string;
    usage?: {
        geminiCalls: number;
        sarvamCalls: number;
        coachBookings: number;
        periodStart: number;
    };
    referralCredits?: number;
}

export interface ICloudSessionBlob extends Document {
    identifier: string;
    sessions: unknown[];
    prepPacks: unknown[];
    spacedDrills: unknown[];
    prepProgress: PrepProgressBlob;
    createdAt: Date;
    updatedAt: Date;
}

const CloudSessionSchema = new Schema(
    {
        identifier: { type: String, required: true, unique: true, index: true },
        sessions: { type: [Schema.Types.Mixed], default: [] },
        prepPacks: { type: [Schema.Types.Mixed], default: [] },
        spacedDrills: { type: [Schema.Types.Mixed], default: [] },
        prepProgress: {
            type: Schema.Types.Mixed,
            default: () => ({
                starHistory: [],
                codingProgress: { solvedIds: [], bestScores: {} },
                referralCredits: 0,
                usage: { geminiCalls: 0, sarvamCalls: 0, coachBookings: 0, periodStart: Date.now() },
            }),
        },
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
