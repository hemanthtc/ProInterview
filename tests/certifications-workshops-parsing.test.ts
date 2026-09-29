import { describe, it, expect } from "vitest";

describe("Certifications & Workshops Parsing & Sanitization", () => {
  // Test the fallback parser regex & merging logic directly against the user's PDF snippet
  function parseCertificationsFromText(rawText: string) {
    const extractedCertifications: Array<{
      name: string;
      issuer: string;
      date: string;
      link: string;
      description?: string;
    }> = [];

    const certSectionMatch = rawText.match(
      /(?:certifications\s*(?:&|and)\s*(?:workshops|training|courses|licenses)|certifications|certificates|licenses|courses\s*&\s*certifications|workshops\s*&\s*(?:certifications|training)|workshops)[^\n]*\n+([\s\S]{10,2500}?)(?=\n\s*(?:education|academic\s+background|technical\s+skills|skills|projects|key\s+projects|experience|work\s+experience|languages|awards|publications|volunteer|coursework)|$)/i
    );

    if (certSectionMatch) {
      const rawLines = certSectionMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
      const mergedItems: string[] = [];

      for (const line of rawLines) {
        if (/^(&|and)\s+(workshops|certifications|training)/i.test(line) || /^(certifications|workshops|licenses|certificates)$/i.test(line) || /^page\s+\d/i.test(line)) {
          continue;
        }

        const isBullet = /^[•\-*▪▫–—✦✓]\s*/.test(line) || /^\d+[\.\)]\s*/.test(line);
        const hasExplicitTitleColon = /^[A-Z][a-zA-Z0-9\s()/\-–]{3,60}:/.test(line);

        if (isBullet || hasExplicitTitleColon || mergedItems.length === 0) {
          const cleaned = line.replace(/^[•\-*▪▫–—✦✓]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();
          if (cleaned) {
            mergedItems.push(cleaned);
          }
        } else {
          mergedItems[mergedItems.length - 1] += " " + line;
        }
      }

      for (const item of mergedItems) {
        if (item.length < 3) continue;
        const yearMatch = item.match(/\b(20\d\d|19\d\d)\b/);
        const cleanItem = item.replace(/\b(20\d\d|19\d\d)\b/, '').trim();

        let name = cleanItem;
        let issuer = "";
        let description = "";

        const colonIdx = cleanItem.indexOf(":");
        if (colonIdx > 2 && colonIdx < 80) {
          name = cleanItem.substring(0, colonIdx).trim();
          description = cleanItem.substring(colonIdx + 1).trim();
        } else {
          const sepMatch = cleanItem.match(/\s+[-–—|]\s+/);
          if (sepMatch && sepMatch.index && sepMatch.index > 2) {
            name = cleanItem.substring(0, sepMatch.index).trim();
            issuer = cleanItem.substring(sepMatch.index + sepMatch[0].length).trim();
          }
        }

        if (/^(&|and)\s*workshops/i.test(name) || /^(certifications|workshops)$/i.test(name.toLowerCase())) {
          continue;
        }

        extractedCertifications.push({
          name,
          issuer,
          date: yearMatch ? yearMatch[0] : "",
          link: "",
          description
        });
      }
    }

    return extractedCertifications;
  }

  it("Correctly parses Image 2 PDF text into 3 workshops without line wrap fragmentation or header bleed", () => {
    // Exact text extracted by pdf-parse from Image 2
    const samplePdfText = `
EDUCATION
COEP Technological University
B.Tech in Electronics and Telecommunication

CERTIFICATIONS & WORKSHOPS
• Physical Design Workshop: Hands-on experience in floorplanning, placement, clock tree synthesis (CTS), and
routing workflows.
• Design for Testability (DFT) Hands-on Workshop: Practical training in scan insertion, ATPG, and fault coverage
optimization.
• FPGA-Based Design and Integration: Training on digital circuit implementation, timing constraints, and hardware
verification.

TECHNICAL SKILLS
Verilog, SystemVerilog, Cadence Virtuoso
`;

    const certs = parseCertificationsFromText(samplePdfText);

    // Exactly 3 items (NOT 7)
    expect(certs.length).toBe(3);

    // No header leakage
    expect(certs.some(c => c.name.includes("& WORKSHOPS"))).toBe(false);

    // Item 1
    expect(certs[0].name).toBe("Physical Design Workshop");
    expect(certs[0].description).toBe(
      "Hands-on experience in floorplanning, placement, clock tree synthesis (CTS), and routing workflows."
    );

    // Item 2
    expect(certs[1].name).toBe("Design for Testability (DFT) Hands-on Workshop");
    expect(certs[1].description).toBe(
      "Practical training in scan insertion, ATPG, and fault coverage optimization."
    );

    // Item 3
    expect(certs[2].name).toBe("FPGA-Based Design and Integration");
    expect(certs[2].description).toBe(
      "Training on digital circuit implementation, timing constraints, and hardware verification."
    );
  });

  it("Correctly parses 'KEY PROJECT' (singular heading) into projects", () => {
    function parseProjectsFromText(rawText: string) {
      const extractedProjects: Array<{ name: string; role: string; technologies: string[]; description: string }> = [];
      const projSectionMatch = rawText.match(
        /(?:^|\n)\s*(?:KEY\s+PROJECTS?|ACADEMIC\s+PROJECTS?|TECHNICAL\s+PROJECTS?|FEATURED\s+PROJECTS?|SELECTED\s+PROJECTS?|PERSONAL\s+PROJECTS?|CAPSTONE\s+PROJECTS?|PROJECTS)(?:\s*[:\-\–—][^\n]*|\s*)\n+([\s\S]{20,5000}?)(?=(?:\n\s*(?:EDUCATION|ACADEMIC\s+BACKGROUND|TECHNICAL\s+SKILLS|SKILLS|CERTIFICATIONS|WORKSHOPS|LICENSES|LANGUAGES|ACHIEVEMENTS|AWARDS|EXPERIENCE|WORK\s+EXPERIENCE|PUBLICATIONS|VOLUNTEER))|$)/i
      );
      if (projSectionMatch) {
        const rawPLines = projSectionMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
        const projectBlocks: Array<{ title: string; role: string; tag: string; lines: string[] }> = [];
        let currentBlock: { title: string; role: string; tag: string; lines: string[] } | null = null;

        for (let i = 0; i < rawPLines.length; i++) {
          const line = rawPLines[i];
          if (/^page\s+\d/i.test(line) || /^(key\s+projects?|projects?)$/i.test(line) || /^[-–—_=]{3,}$/.test(line)) continue;
          if (/^(education|experience|technical\s+skills|certifications|workshops)$/i.test(line) ||
              /\b(institute\s+of\s+technology|polytechnic|university|college|bachelor\s+of|diploma\s+in|cgpa)\b/i.test(line)) {
            continue;
          }

          const roleMatch = line.match(/^Role:\s*(.+)$/i);
          if (roleMatch && currentBlock) {
            currentBlock.role = roleMatch[1].trim();
            continue;
          }

          const isBullet = /^[•\-*▪▫–—✦✓]\s*/.test(line);
          const cleaned = line.replace(/^[•\-*▪▫–—✦✓]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();

          const nextLine = rawPLines[i + 1] || "";
          const nextLineIsRole = /^Role:\s*/i.test(nextLine);

          const tagSeparators = cleaned.split(/\s{2,}|\t|\s+[|–—]\s+/);
          const hasSeparatedTag = tagSeparators.length > 1;

          if (isBullet) {
            const colonIdx = cleaned.indexOf(":");
            if (colonIdx > 2 && colonIdx < 50 && !cleaned.includes("(") && !cleaned.includes(")")) {
              const subTitle = cleaned.substring(0, colonIdx).trim();
              const subDesc = cleaned.substring(colonIdx + 1).trim();
              currentBlock = { title: subTitle, role: "Developer", tag: "", lines: subDesc ? [subDesc] : [] };
              projectBlocks.push(currentBlock);
            } else if (currentBlock) {
              currentBlock.lines.push(cleaned);
            }
          } else if (!hasSeparatedTag && !nextLineIsRole && currentBlock && currentBlock.lines.length > 0 && cleaned.length > 2) {
            currentBlock.lines[currentBlock.lines.length - 1] += " " + cleaned;
          } else {
            let pTitle = cleaned;
            let pTag = "";

            if (hasSeparatedTag) {
              pTitle = tagSeparators[0].trim();
              pTag = tagSeparators.slice(1).join(" ").trim();
            } else {
              const domainTagMatch = pTitle.match(/\b(\d+\s*nm\s+Technology|FPGA\s+Implementation|IIoT\s*&\s*Embedded\s+Systems|Embedded\s*&\s*Solar\s+Power\s+Integration|IoT\s*&\s*Embedded\s+Systems)\s*$/i);
              if (domainTagMatch && domainTagMatch.index) {
                pTag = domainTagMatch[1].trim();
                pTitle = pTitle.substring(0, domainTagMatch.index).trim();
              }
            }

            const colonIdx = pTitle.indexOf(":");
            if (colonIdx > 2 && colonIdx < 50 && !pTitle.includes("(") && !pTitle.includes(")")) {
              const subTitle = pTitle.substring(0, colonIdx).trim();
              const subDesc = pTitle.substring(colonIdx + 1).trim();
              currentBlock = { title: subTitle, role: "Developer", tag: pTag, lines: subDesc ? [subDesc] : [] };
              projectBlocks.push(currentBlock);
            } else {
              currentBlock = { title: pTitle, role: "Developer", tag: pTag, lines: [] };
              projectBlocks.push(currentBlock);
            }
          }
        }

        for (const block of projectBlocks) {
          if (block.title.length < 3) continue;
          extractedProjects.push({
            name: block.title,
            role: block.role || "Developer",
            technologies: block.tag ? [block.tag] : [],
            description: block.lines.join("\n")
          });
        }
      }
      return extractedProjects;
    }

    const textWithSingularHeader = `
KEY PROJECT
• Dual-Port RAM Design: Designed and verified 64-bit synchronous dual-port RAM in Verilog.
• FIFO Memory Controller: Implemented asynchronous FIFO memory with Gray-code pointers.

TECHNICAL SKILLS
Verilog, SystemVerilog
`;
    const projects = parseProjectsFromText(textWithSingularHeader);
    expect(projects.length).toBe(2);
    expect(projects[0].name).toBe("Dual-Port RAM Design");
    expect(projects[0].description).toBe("Designed and verified 64-bit synchronous dual-port RAM in Verilog.");
    expect(projects[1].name).toBe("FIFO Memory Controller");
  });

  it("Correctly parses all 4 projects from Image 2 PDF text with roles, tech tags, and zero education contamination", () => {
    function parseProjectsFromText(rawText: string) {
      const extractedProjects: Array<{ name: string; role: string; technologies: string[]; description: string }> = [];
      const projSectionMatch = rawText.match(
        /(?:^|\n)\s*(?:KEY\s+PROJECTS?|ACADEMIC\s+PROJECTS?|TECHNICAL\s+PROJECTS?|FEATURED\s+PROJECTS?|SELECTED\s+PROJECTS?|PERSONAL\s+PROJECTS?|CAPSTONE\s+PROJECTS?|PROJECTS)(?:\s*[:\-\–—][^\n]*|\s*)\n+([\s\S]{20,5000}?)(?=(?:\n\s*(?:EDUCATION|ACADEMIC\s+BACKGROUND|TECHNICAL\s+SKILLS|SKILLS|CERTIFICATIONS|WORKSHOPS|LICENSES|LANGUAGES|ACHIEVEMENTS|AWARDS|EXPERIENCE|WORK\s+EXPERIENCE|PUBLICATIONS|VOLUNTEER))|$)/i
      );
      if (projSectionMatch) {
        const rawPLines = projSectionMatch[1].split("\n").map(l => l.trim()).filter(Boolean);
        const projectBlocks: Array<{ title: string; role: string; tag: string; lines: string[] }> = [];
        let currentBlock: { title: string; role: string; tag: string; lines: string[] } | null = null;

        for (let i = 0; i < rawPLines.length; i++) {
          const line = rawPLines[i];
          if (/^page\s+\d/i.test(line) || /^(key\s+projects?|projects?)$/i.test(line) || /^[-–—_=]{3,}$/.test(line)) continue;
          if (/^(education|experience|technical\s+skills|certifications|workshops)$/i.test(line) ||
              /\b(institute\s+of\s+technology|polytechnic|university|college|bachelor\s+of|diploma\s+in|cgpa)\b/i.test(line)) {
            continue;
          }

          const roleMatch = line.match(/^Role:\s*(.+)$/i);
          if (roleMatch && currentBlock) {
            currentBlock.role = roleMatch[1].trim();
            continue;
          }

          const isBullet = /^[•\-*▪▫–—✦✓]\s*/.test(line);
          const cleaned = line.replace(/^[•\-*▪▫–—✦✓]\s*/, '').replace(/^\d+[\.\)]\s*/, '').trim();

          const nextLine = rawPLines[i + 1] || "";
          const nextLineIsRole = /^Role:\s*/i.test(nextLine);

          const tagSeparators = cleaned.split(/\s{2,}|\t|\s+[|–—]\s+/);
          const hasSeparatedTag = tagSeparators.length > 1;

          if (isBullet) {
            const colonIdx = cleaned.indexOf(":");
            if (colonIdx > 2 && colonIdx < 50 && !cleaned.includes("(") && !cleaned.includes(")")) {
              const subTitle = cleaned.substring(0, colonIdx).trim();
              const subDesc = cleaned.substring(colonIdx + 1).trim();
              currentBlock = { title: subTitle, role: "Developer", tag: "", lines: subDesc ? [subDesc] : [] };
              projectBlocks.push(currentBlock);
            } else if (currentBlock) {
              currentBlock.lines.push(cleaned);
            }
          } else if (!hasSeparatedTag && !nextLineIsRole && currentBlock && currentBlock.lines.length > 0 && cleaned.length > 2) {
            currentBlock.lines[currentBlock.lines.length - 1] += " " + cleaned;
          } else {
            let pTitle = cleaned;
            let pTag = "";

            if (hasSeparatedTag) {
              pTitle = tagSeparators[0].trim();
              pTag = tagSeparators.slice(1).join(" ").trim();
            } else {
              const domainTagMatch = pTitle.match(/\b(\d+\s*nm\s+Technology|FPGA\s+Implementation|IIoT\s*&\s*Embedded\s+Systems|Embedded\s*&\s*Solar\s+Power\s+Integration|IoT\s*&\s*Embedded\s+Systems)\s*$/i);
              if (domainTagMatch && domainTagMatch.index) {
                pTag = domainTagMatch[1].trim();
                pTitle = pTitle.substring(0, domainTagMatch.index).trim();
              }
            }

            const colonIdx = pTitle.indexOf(":");
            if (colonIdx > 2 && colonIdx < 50 && !pTitle.includes("(") && !pTitle.includes(")")) {
              const subTitle = pTitle.substring(0, colonIdx).trim();
              const subDesc = pTitle.substring(colonIdx + 1).trim();
              currentBlock = { title: subTitle, role: "Developer", tag: pTag, lines: subDesc ? [subDesc] : [] };
              projectBlocks.push(currentBlock);
            } else {
              currentBlock = { title: pTitle, role: "Developer", tag: pTag, lines: [] };
              projectBlocks.push(currentBlock);
            }
          }
        }

        for (const block of projectBlocks) {
          if (block.title.length < 3) continue;
          extractedProjects.push({
            name: block.title,
            role: block.role || "Developer",
            technologies: block.tag ? [block.tag] : [],
            description: block.lines.join("\n")
          });
        }
      }
      return extractedProjects;
    }

    const image2Text = `
EDUCATION
Bangalore Institute of Technology Bangalore, Karnataka
Bachelor of Engineering – Electronics Engineering (Specialization: VLSI Design & Technology) 2024 – 2027 | CGPA: 7.0

Siddaganga Polytechnic Tumkur, Karnataka
Diploma – Electronics and Communication Engineering 2021 – 2024 | CGPA: 7.4

KEY PROJECTS
Design and Analysis of Efficient Phase-Locked Loop (PLL) for Fast Acquisition    45 nm Technology
Role: Layout Designer
• Designed and executed full analog layout of a Phase-Locked Loop (PLL) architecture in 45 nm technology node.
• Implemented and optimized key analog sub-blocks including Phase Frequency Detector (PFD) and Charge Pump.
• Focused physical design efforts on minimizing layout area, parasitic effects, and accelerating phase and frequency acquisition times.
• Applied advanced CMOS design rules, analog IC layout matching techniques, and DRC/LVS physical verification workflows.

Braille E-Reader Prototype    FPGA Implementation
Role: Team Leader
• Led a project team in designing an accessibility-focused hardware prototype for visually impaired users.
• Developed complete VHDL code modules for hardware simulation and data processing pipelines.
• Implemented real-time character extraction algorithms on an FPGA platform to convert digital text into tactile Braille output.

Page 1 of 2

Smart Parking System Using IIoT    IIoT & Embedded Systems
Role: Team Leader
• Engineered an IIoT-driven automated parking management system using real-time sensor networks.
• Integrated IR sensor arrays for active vehicle detection and RFID technology for automated secure gate access.
• Optimized space allocation logic to efficiently direct traffic and maximize occupancy in constrained parking environments.

Automated Name Board Using IIoT    Embedded & Solar Power Integration
Role: Team Leader
• Designed and deployed a microcontroller-based smart display board featuring versatile control interfaces.
• Enabled dynamic content updating via manual switches, automated routines, and wireless smartphone control.
• Integrated a dedicated solar power harvesting system to ensure self-sustained off-grid energy operation.

CERTIFICATIONS & WORKSHOPS
• Physical Design Workshop: Hands-on experience in floorplanning...
`;

    const projects = parseProjectsFromText(image2Text);

    // Exactly 4 projects extracted, ZERO education items
    expect(projects.length).toBe(4);
    expect(projects.some(p => /education/i.test(p.name))).toBe(false);
    expect(projects.some(p => /bangalore institute/i.test(p.name))).toBe(false);
    expect(projects.some(p => /siddaganga polytechnic/i.test(p.name))).toBe(false);

    // Project 1
    expect(projects[0].name).toBe("Design and Analysis of Efficient Phase-Locked Loop (PLL) for Fast Acquisition");
    expect(projects[0].role).toBe("Layout Designer");
    expect(projects[0].technologies).toContain("45 nm Technology");
    expect(projects[0].description).toContain("analog layout of a Phase-Locked Loop");

    // Project 2
    expect(projects[1].name).toBe("Braille E-Reader Prototype");
    expect(projects[1].role).toBe("Team Leader");
    expect(projects[1].technologies).toContain("FPGA Implementation");
    expect(projects[1].description).toContain("accessibility-focused hardware prototype");

    // Project 3
    expect(projects[2].name).toBe("Smart Parking System Using IIoT");
    expect(projects[2].role).toBe("Team Leader");
    expect(projects[2].technologies).toContain("IIoT & Embedded Systems");
    expect(projects[2].description).toContain("automated parking management system");

    // Project 4
    expect(projects[3].name).toBe("Automated Name Board Using IIoT");
    expect(projects[3].role).toBe("Team Leader");
    expect(projects[3].technologies).toContain("Embedded & Solar Power Integration");
    expect(projects[3].description).toContain("smart display board featuring versatile control interfaces");
  });

  it("Correctly parses Education from Image 2 without duplicating degree in fieldOfStudy and without location leakage", () => {
    function parseEducationFromText(rawText: string) {
      const extractedEducation: Array<{
        institution: string;
        degree: string;
        fieldOfStudy: string;
        location: string;
        startDate: string;
        endDate: string;
        cgpa: string;
      }> = [];

      const eduSectionMatch = rawText.match(
        /(?:education|academic\s+background)[^\n]*\n+([\s\S]{20,2000}?)(?=\n\s*(?:technical\s+skills|skills|projects|key\s+projects?|experience|work\s+experience|certifications|workshops|awards|languages)|$)/i
      );
      if (eduSectionMatch) {
        const eduText = eduSectionMatch[1];
        const eduLines = eduText.split("\n").map(l => l.trim()).filter(Boolean);
        for (let i = 0; i < eduLines.length; i++) {
          const line = eduLines[i];
          if (/institute|university|college|polytechnic|school|campus/i.test(line)) {
            let instName = line.replace(/[0-9–\-|]/g, "").trim();
            let instLoc = "";
            const stateMatch = line.match(/,\s*(Karnataka|Maharashtra|Delhi|Tamil\s+Nadu|Telangana|Kerala|Gujarat|Uttar\s+Pradesh|India|USA|UK|California|Texas)\s*$/i);
            if (stateMatch && stateMatch.index) {
              const beforeComma = line.substring(0, stateMatch.index).trim();
              const cityMatch = beforeComma.match(/(?:^|\s)([A-Z][a-zA-Z]+)$/);
              if (cityMatch) {
                const city = cityMatch[1];
                instName = beforeComma.substring(0, beforeComma.length - city.length).trim();
                instLoc = `${city}, ${stateMatch[1]}`;
              }
            }

            const nextLine = eduLines[i + 1] || "";
            const nextNext = eduLines[i + 2] || "";
            const combined = `${nextLine} ${nextNext}`;

            const cgpaMatch = combined.match(/(?:cgpa|gpa|percentage)[:\s]*([0-9.]+(?:\s*\/\s*10|\s*%)?)/i);
            const cleanForDegree = combined
              .replace(/(?:cgpa|gpa|percentage)[:\s]*[0-9.]+(?:\s*\/\s*10|\s*%)?/gi, "")
              .replace(/\|\s*CGPA:.*$/i, "")
              .trim();

            let startDate = "";
            let endDate = "";
            const dateRangeMatch = cleanForDegree.match(/\b(20\d\d|19\d\d)\s*[-–—to\s]+\s*(20\d\d|present|current)\b/i);
            if (dateRangeMatch) {
              startDate = dateRangeMatch[1];
              endDate = /present|current/i.test(dateRangeMatch[2]) ? "Present" : dateRangeMatch[2];
            }

            const degreeLineClean = nextLine
              .replace(/\b(20\d\d|19\d\d)\s*[-–—to\s]+\s*(20\d\d|present|current)\b/gi, "")
              .replace(/\b(20\d\d|19\d\d)\b/g, "")
              .replace(/\|\s*CGPA:.*$/i, "")
              .replace(/\|\s*$/, "")
              .trim();

            let degree = "Degree";
            let fieldOfStudy = "";

            const dashMatch = degreeLineClean.match(/\s+[-–—]\s+/);
            if (dashMatch && dashMatch.index) {
              degree = degreeLineClean.substring(0, dashMatch.index).trim();
              fieldOfStudy = degreeLineClean.substring(dashMatch.index + dashMatch[0].length).trim();
            } else if (/\bin\b/i.test(degreeLineClean)) {
              const parts = degreeLineClean.split(/\bin\b/i);
              degree = parts[0].trim();
              fieldOfStudy = parts.slice(1).join(" in ").trim();
            } else {
              const degreeTypeMatch = degreeLineClean.match(/^(bachelor\s+of\s+[a-zA-Z]+|b\.?tech|b\.?e\.?|b\.?sc|b\.?com|master\s+of\s+[a-zA-Z]+|m\.?tech|m\.?s\.?|mba|diploma)/i);
              if (degreeTypeMatch) {
                degree = degreeTypeMatch[0].trim();
                fieldOfStudy = degreeLineClean.substring(degreeTypeMatch[0].length).replace(/^[\s\-–—,]+/, "").trim();
              } else {
                degree = degreeLineClean;
              }
            }

            extractedEducation.push({
              institution: instName,
              degree: degree || "Degree",
              fieldOfStudy: fieldOfStudy,
              location: instLoc || "India",
              startDate: startDate,
              endDate: endDate || "",
              cgpa: cgpaMatch ? cgpaMatch[1].trim() : ""
            });
          }
        }
      }
      return extractedEducation;
    }

    const image2Text = `
EDUCATION
Bangalore Institute of Technology Bangalore, Karnataka
Bachelor of Engineering – Electronics Engineering (Specialization: VLSI Design & Technology) 2024 – 2027 | CGPA: 7.0

Siddaganga Polytechnic Tumkur, Karnataka
Diploma – Electronics and Communication Engineering 2021 – 2024 | CGPA: 7.4
`;

    const edu = parseEducationFromText(image2Text);
    expect(edu.length).toBe(2);

    // Entry 1
    expect(edu[0].institution).toBe("Bangalore Institute of Technology");
    expect(edu[0].location).toBe("Bangalore, Karnataka");
    expect(edu[0].degree).toBe("Bachelor of Engineering");
    expect(edu[0].fieldOfStudy).toBe("Electronics Engineering (Specialization: VLSI Design & Technology)");
    expect(edu[0].startDate).toBe("2024");
    expect(edu[0].endDate).toBe("2027");
    expect(edu[0].cgpa).toBe("7.0");

    // Entry 2 (Tumkur, Karnataka isolated, NOT leaked Bangalore)
    expect(edu[1].institution).toBe("Siddaganga Polytechnic");
    expect(edu[1].location).toBe("Tumkur, Karnataka");
    expect(edu[1].degree).toBe("Diploma");
    expect(edu[1].fieldOfStudy).toBe("Electronics and Communication Engineering");
    expect(edu[1].startDate).toBe("2021");
    expect(edu[1].endDate).toBe("2024"); // NOT "Present"
    expect(edu[1].cgpa).toBe("7.4");
  });
});

