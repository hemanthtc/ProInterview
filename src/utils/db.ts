import mongoose from "mongoose";
import dns from "dns";

// Prevent ECONNREFUSED DNS resolution issues for MongoDB Atlas SRV records by setting public DNS resolvers
try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
    console.warn("Failed to set DNS servers for MongoDB connection:", e);
}

let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
}

async function fetchWithTimeout(url: string, init?: RequestInit, timeoutMs = 6000): Promise<Response> {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(url, {
            ...init,
            signal: controller.signal
        });
    } finally {
        clearTimeout(id);
    }
}

// Resolves a mongodb+srv:// connection string dynamically using DNS over HTTPS (DoH)
// to bypass local DNS blocks/querySrv ECONNREFUSED issues on port 53.
async function resolveSrvConnectionString(srvUri: string): Promise<string> {
    if (!srvUri.startsWith("mongodb+srv://")) {
        return srvUri;
    }

    try {
        console.log("Detecting mongodb+srv connection string. Attempting DNS over HTTPS resolution...");

        const rawPart = srvUri.replace("mongodb+srv://", "");
        const authSplit = rawPart.split("@");
        
        let authInfo = "";
        let hostAndRest = "";
        
        if (authSplit.length > 1) {
            authInfo = authSplit[0];
            hostAndRest = authSplit.slice(1).join("@");
        } else {
            hostAndRest = rawPart;
        }

        const slashSplit = hostAndRest.split("/");
        const hostPort = slashSplit[0];
        const dbAndOptions = slashSplit.slice(1).join("/");
        
        const questionSplit = dbAndOptions.split("?");
        const database = questionSplit[0] || "";
        const queryOptions = questionSplit[1] || "";

        const host = hostPort.split(":")[0];

        // Helper to query Cloudflare first, then Google DoH
        const queryDoH = async (name: string, type: string) => {
            try {
                const cfUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(name)}&type=${type}`;
                const res = await fetchWithTimeout(cfUrl, { headers: { "accept": "application/dns-json" } }, 4000);
                if (res.ok) {
                    const data = await res.json();
                    if (data.Answer && data.Answer.length > 0) return data;
                }
            } catch {
                // fall through to Google DoH
            }
            const googleUrl = `https://dns.google/resolve?name=${encodeURIComponent(name)}&type=${type}`;
            const resGoogle = await fetchWithTimeout(googleUrl, undefined, 4000);
            if (resGoogle.ok) {
                return await resGoogle.json();
            }
            throw new Error(`Both Cloudflare and Google DoH failed for ${name} (${type})`);
        };

        // 1. Fetch SRV records via DoH (port 443)
        const srvData = await queryDoH(`_mongodb._tcp.${host}`, "SRV");
        if (!srvData.Answer || srvData.Answer.length === 0) {
            throw new Error("No SRV records found for the MongoDB Atlas host.");
        }

        const nodes = srvData.Answer.map((ans: any) => {
            const parts = ans.data.trim().split(/\s+/);
            if (parts.length < 4) return null;
            const port = parts[2];
            let target = parts[3];
            if (target.endsWith(".")) {
                target = target.slice(0, -1);
            }
            return `${target}:${port}`;
        }).filter(Boolean);

        if (nodes.length === 0) {
            throw new Error("Failed to parse replica set nodes from SRV query.");
        }

        // 2. Fetch TXT records via DoH for cluster options
        let txtOptions = "";
        try {
            const txtData = await queryDoH(host, "TXT");
            if (txtData.Answer && txtData.Answer.length > 0) {
                const rawTxt = txtData.Answer[0].data || "";
                txtOptions = rawTxt.replace(/^"|"$/g, "").replace(/\\/g, "");
            }
        } catch {
            // Optional TXT options
        }


        const combinedOptionsList: string[] = [];
        if (txtOptions) combinedOptionsList.push(txtOptions);
        if (queryOptions) combinedOptionsList.push(queryOptions);
        if (!combinedOptionsList.some(o => o.includes("ssl="))) {
            combinedOptionsList.push("ssl=true");
        }
        if (!combinedOptionsList.some(o => o.includes("authSource="))) {
            combinedOptionsList.push("authSource=admin");
        }

        const finalOptions = combinedOptionsList.join("&");
        const authPart = authInfo ? `${authInfo}@` : "";
        const resolvedUri = `mongodb://${authPart}${nodes.join(",")}/${database}?${finalOptions}`;
        
        console.log("Successfully resolved standard connection string using DoH: mongodb://****@" + nodes[0].split(".")[0] + "...");
        return resolvedUri;
    } catch (err) {
        console.error("DNS over HTTPS resolution failed, falling back to original string:", err);
        return srvUri;
    }
}

async function connectDB() {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
        throw new Error(
            "Please define the MONGODB_URI environment variable to connect to MongoDB Atlas."
        );
    }

    if (cached.conn && mongoose.connection.readyState === 1) {
        return cached.conn;
    }

    // Reset cached state if connection was dropped or disconnected
    if (mongoose.connection.readyState === 0) {
        cached.conn = null;
        cached.promise = null;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: true,
            serverSelectionTimeoutMS: 8000,
            connectTimeoutMS: 8000,
            maxPoolSize: 10,
        };

        // If in development and using mongodb+srv://, resolve via DoH first to avoid local DNS timeout on blocked UDP port 53.
        // In production, connect directly to prevent leaking internal Atlas cluster hostnames to third-party DoH.
        cached.promise = (async () => {
            let targetUri = mongoUri;
            if (process.env.NODE_ENV !== "production" && mongoUri.startsWith("mongodb+srv://")) {
                try {
                    targetUri = await resolveSrvConnectionString(mongoUri);
                } catch (dohError) {
                    console.warn("DoH pre-resolution failed, trying original MONGODB_URI...", dohError);
                    targetUri = mongoUri;
                }
            }

            try {
                const mongooseInstance = await mongoose.connect(targetUri, opts);
                console.log("Connected to MongoDB successfully.");
                return mongooseInstance;
            } catch (firstError) {
                if (targetUri !== mongoUri) {
                    console.warn("Resolved URI connection failed, falling back to original MONGODB_URI...", firstError);
                    return await mongoose.connect(mongoUri, opts);
                }
                throw firstError;
            }
        })();
    }

    try {
        cached.conn = await cached.promise;
    } catch (e) {
        cached.promise = null;
        throw e;
    }

    return cached.conn;
}

export default connectDB;
