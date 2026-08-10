import mongoose, { Schema, Document, Model } from "mongoose";

/** Admin-editable coach catalog (falls back to seed data when empty). */
export interface ICoachDoc extends Document {
    coachId: string;
    name: string;
    headline: string;
    domains: string[];
    companies: string[];
    rateUsd: number;
    rateInr: number;
    rating: number;
    slots: string[];
    /** Remaining seats per slot label */
    slotInventory: Record<string, number>;
    bio: string;
    durationMin: number;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
}

const CoachSchema = new Schema<ICoachDoc>(
    {
        coachId: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        headline: { type: String, required: true },
        domains: { type: [String], default: [] },
        companies: { type: [String], default: [] },
        rateUsd: { type: Number, required: true },
        rateInr: { type: Number, required: true },
        rating: { type: Number, default: 4.5 },
        slots: { type: [String], default: [] },
        slotInventory: { type: Schema.Types.Mixed, default: {} },
        bio: { type: String, default: "" },
        durationMin: { type: Number, default: 45 },
        active: { type: Boolean, default: true },
    },
    { timestamps: true, collection: "coaches" }
);

const Coach: Model<ICoachDoc> = mongoose.models.Coach || mongoose.model<ICoachDoc>("Coach", CoachSchema);

export default Coach;
