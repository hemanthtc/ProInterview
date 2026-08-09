import mongoose, { Schema, Document, Model } from "mongoose";

export interface ICommunityMessage extends Document {
    roomSlug: string;
    senderId: string;
    senderName: string;
    body: string;
    createdAt: Date;
    updatedAt: Date;
}

const CommunityMessageSchema: Schema<ICommunityMessage> = new Schema(
    {
        roomSlug: { type: String, required: true, index: true },
        senderId: { type: String, required: true, index: true },
        senderName: { type: String, required: true },
        body: { type: String, required: true, maxlength: 2000 },
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
