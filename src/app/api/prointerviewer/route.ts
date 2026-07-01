import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export async function GET() {
    try {
        const filePath = path.join(process.cwd(), "combined_source_code.txt");
        if (!fs.existsSync(filePath)) {
            return NextResponse.json({ error: "combined_source_code.txt not found in workspace root" }, { status: 404 });
        }
        const code = fs.readFileSync(filePath, "utf-8");
        return NextResponse.json({ code });
    } catch (e: any) {
        return NextResponse.json({ error: e.message || "Failed to load combined source code" }, { status: 500 });
    }
}
