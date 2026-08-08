import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

let s3Client: S3Client | null = null;

function getS3BucketDetails() {
  let bucketName = process.env.AMPLIFY_STORAGE_BUCKET_NAME || process.env.AWS_STORAGE_BUCKET;
  let region = process.env.AWS_REGION || "ap-south-1";

  try {
    const outputs = require("../../amplify_outputs.json");
    if (outputs?.storage?.bucket_name) {
      bucketName = outputs.storage.bucket_name;
    }
    if (outputs?.storage?.aws_region) {
      region = outputs.storage.aws_region;
    }
  } catch (e) {
    // Fallback if outputs file not generated yet
  }

  // Fallback to active S3 bucket name if empty or generic
  if (!bucketName || bucketName === "webappfiles") {
    bucketName = "amplify-d2zqxt0up4qvdw-ma-webappfilesbucketc3bd4ab-hohc4u1gy0qe";
  }

  return { bucketName, region };
}

export function getS3Client() {
  if (!s3Client) {
    const { region } = getS3BucketDetails();
    s3Client = new S3Client({ region });
  }
  return s3Client;
}

/**
 * Uploads a text or JSON synthetic payload directly to AWS S3 from server API routes.
 */
export async function uploadSyntheticPayloadToS3(opts: {
  userId: string;
  fileId: string;
  payload: any;
  filename: string;
  visibility?: string;
}): Promise<string> {
  try {
    const { bucketName } = getS3BucketDetails();
    const isPublic = opts.visibility === "public";
    const extension = opts.filename.includes(".") ? opts.filename.split(".").pop() : "json";
    const key = isPublic
      ? `public/synthetic/${opts.fileId}.${extension}`
      : `media/${opts.userId}/synthetic/${opts.fileId}.${extension}`;

    const bodyString = typeof opts.payload === "string"
      ? opts.payload
      : JSON.stringify(opts.payload, null, 2);

    const client = getS3Client();
    await client.send(
      new PutObjectCommand({
        Bucket: bucketName,
        Key: key,
        Body: bodyString,
        ContentType: extension === "md" ? "text/markdown" : extension === "txt" ? "text/plain" : "application/json",
      })
    );

    console.log(`Server S3 upload successful: s3://${bucketName}/${key}`);
    return key;
  } catch (err) {
    console.error("Server S3 upload error:", err);
    return "";
  }
}

/**
 * Reads a synthetic file payload from S3 given its s3Key.
 */
export async function readSyntheticPayloadFromS3(s3Key: string): Promise<string | null> {
  if (!s3Key) return null;
  try {
    const { bucketName } = getS3BucketDetails();
    const client = getS3Client();
    const res = await client.send(
      new GetObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      })
    );
    if (!res.Body) return null;
    return await res.Body.transformToString("utf-8");
  } catch (err) {
    console.warn(`Could not read S3 key ${s3Key}:`, err);
    return null;
  }
}

/**
 * Deletes a synthetic object from S3.
 */
export async function deleteSyntheticPayloadFromS3(s3Key: string): Promise<void> {
  if (!s3Key) return;
  try {
    const { bucketName } = getS3BucketDetails();
    const client = getS3Client();
    await client.send(
      new DeleteObjectCommand({
        Bucket: bucketName,
        Key: s3Key,
      })
    );
    console.log(`Deleted S3 key: ${s3Key}`);
  } catch (err) {
    console.warn(`Could not delete S3 key ${s3Key}:`, err);
  }
}
