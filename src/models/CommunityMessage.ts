import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICommunityMessage extends Document {
    roomSlug: string;
    senderId: string;
    senderName: string;
    body: string;
    replyToId?: string;
    replyToMessage?: {
        body: string;
        senderName: string;
        attachmentType?: string;
    };
    attachmentUrl?: string;
    attachmentType?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CommunityMessageSchema: Schema<ICommunityMessage> = new Schema(
    {
        roomSlug: { type: String, required: true, index: true },
        senderId: { type: String, required: true, index: true },
        senderName: { type: String, required: true },
        body: { type: String, default: "", maxlength: 2000 },
        replyToId: { type: String },
        replyToMessage: {
            body: { type: String },
            senderName: { type: String },
            attachmentType: { type: String },
        },
        attachmentUrl: { type: String },
        attachmentType: { type: String },
    },
    {
        timestamps: true,
        collection: "community_messages",
    }
);

CommunityMessageSchema.index({ roomSlug: 1, createdAt: -1 });

const CommunityMessage: Model<ICommunityMessage> =
    mongoose.models.CommunityMessage ||
    mongoose.model<ICommunityMessage>("CommunityMessage", CommunityMessageSchema);

export default CommunityMessage;
