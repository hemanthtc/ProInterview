import { uploadData, getUrl, remove } from 'aws-amplify/storage';

export interface FileMetadata {
  originalFileName: string;
  s3Key: string;
  mimeType: string;
  fileSize: number;
  accessLevel?: 'public' | 'private' | 'protected';
  category?: string;
}

/**
 * Uploads a file directly to AWS S3 via Amplify Storage
 * and records its metadata in MongoDB Atlas via Next.js API.
 */
export async function uploadFileAndSaveMetadata(
  file: File,
  userId?: string,
  category: string = 'general'
): Promise<{ success: boolean; s3Key: string; metadataId?: string; fileUrl?: string }> {
  try {
    const s3Path = `public/uploads/${Date.now()}-${file.name.replace(/\s+/g, '_')}`;

    // 1. Upload binary payload directly to S3
    const uploadTask = uploadData({
      path: s3Path,
      data: file,
      options: {
        contentType: file.type,
      },
    });

    const result = await uploadTask.result;
    console.log('S3 Upload successful:', result.path);

    // 2. Save metadata reference in MongoDB Atlas via Next.js API endpoint
    const response = await fetch('/api/uploads', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId: userId || 'anonymous',
        originalFileName: file.name,
        s3Key: result.path,
        mimeType: file.type,
        fileSize: file.size,
        category,
      }),
    });

    const metadataResult = await response.json();

    // 3. Obtain signed S3 download URL
    const downloadUrlResult = await getUrl({ path: result.path });

    return {
      success: true,
      s3Key: result.path,
      metadataId: metadataResult.id || metadataResult._id,
      fileUrl: downloadUrlResult.url.toString(),
    };
  } catch (error: any) {
    console.error('Failed to upload file to S3 or save metadata to MongoDB:', error);
    throw error;
  }
}

/**
 * Retrieves a signed URL for reading/viewing an S3 file.
 */
export async function getS3FileUrl(s3Key: string): Promise<string> {
  const result = await getUrl({ path: s3Key });
  return result.url.toString();
}

/**
 * Deletes a file from AWS S3.
 */
export async function deleteS3File(s3Key: string): Promise<void> {
  await remove({ path: s3Key });
}
