import { NextResponse } from "next/server";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getS3Config() {
  let bucketName = process.env.AMPLIFY_STORAGE_BUCKET_NAME || process.env.AWS_STORAGE_BUCKET;
  let region = process.env.AWS_REGION || "ap-south-1";

  try {
    const outputs = require("../../../../../amplify_outputs.json");
    if (outputs?.storage?.bucket_name) {
      bucketName = outputs.storage.bucket_name;
    }
    if (outputs?.storage?.aws_region) {
      region = outputs.storage.aws_region;
    }
  } catch (e) {
    // Fallback if outputs file not loaded
  }

  if (!bucketName || bucketName === "webappfiles") {
    bucketName = "amplify-d2qzxt0up4qvdw-ma-webappfilesbucketc3bd4ab-hohc4u1gy0qe";
  }

  return { bucketName, region };
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { key, contentType } = body;

    if (!key) {
      return NextResponse.json({ success: false, error: "Missing S3 object key" }, { status: 400 });
    }

    const { bucketName, region } = getS3Config();
    const client = new S3Client({ region });

    const command = new PutObjectCommand({
      Bucket: bucketName,
      Key: key,
      ContentType: contentType || "application/octet-stream",
    });

    // Generate short-lived (15 minutes) pre-signed upload URL
    const uploadUrl = await getSignedUrl(client, command, { expiresIn: 900 });

    return NextResponse.json({
      success: true,
      uploadUrl,
      key,
      bucketName,
    });
  } catch (error: any) {
    console.error("Error generating S3 pre-signed URL:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to generate pre-signed URL" },
      { status: 500 }
    );
  }
}
