import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITierFeatureConfig extends Document {
    tier: string;             // 'free' | 'pro' | 'elite'
    features: string[];       // array of feature IDs that are enabled
    updatedBy?: string;
    createdAt: Date;
    updatedAt: Date;
}

const TierFeatureConfigSchema: Schema<ITierFeatureConfig> = new Schema(
    {
        tier: { type: String, required: true, unique: true, index: true },
        features: { type: [String], default: [] },
        updatedBy: { type: String },
    },
    {
        timestamps: true,
        collection: "tier_feature_configs"
    }
);

if (mongoose.models.TierFeatureConfig) {
    delete mongoose.models.TierFeatureConfig;
}

const TierFeatureConfig: Model<ITierFeatureConfig> = mongoose.model<ITierFeatureConfig>("TierFeatureConfig", TierFeatureConfigSchema);

export default TierFeatureConfig;
