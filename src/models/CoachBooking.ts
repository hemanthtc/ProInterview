import mongoose, { Schema, Document, Model } from "mongoose";

export type CoachBookingStatus = "pending" | "paid" | "confirmed" | "cancelled";

export interface ICoachBooking extends Document {
    bookingId: string;
    userIdentifier: string;
    coachId: string;
    coachName: string;
    slot: string;
    amountPaise: number;
    currency: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    meetLink: string;
    status: CoachBookingStatus;
    createdAt: Date;
    updatedAt: Date;
}

const CoachBookingSchema: Schema<ICoachBooking> = new Schema(
    {
        bookingId: { type: String, required: true, unique: true, index: true },
        userIdentifier: { type: String, required: true, index: true },
        coachId: { type: String, required: true, index: true },
        coachName: { type: String, required: true },
        slot: { type: String, required: true },
        amountPaise: { type: Number, required: true },
        currency: { type: String, default: "INR" },
        razorpayOrderId: { type: String },
        razorpayPaymentId: { type: String },
        meetLink: { type: String, required: true },
        status: {
            type: String,
            enum: ["pending", "paid", "confirmed", "cancelled"],
            default: "pending",
        },
    },
    { timestamps: true, collection: "coach_bookings" }
);

const CoachBooking: Model<ICoachBooking> =
    mongoose.models.CoachBooking || mongoose.model<ICoachBooking>("CoachBooking", CoachBookingSchema);

export default CoachBooking;
