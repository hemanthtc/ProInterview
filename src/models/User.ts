import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
    identifier: string; // email or phone number
    password?: string;
    displayName: string;
    type: "email" | "phone";
    isOrganization: boolean;
    orgRole: "admin" | "employee" | "user";
    subscriptionPlan: string;
    isVerified: boolean;
    createdAt: Date;
    updatedAt: Date;
    otpCode?: string;
    otpExpires?: Date;
}

const UserSchema: Schema<IUser> = new Schema(
    {
        identifier: { type: String, required: true, unique: true, index: true },
        password: { type: String },
        displayName: { type: String, required: true },
        type: { type: String, enum: ["email", "phone"], required: true },
        isOrganization: { type: Boolean, default: false },
        orgRole: { type: String, enum: ["admin", "employee", "user"], default: "user" },
        subscriptionPlan: { type: String, default: "Free Tier" },
        isVerified: { type: Boolean, default: false },
        otpCode: { type: String },
        otpExpires: { type: Date },
    },
    {
        timestamps: true,
        collection: "user"
    }
);

const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

export default User;
