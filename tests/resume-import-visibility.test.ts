import { describe, it, expect } from "vitest";
import { formatResumeDataToText } from "../src/utils/formatResume";

describe("Resume Import Visibility Filter", () => {
    const mockResumeData = {
        personalInfo: {
            name: "John Doe",
            title: "Senior Full Stack Engineer",
            email: "john@example.com",
            phone: "+1 555-123-4567",
            location: "San Francisco, CA",
            summary: "Experienced software engineer specializing in scalable cloud applications."
        },
        workExperience: [
            {
                id: "exp-1",
                company: "Acme Corp",
                position: "Senior Engineer",
                startDate: "2021",
                endDate: "Present",
                current: true,
                description: "Built microservices using Node.js.",
                hidden: false
            },
            {
                id: "exp-2",
                company: "Old Startup",
                position: "Junior Developer",
                startDate: "2019",
                endDate: "2021",
                current: false,
                description: "Maintained legacy codebase.",
                hidden: true // hidden item
            }
        ],
        education: [
            {
                id: "edu-1",
                institution: "Tech University",
                degree: "B.S.",
                fieldOfStudy: "Computer Science",
                startDate: "2015",
                endDate: "2019",
                hidden: false
            },
            {
                id: "edu-2",
                institution: "Online BootCamp",
                degree: "Certificate",
                fieldOfStudy: "Web Dev",
                hidden: true // hidden item
            }
        ],
        skills: [
            { id: "s-1", name: "TypeScript", level: "Advanced", hidden: false },
            { id: "s-2", name: "COBOL", level: "Beginner", hidden: true } // hidden skill
        ],
        projects: [
            { id: "p-1", name: "CloudPlatform", description: "A cloud platform", hidden: false },
            { id: "p-2", name: "SecretProject", description: "Confidential", hidden: true }
        ],
        languages: [
            { id: "l-1", name: "English", proficiency: "Native", hidden: false },
            { id: "l-2", name: "Klingon", proficiency: "Basic", hidden: true }
        ],
        certifications: [
            { id: "c-1", name: "AWS Certified Solutions Architect", issuer: "Amazon", date: "2023", hidden: false },
            { id: "c-2", name: "Expired Cert", issuer: "Old Org", date: "2018", hidden: true }
        ],
        customSections: [
            {
                id: "cs-1",
                title: "Patents",
                items: [
                    { id: "cs-i1", title: "Distributed Consensus Algorithm", hidden: false },
                    { id: "cs-i2", title: "Unpublished Idea", hidden: true }
                ]
            }
        ]
    };

    it("excludes entire sections when section-level visibility is toggled off", () => {
        const styleWithHiddenExp = {
            visibleSections: {
                experience: false,
                summary: true,
                education: true,
                skills: true,
                projects: true,
                languages: true,
                certifications: true
            }
        };

        const result = formatResumeDataToText(mockResumeData, styleWithHiddenExp);

        expect(result).not.toContain("Work Experience:");
        expect(result).not.toContain("Acme Corp");
        expect(result).toContain("Education:");
        expect(result).toContain("Tech University");
        expect(result).toContain("Skills:");
        expect(result).toContain("TypeScript");
    });

    it("filters out individual items marked with hidden: true within visible sections", () => {
        const defaultStyle = {
            visibleSections: {
                experience: true,
                education: true,
                skills: true,
                projects: true,
                languages: true,
                certifications: true
            }
        };

        const result = formatResumeDataToText(mockResumeData, defaultStyle);

        // Visible items should appear
        expect(result).toContain("Acme Corp");
        expect(result).toContain("Tech University");
        expect(result).toContain("TypeScript");
        expect(result).toContain("CloudPlatform");
        expect(result).toContain("English");
        expect(result).toContain("AWS Certified Solutions Architect");
        expect(result).toContain("Distributed Consensus Algorithm");

        // Hidden items MUST NOT appear
        expect(result).not.toContain("Old Startup");
        expect(result).not.toContain("Online BootCamp");
        expect(result).not.toContain("COBOL");
        expect(result).not.toContain("SecretProject");
        expect(result).not.toContain("Klingon");
        expect(result).not.toContain("Expired Cert");
        expect(result).not.toContain("Unpublished Idea");
    });

    it("excludes summary when visibleSections.summary is false", () => {
        const style = {
            visibleSections: {
                summary: false
            }
        };

        const result = formatResumeDataToText(mockResumeData, style);
        expect(result).not.toContain("Professional Summary:");
        expect(result).not.toContain("Experienced software engineer specializing in scalable cloud applications.");
    });
});
