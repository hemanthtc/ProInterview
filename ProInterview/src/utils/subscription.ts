import { IUser } from "@/models/User";

/**
 * Checks if a user's subscription has expired and automatically degrades it to "Free Tier".
 * Returns true if the user was degraded.
 */
export async function checkAndDegradeSubscription(user: IUser): Promise<boolean> {
    if (!user || user.subscriptionPlan === "Free Tier") return false;

    if (user.subscriptionExpiresAt) {
        const expiry = new Date(user.subscriptionExpiresAt);
        if (new Date() > expiry) {
            user.subscriptionPlan = "Free Tier";
            user.billingCycle = null;
            user.subscriptionStartedAt = null;
            user.subscriptionExpiresAt = null;
            await user.save();
            return true;
        }
    }
    return false;
}
