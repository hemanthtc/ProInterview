export interface LocalFaceEstimate {
    faceVisible: boolean;
    skinRatio: number;
    expressionGuess: "neutral" | "focused" | "no_face";
}

type PixelBuffer = Pick<ImageData, "data" | "width" | "height">;

/** Lightweight skin-tone presence check used when Gemini is unavailable. */
export function estimateFaceFromImageData(imageData: PixelBuffer): LocalFaceEstimate {
    const { data, width, height } = imageData;
    const x0 = Math.floor(width * 0.25);
    const y0 = Math.floor(height * 0.15);
    const x1 = Math.floor(width * 0.75);
    const y1 = Math.floor(height * 0.85);
    let skin = 0;
    let total = 0;
    for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
            const idx = (y * width + x) * 4;
            const r = data[idx];
            const g = data[idx + 1];
            const b = data[idx + 2];
            if (r > 60 && g > 40 && b > 20 && r > g && r > b && Math.abs(r - g) > 15 && r - b > 15) {
                skin++;
            }
            total++;
        }
    }
    const skinRatio = total ? skin / total : 0;
    const faceVisible = skinRatio >= 0.05;
    return {
        faceVisible,
        skinRatio,
        expressionGuess: faceVisible ? "focused" : "no_face",
    };
}

export function captureJpegDataUrl(video: HTMLVideoElement, canvas: HTMLCanvasElement, quality = 0.45): string | null {
    if (!video.videoWidth) return null;
    canvas.width = 160;
    canvas.height = 120;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return null;
    ctx.drawImage(video, 0, 0, 160, 120);
    return canvas.toDataURL("image/jpeg", quality);
}
