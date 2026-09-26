/**
 * Helper script to list or register Tavus replicas from your Tavus account.
 * Usage:
 *   node scripts/create-tavus-replica.js
 */

const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.join(__dirname, '..', '.env');
let apiKey = process.env.TAVUS_API_KEY;

if (fs.existsSync(envPath)) {
    const envContent = fs.readFileSync(envPath, 'utf8');
    envContent.split('\n').forEach(line => {
        const [key, ...vals] = line.trim().split('=');
        if (key && vals.length > 0 && !process.env[key]) {
            process.env[key] = vals.join('=').trim().replace(/^["']|["']$/g, '');
        }
    });
    apiKey = apiKey || process.env.TAVUS_API_KEY;
}

if (!apiKey || apiKey === 'dummy') {
    console.error("❌ Error: TAVUS_API_KEY not found in .env. Please add your Tavus API key.");
    process.exit(1);
}

async function listReplicas() {
    console.log("🔍 Fetching replicas from your Tavus account...");
    try {
        const res = await fetch("https://tavusapi.com/v2/replicas", {
            headers: { "x-api-key": apiKey }
        });
        
        if (!res.ok) {
            const err = await res.text();
            console.error(`❌ Failed to fetch replicas (${res.status}): ${err}`);
            return;
        }

        const data = await res.json();
        const replicas = data?.data || data?.replicas || [];
        
        console.log(`\n✅ Found ${replicas.length} replica(s) in your Tavus account:`);
        replicas.forEach((r, idx) => {
            console.log(`  [${idx + 1}] Name: ${r.replica_name || 'Unnamed'}`);
            console.log(`      Replica ID: ${r.replica_id}`);
            console.log(`      Status: ${r.status}`);
            console.log(`      Created: ${r.created_at || 'N/A'}\n`);
        });

        if (replicas.length > 0) {
            console.log(`💡 To use a specific replica, add this line to your .env file:`);
            console.log(`TAVUS_FACE_ID=${replicas[0].replica_id}\n`);
        } else {
            console.log(`💡 No custom replicas found. You can create one on the Tavus portal at https://platform.tavus.io`);
        }
    } catch (err) {
        console.error("❌ Error querying Tavus API:", err);
    }
}

listReplicas();
