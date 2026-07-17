import { useState, useEffect } from 'react';
import { initialResumeData } from './initialData';
import { TEMPLATES } from './templates';
import type { ResumeData, ResumeStyle, ResumeTemplate, Education } from './types';
import { TemplateSelector } from './TemplateSelector';
import { StyleCustomizer } from './StyleCustomizer';
import { ResumeForm } from './ResumeForm';
import { ResumePreview } from './ResumePreview';
import { getStorageItem, setStorageItem } from '../../utils/storage';
import { 
  FileText, Palette, Sliders, Printer, RotateCcw, Download, Upload, ZoomIn, ZoomOut, Check, Info, AlertTriangle, X, Maximize2, Minimize2, Sparkles, Folder, Save, ChevronDown, ChevronUp
} from 'lucide-react';

interface ProInterviewerAppProps {
  onClose?: () => void;
}

export default function ProInterviewerApp({ onClose }: ProInterviewerAppProps) {
  const [resumeData, setResumeData] = useState<ResumeData>(initialResumeData);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(TEMPLATES[0].id);
  const [currentStyle, setCurrentStyle] = useState<ResumeStyle>(TEMPLATES[0].style);
  
  const [activeTab, setActiveTab] = useState<'form' | 'templates' | 'style'>('form');
  const [mobileView, setMobileView] = useState<'editor' | 'preview'>('editor');
  const [zoom, setZoom] = useState<number>(0.9); // zoom level 0.7 - 1.2
  const [contentHeight, setContentHeight] = useState<number>(1123);
  const [showPrintGuide, setShowPrintGuide] = useState<boolean>(false);
  const [guideExpanded, setGuideExpanded] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAILoading, setIsAILoading] = useState<boolean>(false);

  // Auto scaling for mobile preview
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 1024) {
        const calculatedZoom = (window.innerWidth - 32) / 794;
        setZoom(Math.max(0.4, Math.min(1.0, calculatedZoom)));
      } else {
        setZoom(0.9);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  const [showAIModal, setShowAIModal] = useState<boolean>(false);
  const [aiModalStep, setAiModalStep] = useState<'choice' | 'upload' | 'notes'>('choice');
  const [resumeUploadFile, setResumeUploadFile] = useState<File | null>(null);
  const [savedResumes, setSavedResumes] = useState<any[]>([]);
  const [activeResumeId, setActiveResumeId] = useState<string | null>(null);
  const [showSavedResumesModal, setShowSavedResumesModal] = useState<boolean>(false);
  const [aiTargetRoles, setAiTargetRoles] = useState<string>('');
  const [aiTargetCompanies, setAiTargetCompanies] = useState<string>('');
  const [missingSectionsList, setMissingSectionsList] = useState<string[]>([]);
  const [aiNotesSummary, setAiNotesSummary] = useState<string>('');
  const [aiNotesExperience, setAiNotesExperience] = useState<string>('');
  const [aiNotesEducation, setAiNotesEducation] = useState<string>('');
  const [aiNotesProjects, setAiNotesProjects] = useState<string>('');
  const [aiNotesSkills, setAiNotesSkills] = useState<string>('');
  const [aiNotesLanguages, setAiNotesLanguages] = useState<string>('');
  const [aiNotesCertifications, setAiNotesCertifications] = useState<string>('');

  // Load saved state from localStorage on mount (with security schema validation)
  useEffect(() => {
    const saved = getStorageItem("proResumeState");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed && parsed.data && typeof parsed.data === 'object' && parsed.data.personalInfo && parsed.style && parsed.templateId) {
          setResumeData(parsed.data);
          setCurrentStyle(parsed.style);
          setActiveTemplateId(parsed.templateId);
        }
      } catch (e) {
        console.error("Failed to parse saved resume state safely", e);
      }
    }

    // Load Saved Resumes
    const storedResumes = getStorageItem("proSavedResumes");
    if (storedResumes) {
      try {
        setSavedResumes(JSON.parse(storedResumes));
      } catch (e) {
        console.error("Failed to parse proSavedResumes", e);
      }
    }
    const activeId = getStorageItem("proActiveResumeId");
    if (activeId) {
      setActiveResumeId(activeId);
    }
  }, []);

  // Save changes to localStorage on any data or style update
  useEffect(() => {
    try {
      const stateToSave = {
        data: resumeData,
        style: currentStyle,
        templateId: activeTemplateId
      };
      setStorageItem("proResumeState", JSON.stringify(stateToSave));

      if (activeResumeId) {
        const stored = getStorageItem("proSavedResumes");
        let list: any[] = [];
        if (stored) {
          try { list = JSON.parse(stored); } catch (e) {}
        }
        const idx = list.findIndex((r: any) => r.id === activeResumeId);
        if (idx !== -1) {
          list[idx] = {
            ...list[idx],
            updatedAt: Date.now(),
            data: resumeData,
            style: currentStyle,
            templateId: activeTemplateId
          };
          setStorageItem("proSavedResumes", JSON.stringify(list));
          setSavedResumes(list);
        }
      }
    } catch (e) {
      console.error("Failed to save resume state to local storage", e);
    }
  }, [resumeData, currentStyle, activeTemplateId]);

  // Apply a prebuilt template
  const handleSelectTemplate = (template: ResumeTemplate) => {
    setActiveTemplateId(template.id);
    setCurrentStyle(template.style);
    triggerToast(`Applied template: "${template.name}"`);
  };

  // Toast notifier
  const triggerToast = (msg: string) => {
    setShowSuccessToast(msg);
    setTimeout(() => {
      setShowSuccessToast(null);
    }, 3000);
  };

  // Trigger browser print dialog
  const handlePrint = () => {
    setShowPrintGuide(false);
    // Short timeout to allow modal animation to clear
    setTimeout(() => {
      window.print();
    }, 300);
  };

  // Reset to initial mock data
  const handleReset = () => {
    if (window.confirm("Are you sure you want to reset the resume back to the default profile? All your edits will be lost.")) {
      setResumeData(initialResumeData);
      setActiveTemplateId(TEMPLATES[0].id);
      setCurrentStyle(TEMPLATES[0].style);
      triggerToast("Reset to default profile data");
    }
  };

  // Back up data to JSON
  const handleExportJSON = () => {
    const exportState = {
      data: resumeData,
      style: currentStyle,
      templateId: activeTemplateId
    };
    const blob = new Blob([JSON.stringify(exportState, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `resume-backup-${resumeData.personalInfo.name.toLowerCase().replace(/\s+/g, '-')}.json`;
    link.click();
    URL.revokeObjectURL(url);
    triggerToast("Backup JSON file downloaded");
  };

  // Restore data from JSON
  const handleImportJSON = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.data && parsed.style) {
            setResumeData(parsed.data);
            setCurrentStyle(parsed.style);
            if (parsed.templateId) {
              setActiveTemplateId(parsed.templateId);
            }
            triggerToast("Resume details restored successfully!");
          } else {
            alert("Error: Invalid backup file format. Missing data or style configuration.");
          }
        } catch (err) {
          alert("Failed to parse the backup file: " + err);
        }
      };
      reader.readAsText(file);
    }
  };

  // --- MULTI-RESUME MANAGER FUNCTIONS ---
  const handleCreateBlankResume = () => {
    const defaultTitle = prompt("Enter a title for the new blank resume:", "New Resume");
    if (defaultTitle === null) return;
    
    const newId = `resume-id-${Date.now()}`;
    const newResume = {
      id: newId,
      title: defaultTitle.trim() || "Untitled Resume",
      updatedAt: Date.now(),
      data: initialResumeData,
      style: TEMPLATES[0].style,
      templateId: TEMPLATES[0].id
    };

    const list = [...savedResumes, newResume];
    setSavedResumes(list);
    setStorageItem("proSavedResumes", JSON.stringify(list));

    setResumeData(initialResumeData);
    setCurrentStyle(TEMPLATES[0].style);
    setActiveTemplateId(TEMPLATES[0].id);
    setActiveResumeId(newId);
    setStorageItem("proActiveResumeId", newId);
    
    triggerToast(`Created and loaded blank resume: "${newResume.title}"`);
  };

  const handleLoadResume = (id: string) => {
    const target = savedResumes.find(r => r.id === id);
    if (!target) return;
    
    setResumeData(target.data);
    setCurrentStyle(target.style);
    setActiveTemplateId(target.templateId);
    setActiveResumeId(id);
    setStorageItem("proActiveResumeId", id);
    
    triggerToast(`Loaded resume: "${target.title}"`);
  };

  const handleRenameResume = (id: string) => {
    const target = savedResumes.find(r => r.id === id);
    if (!target) return;
    
    const newTitle = prompt("Rename resume title:", target.title);
    if (!newTitle) return;

    const list = savedResumes.map(r => {
      if (r.id === id) {
        return { ...r, title: newTitle.trim(), updatedAt: Date.now() };
      }
      return r;
    });

    setSavedResumes(list);
    setStorageItem("proSavedResumes", JSON.stringify(list));
    triggerToast(`Renamed resume to "${newTitle.trim()}"`);
  };

  const handleDeleteResume = (id: string) => {
    const target = savedResumes.find(r => r.id === id);
    if (!target) return;

    if (!window.confirm(`Are you sure you want to delete the saved resume "${target.title}"?`)) {
      return;
    }

    const list = savedResumes.filter(r => r.id !== id);
    setSavedResumes(list);
    setStorageItem("proSavedResumes", JSON.stringify(list));

    if (activeResumeId === id) {
      setActiveResumeId(null);
      setStorageItem("proActiveResumeId", "");
    }
    triggerToast(`Deleted resume: "${target.title}"`);
  };

  const handleSaveCurrentAsCopy = () => {
    const title = prompt("Enter a title for this copy:", resumeData.personalInfo.name ? `${resumeData.personalInfo.name}'s Resume Copy` : "My Resume Copy");
    if (title === null) return;

    const newId = `resume-id-${Date.now()}`;
    const copyResume = {
      id: newId,
      title: title.trim() || "My Resume Copy",
      updatedAt: Date.now(),
      data: resumeData,
      style: currentStyle,
      templateId: activeTemplateId
    };

    const list = [...savedResumes, copyResume];
    setSavedResumes(list);
    setStorageItem("proSavedResumes", JSON.stringify(list));

    setActiveResumeId(newId);
    setStorageItem("proActiveResumeId", newId);
    
    triggerToast(`Saved current resume as copy: "${copyResume.title}"`);
  };

  const handleSave = () => {
    if (activeResumeId) {
      const active = savedResumes.find(r => r.id === activeResumeId);
      const title = active ? active.title : "Resume";
      triggerToast(`Changes saved successfully to "${title}"!`);
    } else {
      handleSaveCurrentAsCopy();
    }
  };

  // AI Autofill: opens the interactive modal and auto-imports account profile
  const handleAIAutofill = () => {
    // Auto-import profile details from account
    const storedName = getStorageItem("userName") || "";
    const storedEmail = getStorageItem("userIdentifier") || "";
    const storedPhone = getStorageItem("userPhone") || "";
    const storedPhoto = getStorageItem("userProfilePhoto") || "";
    const storedLinkedin = getStorageItem("userLinkedin") || "";
    const storedGithub = getStorageItem("userGithub") || "";
    const storedPortfolio = getStorageItem("userPortfolio") || "";

    const updatedPersonal = {
      ...resumeData.personalInfo,
      name: storedName || resumeData.personalInfo.name,
      email: storedEmail || resumeData.personalInfo.email,
      phone: storedPhone || resumeData.personalInfo.phone,
      avatar: storedPhoto || resumeData.personalInfo.avatar,
      linkedin: storedLinkedin || resumeData.personalInfo.linkedin,
      github: storedGithub || resumeData.personalInfo.github,
      website: storedPortfolio || resumeData.personalInfo.website
    };

    let educationList = [...resumeData.education];
    if (educationList.length === 0) {
      try {
        const storedEdu = JSON.parse(getStorageItem("userEducationData") || "{}");
        const newEdu: Education[] = [];
        const getCgpaAndPercentage = (marks: string) => {
          const clean = (marks || "").trim();
          if (clean.includes('%')) {
            return { percentage: clean, cgpa: "" };
          } else {
            return { percentage: "", cgpa: clean };
          }
        };

        if (storedEdu.ug?.institution) {
          const scores = getCgpaAndPercentage(storedEdu.ug.marks);
          newEdu.push({
            id: `edu-ug-${Date.now()}`,
            institution: storedEdu.ug.institution,
            degree: storedEdu.ug.degree || "Bachelor's",
            fieldOfStudy: storedEdu.ug.field || "",
            location: "",
            startDate: "",
            endDate: storedEdu.ug.year || "",
            cgpa: scores.cgpa,
            percentage: scores.percentage,
            description: ""
          });
        }
        if (storedEdu.pg?.institution) {
          const scores = getCgpaAndPercentage(storedEdu.pg.marks);
          newEdu.push({
            id: `edu-pg-${Date.now()}`,
            institution: storedEdu.pg.institution,
            degree: storedEdu.pg.degree || "Master's",
            fieldOfStudy: storedEdu.pg.field || "",
            location: "",
            startDate: "",
            endDate: storedEdu.pg.year || "",
            cgpa: scores.cgpa,
            percentage: scores.percentage,
            description: ""
          });
        }
        if (storedEdu.twelfth?.institution) {
          const scores = getCgpaAndPercentage(storedEdu.twelfth.marks);
          newEdu.push({
            id: `edu-12th-${Date.now()}`,
            institution: storedEdu.twelfth.institution,
            degree: "High School (12th)",
            fieldOfStudy: storedEdu.twelfth.stream || "",
            location: "",
            startDate: "",
            endDate: storedEdu.twelfth.year || "",
            cgpa: scores.cgpa,
            percentage: scores.percentage,
            description: ""
          });
        }
        if (storedEdu.tenth?.institution) {
          const scores = getCgpaAndPercentage(storedEdu.tenth.marks);
          newEdu.push({
            id: `edu-10th-${Date.now()}`,
            institution: storedEdu.tenth.institution,
            degree: "Secondary School (10th)",
            fieldOfStudy: "",
            location: "",
            startDate: "",
            endDate: storedEdu.tenth.year || "",
            cgpa: scores.cgpa,
            percentage: scores.percentage,
            description: ""
          });
        }
        if (newEdu.length > 0) {
          educationList = newEdu;
        }
      } catch (e) {
        console.error("Failed to parse education data on AI import", e);
      }
    }

    const mergedData = {
      ...resumeData,
      personalInfo: updatedPersonal,
      education: educationList
    };

    setResumeData(mergedData);

    // Identify missing sections to prompt user for notes
    const missing: string[] = [];
    if (!mergedData.personalInfo.summary || !mergedData.personalInfo.summary.trim()) {
      missing.push("summary");
    }
    if (mergedData.workExperience.length === 0) {
      missing.push("workExperience");
    }
    if (mergedData.education.length === 0) {
      missing.push("education");
    }
    if (mergedData.projects.length === 0) {
      missing.push("projects");
    }
    if (mergedData.skills.length === 0) {
      missing.push("skills");
    }
    if (mergedData.languages.length === 0) {
      missing.push("languages");
    }
    if (mergedData.certifications.length === 0) {
      missing.push("certifications");
    }

    setAiModalStep('choice');
    setResumeUploadFile(null);
    setMissingSectionsList(missing);
    setAiTargetRoles(updatedPersonal.title || '');
    setShowAIModal(true);
  };

  // AI Generate: sends user notes to the Gemini API and updates the resume
  const handleAIGenerate = async () => {
    setIsAILoading(true);
    try {
      // Build structured userInput combining user inputs for missing fields
      const notesObj: Record<string, string> = {};
      if (missingSectionsList.includes("summary") && aiNotesSummary.trim()) {
        notesObj["summary"] = aiNotesSummary.trim();
      }
      if (missingSectionsList.includes("workExperience") && aiNotesExperience.trim()) {
        notesObj["workExperience"] = aiNotesExperience.trim();
      }
      if (missingSectionsList.includes("education") && aiNotesEducation.trim()) {
        notesObj["education"] = aiNotesEducation.trim();
      }
      if (missingSectionsList.includes("projects") && aiNotesProjects.trim()) {
        notesObj["projects"] = aiNotesProjects.trim();
      }
      if (missingSectionsList.includes("skills") && aiNotesSkills.trim()) {
        notesObj["skills"] = aiNotesSkills.trim();
      }
      if (missingSectionsList.includes("languages") && aiNotesLanguages.trim()) {
        notesObj["languages"] = aiNotesLanguages.trim();
      }
      if (missingSectionsList.includes("certifications") && aiNotesCertifications.trim()) {
        notesObj["certifications"] = aiNotesCertifications.trim();
      }

      const formData = new FormData();
      formData.append('github', resumeData.personalInfo.github || '');
      formData.append('linkedin', resumeData.personalInfo.linkedin || '');
      formData.append('portfolioUrl', resumeData.personalInfo.website || '');
      formData.append('preferredRoles', aiTargetRoles || resumeData.personalInfo.title || 'Software Engineer');
      formData.append('targetCompanies', aiTargetCompanies || 'Top Tech Companies');
      formData.append('userInput', Object.keys(notesObj).length > 0 ? JSON.stringify(notesObj) : '');
      formData.append('missingSections', missingSectionsList.join(','));
      if (resumeUploadFile) {
        formData.append('resumeFile', resumeUploadFile);
      }

      const res = await fetch('/api/generate-resume', { method: 'POST', body: formData });
      const result = await res.json();

      if (result.error) {
        alert('AI generation failed: ' + result.error);
      } else {
        const updatedData = { ...resumeData };

        if (result.summary) {
          updatedData.personalInfo = { ...updatedData.personalInfo, summary: result.summary };
        }

        if (Array.isArray(result.workExperience)) {
          updatedData.workExperience = result.workExperience.map((job: any, index: number) => ({
            id: `exp-ai-${Date.now()}-${index}`,
            company: job.company || "",
            position: job.position || "",
            location: job.location || "",
            startDate: job.startDate || "",
            endDate: job.endDate || "",
            current: !!job.current,
            description: job.description || ""
          }));
        }

        if (Array.isArray(result.education)) {
          updatedData.education = result.education.map((edu: any, index: number) => ({
            id: `edu-ai-${Date.now()}-${index}`,
            institution: edu.institution || "",
            degree: edu.degree || "",
            fieldOfStudy: edu.fieldOfStudy || "",
            location: edu.location || "",
            startDate: edu.startDate || "",
            endDate: edu.endDate || "",
            cgpa: edu.cgpa || "",
            percentage: edu.percentage || "",
            description: edu.description || ""
          }));
        }

        if (Array.isArray(result.projects)) {
          updatedData.projects = result.projects.map((proj: any, index: number) => ({
            id: `proj-ai-${Date.now()}-${index}`,
            name: proj.name || "",
            description: proj.description || "",
            technologies: Array.isArray(proj.technologies) ? proj.technologies : [],
            link: proj.link || "",
            role: proj.role || ""
          }));
        }

        if (Array.isArray(result.skills)) {
          updatedData.skills = result.skills.map((skill: any, index: number) => ({
            id: `skill-ai-${Date.now()}-${index}`,
            name: skill.name || "",
            level: skill.level || "",
            category: skill.category || ""
          }));
        }

        if (Array.isArray(result.languages)) {
          updatedData.languages = result.languages.map((lang: any, index: number) => ({
            id: `lang-ai-${Date.now()}-${index}`,
            name: lang.name || "",
            proficiency: lang.proficiency || ""
          }));
        }

        if (Array.isArray(result.certifications)) {
          updatedData.certifications = result.certifications.map((cert: any, index: number) => ({
            id: `cert-ai-${Date.now()}-${index}`,
            name: cert.name || "",
            issuer: cert.issuer || "",
            date: cert.date || "",
            link: cert.link || ""
          }));
        }

        setResumeData(updatedData);
        setShowAIModal(false);
        
        // Reset notes states
        setAiNotesSummary('');
        setAiNotesExperience('');
        setAiNotesEducation('');
        setAiNotesProjects('');
        setAiNotesSkills('');
        setAiNotesLanguages('');
        setAiNotesCertifications('');
        setAiTargetRoles('');
        setAiTargetCompanies('');
        triggerToast('AI autofill completed successfully!');
      }
    } catch (err: any) {
      alert('AI autofill error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsAILoading(false);
    }
  };

  return (
    <div className={`resume-builder-pro ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* Mobile Toggle View Tabs (No Print) */}
      <div className="mobile-view-selector no-print">
        <button 
          type="button" 
          className={`view-btn ${mobileView === 'editor' ? 'active' : ''}`}
          onClick={() => setMobileView('editor')}
        >
          Editor
        </button>
        <button 
          type="button" 
          className={`view-btn ${mobileView === 'preview' ? 'active' : ''}`}
          onClick={() => setMobileView('preview')}
        >
          Preview
        </button>
      </div>

      <div className="app-container">
        {/* 1. LEFT SIDEBAR PANEL */}
        <aside className={`sidebar-panel no-print ${mobileView === 'editor' ? 'mobile-visible' : 'mobile-hidden'}`}>
          {/* Navigation / Branding */}
          <div className="nav-header">
            <div className="brand">
              <FileText className="brand-icon" size={20} />
              <h1>Resume Builder Pro</h1>
            </div>
            <div className="nav-actions" style={{ display: 'flex', gap: '0.35rem', alignItems: 'center' }}>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => setShowSavedResumesModal(true)}
                title="My Saved Resumes"
                style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem', backgroundColor: 'rgba(99, 102, 241, 0.1)', borderColor: 'rgba(99, 102, 241, 0.2)', color: '#a5b4fc' }}
              >
                <Folder size={13} />
                <span>My Resumes</span>
              </button>
              <button 
                type="button"
                className="btn btn-secondary" 
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
                style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span>{isFullscreen ? "Exit" : "Full"}</span>
              </button>

              {onClose && (
                <button 
                  type="button"
                  className="btn btn-secondary" 
                  onClick={onClose}
                  title="Close Resume Builder"
                  style={{ 
                    padding: '0.35rem 0.5rem', 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.25rem',
                    fontSize: '0.75rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                    borderColor: 'rgba(239, 68, 68, 0.2)',
                    color: '#ef4444'
                  }}
                >
                  <X size={13} />
                  <span>Exit</span>
                </button>
              )}
            </div>
          </div>

          {/* Tab Controllers */}
          <nav className="panel-tabs">
            <button 
              type="button"
              className={`tab-btn ${activeTab === 'form' ? 'active' : ''}`}
              onClick={() => setActiveTab('form')}
            >
              <FileText size={15} />
              <span>Content</span>
            </button>
            <button 
              type="button"
              className={`tab-btn ${activeTab === 'templates' ? 'active' : ''}`}
              onClick={() => setActiveTab('templates')}
            >
              <Palette size={15} />
              <span>Templates</span>
            </button>
            <button 
              type="button"
              className={`tab-btn ${activeTab === 'style' ? 'active' : ''}`}
              onClick={() => setActiveTab('style')}
            >
              <Sliders size={15} />
              <span>Customize</span>
            </button>
          </nav>

          {/* Tab Content Panel */}
          <div className="panel-content">
            {activeTab === 'form' && (
              <ResumeForm 
                data={resumeData} 
                onChangeData={setResumeData}
                onAIAutofill={handleAIAutofill}
                isAILoading={isAILoading}
                style={currentStyle}
                onChangeStyle={setCurrentStyle}
              />
            )}

            {activeTab === 'templates' && (
              <TemplateSelector
                activeTemplateId={activeTemplateId}
                onSelectTemplate={handleSelectTemplate}
              />
            )}

            {activeTab === 'style' && (
              <StyleCustomizer 
                style={currentStyle} 
                onChangeStyle={setCurrentStyle} 
              />
            )}
          </div>

          {/* Bottom Control Bar */}
          <div style={{
            padding: '0.85rem 1.25rem',
            borderTop: '1px solid var(--panel-border)',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'rgba(0,0,0,0.15)'
          }}>
            <button 
              type="button"
              className="btn btn-secondary" 
              onClick={handleReset} 
              title="Reset default values"
              style={{ padding: '0.35rem 0.6rem', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '0.35rem' }}
            >
              <RotateCcw size={13} />
              <span>Reset Profile Data</span>
            </button>
          </div>
        </aside>

        {/* 2. RIGHT PREVIEW CANVAS */}
        <main 
          className={`preview-canvas-container ${mobileView === 'preview' ? 'mobile-visible' : 'mobile-hidden'}`}
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: 'relative',
            padding: 0,
            overflow: 'hidden', // Main canvas is static, scroll is managed inside bottom viewport
            height: '100%'
          }}
        >
          {/* Unified Preview Header Toolbar */}
          <div className="no-print" style={{
            background: 'var(--app-bg)', // Opaque main color to completely hide scrolling content underneath
            borderBottom: '1px solid var(--panel-border)',
            padding: '0.75rem 1rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            width: '100%'
          }}>
            {/* Left Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)'
                }}
              >
                <Save size={14} />
                <span className="hidden sm:inline">Save Resume</span>
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowPrintGuide(true)}
                title="Download as PDF / Print"
                style={{
                  padding: '0.4rem 0.8rem',
                  fontSize: '0.75rem',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
                }}
              >
                <Printer size={14} />
                <span className="hidden sm:inline">Export</span>
              </button>
              {activeResumeId && (
                <div style={{
                  background: 'var(--panel-bg)', // Dynamic contrast background for light/dark/eyeprotect compatibility
                  border: '1px solid var(--panel-border)',
                  padding: '0.4rem 0.6rem',
                  borderRadius: '8px',
                  fontSize: '0.7rem',
                  color: 'var(--text-muted)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  maxWidth: '120px',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis'
                }} title={savedResumes.find(r => r.id === activeResumeId)?.title}>
                  <FileText size={12} style={{ color: 'var(--input-focus)', flexShrink: 0 }} />
                  <span className="hidden sm:inline" style={{ marginRight: '0.2rem' }}>Editing:</span>
                  <strong style={{ color: 'var(--text-main)', textOverflow: 'ellipsis', overflow: 'hidden', whiteSpace: 'nowrap' }}>
                    {savedResumes.find(r => r.id === activeResumeId)?.title}
                  </strong>
                </div>
              )}
            </div>

            {/* Right Actions */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
              <div style={{
                background: 'var(--panel-bg)', // Dynamic contrast background for light/dark/eyeprotect compatibility
                border: '1px solid var(--panel-border)',
                padding: '0.3rem 0.5rem',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem'
              }}>
                <button 
                  type="button"
                  className="btn-icon" 
                  onClick={() => setZoom(Math.max(0.6, zoom - 0.05))} 
                  style={{ padding: '0.2rem', background: 'transparent', border: 'none' }}
                >
                  <ZoomOut size={14} />
                </button>
                <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-main)', minWidth: '35px', textAlign: 'center' }}>
                  {Math.round(zoom * 100)}%
                </span>
                <button 
                  type="button"
                  className="btn-icon" 
                  onClick={() => setZoom(Math.min(1.2, zoom + 0.05))}
                  style={{ padding: '0.2rem', background: 'transparent', border: 'none' }}
                >
                  <ZoomIn size={14} />
                </button>
              </div>

              {/* Tip */}
              <div className="hidden lg:flex" style={{
                background: 'var(--panel-bg)', // Dynamic contrast background for light/dark/eyeprotect compatibility
                border: '1px solid var(--panel-border)',
                padding: '0.4rem 0.6rem',
                borderRadius: '8px',
                alignItems: 'center',
                gap: '0.35rem',
                color: 'var(--text-muted)',
                fontSize: '0.7rem'
              }}>
                <Info size={12} className="brand-icon" />
                <span>Click any text directly on the page to edit inline!</span>
              </div>
            </div>
          </div>

          {/* Scrollable canvas area positioned strictly below the header */}
          <div 
            style={{
              flex: 1,
              overflowY: 'auto',
              width: '100%',
              paddingTop: '10px', // Exact 10px spacing from the header bottom edge
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* Centering Wrapper and Scaled A4 sheets */}
            <div
              className="resume-preview-container-wrapper"
              style={{
                width: '100%',
                minHeight: `${contentHeight * zoom}px`,
                position: 'relative',
                display: 'flex',
                justifyContent: 'center',
                overflow: 'hidden',
                paddingBottom: '2.5rem'
              }}
            >
              <div 
                className="resume-pages-wrapper"
                style={{
                  width: '794px',
                  height: `${contentHeight}px`,
                  transform: `translateX(-50%) scale(${zoom})`,
                  transformOrigin: 'top center',
                  position: 'absolute',
                  top: 0,
                  left: '50%',
                  transition: 'transform 0.15s ease',
                  boxSizing: 'border-box'
                }}
              >
                <ResumePreview 
                  data={resumeData}
                  style={currentStyle}
                  onChangeData={setResumeData}
                  onHeightChange={setContentHeight}
                />
              </div>
            </div>
          </div>

          {/* Success Alert Toast Notification */}
          {showSuccessToast && (
            <div style={{
              position: 'fixed',
              bottom: '1.5rem',
              right: '1.5rem',
              background: '#10b981',
              color: 'white',
              padding: '0.6rem 1.2rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.4rem',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)',
              zIndex: 100,
              fontSize: '0.85rem',
              fontWeight: 500
            }}>
              <Check size={14} />
              <span>{showSuccessToast}</span>
            </div>
          )}

                    {/* PRINT / PDF DOWNLOAD HELP MODAL */}
          {showPrintGuide && (
            <>
              <div className="modal-backdrop" onClick={() => setShowPrintGuide(false)} />
              <div className="print-helper-modal">
                <div 
                  onClick={() => setGuideExpanded(!guideExpanded)}
                  style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'space-between', 
                    marginBottom: '1rem', 
                    color: 'var(--input-focus)',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <Printer size={18} />
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>PDF Export Guide</h3>
                  </div>
                  {guideExpanded ? <ChevronUp size={16} color="var(--text-muted)" /> : <ChevronDown size={16} color="var(--text-muted)" />}
                </div>
                
                {guideExpanded && (
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.65rem', borderTop: '1px solid var(--panel-border)', paddingTop: '0.75rem' }} className="animate-in fade-in duration-200">
                    <p style={{ margin: 0 }}>To print or download your resume as a clean, pixel-perfect PDF document, verify these settings in the browser print window:</p>
                    
                    <ol style={{ paddingLeft: '1.25rem', margin: '0.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                      <li>Set <strong>Destination</strong> to <strong>Save as PDF</strong> (or Microsoft Print to PDF).</li>
                      <li>Click <strong>More settings</strong> to expand configuration options.</li>
                      <li>Ensure <strong>Background graphics</strong> is checked <span className="warning-text" style={{ fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><AlertTriangle size={10} />(Required for color themes!)</span></li>
                      <li>Set <strong>Margins</strong> to <strong>None</strong> or <strong>Default</strong>.</li>
                      <li>Set <strong>Paper size</strong> to <strong>A4</strong> (or Letter) to match the template aspect ratio.</li>
                      <li>Untick <strong>Headers and footers</strong> to remove the browser date/URL timestamps from the page edges.</li>
                      <li>Set <strong>Scale</strong> to <strong>100</strong> (Default) or select <strong>Fit to page width</strong>.</li>
                    </ol>

                    <p className="print-guide-note">
                      <strong>Note:</strong> Any editing outlines or control bars will automatically be stripped from the printed page.
                    </p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPrintGuide(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={handlePrint}>Download</button>
                </div>
              </div>
            </>
          )}

          {/* AI Resume Assistant Modal */}
          {showAIModal && (
            <>
              <div 
                className="modal-backdrop no-print"
                onClick={() => { if (!isAILoading) { setShowAIModal(false); } }}
                style={{
                  position: 'fixed', inset: 0, zIndex: 9998,
                  background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)'
                }} 
              />
              <div className="no-print" style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)',
                zIndex: 9999, width: '95%', maxWidth: '540px',
                background: 'linear-gradient(145deg, #1a1a2e, #16213e)',
                border: '1px solid rgba(139, 92, 246, 0.3)',
                borderRadius: '1.25rem', padding: '1.75rem',
                boxShadow: '0 0 60px rgba(139, 92, 246, 0.15), 0 25px 50px rgba(0,0,0,0.5)',
                color: '#f3f4f6', fontFamily: "'Inter', sans-serif",
                boxSizing: 'border-box'
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '2rem', height: '2rem', borderRadius: '0.5rem',
                      background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Sparkles size={14} color="#fff" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700 }}>AI Resume Assistant</h3>
                  </div>
                  <button 
                    type="button" onClick={() => { if (!isAILoading) setShowAIModal(false); }}
                    style={{ background: 'none', border: 'none', color: '#9ca3af', cursor: 'pointer', padding: '0.25rem' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                {aiModalStep === 'choice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0, lineHeight: 1.6 }}>
                      Choose how you want to autofill your resume details. You can import from an existing resume file or generate details based on your account profile.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAiModalStep('upload');
                          // Target all sections for extraction when uploading a resume
                          setMissingSectionsList(["summary", "workExperience", "education", "projects", "skills", "languages", "certifications"]);
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          alignItems: 'flex-start',
                          padding: '1rem',
                          background: 'rgba(139, 92, 246, 0.08)',
                          border: '1px solid rgba(139, 92, 246, 0.25)',
                          borderRadius: '0.75rem',
                          color: '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                      >
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a78bfa' }}>Upload Existing Resume / CV</span>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>Select a PDF, DOCX, or text file. AI will extract and structure your work experience, education, and skills.</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAiModalStep('notes');
                        }}
                        style={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '0.25rem',
                          alignItems: 'flex-start',
                          padding: '1rem',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid rgba(255, 255, 255, 0.08)',
                          borderRadius: '0.75rem',
                          color: '#fff',
                          cursor: 'pointer',
                          textAlign: 'left',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                      >
                        <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#f3f4f6' }}>Create New from Profile Data</span>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>No existing resume needed. AI will build your missing sections using your account details and custom notes.</span>
                      </button>
                    </div>
                  </div>
                )}

                {aiModalStep === 'upload' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <p style={{ fontSize: '0.85rem', color: '#9ca3af', margin: 0, lineHeight: 1.6 }}>
                      Upload your current resume or CV. Supported formats: <strong>PDF, TXT, DOCX</strong>.
                    </p>
                    
                    <div style={{
                      border: '2px dashed rgba(139, 92, 246, 0.3)',
                      background: 'rgba(15, 23, 42, 0.4)',
                      borderRadius: '0.75rem',
                      padding: '2rem 1rem',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '0.75rem',
                      cursor: 'pointer',
                      position: 'relative'
                    }}
                    onClick={() => document.getElementById('ai-resume-file-input')?.click()}
                    >
                      <input
                        type="file"
                        id="ai-resume-file-input"
                        accept=".pdf,.txt,.doc,.docx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setResumeUploadFile(file);
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <FileText size={32} color="#8b5cf6" style={{ opacity: 0.8 }} />
                      <span style={{ fontSize: '0.8rem', color: '#d1d5db', fontWeight: 600 }}>
                        {resumeUploadFile ? resumeUploadFile.name : 'Click to select resume file'}
                      </span>
                      <span style={{ fontSize: '0.7rem', color: '#9ca3af' }}>
                        {resumeUploadFile ? `${(resumeUploadFile.size / 1024 / 1024).toFixed(2)} MB` : 'Max file size 2MB'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setAiModalStep('choice')}
                        style={{
                          padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600,
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '0.5rem', color: '#9ca3af', cursor: 'pointer'
                        }}
                      >Back</button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!resumeUploadFile) {
                            alert("Please upload a resume file first.");
                            return;
                          }
                          setAiModalStep('notes');
                        }}
                        style={{
                          padding: '0.5rem 1.25rem', fontSize: '0.8rem', fontWeight: 700,
                          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                          border: 'none', borderRadius: '0.5rem', color: '#fff',
                          cursor: 'pointer'
                        }}
                      >Next: Preferences</button>
                    </div>
                  </div>
                )}

                {aiModalStep === 'notes' && (
                  <>
                    {resumeUploadFile ? (
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.5rem',
                        background: 'rgba(16, 185, 129, 0.08)',
                        border: '1px solid rgba(16, 185, 129, 0.25)',
                        borderRadius: '0.5rem',
                        padding: '0.6rem 0.85rem',
                        marginBottom: '1rem',
                        fontSize: '0.75rem',
                        color: '#6ee7b7'
                      }}>
                        <Check size={14} color="#10b981" />
                        <span>Ready to import from: <strong>{resumeUploadFile.name}</strong></span>
                      </div>
                    ) : (
                      <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
                        Profile details and education (if available) are imported from your account. Fill in custom notes for the remaining empty sections below, and Gemini will generate them.
                      </p>
                    )}

                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      gap: '0.85rem',
                      maxHeight: '360px',
                      overflowY: 'auto',
                      paddingRight: '0.4rem',
                      marginBottom: '1.25rem',
                      boxSizing: 'border-box'
                    }}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d1d5db', marginBottom: '0.2rem', display: 'block' }}>Target Roles</label>
                          <input
                            type="text"
                            value={aiTargetRoles}
                            onChange={(e) => setAiTargetRoles(e.target.value)}
                            placeholder="e.g. Frontend Engineer"
                            style={{
                              width: '100%', padding: '0.5rem 0.65rem', fontSize: '0.78rem',
                              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '0.5rem', color: '#f3f4f6', outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>

                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d1d5db', marginBottom: '0.2rem', display: 'block' }}>Target Companies</label>
                          <input
                            type="text"
                            value={aiTargetCompanies}
                            onChange={(e) => setAiTargetCompanies(e.target.value)}
                            placeholder="e.g. Top Tech Companies"
                            style={{
                              width: '100%', padding: '0.5rem 0.65rem', fontSize: '0.78rem',
                              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '0.5rem', color: '#f3f4f6', outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </div>

                      {missingSectionsList.includes("summary") && (
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d1d5db', marginBottom: '0.2rem', display: 'block' }}>
                            Profile Summary Notes {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesSummary}
                            onChange={(e) => setAiNotesSummary(e.target.value)}
                            placeholder="Key expertise, leadership focus, or areas to highlight in your summary paragraph."
                            rows={3}
                            style={{
                              width: '100%', padding: '0.55rem 0.7rem', fontSize: '0.78rem',
                              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '0.5rem', color: '#f3f4f6', outline: 'none',
                              resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif",
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}

                      {missingSectionsList.includes("workExperience") && (
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d1d5db', marginBottom: '0.2rem', display: 'block' }}>
                            Work Experience Notes {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesExperience}
                            onChange={(e) => setAiNotesExperience(e.target.value)}
                            placeholder={"Describe roles, companies, and achievements.\nExample:\n- Dev at Google (2022-present): built React UI pages, optimized speed 30%."}
                            rows={4}
                            style={{
                              width: '100%', padding: '0.55rem 0.7rem', fontSize: '0.78rem',
                              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '0.5rem', color: '#f3f4f6', outline: 'none',
                              resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif",
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}

                      {missingSectionsList.includes("education") && (
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d1d5db', marginBottom: '0.2rem', display: 'block' }}>
                            Education Details {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesEducation}
                            onChange={(e) => setAiNotesEducation(e.target.value)}
                            placeholder="Degrees, institutions, CGPA, percentage, coursework, or years (e.g. Master's in CS, Stanford, 2022)."
                            rows={3}
                            style={{
                              width: '100%', padding: '0.55rem 0.7rem', fontSize: '0.78rem',
                              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '0.5rem', color: '#f3f4f6', outline: 'none',
                              resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif",
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}

                      {missingSectionsList.includes("projects") && (
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d1d5db', marginBottom: '0.2rem', display: 'block' }}>
                            Projects Details {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesProjects}
                            onChange={(e) => setAiNotesProjects(e.target.value)}
                            placeholder="Specify projects, tech stacks, role, and results (e.g. E-Commerce Next.js app with Stripe backend)."
                            rows={3}
                            style={{
                              width: '100%', padding: '0.55rem 0.7rem', fontSize: '0.78rem',
                              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '0.5rem', color: '#f3f4f6', outline: 'none',
                              resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif",
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}

                      {missingSectionsList.includes("skills") && (
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d1d5db', marginBottom: '0.2rem', display: 'block' }}>
                            Skills & Keywords {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesSkills}
                            onChange={(e) => setAiNotesSkills(e.target.value)}
                            placeholder="List skills and tools you want categorized (e.g. JavaScript, Python, AWS, Docker, Git)."
                            rows={3}
                            style={{
                              width: '100%', padding: '0.55rem 0.7rem', fontSize: '0.78rem',
                              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '0.5rem', color: '#f3f4f6', outline: 'none',
                              resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif",
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}

                      {missingSectionsList.includes("languages") && (
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d1d5db', marginBottom: '0.2rem', display: 'block' }}>
                            Languages Spoken {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesLanguages}
                            onChange={(e) => setAiNotesLanguages(e.target.value)}
                            placeholder="Languages and fluency level (e.g. English - Native, Spanish - Conversational)."
                            rows={2}
                            style={{
                              width: '100%', padding: '0.55rem 0.7rem', fontSize: '0.78rem',
                              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '0.5rem', color: '#f3f4f6', outline: 'none',
                              resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif",
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}

                      {missingSectionsList.includes("certifications") && (
                        <div>
                          <label style={{ fontSize: '0.72rem', fontWeight: 600, color: '#d1d5db', marginBottom: '0.2rem', display: 'block' }}>
                            Certifications {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesCertifications}
                            onChange={(e) => setAiNotesCertifications(e.target.value)}
                            placeholder="AWS Solutions Architect from Amazon (2023), Scrum Master from Scrum.org (2022)."
                            rows={2}
                            style={{
                              width: '100%', padding: '0.55rem 0.7rem', fontSize: '0.78rem',
                              background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.1)',
                              borderRadius: '0.5rem', color: '#f3f4f6', outline: 'none',
                              resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif",
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (resumeUploadFile) {
                            setAiModalStep('upload');
                          } else {
                            setAiModalStep('choice');
                          }
                        }}
                        disabled={isAILoading}
                        style={{
                          padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600,
                          background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                          borderRadius: '0.5rem', color: '#9ca3af', cursor: 'pointer'
                        }}
                      >Back</button>
                      <button
                        type="button"
                        onClick={handleAIGenerate}
                        disabled={isAILoading}
                        style={{
                          padding: '0.5rem 1.25rem', fontSize: '0.8rem', fontWeight: 700,
                          background: isAILoading ? 'rgba(139, 92, 246, 0.4)' : 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                          border: 'none', borderRadius: '0.5rem', color: '#fff',
                          cursor: isAILoading ? 'wait' : 'pointer',
                          display: 'flex', alignItems: 'center', gap: '0.4rem',
                          boxShadow: '0 0 20px rgba(139, 92, 246, 0.3)'
                        }}
                      >
                        <Sparkles size={14} style={isAILoading ? { animation: 'spin 1s linear infinite' } : {}} />
                        {isAILoading ? 'Generating...' : 'Generate Resume'}
                      </button>
                    </div>
                  </>
                )}
              </div>
            </>
          )}

          {/* Saved Resumes Modal */}
          {showSavedResumesModal && (
            <>
              <div 
                className="modal-backdrop no-print"
                onClick={() => setShowSavedResumesModal(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 9998,
                  background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)'
                }} 
              />
              <div className="saved-resumes-modal no-print">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '2rem', height: '2rem', borderRadius: '0.5rem',
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Folder size={14} color="#fff" />
                    </div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>My Saved Resumes</h3>
                  </div>
                  <button 
                    type="button" onClick={() => setShowSavedResumesModal(false)}
                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                  >
                    <X size={18} />
                  </button>
                </div>

                <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
                  Wipe older copies or switch between resumes below. You currently have <strong>{savedResumes.length}</strong> saved resume version{savedResumes.length !== 1 ? 's' : ''}.
                </p>

                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem',
                  maxHeight: '320px',
                  overflowY: 'auto',
                  paddingRight: '0.4rem',
                  marginBottom: '1.25rem',
                  boxSizing: 'border-box'
                }}>
                  {savedResumes.length === 0 ? (
                    <div className="no-resumes-found" style={{ padding: '2rem 1rem', textAlign: 'center', fontSize: '0.8rem', borderRadius: '8px' }}>
                      No saved resumes found. Try saving your current resume as a copy!
                    </div>
                  ) : (
                    savedResumes.map((resume) => {
                      const isActive = activeResumeId === resume.id;
                      return (
                        <div 
                          key={resume.id} 
                          className={`saved-resume-item ${isActive ? 'active' : ''}`}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '0.75rem 1rem',
                            borderRadius: '0.75rem',
                            gap: '0.75rem'
                          }}
                        >
                          <div style={{ minWidth: 0, flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ fontSize: '0.85rem', fontWeight: isActive ? 700 : 600, color: isActive ? 'var(--input-focus)' : 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>
                                {resume.title}
                              </span>
                              {isActive && (
                                <span className="active-badge" style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', fontWeight: 700 }}>
                                  Active
                                </span>
                              )}
                            </div>
                            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '0.15rem', display: 'block' }}>
                              Last updated: {new Date(resume.updatedAt).toLocaleString()}
                            </span>
                          </div>

                          <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0 }}>
                            <button
                              type="button"
                              onClick={() => handleLoadResume(resume.id)}
                              disabled={isActive}
                              className="btn-load"
                            >Load</button>
                            <button
                              type="button"
                              onClick={() => handleRenameResume(resume.id)}
                              className="btn-rename"
                            >Rename</button>
                            <button
                              type="button"
                              onClick={() => handleDeleteResume(resume.id)}
                              className="btn-delete"
                            >Delete</button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', borderTop: '1px solid var(--panel-border)', paddingTop: '1rem' }}>
                  <div style={{ display: 'flex', gap: '0.4rem' }}>
                    <button
                      type="button"
                      onClick={handleSaveCurrentAsCopy}
                      className="btn btn-primary"
                      style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}
                    >Save Current Copy</button>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowSavedResumesModal(false)}
                    className="btn btn-secondary"
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600 }}
                  >Close</button>
                </div>
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}
