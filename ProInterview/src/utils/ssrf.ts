import dns from "dns";
import { promisify } from "util";
import net from "net";

const lookupAsync = promisify(dns.lookup);

/**
 * Validates if a user-supplied URL is safe from SSRF.
 * Resolves hostnames to actual IPs and checks if they fall into private/loopback ranges.
 */
export async function isSafeUrl(urlStr: string): Promise<boolean> {
    try {
        const parsed = new URL(urlStr);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return false;
        }

        const hostname = parsed.hostname.toLowerCase();
        
        // Block obvious local hosts
        if (["localhost", "0.0.0.0", "127.0.0.1", "169.254.169.254"].includes(hostname)) {
            return false;
        }
        if (hostname.endsWith(".local") || hostname.endsWith(".internal")) {
            return false;
        }

        // Resolve DNS to verify actual IP
        let ip: string;
        if (net.isIP(hostname)) {
            ip = hostname;
        } else {
            const lookup = await lookupAsync(hostname);
            ip = lookup.address;
        }

        // Block private IPv4 ranges
        // 10.0.0.0/8
        // 172.16.0.0/12
        // 192.168.0.0/16
        // 127.0.0.0/8
        // 169.254.169.254 (link local)
        if (
            ip.startsWith("10.") ||
            ip.startsWith("192.168.") ||
            ip.startsWith("127.") ||
            ip.startsWith("169.254.")
        ) {
            return false;
        }

        if (ip.startsWith("172.")) {
            const parts = ip.split(".");
            const secondOctet = parseInt(parts[1], 10);
            if (secondOctet >= 16 && secondOctet <= 31) {
                return false;
            }
        }

        // Block IPv6 local/private addresses
        if (ip === "::1" || ip.startsWith("fe80:") || ip.startsWith("fc00:") || ip.startsWith("fd00:")) {
            return false;
        }

        return true;
    } catch {
        return false;
    }
}
