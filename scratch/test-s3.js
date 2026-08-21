const fs = require("fs");
const path = require("path");
const { S3Client, HeadBucketCommand } = require("@aws-sdk/client-s3");

// 1. Read and parse local .env file
const envPath = path.join(__dirname, "../.env");
if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, "utf-8");
    envContent.split("\n").forEach((line) => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            const key = match[1];
            let val = match[2] || "";
            // Remove wrapping quotes if any
            if (val.startsWith('"') && val.endsWith('"')) {
                val = val.slice(1, -1);
            }
            process.env[key] = val.trim();
        }
    });
}

const accessKeyId = process.env.S3_ACCESS_KEY_ID;
const secretAccessKey = process.env.S3_SECRET_ACCESS_KEY;
const bucket = process.env.S3_BUCKET;
const region = process.env.S3_REGION || "ap-south-1";

console.log("Configured Parameters:");
console.log("- S3_BUCKET:", bucket);
console.log("- S3_REGION:", region);
console.log("- S3_ACCESS_KEY_ID:", accessKeyId ? `${accessKeyId.slice(0, 5)}...${accessKeyId.slice(-5)}` : "missing");
console.log("- S3_SECRET_ACCESS_KEY:", secretAccessKey ? "configured" : "missing");

if (!accessKeyId || !secretAccessKey || !bucket) {
    console.error("\nError: Missing AWS S3 configuration parameters in .env!");
    process.exit(1);
}

// 2. Initialize S3 client and send HeadBucketCommand
const client = new S3Client({
    region,
    credentials: {
        accessKeyId,
        secretAccessKey
    }
});

async function run() {
    try {
        console.log("\nAttempting to query S3 bucket status (HeadBucketCommand)...");
        await client.send(new HeadBucketCommand({ Bucket: bucket }));
        console.log("✅ SUCCESS: Successfully connected to S3! The credentials are valid and the bucket is accessible.");
    } catch (err) {
        console.error("\n❌ CONNECTION FAILED!");
        console.error("Error Code:", err.code || err.name);
        console.error("Error Message:", err.message);
        console.error("Full Error details:", err);
    }
}

run();
