import { NextResponse } from "next/server";
import connectDB from "@/utils/db";
import mongoose from "mongoose";

// Mongoose schema for S3 uploads metadata
const FileUploadSchema = new mongoose.Schema(
  {
    userId: { type: String, required: true, index: true },
    originalFileName: { type: String, required: true },
    s3Key: { type: String, required: true },
    mimeType: { type: String, default: "application/octet-stream" },
    fileSize: { type: Number, default: 0 },
    category: { type: String, default: "general" },
    uploadDate: { type: Date, default: Date.now },
  },
  { collection: "uploads" }
);

const FileUpload =
  mongoose.models.FileUpload || mongoose.model("FileUpload", FileUploadSchema);

export async function POST(req: Request) {
  try {
    await connectDB();
    const body = await req.json();

    const { userId, originalFileName, s3Key, mimeType, fileSize, category } = body;

    if (!s3Key || !originalFileName) {
      return NextResponse.json(
        { success: false, error: "Missing required file metadata (s3Key, originalFileName)" },
        { status: 400 }
      );
    }

    const newUpload = await FileUpload.create({
      userId: userId || "anonymous",
      originalFileName,
      s3Key,
      mimeType: mimeType || "application/octet-stream",
      fileSize: fileSize || 0,
      category: category || "general",
    });

    return NextResponse.json(
      {
        success: true,
        message: "File reference and metadata saved to MongoDB Atlas",
        id: newUpload._id,
        s3Key: newUpload.s3Key,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("Error saving S3 metadata to MongoDB Atlas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to save file metadata" },
      { status: 500 }
    );
  }
}

export async function GET(req: Request) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    const query = userId ? { userId } : {};
    const uploads = await FileUpload.find(query).sort({ uploadDate: -1 }).limit(100);

    return NextResponse.json({ success: true, uploads });
  } catch (error: any) {
    console.error("Error fetching file metadata from MongoDB Atlas:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to fetch uploads" },
      { status: 500 }
    );
  }
}
