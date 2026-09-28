import { describe, it, expect } from "vitest";

// Reconciler logic matching ProInterviewerApp.tsx handleATSOptimize
function reconcileAtsOptimization(resumeData: any, aiResult: any) {
  const updatedData = { ...resumeData };

  // 1. PersonalInfo
  updatedData.personalInfo = {
    ...resumeData.personalInfo,
    name: (aiResult.personalInfo?.name && aiResult.personalInfo.name.trim()) || resumeData.personalInfo.name,
    title: (aiResult.personalInfo?.title && aiResult.personalInfo.title.trim()) || resumeData.personalInfo.title,
    email: (aiResult.personalInfo?.email && aiResult.personalInfo.email.trim()) || resumeData.personalInfo.email,
    phone: (aiResult.personalInfo?.phone && aiResult.personalInfo.phone.trim()) || resumeData.personalInfo.phone,
    location: (aiResult.personalInfo?.location && aiResult.personalInfo.location.trim()) || resumeData.personalInfo.location,
    linkedin: (aiResult.personalInfo?.linkedin && aiResult.personalInfo.linkedin.trim()) || resumeData.personalInfo.linkedin,
    github: (aiResult.personalInfo?.github && aiResult.personalInfo.github.trim()) || resumeData.personalInfo.github,
    website: (aiResult.personalInfo?.website && aiResult.personalInfo.website.trim()) || resumeData.personalInfo.website,
    avatar: resumeData.personalInfo.avatar,
    summary: (aiResult.summary && aiResult.summary.trim()) || (aiResult.personalInfo?.summary && aiResult.personalInfo.summary.trim()) || resumeData.personalInfo.summary
  };

  // 2. Work Experience
  if (resumeData.workExperience.length > 0) {
    if (Array.isArray(aiResult.workExperience) && aiResult.workExperience.length > 0) {
      updatedData.workExperience = resumeData.workExperience.map((origJob: any, idx: number) => {
        const matched = aiResult.workExperience.find((j: any) => 
          (j.company && origJob.company && j.company.trim().toLowerCase() === origJob.company.trim().toLowerCase()) ||
          (j.id && origJob.id && j.id === origJob.id)
        ) || (aiResult.workExperience[idx] && !resumeData.workExperience.some((oj: any, oIdx: number) => oIdx !== idx && oj.company && aiResult.workExperience[idx].company && oj.company.trim().toLowerCase() === aiResult.workExperience[idx].company.trim().toLowerCase()) ? aiResult.workExperience[idx] : null);

        if (matched) {
          return {
            ...origJob,
            company: matched.company || origJob.company,
            position: matched.position || origJob.position,
            location: matched.location || origJob.location,
            startDate: matched.startDate || origJob.startDate,
            endDate: matched.endDate || origJob.endDate,
            current: matched.current !== undefined ? !!matched.current : origJob.current,
            description: (matched.description && matched.description.trim()) ? matched.description : origJob.description
          };
        }
        return origJob;
      });

      aiResult.workExperience.forEach((aiJob: any) => {
        const alreadyExists = updatedData.workExperience.some((w: any) => 
          w.company && aiJob.company && w.company.trim().toLowerCase() === aiJob.company.trim().toLowerCase()
        );
        if (!alreadyExists && (aiJob.company || aiJob.position)) {
          updatedData.workExperience.push({
            id: `exp-ats-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            company: aiJob.company || "",
            position: aiJob.position || "",
            location: aiJob.location || "",
            startDate: aiJob.startDate || "",
            endDate: aiJob.endDate || "",
            current: !!aiJob.current,
            description: aiJob.description || ""
          });
        }
      });
    } else {
      updatedData.workExperience = [...resumeData.workExperience];
    }
  } else {
    updatedData.workExperience = [];
  }

  // 3. Education
  if (resumeData.education.length > 0) {
    if (Array.isArray(aiResult.education) && aiResult.education.length > 0) {
      updatedData.education = resumeData.education.map((origEdu: any, idx: number) => {
        const matched = aiResult.education.find((e: any) => 
          (e.institution && origEdu.institution && e.institution.trim().toLowerCase() === origEdu.institution.trim().toLowerCase()) ||
          (e.degree && origEdu.degree && e.degree.trim().toLowerCase() === origEdu.degree.trim().toLowerCase()) ||
          (e.id && origEdu.id && e.id === origEdu.id)
        ) || (aiResult.education[idx] && !resumeData.education.some((oe: any, oIdx: number) => oIdx !== idx && oe.institution && aiResult.education[idx].institution && oe.institution.trim().toLowerCase() === aiResult.education[idx].institution.trim().toLowerCase()) ? aiResult.education[idx] : null);

        if (matched) {
          return {
            ...origEdu,
            institution: matched.institution || origEdu.institution,
            degree: matched.degree || origEdu.degree,
            fieldOfStudy: matched.fieldOfStudy || origEdu.fieldOfStudy,
            location: matched.location || origEdu.location,
            startDate: matched.startDate || origEdu.startDate,
            endDate: matched.endDate || origEdu.endDate,
            cgpa: matched.cgpa || origEdu.cgpa,
            percentage: matched.percentage || origEdu.percentage,
            description: matched.description || origEdu.description
          };
        }
        return origEdu;
      });
    } else {
      updatedData.education = [...resumeData.education];
    }
  }

  // 4. Projects
  if (resumeData.projects.length > 0) {
    if (Array.isArray(aiResult.projects) && aiResult.projects.length > 0) {
      updatedData.projects = resumeData.projects.map((origProj: any, idx: number) => {
        const matched = aiResult.projects.find((p: any) => 
          (p.name && origProj.name && p.name.trim().toLowerCase() === origProj.name.trim().toLowerCase()) ||
          (p.id && origProj.id && p.id === origProj.id)
        ) || (aiResult.projects[idx] && !resumeData.projects.some((op: any, oIdx: number) => oIdx !== idx && op.name && aiResult.projects[idx].name && op.name.trim().toLowerCase() === aiResult.projects[idx].name.trim().toLowerCase()) ? aiResult.projects[idx] : null);

        if (matched) {
          return {
            ...origProj,
            name: matched.name || origProj.name,
            description: (matched.description && matched.description.trim()) ? matched.description : origProj.description,
            technologies: (Array.isArray(matched.technologies) && matched.technologies.length > 0) ? matched.technologies : origProj.technologies,
            link: matched.link || origProj.link,
            role: matched.role || origProj.role
          };
        }
        return origProj;
      });

      aiResult.projects.forEach((aiProj: any) => {
        const alreadyExists = updatedData.projects.some((p: any) => 
          p.name && aiProj.name && p.name.trim().toLowerCase() === aiProj.name.trim().toLowerCase()
        );
        if (!alreadyExists && aiProj.name && aiProj.description) {
          updatedData.projects.push({
            id: `proj-ats-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
            name: aiProj.name,
            description: aiProj.description,
            technologies: Array.isArray(aiProj.technologies) ? aiProj.technologies : [],
            link: aiProj.link || "",
            role: aiProj.role || ""
          });
        }
      });
    } else {
      updatedData.projects = [...resumeData.projects];
    }
  }

  // 5. Skills
  if (resumeData.skills.length > 0) {
    if (Array.isArray(aiResult.skills) && aiResult.skills.length > 0) {
      const skillMap = new Map<string, any>();
      resumeData.skills.forEach((s: any) => skillMap.set(s.name.trim().toLowerCase(), { ...s }));
      aiResult.skills.forEach((s: any) => {
        if (s.name && s.name.trim()) {
          const key = s.name.trim().toLowerCase();
          if (skillMap.has(key)) {
            const existing = skillMap.get(key);
            skillMap.set(key, { ...existing, level: s.level || existing.level, category: s.category || existing.category });
          } else {
            skillMap.set(key, {
              id: `skill-ats-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              name: s.name.trim(),
              level: s.level || "Advanced",
              category: s.category || "Languages & Tools"
            });
          }
        }
      });
      updatedData.skills = Array.from(skillMap.values());
    } else {
      updatedData.skills = [...resumeData.skills];
    }
  }

  // 6. Languages
  if (resumeData.languages.length > 0) {
    if (Array.isArray(aiResult.languages) && aiResult.languages.length > 0) {
      updatedData.languages = resumeData.languages.map((origLang: any, idx: number) => {
        const matched = aiResult.languages.find((l: any) => 
          l.name && origLang.name && l.name.trim().toLowerCase() === origLang.name.trim().toLowerCase()
        ) || aiResult.languages[idx];
        return matched ? { ...origLang, proficiency: matched.proficiency || origLang.proficiency } : origLang;
      });
    } else {
      updatedData.languages = [...resumeData.languages];
    }
  }

  // 7. Certifications
  if (resumeData.certifications.length > 0) {
    if (Array.isArray(aiResult.certifications) && aiResult.certifications.length > 0) {
      updatedData.certifications = resumeData.certifications.map((origCert: any, idx: number) => {
        const matched = aiResult.certifications.find((c: any) => 
          c.name && origCert.name && c.name.trim().toLowerCase() === origCert.name.trim().toLowerCase()
        ) || aiResult.certifications[idx];
        return matched ? {
          ...origCert,
          name: matched.name || origCert.name,
          issuer: matched.issuer || origCert.issuer,
          date: matched.date || origCert.date,
          link: matched.link || origCert.link
        } : origCert;
      });
    } else {
      updatedData.certifications = [...resumeData.certifications];
    }
  }

  // 8. Custom Sections
  if (resumeData.customSections.length > 0) {
    if (Array.isArray(aiResult.customSections) && aiResult.customSections.length > 0) {
      updatedData.customSections = resumeData.customSections.map((origSect: any, idx: number) => {
        const matched = aiResult.customSections.find((cs: any) => 
          cs.title && origSect.title && cs.title.trim().toLowerCase() === origSect.title.trim().toLowerCase()
        ) || aiResult.customSections[idx];
        return matched ? {
          ...origSect,
          title: matched.title || origSect.title,
          items: (Array.isArray(matched.items) && matched.items.length > 0) ? matched.items : origSect.items
        } : origSect;
      });
    } else {
      updatedData.customSections = [...resumeData.customSections];
    }
  }

  // Pre-commit validation layer
  if (resumeData.projects.length > 0 && updatedData.projects.length < resumeData.projects.length) {
    resumeData.projects.forEach((orig: any) => {
      if (!updatedData.projects.some((p: any) => p.name?.toLowerCase() === orig.name?.toLowerCase() || p.id === orig.id)) {
        updatedData.projects.push(orig);
      }
    });
  }
  if (resumeData.education.length > 0 && updatedData.education.length < resumeData.education.length) {
    resumeData.education.forEach((orig: any) => {
      if (!updatedData.education.some((e: any) => e.institution?.toLowerCase() === orig.institution?.toLowerCase() || e.id === orig.id)) {
        updatedData.education.push(orig);
      }
    });
  }
  if (resumeData.workExperience.length > 0 && updatedData.workExperience.length < resumeData.workExperience.length) {
    resumeData.workExperience.forEach((orig: any) => {
      if (!updatedData.workExperience.some((w: any) => w.company?.toLowerCase() === orig.company?.toLowerCase() || w.id === orig.id)) {
        updatedData.workExperience.push(orig);
      }
    });
  }
  if (resumeData.skills.length > 0 && updatedData.skills.length < resumeData.skills.length) {
    resumeData.skills.forEach((orig: any) => {
      if (!updatedData.skills.some((s: any) => s.name?.toLowerCase() === orig.name?.toLowerCase() || s.id === orig.id)) {
        updatedData.skills.push(orig);
      }
    });
  }
  if (resumeData.certifications.length > 0 && updatedData.certifications.length < resumeData.certifications.length) {
    resumeData.certifications.forEach((orig: any) => {
      if (!updatedData.certifications.some((c: any) => c.name?.toLowerCase() === orig.name?.toLowerCase() || c.id === orig.id)) {
        updatedData.certifications.push(orig);
      }
    });
  }
  if (resumeData.languages.length > 0 && updatedData.languages.length < resumeData.languages.length) {
    resumeData.languages.forEach((orig: any) => {
      if (!updatedData.languages.some((l: any) => l.name?.toLowerCase() === orig.name?.toLowerCase() || l.id === orig.id)) {
        updatedData.languages.push(orig);
      }
    });
  }
  if (resumeData.customSections.length > 0 && updatedData.customSections.length < resumeData.customSections.length) {
    resumeData.customSections.forEach((orig: any) => {
      if (!updatedData.customSections.some((cs: any) => cs.title?.toLowerCase() === orig.title?.toLowerCase() || cs.id === orig.id)) {
        updatedData.customSections.push(orig);
      }
    });
  }

  return updatedData;
}

describe("ATS Assistant Resume Optimizer Data Preservation Tests", () => {
  const fullResume = {
    personalInfo: {
      name: "Rahul Sharma",
      title: "Senior Full Stack Engineer",
      email: "rahul.sharma@example.com",
      phone: "+91 9876543210",
      location: "Bengaluru, India",
      linkedin: "linkedin.com/in/rahulsharma",
      github: "github.com/rahulsharma",
      website: "rahul.dev",
      avatar: "https://example.com/avatar.jpg",
      summary: "Full Stack Developer with 5 years experience in React, Node, and AWS."
    },
    workExperience: [
      {
        id: "exp-1",
        company: "Acme Corp",
        position: "Full Stack Lead",
        location: "Bengaluru",
        startDate: "2021",
        endDate: "Present",
        current: true,
        description: "Built microservices handling 10M requests daily."
      }
    ],
    education: [
      {
        id: "edu-1",
        institution: "IIT Madras",
        degree: "B.Tech",
        fieldOfStudy: "Computer Science",
        startDate: "2017",
        endDate: "2021",
        cgpa: "8.9",
        percentage: "",
        location: "Chennai",
        description: "Specialized in Distributed Systems."
      }
    ],
    projects: [
      {
        id: "proj-1",
        name: "Cloud Pipeline Orchestrator",
        description: "Orchestrated CI/CD pipelines using Docker and Kubernetes.",
        technologies: ["Docker", "Kubernetes", "TypeScript"],
        link: "https://github.com/rahul/pipeline",
        role: "Lead Architect"
      },
      {
        id: "proj-2",
        name: "Real-time Telemetry Dashboard",
        description: "WebSocket streaming dashboard for IoT device health monitoring.",
        technologies: ["React", "Go", "WebSockets"],
        link: "https://github.com/rahul/iot-dash",
        role: "Frontend & Socket Lead"
      },
      {
        id: "proj-3",
        name: "Financial Portfolio Optimizer",
        description: "Mean-variance portfolio optimization tool with Python backend.",
        technologies: ["Python", "FastAPI", "React"],
        link: "https://github.com/rahul/finance-opt",
        role: "Full Stack"
      }
    ],
    skills: [
      { id: "sk-1", name: "React", level: "Expert", category: "Frontend" },
      { id: "sk-2", name: "Node.js", level: "Advanced", category: "Backend" },
      { id: "sk-3", name: "TypeScript", level: "Expert", category: "Languages" },
      { id: "sk-4", name: "Docker", level: "Advanced", category: "DevOps" }
    ],
    languages: [
      { id: "lang-1", name: "English", proficiency: "Fluent" },
      { id: "lang-2", name: "Hindi", proficiency: "Native" }
    ],
    certifications: [
      { id: "cert-1", name: "AWS Solutions Architect", issuer: "Amazon Web Services", date: "2023", link: "" }
    ],
    customSections: [
      {
        id: "cs-1",
        title: "Awards & Honors",
        items: [
          { id: "it-1", title: "Innovator of the Year", subtitle: "Acme Corp", date: "2023", description: "Recognized for architecture redesign." }
        ]
      }
    ]
  };

  it("Test 1 — Full resume: Every section remains present and optimized", () => {
    const aiResponse = {
      summary: "High-impact Full Stack Architect with 5+ years scaling distributed systems on AWS.",
      projects: [
        {
          name: "Cloud Pipeline Orchestrator",
          description: "Streamlined CI/CD deployment frequency by 40% utilizing Docker & Kubernetes.",
          technologies: ["Docker", "Kubernetes", "TypeScript"]
        },
        {
          name: "Real-time Telemetry Dashboard",
          description: "Engineered ultra-low-latency telemetry dashboard monitoring 50,000+ IoT endpoints.",
          technologies: ["React", "Go", "WebSockets"]
        },
        {
          name: "Financial Portfolio Optimizer",
          description: "Constructed algorithmic portfolio allocation engine serving institutional clients.",
          technologies: ["Python", "FastAPI", "React"]
        }
      ]
    };

    const result = reconcileAtsOptimization(fullResume, aiResponse);
    expect(result.personalInfo.name).toBe("Rahul Sharma");
    expect(result.personalInfo.avatar).toBe("https://example.com/avatar.jpg");
    expect(result.personalInfo.summary).toContain("High-impact Full Stack Architect");
    expect(result.workExperience.length).toBe(1);
    expect(result.education.length).toBe(1);
    expect(result.projects.length).toBe(3);
    expect(result.skills.length).toBe(4);
    expect(result.languages.length).toBe(2);
    expect(result.certifications.length).toBe(1);
    expect(result.customSections.length).toBe(1);
  });

  it("Test 2 — AI returns empty arrays: Original populated sections remain 100% unchanged", () => {
    const emptyAiResponse = {
      workExperience: [],
      education: [],
      projects: [],
      skills: [],
      languages: [],
      certifications: [],
      customSections: []
    };

    const result = reconcileAtsOptimization(fullResume, emptyAiResponse);
    expect(result.workExperience.length).toBe(1);
    expect(result.education.length).toBe(1);
    expect(result.projects.length).toBe(3);
    expect(result.skills.length).toBe(4);
    expect(result.languages.length).toBe(2);
    expect(result.certifications.length).toBe(1);
    expect(result.customSections.length).toBe(1);
    expect(result.projects[0].name).toBe("Cloud Pipeline Orchestrator");
  });

  it("Test 3 — AI returns partial projects: Preserves all 3 projects and updates the 2 returned", () => {
    const partialAiResponse = {
      projects: [
        {
          name: "Cloud Pipeline Orchestrator",
          description: "ATS Optimized description for project 1.",
          technologies: ["Docker", "Kubernetes", "TypeScript"]
        },
        {
          name: "Real-time Telemetry Dashboard",
          description: "ATS Optimized description for project 2.",
          technologies: ["React", "Go", "WebSockets"]
        }
        // Project 3 omitted by AI
      ]
    };

    const result = reconcileAtsOptimization(fullResume, partialAiResponse);
    expect(result.projects.length).toBe(3);
    expect(result.projects[0].description).toBe("ATS Optimized description for project 1.");
    expect(result.projects[1].description).toBe("ATS Optimized description for project 2.");
    // Project 3 is completely preserved
    expect(result.projects[2].name).toBe("Financial Portfolio Optimizer");
    expect(result.projects[2].description).toBe("Mean-variance portfolio optimization tool with Python backend.");
  });

  it("Test 4 — Resume without work experience: Legitimate fresher resume does not invent corporate jobs", () => {
    const fresherResume = {
      ...fullResume,
      workExperience: []
    };

    const aiResponse = {
      projects: [
        { name: "Cloud Pipeline Orchestrator", description: "Concise description." }
      ]
    };

    const result = reconcileAtsOptimization(fresherResume, aiResponse);
    expect(result.workExperience.length).toBe(0);
    expect(result.projects.length).toBe(3);
  });

  it("Test 5 — Resume with only education and skills: ATS optimization preserves both", () => {
    const studentResume = {
      personalInfo: {
        name: "Priya Patel",
        title: "Civil Engineering Graduate",
        email: "priya@example.com",
        phone: "+91 9988776655",
        location: "Pune, India",
        linkedin: "",
        github: "",
        website: "",
        avatar: "",
        summary: "Civil Engineering graduate with STAAD Pro and AutoCAD skills."
      },
      workExperience: [],
      education: [
        {
          id: "edu-1",
          institution: "COEP Pune",
          degree: "B.E",
          fieldOfStudy: "Civil Engineering",
          startDate: "2020",
          endDate: "2024",
          cgpa: "8.5",
          percentage: "",
          location: "Pune",
          description: ""
        }
      ],
      projects: [],
      skills: [
        { id: "sk-1", name: "AutoCAD", level: "Expert", category: "Core" },
        { id: "sk-2", name: "STAAD Pro", level: "Advanced", category: "Core" }
      ],
      languages: [],
      certifications: [],
      customSections: []
    };

    const aiResponse = {
      summary: "Detail-oriented Civil Engineering graduate skilled in STAAD Pro and AutoCAD structural drafting.",
      skills: [
        { name: "AutoCAD", level: "Advanced", category: "CAD Tools" },
        { name: "STAAD Pro", level: "Advanced", category: "Structural Analysis" }
      ]
    };

    const result = reconcileAtsOptimization(studentResume, aiResponse);
    expect(result.education.length).toBe(1);
    expect(result.education[0].institution).toBe("COEP Pune");
    expect(result.skills.length).toBe(2);
    expect(result.skills.map((s: any) => s.name)).toContain("AutoCAD");
    expect(result.skills.map((s: any) => s.name)).toContain("STAAD Pro");
  });

  it("Test 6 — One-page ATS target: Content is compressed concisely without deleting projects, education, or skills", () => {
    const aiOnePageResponse = {
      summary: "Concise summary fitting within single-page layout.",
      projects: [
        { name: "Cloud Pipeline Orchestrator", description: "Streamlined CI/CD deployment frequency by 40% with Docker & K8s." },
        { name: "Real-time Telemetry Dashboard", description: "Engineered ultra-low-latency telemetry dashboard for 50k+ IoT endpoints." },
        { name: "Financial Portfolio Optimizer", description: "Built algorithmic portfolio allocation engine serving institutional clients." }
      ]
    };

    const result = reconcileAtsOptimization(fullResume, aiOnePageResponse);
    // Zero items deleted across all 8 sections
    expect(result.projects.length).toBe(3);
    expect(result.education.length).toBe(1);
    expect(result.workExperience.length).toBe(1);
    expect(result.skills.length).toBe(4);
    expect(result.certifications.length).toBe(1);
    expect(result.languages.length).toBe(2);
    expect(result.customSections.length).toBe(1);
  });
});
