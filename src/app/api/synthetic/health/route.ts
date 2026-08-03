import { NextResponse } from "next/server";
import connectDB from "@/utils/db";

export async function GET() {
    try {
        await connectDB();
        return NextResponse.json({ ok: true, message: "Synthetic Storage Service operational." });
    } catch (err: any) {
        return NextResponse.json({ ok: false, error: err.message || "Database connection error" }, { status: 500 });
    }
}
