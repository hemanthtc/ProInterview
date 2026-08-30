export function isProductionRuntime(): boolean {
    return process.env.NODE_ENV === "production";
}

/** Production exam/analytics writes must hit Mongo unless explicitly overridden. */
export function requirePersistentStore(): boolean {
    return isProductionRuntime() && process.env.ALLOW_MEMORY_EXAMS !== "1";
}

export function productionEnvStatus() {
    const jwt = Boolean(process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32);
    const gemini = Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "dummy");
    const mongo = Boolean(process.env.MONGODB_URI);
    return {
        jwtConfigured: jwt,
        geminiConfigured: gemini,
        mongoConfigured: mongo,
        ready: jwt && mongo,
    };
}
