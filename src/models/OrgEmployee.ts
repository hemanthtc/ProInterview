import mongoose, { Schema, Document, Model, Types } from "mongoose";

export interface IOrgEmployee extends Document {
    identifier: string;       // login ID (e.g. email, employee code)
    password?: string;
    displayName: string;
    adminId: string;          // identifier of the OrgAdmin who manages this employee
    organizationName: string; // denormalized org name for quick display
    department?: string;      // e.g. Engineering, HR, Sales
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

const OrgEmployeeSchema: Schema<IOrgEmployee> = new Schema(
    {
        identifier: { type: String, required: true, unique: true, index: true },
        password: { type: String },
        displayName: { type: String, required: true },
        adminId: { type: String, required: true, index: true }, // links to OrgAdmin.identifier
        organizationName: { type: String, default: "" },
        department: { type: String, default: "" },
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
        collection: "org_employee"
    }
);

if (mongoose.models.OrgEmployee) {
    delete mongoose.models.OrgEmployee;
}

const OrgEmployee: Model<IOrgEmployee> = mongoose.model<IOrgEmployee>("OrgEmployee", OrgEmployeeSchema);

export default OrgEmployee;
