import { NextRequest, NextResponse } from "next/server";
import { z, type ZodType } from "zod";
import { rateLimit } from "@/utils/rateLimit";

export const MAX_JSON_BODY_BYTES = 1_048_576; // 1 MiB

export function publicErrorMessage(error: unknown, fallback = "Internal server error"): string {
    if (process.env.NODE_ENV === "production") return fallback;
    if (error instanceof Error && error.message.trim()) return error.message;
    if (typeof error === "string" && error.trim()) return error;
    return fallback;
}

export function jsonError(
    error: unknown,
    status = 500,
    fallback = "Internal server error"
): NextResponse {
    const message =
        status >= 500
            ? publicErrorMessage(error, fallback)
            : error instanceof Error
              ? error.message
              : typeof error === "string"
                ? error
                : fallback;
    return NextResponse.json({ error: message }, { status });
}

export function jsonRateLimited(retryAfterSec: number, action = "this action"): NextResponse {
    return NextResponse.json(
        { error: `Too many requests for ${action}. Try again in ${retryAfterSec}s.` },
        { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
}

export function enforceRateLimit(
    key: string,
    opts: { limit: number; windowMs?: number },
    action?: string
): NextResponse | null {
    const rl = rateLimit(key, opts);
    if (!rl.allowed) return jsonRateLimited(rl.retryAfterSec, action);
    return null;
}

function contentLengthBytes(req: NextRequest): number | null {
    const raw = req.headers.get("content-length");
    if (!raw) return null;
    const n = Number(raw);
    return Number.isFinite(n) ? n : null;
}

export async function parseJsonBody<T>(
    req: NextRequest,
    schema: ZodType<T>,
    maxBytes = MAX_JSON_BODY_BYTES
): Promise<{ ok: true; data: T } | { ok: false; response: NextResponse }> {
    const declared = contentLengthBytes(req);
    if (declared !== null && declared > maxBytes) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Request body is too large." }, { status: 413 }),
        };
    }

    let raw: unknown;
    try {
        raw = await req.json();
    } catch {
        return {
            ok: false,
            response: NextResponse.json({ error: "Invalid JSON body." }, { status: 400 }),
        };
    }

    const encoded = Buffer.byteLength(JSON.stringify(raw), "utf8");
    if (encoded > maxBytes) {
        return {
            ok: false,
            response: NextResponse.json({ error: "Request body is too large." }, { status: 413 }),
        };
    }

    const parsed = schema.safeParse(raw);
    if (!parsed.success) {
        const first = parsed.error.issues[0];
        const path = first?.path?.length ? first.path.join(".") : "body";
        return {
            ok: false,
            response: NextResponse.json(
                { error: `Invalid ${path}: ${first?.message || "validation failed"}` },
                { status: 400 }
            ),
        };
    }

    return { ok: true, data: parsed.data };
}

export const aptitudeQuizBodySchema = z.object({
    category: z.enum([
        "logicalReasoning",
        "quantitativeAptitude",
        "technicalCoding",
        "domainAssessments",
        "situationalJudgment",
    ]),
    role: z.string().optional(),
    domain: z.enum(["tech_software", "core_engineering", "business_management"]).optional(),
});

export const mockTestBodySchema = z.object({
    aptitudePath: z.enum(["onCampus", "offCampus"]),
    role: z.string().optional(),
    domain: z.enum(["tech_software", "core_engineering", "business_management"]).optional(),
});

export const runCodeBodySchema = z.object({
    code: z.string().min(1).max(200_000),
    stdin: z.string().max(50_000).optional().default(""),
    language: z.string().min(1).max(32).optional(),
    lang: z.string().min(1).max(32).optional(),
    args: z.array(z.string().max(200)).max(20).optional(),
});

export const analyzeInterviewBodySchema = z.object({
    messages: z
        .array(
            z.object({
                role: z.string().max(40),
                content: z.string().max(20_000),
            })
        )
        .max(200),
    snapshots: z.array(z.string().max(500_000)).max(8).optional(),
    company: z.string().max(200).optional(),
    roles: z.string().max(200).optional(),
    level: z.string().max(80).optional(),
    companyClone: z.boolean().optional(),
});
