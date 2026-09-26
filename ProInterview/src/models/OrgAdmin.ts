import mongoose, { Schema, Document, Model } from "mongoose";

export interface IOrgAdmin extends Document {
    identifier: string;       // login ID (e.g. email, admin code)
    password?: string;
    displayName: string;
    organizationName: string; // name of the company / organization
    type: "email" | "phone";
    subscriptionPlan: string;
    isVerified: boolean;
    isOnline: boolean;
    lastActive: Date;
    createdAt: Date;
    updatedAt: Date;
    otpCode?: string;
    otpExpires?: Date;
}

const OrgAdminSchema: Schema<IOrgAdmin> = new Schema(
    {
        identifier: { type: String, required: true, unique: true, index: true },
        password: { type: String },
        displayName: { type: String, required: true },
        organizationName: { type: String, required: true, default: "My Organization" },
        type: { type: String, enum: ["email", "phone"], required: true },
        subscriptionPlan: { type: String, default: "Enterprise Tier" },
        isVerified: { type: Boolean, default: false },
        isOnline: { type: Boolean, default: false },
        lastActive: { type: Date, default: Date.now },
        otpCode: { type: String },
        otpExpires: { type: Date },
    },
    {
        timestamps: true,
        collection: "org_admin"
    }
);

if (mongoose.models.OrgAdmin) {
    delete mongoose.models.OrgAdmin;
}

const OrgAdmin: Model<IOrgAdmin> = mongoose.model<IOrgAdmin>("OrgAdmin", OrgAdminSchema);

export default OrgAdmin;
