import { NextRequest, NextResponse } from "next/server";
import { isS3Configured, getJSON } from "@/utils/s3";
import seedCatalog from "@/data/studyMaterialsSeed.json";

const CATALOG_KEY = "study-materials/index.json";

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = new URL(req.url);
        const courseId = searchParams.get("course");
        const subjectId = searchParams.get("subject");
        const chapterId = searchParams.get("chapter");

        // If specific chapter requested, return its content pages
        if (courseId && subjectId && chapterId) {
            const key = `study-materials/${courseId}/${subjectId}/${chapterId}/content.json`;
            if (!isS3Configured()) {
                return NextResponse.json({ pages: [] });
            }
            try {
                const data = await getJSON<{ pages: any[] }>(key);
                return NextResponse.json({ pages: data.pages || [] });
            } catch (err) {
                return NextResponse.json({ pages: [] });
            }
        }

        // Otherwise, return the main catalog index
        if (!isS3Configured()) {
            return NextResponse.json({ catalog: seedCatalog, s3Configured: false });
        }
        try {
            const catalog = await getJSON<any[]>(CATALOG_KEY);
            return NextResponse.json({ catalog, s3Configured: true });
        } catch (err) {
            return NextResponse.json({ catalog: seedCatalog, s3Configured: true, fallback: true });
        }
    } catch (error: any) {
        return NextResponse.json(
            { error: error?.message || "Failed to retrieve study materials" },
            { status: 500 }
        );
    }
}

function getMockPages(courseId: string, subjectId: string, chapterId: string) {
    const formattedChapter = chapterId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    const formattedSubject = subjectId.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase());
    
    return [
        {
            left: {
                title: `1. Introduction to ${formattedChapter}`,
                content: `
                    <h3>Overview</h3>
                    <p>Welcome to the study manual on <strong>${formattedChapter}</strong> under the <strong>${formattedSubject}</strong> course category.</p>
                    <p>This chapter covers the fundamental architectural concepts, time complexity bounds, and core operations of ${formattedChapter}. Make sure to review the diagrams and execute practice problems in the coding lab.</p>
                    <h3>Core Objectives</h3>
                    <ul>
                        <li>Understand basic memory layout and pointer references.</li>
                        <li>Analyze worst-case and average-case time complexities.</li>
                        <li>Implement standard traversal, insertion, and deletion algorithms.</li>
                    </ul>
                `
            },
            right: {
                title: `2. Theoretical Framework`,
                content: `
                    <h3>Mathematical Model</h3>
                    <p>The operational logic of ${formattedChapter} is mathematically defined by its data relations and structural invariant constraints.</p>
                    <p>For instance, let $S$ be the structural state of the collection. The operations are bounded by asymptotic constraints that prevent runtime regression.</p>
                    <h3>Common Implementations</h3>
                    <p>Modern compilers optimize these structures using contiguous allocation buffers, register cache lines, or linked heap blocks depending on target CPU architecture.</p>
                `
            }
        },
        {
            left: {
                title: `3. Key Operations`,
                content: `
                    <h3>Insertion & Deletion</h3>
                    <p>Inserting elements into ${formattedChapter} typically requires adjusting pointers or shifting items depending on structural constraints.</p>
                    <p>For a structure of size $N$, insertion complexity is bounded by $O(1)$ in the best case and $O(N)$ in the worst case (e.g. array resizing or tree degeneration).</p>
                    <h3>Search Algorithms</h3>
                    <p>Finding elements in ${formattedChapter} can be performed using linear scan, binary search tree traversal, or direct index offset mapping (hash functions).</p>
                `
            },
            right: {
                title: `4. Performance Optimization`,
                content: `
                    <h3>Cache Locality</h3>
                    <p>Cache friendliness is a key differentiator between contiguous and non-contiguous implementations. Structures like arrays benefit from spatial locality, whereas linked trees might cause cache misses.</p>
                    <h3>Space-Time Trade-offs</h3>
                    <p>Using additional memory pointers or indexes can reduce lookup times from $O(N)$ to $O(1)$ at the cost of higher storage overhead and garbage collection frequency.</p>
                `
            }
        },
        {
            left: {
                title: `5. Advanced Applications`,
                content: `
                    <h3>Practical System Design</h3>
                    <p>In large-scale production platforms, ${formattedChapter} forms the foundation of key systems including database indices, CPU job queues, routing tables, and memory managers.</p>
                    <h3>Typical Interview Questions</h3>
                    <p>During technical screening rounds, candidates are frequently asked to reverse, rebalance, merge, or detect loops/cycles inside these data configurations.</p>
                `
            },
            right: {
                title: `6. Summary & Checklist`,
                content: `
                    <h3>Chapter Summary</h3>
                    <p>You have completed the core readings for <strong>${formattedChapter}</strong>. Practice implementing these models directly from scratch to build intuition.</p>
                    <h3>Self-Review Checklist</h3>
                    <ol>
                        <li>Can you write the insertion and lookup logic without using libraries?</li>
                        <li>Do you understand the difference between spatial and temporal complexities?</li>
                        <li>Can you debug common edge cases (empty inputs, single nodes, index out of bounds)?</li>
                    </ol>
                `
            }
        }
    ];
}

