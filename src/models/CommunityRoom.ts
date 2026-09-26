import mongoose, { Schema, Document, Model } from "mongoose";

export type CommunityRoomType = "channel" | "dm";

export interface ICommunityRoom extends Document {
    slug: string;
    name: string;
    description: string;
    type: CommunityRoomType;
    members: string[]; // identifiers for DMs; empty for public channels
    createdBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const CommunityRoomSchema: Schema<ICommunityRoom> = new Schema(
    {
        slug: { type: String, required: true, unique: true, index: true },
        name: { type: String, required: true },
        description: { type: String, default: "" },
        type: { type: String, enum: ["channel", "dm"], default: "channel", index: true },
        members: { type: [String], default: [] },
        createdBy: { type: String },
    },
    {
        timestamps: true,
        collection: "community_rooms",
    }
);

const CommunityRoom: Model<ICommunityRoom> =
    mongoose.models.CommunityRoom || mongoose.model<ICommunityRoom>("CommunityRoom", CommunityRoomSchema);

export default CommunityRoom;
