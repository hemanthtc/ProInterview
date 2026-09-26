import mongoose, { Schema, Document, Model } from "mongoose";

export type NotificationKind = "prep" | "coach" | "gmail" | "referral" | "system";

export interface INotification extends Document {
    userIdentifier: string;
    kind: NotificationKind;
    title: string;
    body: string;
    href?: string;
    read: boolean;
    createdAt: Date;
}

const NotificationSchema = new Schema<INotification>(
    {
        userIdentifier: { type: String, required: true, index: true },
        kind: {
            type: String,
            enum: ["prep", "coach", "gmail", "referral", "system"],
            default: "system",
        },
        title: { type: String, required: true },
        body: { type: String, required: true },
        href: { type: String },
        read: { type: Boolean, default: false },
    },
    { timestamps: { createdAt: true, updatedAt: false }, collection: "notifications" }
);

const Notification: Model<INotification> =
    mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);

export default Notification;
