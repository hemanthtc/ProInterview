import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAdminReply {
    replyText: string;
    repliedAt: Date;
    repliedBy: string;
    adminName: string;
}

export interface IFeedback extends Document {
    userIdentifier: string;
    userName: string;
    fieldOfStudy: string;
    category: string;
    problemStatement: string;
    problemDescription: string;
    domainSuggestions?: string;
    rating: number;
    attachmentUrl?: string;
    status: "pending" | "under_review" | "replied" | "resolved";
    adminReply?: IAdminReply;
    createdAt: Date;
    updatedAt: Date;
}

const FeedbackSchema = new Schema<IFeedback>(
    {
        userIdentifier: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        userName: {
            type: String,
            required: true,
            trim: true,
            default: "Anonymous User",
        },
        fieldOfStudy: {
            type: String,
            required: true,
            trim: true,
            index: true,
        },
        category: {
            type: String,
            required: true,
            enum: [
                "Bug Report",
                "Domain Content & Question Bank",
                "Platform UI/UX",
                "AI Interview Quality",
                "Feature Request",
                "Curriculum & Study Materials",
                "General Feedback"
            ],
            default: "General Feedback",
            index: true,
        },
        problemStatement: {
            type: String,
            required: true,
            trim: true,
        },
        problemDescription: {
            type: String,
            required: true,
            trim: true,
        },
        domainSuggestions: {
            type: String,
            trim: true,
            default: "",
        },
        rating: {
            type: Number,
            required: true,
            min: 1,
            max: 5,
            default: 5,
        },
        attachmentUrl: {
            type: String,
            trim: true,
            default: "",
        },
        status: {
            type: String,
            enum: ["pending", "under_review", "replied", "resolved"],
            default: "pending",
            index: true,
        },
        adminReply: {
            replyText: { type: String, trim: true },
            repliedAt: { type: Date },
            repliedBy: { type: String, trim: true },
            adminName: { type: String, trim: true },
        },
    },
    { timestamps: true }
);

FeedbackSchema.index({ createdAt: -1 });

const Feedback: Model<IFeedback> =
    mongoose.models.Feedback || mongoose.model<IFeedback>("Feedback", FeedbackSchema);

export default Feedback;
