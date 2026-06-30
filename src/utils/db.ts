import mongoose from "mongoose";
import dns from "dns";

// Prevent ECONNREFUSED DNS resolution issues for MongoDB Atlas SRV records by setting public DNS resolvers
try {
    dns.setServers(["8.8.8.8", "1.1.1.1"]);
} catch (e) {
    console.warn("Failed to set DNS servers for MongoDB connection:", e);
}

const MONGODB_URI = process.env.MONGODB_URI;

let cached = (global as any).mongoose;

if (!cached) {
    cached = (global as any).mongoose = { conn: null, promise: null };
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
        let hostPort = slashSplit[0];
        let dbAndOptions = slashSplit.slice(1).join("/");
        
        const questionSplit = dbAndOptions.split("?");
        const database = questionSplit[0] || "";
        const queryOptions = questionSplit[1] || "";

        const host = hostPort.split(":")[0];

        // 1. Fetch SRV records via Cloudflare DoH (port 443)
        const srvUrl = `https://cloudflare-dns.com/dns-query?name=_mongodb._tcp.${encodeURIComponent(host)}&type=SRV`;
        const srvRes = await fetch(srvUrl, { headers: { "accept": "application/dns-json" } });
        if (!srvRes.ok) {
            throw new Error(`Cloudflare DoH SRV query failed with status: ${srvRes.status}`);
        }
        
        const srvData = await srvRes.json();
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

        // 2. Fetch TXT records via Cloudflare DoH for cluster options
        const txtUrl = `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=TXT`;
        const txtRes = await fetch(txtUrl, { headers: { "accept": "application/dns-json" } });
        
        let txtOptions = "";
        if (txtRes.ok) {
            const txtData = await txtRes.json();
            if (txtData.Answer && txtData.Answer.length > 0) {
                const rawTxt = txtData.Answer[0].data || "";
                txtOptions = rawTxt.replace(/^"|"$/g, "").replace(/\\/g, "");
            }
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
    if (!MONGODB_URI) {
        throw new Error(
            "Please define the MONGODB_URI environment variable to connect to MongoDB Atlas."
        );
    }

    if (cached.conn) {
        return cached.conn;
    }

    if (!cached.promise) {
        const opts = {
            bufferCommands: false,
        };

        // Resolve the connection string dynamically before calling mongoose.connect()
        cached.promise = resolveSrvConnectionString(MONGODB_URI).then((resolvedUri) => {
            return mongoose.connect(resolvedUri, opts);
        }).then((mongooseInstance) => {
            return mongooseInstance;
        });
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
