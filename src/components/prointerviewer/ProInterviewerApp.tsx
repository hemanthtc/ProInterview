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
  FileText, Palette, Sliders, Printer, RotateCcw, Download, Upload, ZoomIn, ZoomOut, Check, Info, AlertTriangle, X, Maximize2, Minimize2, Sparkles
} from 'lucide-react';

interface ProInterviewerAppProps {
  onClose?: () => void;
}

export default function ProInterviewerApp({ onClose }: ProInterviewerAppProps) {
  const [resumeData, setResumeData] = useState<ResumeData>(initialResumeData);
  const [activeTemplateId, setActiveTemplateId] = useState<string>(TEMPLATES[0].id);
  const [currentStyle, setCurrentStyle] = useState<ResumeStyle>(TEMPLATES[0].style);
  
  const [activeTab, setActiveTab] = useState<'form' | 'templates' | 'style'>('form');
  const [zoom, setZoom] = useState<number>(0.9); // zoom level 0.7 - 1.2
  const [showPrintGuide, setShowPrintGuide] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [isAILoading, setIsAILoading] = useState<boolean>(false);
  const [showAIModal, setShowAIModal] = useState<boolean>(false);
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
        if (storedEdu.ug?.institution) {
          newEdu.push({
            id: `edu-ug-${Date.now()}`,
            institution: storedEdu.ug.institution,
            degree: storedEdu.ug.degree || "Bachelor's",
            fieldOfStudy: storedEdu.ug.field || "",
            location: "",
            startDate: "",
            endDate: storedEdu.ug.year || "",
            gpa: storedEdu.ug.marks || "",
            description: ""
          });
        }
        if (storedEdu.pg?.institution) {
          newEdu.push({
            id: `edu-pg-${Date.now()}`,
            institution: storedEdu.pg.institution,
            degree: storedEdu.pg.degree || "Master's",
            fieldOfStudy: storedEdu.pg.field || "",
            location: "",
            startDate: "",
            endDate: storedEdu.pg.year || "",
            gpa: storedEdu.pg.marks || "",
            description: ""
          });
        }
        if (storedEdu.twelfth?.institution) {
          newEdu.push({
            id: `edu-12th-${Date.now()}`,
            institution: storedEdu.twelfth.institution,
            degree: "High School (12th)",
            fieldOfStudy: storedEdu.twelfth.stream || "",
            location: "",
            startDate: "",
            endDate: storedEdu.twelfth.year || "",
            gpa: storedEdu.twelfth.marks || "",
            description: ""
          });
        }
        if (storedEdu.tenth?.institution) {
          newEdu.push({
            id: `edu-10th-${Date.now()}`,
            institution: storedEdu.tenth.institution,
            degree: "Secondary School (10th)",
            fieldOfStudy: "",
            location: "",
            startDate: "",
            endDate: storedEdu.tenth.year || "",
            gpa: storedEdu.tenth.marks || "",
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

    if (missing.length === 0) {
      triggerToast("All your resume sections are already populated!");
      return;
    }

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
            gpa: edu.gpa || "",
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
      <div className="app-container">
        {/* 1. LEFT SIDEBAR PANEL */}
        <aside className="sidebar-panel no-print">
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
                onClick={() => setIsFullscreen(!isFullscreen)}
                title={isFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
                style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
              >
                {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
                <span>{isFullscreen ? "Exit" : "Full"}</span>
              </button>
              <button 
                type="button"
                className="btn btn-primary" 
                onClick={() => setShowPrintGuide(true)}
                title="Download as PDF / Print"
                style={{ padding: '0.35rem 0.5rem', display: 'flex', alignItems: 'center', gap: '0.25rem', fontSize: '0.75rem' }}
              >
                <Printer size={13} />
                <span>Export</span>
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
        <main className="preview-canvas-container">
          
          {/* Floating Zoom and Tip Controllers */}
          <div className="no-print" style={{
            position: 'absolute',
            top: '1rem',
            right: '1.5rem',
            display: 'flex',
            gap: '0.5rem',
            zIndex: 5,
            alignItems: 'center'
          }}>
            <div style={{
              background: 'rgba(15, 23, 42, 0.85)',
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
            
            <div style={{
              background: 'rgba(15, 23, 42, 0.85)',
              border: '1px solid var(--panel-border)',
              padding: '0.4rem 0.6rem',
              borderRadius: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              color: 'var(--text-muted)',
              fontSize: '0.7rem'
            }}>
              <Info size={12} className="brand-icon" />
              <span>Click any text directly on the page to edit inline!</span>
            </div>
          </div>

          {/* Scaled paper sheets */}
          <div style={{
            minHeight: `${1123 * zoom}px`,
            width: `${794 * zoom}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top center',
            transition: 'transform 0.15s ease',
            boxSizing: 'border-box'
          }}>
            <ResumePreview 
              data={resumeData}
              style={currentStyle}
              onChangeData={setResumeData}
            />
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: '#60a5fa' }}>
                  <Printer size={18} />
                  <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: 'var(--text-main)' }}>PDF Export Guide</h3>
                </div>
                
                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                  <p style={{ margin: 0 }}>To print or download your resume as a clean, pixel-perfect PDF document, verify these settings in the browser print window:</p>
                  
                  <ol style={{ paddingLeft: '1.25rem', margin: '0.25rem 0', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
                    <li>Set <strong>Destination</strong> to <strong>Save as PDF</strong> (or Microsoft Print to PDF).</li>
                    <li>Click <strong>More settings</strong> to expand configuration options.</li>
                    <li>Ensure <strong>Background graphics</strong> is checked <span style={{ color: '#f59e0b', fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '2px' }}><AlertTriangle size={10} />(Required for color themes!)</span></li>
                    <li>Set <strong>Margins</strong> to <strong>None</strong> or <strong>Default</strong>.</li>
                    <li>Set <strong>Paper size</strong> to <strong>A4</strong> (or Letter) to match the template aspect ratio.</li>
                    <li>Untick <strong>Headers and footers</strong> to remove the browser date/URL timestamps from the page edges.</li>
                  </ol>

                  <p style={{ margin: 0, fontStyle: 'italic', fontSize: '0.75rem', background: 'rgba(255,255,255,0.02)', padding: '0.4rem', borderLeft: '2px solid #ef4444' }}>
                    Note: Any editing outlines or control bars will automatically be stripped from the printed page.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', marginTop: '1.25rem' }}>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPrintGuide(false)}>Cancel</button>
                  <button type="button" className="btn btn-primary" onClick={handlePrint}>Open Print Dialog</button>
                </div>
              </div>
            </>
          )}

          {/* AI Resume Assistant Modal */}
          {showAIModal && (
            <>
              <div 
                onClick={() => { if (!isAILoading) { setShowAIModal(false); } }}
                style={{
                  position: 'fixed', inset: 0, zIndex: 9998,
                  background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(6px)'
                }} 
              />
              <div style={{
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

                <p style={{ fontSize: '0.78rem', color: '#9ca3af', margin: '0 0 1.25rem 0', lineHeight: 1.5 }}>
                  Profile details and education (if available) are imported from your account. Fill in custom notes for the remaining empty sections below, and Gemini will generate them.
                </p>

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
                        Profile Summary Notes (Empty)
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
                        Work Experience Notes (Empty)
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
                        Education Details (Empty)
                      </label>
                      <textarea
                        value={aiNotesEducation}
                        onChange={(e) => setAiNotesEducation(e.target.value)}
                        placeholder="Degrees, institutions, GPA, coursework, or years (e.g. Master's in CS, Stanford, 2022)."
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
                        Projects Details (Empty)
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
                        Skills & Keywords (Empty)
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
                        Languages Spoken (Empty)
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
                        Certifications (Empty)
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
                    onClick={() => { setShowAIModal(false); }}
                    disabled={isAILoading}
                    style={{
                      padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600,
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.15)',
                      borderRadius: '0.5rem', color: '#9ca3af', cursor: 'pointer'
                    }}
                  >Cancel</button>
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
              </div>
            </>
          )}

        </main>
      </div>
    </div>
  );
}
