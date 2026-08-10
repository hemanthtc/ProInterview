import mongoose, { Schema, Document, Model } from "mongoose";

export interface IProfileData extends Document {
    identifier: string; // links to User.identifier
    profilePhoto?: string;
    /** S3 object key for profile photo (preferred over large base64 in profilePhoto). */
    profilePhotoKey?: string;
    /** Public or CDN URL for profile photo when stored in S3. */
    profilePhotoUrl?: string;
    additionalEmail?: string;
    github?: string;
    linkedin?: string;
    portfolioUrl?: string;
    resumeCvName?: string;
    resumeCvText?: string;
    /** S3 object key for original resume file. */
    resumeCvKey?: string;
    /** Public or CDN URL for resume when stored in S3. */
    resumeCvUrl?: string;
    phone?: string;
    educationData?: {
        tenth?: { institution?: string; board?: string; marks?: string };
        twelfth?: { institution?: string; board?: string; marks?: string };
        ug?: { institution?: string; course?: string; marks?: string };
        pg?: { institution?: string; course?: string; marks?: string };
    };
    createdAt: Date;
    updatedAt: Date;
}

const ProfileDataSchema: Schema<IProfileData> = new Schema(
    {
        identifier: { type: String, required: true, unique: true, index: true },
        profilePhoto: { type: String },
        profilePhotoKey: { type: String },
        profilePhotoUrl: { type: String },
        additionalEmail: { type: String },
        github: { type: String },
        linkedin: { type: String },
        portfolioUrl: { type: String },
        resumeCvName: { type: String },
        resumeCvText: { type: String },
        resumeCvKey: { type: String },
        resumeCvUrl: { type: String },
        phone: { type: String },
        educationData: {
            tenth: { institution: { type: String }, board: { type: String }, marks: { type: String } },
            twelfth: { institution: { type: String }, board: { type: String }, marks: { type: String } },
            ug: { institution: { type: String }, course: { type: String }, marks: { type: String } },
            pg: { institution: { type: String }, course: { type: String }, marks: { type: String } }
        }
    },
    {
        timestamps: true,
        collection: "profiledata"
    }
);

const ProfileData: Model<IProfileData> = mongoose.models.ProfileData || mongoose.model<IProfileData>("ProfileData", ProfileDataSchema);

export default ProfileData;
