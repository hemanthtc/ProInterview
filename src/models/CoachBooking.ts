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
    /** Set once a 24h-ahead reminder has been sent, to avoid duplicate sends. */
    reminderSentAt?: Date;
    /** Set when the user or an admin cancels the booking. */
    cancelledAt?: Date;
    /** Razorpay refund id when a refund was initiated on cancellation. */
    refundId?: string;
    /** Optional external calendar event id (reserved for future OAuth-based sync). */
    calendarEventId?: string;
    /** "Add to Google Calendar" template link generated on confirm. */
    googleCalendarLink?: string;
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
        reminderSentAt: { type: Date },
        cancelledAt: { type: Date },
        refundId: { type: String },
        calendarEventId: { type: String },
        googleCalendarLink: { type: String },
    },
    { timestamps: true, collection: "coach_bookings" }
);

const CoachBooking: Model<ICoachBooking> =
    mongoose.models.CoachBooking || mongoose.model<ICoachBooking>("CoachBooking", CoachBookingSchema);

export default CoachBooking;
