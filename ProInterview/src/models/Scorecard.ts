import mongoose, { Schema, Document, Model } from "mongoose";

export interface IScorecard extends Document {
    shareId: string;
    ownerIdentifier: string;
    candidateName: string;
    company: string;
    role: string;
    finalScore: number;
    technicalRating: number;
    behavioralRating: number;
    communicationRating: number;
    portfolioRating: number | string;
    summary: string;
    highlights: string[];
    createdAt: Date;
    updatedAt: Date;
}

const ScorecardSchema: Schema<IScorecard> = new Schema(
    {
        shareId: { type: String, required: true, unique: true, index: true },
        ownerIdentifier: { type: String, required: true, index: true },
        candidateName: { type: String, required: true, default: "Candidate" },
        company: { type: String, default: "" },
        role: { type: String, default: "" },
        finalScore: { type: Number, default: 0 },
        technicalRating: { type: Number, default: 0 },
        behavioralRating: { type: Number, default: 0 },
        communicationRating: { type: Number, default: 0 },
        portfolioRating: { type: Schema.Types.Mixed, default: "N/A" },
        summary: { type: String, default: "" },
        highlights: { type: [String], default: [] },
    },
    {
        timestamps: true,
        collection: "scorecard",
    }
);

const Scorecard: Model<IScorecard> =
    mongoose.models.Scorecard || mongoose.model<IScorecard>("Scorecard", ScorecardSchema);

export default Scorecard;
