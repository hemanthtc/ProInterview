import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICodingExamEvent {
    at: number;
    reason: string;
}

export interface ICodingExamAttempt {
    identifier: string;
    displayName: string;
    startedAt: number;
    submittedAt?: number;
    terminated?: boolean;
    scores: Record<string, number>;
    events: ICodingExamEvent[];
}

export interface ICodingExam extends Document {
    code: string;
    title: string;
    createdBy: string;
    durationSec: number;
    problemIds: string[];
    roster: string[];
    attempts: ICodingExamAttempt[];
    createdAt: Date;
    updatedAt: Date;
}

const EventSchema = new Schema<ICodingExamEvent>(
    { at: Number, reason: String },
    { _id: false }
);

const AttemptSchema = new Schema<ICodingExamAttempt>(
    {
        identifier: { type: String, required: true },
        displayName: { type: String, default: "Student" },
        startedAt: { type: Number, required: true },
        submittedAt: { type: Number },
        terminated: { type: Boolean, default: false },
        scores: { type: Schema.Types.Mixed, default: {} },
        events: { type: [EventSchema], default: [] },
    },
    { _id: false }
);

const CodingExamSchema: Schema<ICodingExam> = new Schema(
    {
        code: { type: String, required: true, unique: true, index: true, uppercase: true },
        title: { type: String, required: true },
        createdBy: { type: String, required: true, index: true },
        durationSec: { type: Number, default: 3600 },
        problemIds: { type: [String], default: [] },
        roster: { type: [String], default: [] },
        attempts: { type: [AttemptSchema], default: [] },
    },
    { timestamps: true, collection: "coding_exams" }
);

const CodingExam: Model<ICodingExam> =
    mongoose.models.CodingExam || mongoose.model<ICodingExam>("CodingExam", CodingExamSchema);

export default CodingExam;
