import mongoose, { Schema, Document, Model } from "mongoose";

export interface IRateLimitConfig extends Document {
    tier: string;             // 'free' | 'pro_monthly' | 'pro_yearly' | 'elite' | 'enterprise'
    tierLabel: string;        // Human readable label e.g. 'Free Tier'
    mode: "unlimited" | "customized";
    maxRequests: number;      // e.g. 15
    windowMinutes: number;    // e.g. 15
    isEnabled: boolean;       // whether rate limiting is active for this tier
    updatedBy?: string;       // identifier of admin who saved this
    createdAt: Date;
    updatedAt: Date;
}

const RateLimitConfigSchema: Schema<IRateLimitConfig> = new Schema(
    {
        tier: { type: String, required: true, unique: true, index: true },
        tierLabel: { type: String, required: true },
        mode: { type: String, enum: ["unlimited", "customized"], default: "customized" },
        maxRequests: { type: Number, required: true, default: 15 },
        windowMinutes: { type: Number, required: true, default: 15 },
        isEnabled: { type: Boolean, default: true },
        updatedBy: { type: String },
    },
    {
        timestamps: true,
        collection: "rate_limit_configs"
    }
);

if (mongoose.models.RateLimitConfig) {
    delete mongoose.models.RateLimitConfig;
}

const RateLimitConfig: Model<IRateLimitConfig> = mongoose.model<IRateLimitConfig>("RateLimitConfig", RateLimitConfigSchema);

export default RateLimitConfig;
