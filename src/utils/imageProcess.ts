/**
 * Dynamic import of heic2any for client-side HEIC to JPEG conversion and canvas-based quality preservation compression.
 */
export async function processImageForUpload(file: File): Promise<File> {
    let activeFile = file;

    // 1. Handle HEIC/HEIF format conversion (iPhone/Android default camera settings)
    const isHEIC = 
        activeFile.name.toLowerCase().endsWith(".heic") || 
        activeFile.name.toLowerCase().endsWith(".heif") ||
        activeFile.type === "image/heic" || 
        activeFile.type === "image/heif";

    if (isHEIC) {
        try {
            // Dynamic import because heic2any relies on browser APIs (Blob, URL)
            const heic2any = (await import("heic2any")).default;
            const conversionResult = await heic2any({
                blob: activeFile,
                toType: "image/jpeg",
                quality: 0.95, // Visually lossless quality
            });
            const resultBlob = Array.isArray(conversionResult) ? conversionResult[0] : conversionResult;
            const newName = activeFile.name.replace(/\.(heic|heif)$/i, ".jpg");
            activeFile = new File([resultBlob], newName, { type: "image/jpeg" });
        } catch (err) {
            console.error("HEIC conversion failed, proceeding with original file", err);
        }
    }

    // 2. Perform canvas-based JPEG quality preservation compression if it's an image
    if (activeFile.type.startsWith("image/")) {
        try {
            activeFile = await compressImageLossless(activeFile);
        } catch (err) {
            console.error("Image compression failed, proceeding with original file", err);
        }
    }

    return activeFile;
}

function compressImageLossless(file: File): Promise<File> {
    return new Promise((resolve, reject) => {
        const image = new Image();
        image.src = URL.createObjectURL(file);
        image.onload = () => {
            URL.revokeObjectURL(image.src);

            const canvas = document.createElement("canvas");
            let width = image.width;
            let height = image.height;

            // Downscale ONLY if extremely large (e.g. > 3072px on longest side)
            // 3072px is ultra-high resolution (above 2K and close to 4K), preserving absolute premium quality
            const MAX_DIM = 3072;
            if (width > MAX_DIM || height > MAX_DIM) {
                if (width > height) {
                    height = Math.round((height * MAX_DIM) / width);
                    width = MAX_DIM;
                } else {
                    width = Math.round((width * MAX_DIM) / height);
                    height = MAX_DIM;
                }
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext("2d");
            if (!ctx) {
                resolve(file);
                return;
            }

            ctx.drawImage(image, 0, 0, width, height);

            // Export to JPEG with 92% quality (visually indistinguishable from original, but drastically smaller size)
            canvas.toBlob(
                (blob) => {
                    if (blob) {
                        const compressedFile = new File([blob], file.name.replace(/\.[^.]+$/, ".jpg"), {
                            type: "image/jpeg",
                            lastModified: Date.now(),
                        });
                        // Only return compressed if it's actually smaller (to avoid compressing small files further)
                        if (compressedFile.size < file.size) {
                            resolve(compressedFile);
                        } else {
                            resolve(file);
                        }
                    } else {
                        resolve(file);
                    }
                },
                "image/jpeg",
                0.92
            );
        };
        image.onerror = (err) => {
            reject(err);
        };
    });
}
