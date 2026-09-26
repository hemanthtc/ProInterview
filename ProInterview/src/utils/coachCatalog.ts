import connectDB from "@/utils/db";
import Coach from "@/models/Coach";
import { COACHES, type CoachProfile } from "@/data/coaches";

/** Coach profile shape returned to the client, extended with live inventory when backed by Mongo. */
export interface ResolvedCoach extends CoachProfile {
    /** Remaining seats per slot label — present only for Mongo-backed coaches that track inventory. */
    slotInventory?: Record<string, number>;
}

interface CoachLeanDoc {
    coachId: string;
    name: string;
    headline: string;
    domains?: string[];
    companies?: string[];
    rateUsd: number;
    rateInr: number;
    rating?: number;
    slots?: string[];
    slotInventory?: Record<string, number>;
    bio?: string;
    durationMin?: number;
    active?: boolean;
}

function docToProfile(doc: CoachLeanDoc): ResolvedCoach {
    return {
        id: doc.coachId,
        name: doc.name,
        headline: doc.headline,
        domains: doc.domains || [],
        companies: doc.companies || [],
        rateUsd: doc.rateUsd,
        rateInr: doc.rateInr,
        rating: doc.rating ?? 4.5,
        slots: doc.slots || [],
        bio: doc.bio || "",
        durationMin: doc.durationMin || 45,
        slotInventory: doc.slotInventory && Object.keys(doc.slotInventory).length ? doc.slotInventory : undefined,
    };
}

/** Loads the admin-editable coach catalog from Mongo, falling back to the static seed when empty/unavailable. */
export async function resolveCoaches(): Promise<ResolvedCoach[]> {
    try {
        await connectDB();
        const docs = await Coach.find({ active: true }).sort({ createdAt: 1 }).lean<CoachLeanDoc[]>();
        if (docs && docs.length > 0) {
            return docs.map(docToProfile);
        }
    } catch (error) {
        console.warn("resolveCoaches: Mongo lookup failed, falling back to seed catalog", error);
    }
    return COACHES.map((coach) => ({ ...coach }));
}

export async function resolveCoach(coachId: string): Promise<ResolvedCoach | undefined> {
    if (!coachId) return undefined;
    const coaches = await resolveCoaches();
    return coaches.find((c) => c.id === coachId);
}

/**
 * Decrements remaining inventory for a slot when the coach doc tracks it.
 * Returns true when the booking may proceed (untracked slots/coaches are treated as unlimited).
 */
export async function decrementSlotInventory(coachId: string, slot: string): Promise<boolean> {
    try {
        await connectDB();
        const doc = await Coach.findOne({ coachId });
        if (!doc) return true;
        const remaining = doc.slotInventory?.[slot];
        if (remaining === undefined) return true;
        if (remaining <= 0) return false;
        await Coach.updateOne({ coachId }, { $inc: { [`slotInventory.${slot}`]: -1 } });
        return true;
    } catch (error) {
        console.warn("decrementSlotInventory failed", error);
        return true;
    }
}

/** Restores one seat to a slot's inventory, used when a booking is cancelled. */
export async function restoreSlotInventory(coachId: string, slot: string): Promise<void> {
    try {
        await connectDB();
        const doc = await Coach.findOne({ coachId });
        if (!doc || doc.slotInventory?.[slot] === undefined) return;
        await Coach.updateOne({ coachId }, { $inc: { [`slotInventory.${slot}`]: 1 } });
    } catch (error) {
        console.warn("restoreSlotInventory failed", error);
    }
}
