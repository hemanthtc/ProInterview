import { extractResumeDocument } from "./documentExtractor";
import { extractSemanticResume } from "./semanticExtractor";
import { validateAndRepairAgainstSource } from "./sourceValidator";
import { mapCanonicalToResumeData } from "./templateMapper";
import { CanonicalResume, DocumentExtractionResult, MergePolicy } from "./types";
import { ResumeData } from "@/components/prointerviewer/types";

export * from "./types";
export * from "./documentExtractor";
export * from "./sectionDetector";
export * from "./educationClassifier";
export * from "./semanticExtractor";
export * from "./sourceValidator";
export * from "./templateMapper";

export interface ParseResumeOptions {
    file?: File | Blob;
    fileName?: string;
    resumeText?: string;
    resumeUrl?: string;
    existingResume?: ResumeData | null;
    mergePolicy?: MergePolicy;
}

export interface ParseResumeResult {
    canonical: CanonicalResume;
    mappedResumeData: ResumeData;
    warnings: CanonicalResume["metadata"]["warnings"];
    isScanned: boolean;
    isFallback?: boolean;
    recordCounts: CanonicalResume["metadata"]["recordCounts"];
}

/**
 * Unified pipeline entry point for end-to-end resume extraction, validation, and template mapping:
 * UPLOAD -> EXTRACT -> DETECT SECTIONS -> CLASSIFY MEANING -> STRUCTURED RECORDS -> VALIDATE AGAINST SOURCE -> MAP TO TEMPLATE
 */
export async function parseResumePipeline(options: ParseResumeOptions): Promise<ParseResumeResult> {
    const { file, fileName, resumeText, existingResume, mergePolicy = "replace" } = options;

    let docResult: DocumentExtractionResult;

    if (file) {
        docResult = await extractResumeDocument(file, fileName || (file as File).name);
    } else if (resumeText && resumeText.trim()) {
        docResult = {
            rawText: resumeText.trim(),
            sourceFormat: "text",
            extractionMethod: "plain-text",
            isScanned: false,
            warnings: []
        };
    } else {
        throw new Error("No resume file or resume text provided for parsing.");
    }

    // Semantic extraction via Gemini (or deterministic fallback)
    const rawCanonical = await extractSemanticResume(docResult);

    // Cross-validate and repair against original source text
    const validatedCanonical = validateAndRepairAgainstSource(rawCanonical, docResult.rawText);

    // Map into ProInterview ResumeData schema
    const mappedResumeData = mapCanonicalToResumeData(validatedCanonical, existingResume, mergePolicy);

    return {
        canonical: validatedCanonical,
        mappedResumeData,
        warnings: validatedCanonical.metadata.warnings,
        isScanned: validatedCanonical.metadata.isScanned,
        isFallback: validatedCanonical.metadata.isFallback,
        recordCounts: validatedCanonical.metadata.recordCounts
    };
}
