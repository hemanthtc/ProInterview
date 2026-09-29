import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { initialResumeData } from './initialData';
import { TEMPLATES } from './templates';
import type { ResumeData, ResumeStyle, ResumeTemplate, Education } from './types';
import { TemplateSelector, CategoryType } from './TemplateSelector';
import { StyleCustomizer } from './StyleCustomizer';
import { ResumeForm } from './ResumeForm';
import { ResumePreview } from './ResumePreview';
import { getStorageItem, setStorageItem, removeStorageItem } from '../../utils/storage';
import { authFetch } from '../../utils/authExpiry';
import { 
  FileText, Palette, Sliders, Printer, RotateCcw, Download, ZoomIn, ZoomOut, Check, Info, AlertTriangle, X, Maximize2, Minimize2, Sparkles, Folder, Save, ChevronDown, ChevronUp, Eye, Trash2, Globe, Plus, PenLine
} from 'lucide-react';

interface ProInterviewerAppProps {
  onClose?: () => void;
  onAtsWarningChange?: (show: boolean) => void;
  onMobileViewChange?: (view: 'editor' | 'preview') => void;
}

export default function ProInterviewerApp({ onClose, onAtsWarningChange, onMobileViewChange }: ProInterviewerAppProps) {
  const router = useRouter();
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
  const [isToolbarExpanded, setIsToolbarExpanded] = useState<boolean>(false);

  // ATS Optimization States
  const [selectedTemplateCategory, setSelectedTemplateCategory] = useState<CategoryType>('All');
  const [showAtsWarning, setShowAtsWarning] = useState<boolean>(true);
  const [showAtsOptimizeModal, setShowAtsOptimizeModal] = useState<boolean>(false);
  const [atsTargetPages, setAtsTargetPages] = useState<'1' | '2'>('1');
  const [atsTargetRole, setAtsTargetRole] = useState<string>('');
  const [atsTargetCompany, setAtsTargetCompany] = useState<string>('');
  const [showInfoTip, setShowInfoTip] = useState<boolean>(false);

  const [isManualZoom, setIsManualZoom] = useState<boolean>(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartRef = useRef<{ distance: number; initialZoom: number } | null>(null);
  
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'warning' | 'info';
  }>({ isOpen: false, title: "", message: "", onConfirm: () => {} });

  const [promptDialog, setPromptDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    defaultValue: string;
    onConfirm: ((val: string) => void) | null;
  }>({
    isOpen: false,
    title: "",
    message: "",
    defaultValue: "",
    onConfirm: null
  });
  const [promptValue, setPromptValue] = useState("");

  const zoomRef = useRef(zoom);
  useEffect(() => {
    zoomRef.current = zoom;
  });

  // Register touch & wheel event listeners programmatically with passive: false to fix pinch-to-zoom
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        touchStartRef.current = { distance: dist, initialZoom: zoomRef.current };
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2 && touchStartRef.current) {
        if (e.cancelable) {
          e.preventDefault();
        }
        const dist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        const factor = dist / touchStartRef.current.distance;
        const newZoom = Math.max(0.35, Math.min(1.5, touchStartRef.current.initialZoom * factor));
        setZoom(newZoom);
        setIsManualZoom(true);
      }
    };

    const onTouchEnd = () => {
      touchStartRef.current = null;
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.0015;
        setZoom(prev => Math.max(0.35, Math.min(1.5, prev + delta)));
        setIsManualZoom(true);
      }
    };

    container.addEventListener('touchstart', onTouchStart, { passive: true });
    container.addEventListener('touchmove', onTouchMove, { passive: false });
    container.addEventListener('touchend', onTouchEnd, { passive: true });
    container.addEventListener('wheel', onWheel, { passive: false });

    return () => {
      container.removeEventListener('touchstart', onTouchStart);
      container.removeEventListener('touchmove', onTouchMove);
      container.removeEventListener('touchend', onTouchEnd);
      container.removeEventListener('wheel', onWheel);
    };
  }, []);

  // Auto scaling for mobile preview using ResizeObserver on the container bounds
  useEffect(() => {
    if (isManualZoom || !containerRef.current) return;

    let rafId: number | null = null;
    const targetElement = containerRef.current.parentElement || containerRef.current;

    const observer = new ResizeObserver((entries) => {
      if (rafId) cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        for (const entry of entries) {
          const width = entry.contentRect.width;
          if (width > 0) {
            const calculatedZoom = Math.max(0.35, Math.min(1.2, (width - 32) / 794));
            const currentZoom = zoomRef.current;
            // Hysteresis deadband: Only update if change exceeds 0.035
            // This prevents scrollbars (~15px = ~0.018 zoom) or subpixel rounding from creating an infinite zoom-in/zoom-out loop
            if (Math.abs(calculatedZoom - currentZoom) > 0.035) {
              setZoom(calculatedZoom);
            }
          }
        }
      });
    });

    observer.observe(targetElement);
    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      observer.disconnect();
    };
  }, [isManualZoom]);
  const [showAIModal, setShowAIModal] = useState<boolean>(false);
  const [aiModalStep, setAiModalStep] = useState<'choice' | 'upload' | 'notes' | 'portfolio_input' | 'both_input'>('choice');
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
  const [aiRoleMode, setAiRoleMode] = useState<'specified' | 'fresher'>('specified');
  const [aiSourceMode, setAiSourceMode] = useState<'resume' | 'portfolio' | 'both'>('resume');
  const [showVerifyAlertModal, setShowVerifyAlertModal] = useState<boolean>(false);
  const [hasPortfolioUrl, setHasPortfolioUrl] = useState<boolean>(false);

  // Prefetched account details states
  const [isUsingAccountResume, setIsUsingAccountResume] = useState<boolean>(false);
  const [accountResumeName, setAccountResumeName] = useState<string>('');
  const [accountResumeText, setAccountResumeText] = useState<string>('');
  const [accountResumeUrl, setAccountResumeUrl] = useState<string>('');
  const [portfolioInputUrl, setPortfolioInputUrl] = useState<string>('');
  const [showOfflineAlert, setShowOfflineAlert] = useState<boolean>(false);
  const [s3ErrorMsg, setS3ErrorMsg] = useState<string>('');
  const isInitialLoadedRef = useRef(false);

  const syncResumesList = async (list: any[]) => {
    const isGuest = getStorageItem("userLoggedIn") === "guest";
    if (isGuest) return true;

    try {
      const res = await authFetch("/api/resumes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(list)
      });
      if (res.ok) {
        setS3ErrorMsg("");
        return true;
      } else {
        const text = await res.text();
        let errMsg = "AWS S3 is offline or not accessible.";
        try {
          const data = JSON.parse(text);
          errMsg = data.error || errMsg;
        } catch {}
        console.warn("Failed to sync resumes to S3:", errMsg);
        setS3ErrorMsg(errMsg);
        setShowOfflineAlert(true);
        return false;
      }
    } catch (err) {
      console.error("Failed to sync resumes to S3:", err);
      setS3ErrorMsg("Failed to connect to the storage server.");
      setShowOfflineAlert(true);
      return false;
    }
  };

  const loadResumesList = async () => {
    let localList: any[] = [];
    const storedResumes = getStorageItem("proSavedResumes");
    if (storedResumes) {
      try { localList = JSON.parse(storedResumes); } catch (e) {}
    }

    const isGuest = getStorageItem("userLoggedIn") === "guest";
    if (isGuest) {
      setSavedResumes(localList);
      return;
    }

    try {
      const res = await authFetch("/api/resumes");
      if (res.ok) {
        const text = await res.text();
        let s3List: any[] = [];
        try { s3List = JSON.parse(text); } catch {}
        if (!Array.isArray(s3List)) s3List = [];
        // Merge lists by item.id, keeping the latest updatedAt timestamp
        const merged = new Map<string, any>();
        s3List.forEach((item: any) => merged.set(item.id, item));
        localList.forEach((item: any) => {
          const existing = merged.get(item.id);
          if (!existing || (item.updatedAt && item.updatedAt > (existing.updatedAt || 0))) {
            merged.set(item.id, item);
          }
        });
        const finalList = Array.from(merged.values());

        // Save merged list to S3 if there are any changes (unsynced local edits)
        if (finalList.length !== s3List.length || JSON.stringify(finalList) !== JSON.stringify(s3List)) {
          await authFetch("/api/resumes", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(finalList)
          });
        }

        setSavedResumes(finalList);
        setStorageItem("proSavedResumes", JSON.stringify(finalList));

        // Keep the editor state in sync with the latest merged active resume if S3 version is newer
        const activeId = getStorageItem("proActiveResumeId") || activeResumeId;
        if (activeId) {
          const activeItem = finalList.find((r: any) => r.id === activeId);
          let localListParsed: any[] = [];
          if (storedResumes) {
            try { localListParsed = JSON.parse(storedResumes); } catch (e) {}
          }
          const localActiveItem = localListParsed.find((r: any) => r.id === activeId);
          if (activeItem && (!localActiveItem || activeItem.updatedAt > (localActiveItem.updatedAt || 0))) {
            setResumeData(activeItem.data);
            setCurrentStyle(activeItem.style);
            setActiveTemplateId(activeItem.templateId);
          }
        }
      } else {
        console.warn("Resumes S3 API returned non-OK status. Using local storage.");
        setSavedResumes(localList);
        setS3ErrorMsg("AWS S3 is offline or not accessible.");
        setShowOfflineAlert(true);
      }
    } catch (err) {
      console.error("Failed to fetch resumes from S3 on load:", err);
      setSavedResumes(localList);
      setS3ErrorMsg("Failed to connect to the storage server.");
      setShowOfflineAlert(true);
    }
  };

  // Load saved state from localStorage on mount (with security schema validation)
  useEffect(() => {
    const saved = getStorageItem("proResumeState");

    const timer = setTimeout(() => {
      let stateLoaded = false;
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (parsed && parsed.data && typeof parsed.data === 'object' && parsed.data.personalInfo && parsed.style && parsed.templateId) {
            setResumeData(parsed.data);
            setCurrentStyle(parsed.style);
            setActiveTemplateId(parsed.templateId);
            stateLoaded = true;
          }
        } catch (e) {
          console.error("Failed to parse saved resume state safely", e);
        }
      }

      const activeId = getStorageItem("proActiveResumeId");
      if (activeId) {
        setActiveResumeId(activeId);

        // Fallback: If proResumeState was empty/missing, load from proSavedResumes
        if (!stateLoaded) {
          const storedResumes = getStorageItem("proSavedResumes");
          if (storedResumes) {
            try {
              const list = JSON.parse(storedResumes);
              const activeItem = list.find((r: any) => r.id === activeId);
              if (activeItem) {
                setResumeData(activeItem.data);
                setCurrentStyle(activeItem.style);
                setActiveTemplateId(activeItem.templateId);
              }
            } catch {}
          }
        }
      }

      loadResumesList();

      const savedPortfolio = getStorageItem("userPortfolio") || getStorageItem("userPortfolioUrl") || "";
      if (savedPortfolio && savedPortfolio.trim()) {
        setHasPortfolioUrl(true);
      }

      isInitialLoadedRef.current = true;
    }, 0);

    return () => clearTimeout(timer);
  }, []);

  // Save changes to localStorage and sync to S3 on any data or style update
  useEffect(() => {
    if (!isInitialLoadedRef.current) return;

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
          Promise.resolve().then(() => {
            setSavedResumes(list);
            syncResumesList(list);
          });
        }
      }
    } catch (e) {
      console.error("Failed to save resume state to local storage", e);
    }
  }, [resumeData, currentStyle, activeTemplateId, activeResumeId]);

  // Collapse info tip popover when clicking outside
  useEffect(() => {
    if (!showInfoTip) return;
    const handleOutsideClick = () => {
      setShowInfoTip(false);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => document.removeEventListener('click', handleOutsideClick);
  }, [showInfoTip]);

  // Notify parent component when mobileView changes
  useEffect(() => {
    if (onMobileViewChange) {
      onMobileViewChange(mobileView);
    }
  }, [mobileView, onMobileViewChange]);

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
    setConfirmDialog({
      isOpen: true,
      title: "Reset Profile Data",
      message: "Are you sure you want to reset the resume back to the default profile? All your edits will be lost.",
      onConfirm: () => {
        setResumeData(initialResumeData);
        setActiveTemplateId(TEMPLATES[0].id);
        setCurrentStyle(TEMPLATES[0].style);
        triggerToast("Reset to default profile data");
      }
    });
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
    if (savedResumes.length >= 3) {
      setConfirmDialog({
        isOpen: true,
        title: "Saved Resumes Limit Reached",
        message: "You can save a maximum of 3 resumes. Please delete one of your existing resumes to create a new one.",
        confirmText: showSavedResumesModal ? "Close" : "Manage Resumes",
        cancelText: "Cancel",
        type: "info",
        onConfirm: () => {
          if (!showSavedResumesModal) {
            setShowSavedResumesModal(true);
          }
        }
      });
      return;
    }

    setPromptDialog({
      isOpen: true,
      title: "New Resume",
      message: "Enter a title for the new blank resume:",
      defaultValue: "New Resume",
      onConfirm: (val) => {
        const titleStr = val.trim() || "Untitled Resume";
        const newId = `resume-id-${Date.now()}`;
        const newResume = {
          id: newId,
          title: titleStr,
          updatedAt: Date.now(),
          data: initialResumeData,
          style: TEMPLATES[0].style,
          templateId: TEMPLATES[0].id
        };

        const list = [...savedResumes, newResume];
        setSavedResumes(list);
        setStorageItem("proSavedResumes", JSON.stringify(list));
        syncResumesList(list);

        setResumeData(initialResumeData);
        setCurrentStyle(TEMPLATES[0].style);
        setActiveTemplateId(TEMPLATES[0].id);
        setActiveResumeId(newId);
        setStorageItem("proActiveResumeId", newId);
        
        triggerToast(`Created and loaded blank resume: "${newResume.title}"`);
      }
    });
    setPromptValue("New Resume");
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
    setShowSavedResumesModal(false);
  };

  const handleDownloadSavedResume = (id: string) => {
    const target = savedResumes.find(r => r.id === id);
    if (!target) return;

    setResumeData(target.data);
    setCurrentStyle(target.style);
    setActiveTemplateId(target.templateId);
    setActiveResumeId(id);
    setStorageItem("proActiveResumeId", id);

    setShowSavedResumesModal(false);
    setShowPrintGuide(true);
  };

  const handleRenameResume = (id: string) => {
    const target = savedResumes.find(r => r.id === id);
    if (!target) return;
    
    setPromptDialog({
      isOpen: true,
      title: "Rename Resume",
      message: "Rename resume title:",
      defaultValue: target.title,
      onConfirm: (val) => {
        const titleStr = val.trim();
        if (!titleStr) return;

        const list = savedResumes.map(r => {
          if (r.id === id) {
            return { ...r, title: titleStr, updatedAt: Date.now() };
          }
          return r;
        });

        setSavedResumes(list);
        setStorageItem("proSavedResumes", JSON.stringify(list));
        syncResumesList(list);
        triggerToast(`Renamed resume to "${titleStr}"`);
      }
    });
    setPromptValue(target.title);
  };

  const handleDeleteResume = (id: string) => {
    const target = savedResumes.find(r => r.id === id);
    if (!target) return;

    setConfirmDialog({
      isOpen: true,
      title: "Delete Saved Resume",
      message: `Are you sure you want to delete the saved resume "${target.title}"?`,
      onConfirm: () => {
        const list = savedResumes.filter(r => r.id !== id);
        setSavedResumes(list);
        setStorageItem("proSavedResumes", JSON.stringify(list));
        syncResumesList(list);

        if (activeResumeId === id) {
          setActiveResumeId(null);
          setStorageItem("proActiveResumeId", "");
        }
        triggerToast(`Deleted resume: "${target.title}"`);
      }
    });
  };

  const handleSaveCurrentAsCopy = () => {
    if (savedResumes.length >= 3) {
      setConfirmDialog({
        isOpen: true,
        title: "Saved Resumes Limit Reached",
        message: "You can save a maximum of 3 resumes. Please delete one of your existing resumes to save this copy.",
        confirmText: showSavedResumesModal ? "Close" : "Manage Resumes",
        cancelText: "Cancel",
        type: "info",
        onConfirm: () => {
          if (!showSavedResumesModal) {
            setShowSavedResumesModal(true);
          }
        }
      });
      return;
    }

    const defaultVal = resumeData.personalInfo.name ? `${resumeData.personalInfo.name}'s Resume Copy` : "My Resume Copy";
    setPromptDialog({
      isOpen: true,
      title: "Save Copy",
      message: "Enter a title for this copy:",
      defaultValue: defaultVal,
      onConfirm: (val) => {
        const titleStr = val.trim() || "My Resume Copy";
        const newId = `resume-id-${Date.now()}`;
        const copyResume = {
          id: newId,
          title: titleStr,
          updatedAt: Date.now(),
          data: resumeData,
          style: currentStyle,
          templateId: activeTemplateId
        };

        const list = [...savedResumes, copyResume];
        setSavedResumes(list);
        setStorageItem("proSavedResumes", JSON.stringify(list));
        syncResumesList(list);

        setActiveResumeId(newId);
        setStorageItem("proActiveResumeId", newId);
        
        triggerToast(`Saved current resume as copy: "${copyResume.title}"`);
      }
    });
    setPromptValue(defaultVal);
  };

  const handleSave = () => {
    if (activeResumeId) {
      const list = savedResumes.map(r => {
        if (r.id === activeResumeId) {
          return {
            ...r,
            updatedAt: Date.now(),
            data: resumeData,
            style: currentStyle,
            templateId: activeTemplateId
          };
        }
        return r;
      });

      setSavedResumes(list);
      setStorageItem("proSavedResumes", JSON.stringify(list));
      syncResumesList(list);

      const stateToSave = {
        data: resumeData,
        style: currentStyle,
        templateId: activeTemplateId
      };
      setStorageItem("proResumeState", JSON.stringify(stateToSave));

      const active = list.find(r => r.id === activeResumeId);
      const title = active ? active.title : "Resume";
      triggerToast(`Changes saved successfully to "${title}"!`);
    } else {
      handleSaveCurrentAsCopy();
    }
  };

  // AI Autofill: opens the interactive modal and auto-imports account profile
  const handleAIAutofill = async () => {
    // Auto-import profile details from account
    const storedName = getStorageItem("userName") || "";
    const storedEmail = getStorageItem("userIdentifier") || "";
    const storedPhone = getStorageItem("userPhone") || "";
    const storedPhoto = getStorageItem("userProfilePhoto") || "";
    const storedLinkedin = getStorageItem("userLinkedin") || "";
    const storedGithub = getStorageItem("userGithub") || "";
    const storedPortfolio = getStorageItem("userPortfolio") || getStorageItem("userPortfolioUrl") || "";

    let fetchedName = storedName;
    let fetchedPhone = storedPhone;
    let fetchedPhoto = storedPhoto;
    let fetchedLinkedin = storedLinkedin;
    let fetchedGithub = storedGithub;
    let fetchedPortfolio = storedPortfolio;
    let fetchedResumeText = "";
    let fetchedResumeName = "";
    let fetchedResumeUrl = "";

    // Fetch latest user profile details from backend
    if (storedEmail) {
      try {
        setIsAILoading(true);
        const res = await fetch(`/api/auth/profile?identifier=${encodeURIComponent(storedEmail)}&accountType=user`);
        const result = await res.json();
        if (result.success && result.user) {
          const u = result.user;
          fetchedName = u.displayName || storedName;
          fetchedPhone = u.phone || storedPhone;
          fetchedPhoto = u.profilePhoto || u.profilePhotoUrl || storedPhoto;
          fetchedLinkedin = u.linkedin || storedLinkedin;
          fetchedGithub = u.github || storedGithub;
          fetchedPortfolio = u.portfolioUrl || storedPortfolio;
          fetchedResumeText = u.resumeCvText || "";
          fetchedResumeName = u.resumeCvName || "";
          fetchedResumeUrl = u.resumeCvUrl || "";

          // Update local storage to keep it in sync
          if (u.displayName) setStorageItem("userName", u.displayName);
          if (u.phone) setStorageItem("userPhone", u.phone);
          if (u.profilePhoto || u.profilePhotoUrl) setStorageItem("userProfilePhoto", u.profilePhoto || u.profilePhotoUrl);
          if (u.linkedin) setStorageItem("userLinkedin", u.linkedin);
          if (u.github) setStorageItem("userGithub", u.github);
          if (u.portfolioUrl) {
            setStorageItem("userPortfolio", u.portfolioUrl);
            setStorageItem("userPortfolioUrl", u.portfolioUrl);
          }
          if (u.resumeCvText) {
            setStorageItem("userResumeCvText", u.resumeCvText);
            setStorageItem("userResumeCvName", u.resumeCvName || "Account_Resume.pdf");
          }
          if (u.resumeCvUrl) {
            setStorageItem("userResumeCvUrl", u.resumeCvUrl);
          }
        }
      } catch (err) {
        console.error("Failed to fetch fresh profile details:", err);
      } finally {
        setIsAILoading(false);
      }
    }

    // Fallbacks to local storage if profile fetch did not return them
    if (!fetchedResumeText) {
      fetchedResumeText = getStorageItem("userResumeCvText") || "";
      fetchedResumeName = getStorageItem("userResumeCvName") || "";
    }
    if (!fetchedResumeUrl) {
      fetchedResumeUrl = getStorageItem("userResumeCvUrl") || "";
    }

    setAccountResumeText(fetchedResumeText);
    setAccountResumeName(fetchedResumeName || "Account_Resume.pdf");
    setAccountResumeUrl(fetchedResumeUrl);
    setPortfolioInputUrl(fetchedPortfolio);

    const updatedPersonal = {
      ...resumeData.personalInfo,
      name: fetchedName || resumeData.personalInfo.name,
      email: storedEmail || resumeData.personalInfo.email,
      phone: fetchedPhone || resumeData.personalInfo.phone,
      avatar: fetchedPhoto || resumeData.personalInfo.avatar,
      linkedin: fetchedLinkedin || "",
      github: fetchedGithub || "",
      website: fetchedPortfolio || ""
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
      formData.append('sourceMode', aiSourceMode);
      if (aiSourceMode === 'resume') {
        if (resumeData.personalInfo.github) formData.append('github', resumeData.personalInfo.github);
        if (resumeData.personalInfo.linkedin) formData.append('linkedin', resumeData.personalInfo.linkedin);
      } else {
        formData.append('github', resumeData.personalInfo.github || getStorageItem("userGithub") || '');
        formData.append('linkedin', resumeData.personalInfo.linkedin || getStorageItem("userLinkedin") || '');
      }
      if (aiSourceMode === 'portfolio' || aiSourceMode === 'both') {
        formData.append('portfolioUrl', portfolioInputUrl || resumeData.personalInfo.website || getStorageItem("userPortfolio") || getStorageItem("userPortfolioUrl") || '');
      }
      const isUploadingResume = !!resumeUploadFile || !!accountResumeUrl || (isUsingAccountResume && !!accountResumeText) || aiSourceMode === 'resume' || aiSourceMode === 'both';
      const targetRoleValue = aiRoleMode === 'fresher' 
        ? 'Entry-Level / Fresher' 
        : (aiTargetRoles || (isUploadingResume ? '' : resumeData.personalInfo.title) || '');
      formData.append('preferredRoles', targetRoleValue);
      formData.append('targetCompanies', aiRoleMode === 'fresher' ? 'Open Opportunity' : (aiTargetCompanies || ''));
      formData.append('roleMode', aiRoleMode);
      formData.append('userInput', Object.keys(notesObj).length > 0 ? JSON.stringify(notesObj) : '');
      const allSections = ['summary', 'workExperience', 'education', 'projects', 'skills', 'languages', 'certifications', 'customSections'];
      const sectionsToSend = isUploadingResume 
        ? allSections 
        : (missingSectionsList.length > 0 ? missingSectionsList : allSections);
      formData.append('missingSections', sectionsToSend.join(','));
      if (resumeUploadFile) {
        formData.append('resumeFile', resumeUploadFile);
      }
      if (isUsingAccountResume && accountResumeUrl) {
        formData.append('resumeUrl', accountResumeUrl);
      }
      if (accountResumeText) {
        formData.append('resumeText', accountResumeText);
      }

      const res = await authFetch('/api/generate-resume', { method: 'POST', body: formData });
      if (res.status === 401) {
        removeStorageItem("userLoggedIn");
        alert("Your session has expired. Please sign in again to continue.");
        router.push("/login?redirect=/features");
        return;
      }

      let result: any;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        result = await res.json();
      } else if (res.status === 504) {
        throw new Error("The AI server timed out while processing your resume. Please try again or re-upload your resume.");
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned HTTP ${res.status}`);
      }

      if (!res.ok || result.error) {
        alert('AI generation failed: ' + (result.error || `HTTP ${res.status}`));
      } else {
        const updatedData = { ...resumeData };

        if (result.personalInfo) {
          updatedData.personalInfo = {
            ...updatedData.personalInfo,
            name: result.personalInfo.name || updatedData.personalInfo.name,
            title: isUploadingResume 
              ? (result.personalInfo.title || "") 
              : (result.personalInfo.title || updatedData.personalInfo.title),
            email: result.personalInfo.email || updatedData.personalInfo.email,
            phone: result.personalInfo.phone || updatedData.personalInfo.phone,
            location: result.personalInfo.location || "",
            linkedin: result.personalInfo.linkedin || "",
            github: result.personalInfo.github || "",
            website: result.personalInfo.website || "",
            summary: result.summary || updatedData.personalInfo.summary
          };
          if (isUploadingResume && aiSourceMode !== 'resume') {
            const storedPhoto = getStorageItem("userProfilePhoto") || "";
            updatedData.personalInfo.avatar = storedPhoto || "";
          }
        } else if (result.summary) {
          updatedData.personalInfo = { ...updatedData.personalInfo, summary: result.summary };
        }

        if (Array.isArray(result.workExperience) && result.workExperience.length > 0) {
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
        } else if (isUploadingResume) {
          updatedData.workExperience = [];
        }

        if (Array.isArray(result.education) && result.education.length > 0) {
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
            description: edu.description || "",
            degreeType: edu.degreeType || ""
          }));
        } else if (isUploadingResume && Array.isArray(result.education)) {
          updatedData.education = [];
        }

        if (Array.isArray(result.projects) && result.projects.length > 0) {
          const validProjects = result.projects.filter((p: any) => {
            if (!p || !p.name) return false;
            const name = p.name.trim();
            const nameLower = name.toLowerCase();
            if (nameLower === "project" || nameLower === "untitled project") return false;
            if (nameLower.startsWith("tech:") || nameLower.startsWith("technologies:") || nameLower.startsWith("stack:")) return false;
            if (name.endsWith(".") || name.endsWith("...") || /^(built|developed|designed|implemented|engineered|created|voice-first|deep\s+learning|centralized|resume-aware|optimization|streamlit\s+web\s+interface)\b/i.test(name)) return false;
            if (/^(?:developer|engineer|lead|full\s*stack\s+developer|ai\s+developer|software\s+engineer)$/i.test(name)) return false;
            return true;
          });

          updatedData.projects = validProjects.map((proj: any, index: number) => {
            let role = (proj.role || "").replace(/^(?:role|position)\s*[:\-–—]\s*/i, "").replace(/[|–—]/g, "").trim() || "Developer";
            let name = (proj.name || "")
              .replace(/^(?:project\s*\d*[:\s]|\d+[\.\)]\s*|[•\-*▪▫–—✦✓]\s*)/i, "")
              .replace(/https?:\/\/[^\s]+/gi, "")
              .replace(/[-–—|:]\s*$/, "")
              .trim();
            const techList = Array.isArray(proj.technologies) ? [...proj.technologies] : [];
            const domainTagRegex = /(?:(?<=[a-zA-Z0-9])|\b)(\d+\s*nm\s+Technology|FPGA\s+Implementation|IIoT\s*&\s*Embedded\s+Systems|Embedded\s*&\s*Solar\s+Power\s+Integration|IoT\s*&\s*Embedded\s+Systems|VLSI\s+Design|Embedded\s+Systems|Machine\s+Learning|Deep\s+Learning|Computer\s+Vision)\s*$/i;
            const domainMatch = name.match(domainTagRegex);
            if (domainMatch && domainMatch.index !== undefined) {
                techList.push(domainMatch[1].trim());
                name = name.substring(0, domainMatch.index).trim();
            }

            return {
              id: `proj-ai-${Date.now()}-${index}`,
              name,
              description: proj.description || "",
              technologies: Array.from(new Set(techList)),
              link: proj.link || "",
              role
            };
          });
        } else if (isUploadingResume && Array.isArray(result.projects)) {
          updatedData.projects = [];
        }

        if (Array.isArray(result.skills) && result.skills.length > 0) {
          updatedData.skills = result.skills.map((skill: any, index: number) => ({
            id: `skill-ai-${Date.now()}-${index}`,
            name: skill.name || "",
            level: skill.level || "",
            category: skill.category || ""
          }));
        } else if (isUploadingResume && Array.isArray(result.skills)) {
          updatedData.skills = [];
        }

        if (Array.isArray(result.languages) && result.languages.length > 0) {
          updatedData.languages = result.languages.map((lang: any, index: number) => ({
            id: `lang-ai-${Date.now()}-${index}`,
            name: lang.name || "",
            proficiency: lang.proficiency || ""
          }));
        } else if (isUploadingResume) {
          updatedData.languages = [];
        }

        if (Array.isArray(result.certifications) && result.certifications.length > 0) {
          const cleanedCerts: any[] = [];
          for (const c of result.certifications) {
            if (!c || !c.name) continue;
            const name = (c.name || "").trim();
            const isFrag = (
                /^(?:routing|optimization|verification|workflows|bottlenecks|implementation|synthesis)\b/i.test(name) ||
                (/^[a-z]/.test(name) && name.length < 50)
            ) &&
              (!c.issuer || c.issuer.trim() === "") &&
              (!c.description || c.description.trim() === "");

            if (isFrag && cleanedCerts.length > 0) {
              const prev = cleanedCerts[cleanedCerts.length - 1];
              prev.description = (prev.description ? prev.description + " " : "") + name;
              continue;
            }

            if (name && !/^(&|and)\s*workshops/i.test(name) && !/^(certifications|workshops|licenses|certificates)$/i.test(name.toLowerCase())) {
              cleanedCerts.push({
                ...c,
                name: name.replace(/\.+$/, "").trim()
              });
            }
          }

          updatedData.certifications = cleanedCerts.map((cert: any, index: number) => ({
            id: `cert-ai-${Date.now()}-${index}`,
            name: cert.name || "",
            issuer: cert.issuer || "",
            date: cert.date || "",
            link: cert.link || "",
            description: cert.description || ""
          }));
        } else if (isUploadingResume) {
          updatedData.certifications = [];
        }

        if (Array.isArray(result.customSections) && result.customSections.length > 0) {
          const validSections = result.customSections.filter((sect: any) => sect && sect.title && Array.isArray(sect.items) && sect.items.length > 0);
          updatedData.customSections = validSections.map((sect: any, sIdx: number) => ({
            id: `custom-ai-${Date.now()}-${sIdx}`,
            title: sect.title || "Additional Section",
            items: sect.items.map((it: any, iIdx: number) => ({
              id: `item-ai-${Date.now()}-${sIdx}-${iIdx}`,
              title: it.title || "",
              subtitle: it.subtitle || "",
              date: it.date || "",
              description: it.description || ""
            }))
          }));
        } else if (isUploadingResume) {
          updatedData.customSections = [];
        }

        setCurrentStyle(prev => {
          const vs = { ...(prev.visibleSections || {}) };
          if (updatedData.projects.length > 0) {
            vs.projects = true;
          }
          if (updatedData.certifications.length > 0) {
            vs.certifications = true;
          }
          return {
            ...prev,
            visibleSections: vs
          };
        });

        setResumeData(updatedData);
        setShowAIModal(false);
        setMobileView('editor');
        onMobileViewChange?.('editor');
        setShowVerifyAlertModal(true);
        
        // Reset notes states
        setAiNotesSummary('');
        setAiNotesExperience('');
        setAiNotesEducation('');
        setAiNotesProjects('');
        setAiNotesSkills('');
        setAiNotesLanguages('');
        setAiNotesCertifications('');
        setAiTargetRoles('');
        if (result.isFallback) {
          triggerToast('Auto-filled with smart template (Gemini API was rate-limited)');
        } else {
          triggerToast('AI autofill completed! Editor fields updated.');
        }
      }
    } catch (err: any) {
      alert('AI autofill error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsAILoading(false);
    }
  };

  // ATS AI Optimization
  const handleATSOptimize = async () => {
    setIsAILoading(true);
    try {
      const formData = new FormData();
      formData.append('github', resumeData.personalInfo.github || '');
      formData.append('linkedin', resumeData.personalInfo.linkedin || '');
      formData.append('portfolioUrl', resumeData.personalInfo.website || '');
      formData.append('preferredRoles', atsTargetRole || resumeData.personalInfo.title || '');
      formData.append('targetCompanies', atsTargetCompany || '');
      formData.append('optimizeAts', 'true');
      formData.append('targetPages', atsTargetPages);
      formData.append('missingSections', 'summary,workExperience,education,projects,skills,languages,certifications,customSections');
      
      const optimizationPrompt = {
        instructions: `Optimize this resume to be strictly ATS-compliant. Budget the length to fit within exactly ${atsTargetPages} page(s).
CRITICAL RULES FOR DESCRIPTIONS:
1. SUMMARY: If a professional summary is missing or empty, generate a compelling, professional, 2-3 sentence ATS-friendly summary based on candidate skills, title, and projects. If already present, optimize and polish it for keyword strength and impact.
2. PROJECTS: For every project, if the description is missing or empty, generate a realistic, high-impact description (1-2 punchy sentences or bullet points) explaining what was engineered, the key architecture, features, and tools used based on the project title and technical domain. If a description is already present, optimize it with strong action verbs and technical keywords.
3. WORK EXPERIENCE: For every work experience, if the description is missing or empty, generate standard, realistic bulleted achievements and responsibilities matching the job title and company. If already present, optimize and quantify the bullet points.
4. CERTIFICATIONS & WORKSHOPS: If the description is missing, generate a concise 1-line description of the skills or topics covered. If present, polish it.
5. EDUCATION: If description is missing and relevant coursework/achievements fit, add relevant academic coursework or honors. If present, polish it.
6. ABSOLUTE ZERO DELETION: Never drop any existing project, job, education entry, certification, or skill. Preserve all items.`,
        existingResume: resumeData
      };
      formData.append('userInput', JSON.stringify(optimizationPrompt));

      const res = await authFetch('/api/generate-resume', { method: 'POST', body: formData });
      if (res.status === 401) {
        removeStorageItem("userLoggedIn");
        alert("Your session has expired. Please sign in again to continue.");
        router.push("/login?redirect=/features");
        return;
      }

      let result: any;
      const contentType = res.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        result = await res.json();
      } else if (res.status === 504) {
        throw new Error("The AI server timed out while optimizing your resume. Please try again.");
      } else {
        const text = await res.text();
        throw new Error(text || `Server returned HTTP ${res.status}`);
      }

      if (!res.ok || result.error) {
        alert('ATS optimization failed: ' + (result.error || `HTTP ${res.status}`));
      } else {
        const updatedData = { ...resumeData };

        // 1. Preserve and optimize personalInfo
        updatedData.personalInfo = {
          ...resumeData.personalInfo,
          name: (result.personalInfo?.name && result.personalInfo.name.trim()) || resumeData.personalInfo.name,
          title: (result.personalInfo?.title && result.personalInfo.title.trim()) || resumeData.personalInfo.title,
          email: (result.personalInfo?.email && result.personalInfo.email.trim()) || resumeData.personalInfo.email,
          phone: (result.personalInfo?.phone && result.personalInfo.phone.trim()) || resumeData.personalInfo.phone,
          location: (result.personalInfo?.location && result.personalInfo.location.trim()) || resumeData.personalInfo.location,
          linkedin: (result.personalInfo?.linkedin && result.personalInfo.linkedin.trim()) || resumeData.personalInfo.linkedin,
          github: (result.personalInfo?.github && result.personalInfo.github.trim()) || resumeData.personalInfo.github,
          website: (result.personalInfo?.website && result.personalInfo.website.trim()) || resumeData.personalInfo.website,
          avatar: resumeData.personalInfo.avatar,
          summary: (result.summary && result.summary.trim()) || (result.personalInfo?.summary && result.personalInfo.summary.trim()) || resumeData.personalInfo.summary
        };

        // 2. Work Experience: Item-level reconciliation (keep unreturned jobs intact, never wipe with [])
        if (resumeData.workExperience.length > 0) {
          if (Array.isArray(result.workExperience) && result.workExperience.length > 0) {
            updatedData.workExperience = resumeData.workExperience.map((origJob, idx) => {
              const matched = result.workExperience.find((j: any) => 
                (j.company && origJob.company && j.company.trim().toLowerCase() === origJob.company.trim().toLowerCase()) ||
                (j.id && origJob.id && j.id === origJob.id)
              ) || (result.workExperience[idx] && !resumeData.workExperience.some((oj, oIdx) => oIdx !== idx && oj.company && result.workExperience[idx].company && oj.company.trim().toLowerCase() === result.workExperience[idx].company.trim().toLowerCase()) ? result.workExperience[idx] : null);

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

            // Append any valid new experience from AI not in original
            result.workExperience.forEach((aiJob: any) => {
              const alreadyExists = updatedData.workExperience.some(w => 
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
          // If candidate had zero work experience, do NOT invent fake corporate jobs
          updatedData.workExperience = [];
        }

        // 3. Education: Item-level reconciliation (keep unreturned education intact, never wipe with [])
        if (resumeData.education.length > 0) {
          if (Array.isArray(result.education) && result.education.length > 0) {
            updatedData.education = resumeData.education.map((origEdu, idx) => {
              const matched = result.education.find((e: any) => 
                (e.institution && origEdu.institution && e.institution.trim().toLowerCase() === origEdu.institution.trim().toLowerCase()) ||
                (e.degree && origEdu.degree && e.degree.trim().toLowerCase() === origEdu.degree.trim().toLowerCase()) ||
                (e.id && origEdu.id && e.id === origEdu.id)
              ) || (result.education[idx] && !resumeData.education.some((oe, oIdx) => oIdx !== idx && oe.institution && result.education[idx].institution && oe.institution.trim().toLowerCase() === result.education[idx].institution.trim().toLowerCase()) ? result.education[idx] : null);

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
                  description: (matched.description && matched.description.trim()) ? matched.description : origEdu.description
                };
              }
              return origEdu;
            });
          } else {
            updatedData.education = [...resumeData.education];
          }
        }

        // 4. Projects: Item-level reconciliation (keep unreturned projects intact, never wipe with [])
        if (resumeData.projects.length > 0) {
          if (Array.isArray(result.projects) && result.projects.length > 0) {
            updatedData.projects = resumeData.projects.map((origProj, idx) => {
              const matched = result.projects.find((p: any) => 
                (p.name && origProj.name && p.name.trim().toLowerCase() === origProj.name.trim().toLowerCase()) ||
                (p.id && origProj.id && p.id === origProj.id)
              ) || (result.projects[idx] && !resumeData.projects.some((op, oIdx) => oIdx !== idx && op.name && result.projects[idx].name && op.name.trim().toLowerCase() === result.projects[idx].name.trim().toLowerCase()) ? result.projects[idx] : null);

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

            // Append any valid new projects from AI
            result.projects.forEach((aiProj: any) => {
              const alreadyExists = updatedData.projects.some(p => 
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

        // 5. Skills: Preserve all original skills, refine categories/levels if provided
        if (resumeData.skills.length > 0) {
          if (Array.isArray(result.skills) && result.skills.length > 0) {
            const skillMap = new Map<string, any>();
            // Seed with all original skills
            resumeData.skills.forEach(s => skillMap.set(s.name.trim().toLowerCase(), { ...s }));
            // Apply refinements
            result.skills.forEach((s: any) => {
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

        // 6. Languages: Preserve all original languages
        if (resumeData.languages.length > 0) {
          if (Array.isArray(result.languages) && result.languages.length > 0) {
            updatedData.languages = resumeData.languages.map((origLang, idx) => {
              const matched = result.languages.find((l: any) => 
                l.name && origLang.name && l.name.trim().toLowerCase() === origLang.name.trim().toLowerCase()
              ) || result.languages[idx];
              return matched ? { ...origLang, proficiency: matched.proficiency || origLang.proficiency } : origLang;
            });
          } else {
            updatedData.languages = [...resumeData.languages];
          }
        }

        // 7. Certifications: Preserve all original certifications
        if (resumeData.certifications.length > 0) {
          if (Array.isArray(result.certifications) && result.certifications.length > 0) {
            updatedData.certifications = resumeData.certifications.map((origCert, idx) => {
              const matched = result.certifications.find((c: any) => 
                c.name && origCert.name && c.name.trim().toLowerCase() === origCert.name.trim().toLowerCase()
              ) || result.certifications[idx];
              return matched ? {
                ...origCert,
                name: matched.name || origCert.name,
                issuer: matched.issuer || origCert.issuer,
                date: matched.date || origCert.date,
                link: matched.link || origCert.link,
                description: (matched.description && matched.description.trim()) ? matched.description : origCert.description
              } : origCert;
            });
          } else {
            updatedData.certifications = [...resumeData.certifications];
          }
        }

        // 8. Custom Sections: Preserve all original custom sections
        if (resumeData.customSections.length > 0) {
          if (Array.isArray(result.customSections) && result.customSections.length > 0) {
            updatedData.customSections = resumeData.customSections.map((origSect, idx) => {
              const matched = result.customSections.find((cs: any) => 
                cs.title && origSect.title && cs.title.trim().toLowerCase() === origSect.title.trim().toLowerCase()
              ) || result.customSections[idx];
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

        // PRE-COMMIT DATA INTEGRITY VALIDATION:
        // Guarantee that no populated original section loses data
        if (resumeData.projects.length > 0 && updatedData.projects.length < resumeData.projects.length) {
          console.warn("[ATS Optimize] Restoring missing projects to prevent data loss");
          resumeData.projects.forEach(orig => {
            if (!updatedData.projects.some(p => p.name?.toLowerCase() === orig.name?.toLowerCase() || p.id === orig.id)) {
              updatedData.projects.push(orig);
            }
          });
        }
        if (resumeData.education.length > 0 && updatedData.education.length < resumeData.education.length) {
          console.warn("[ATS Optimize] Restoring missing education to prevent data loss");
          resumeData.education.forEach(orig => {
            if (!updatedData.education.some(e => e.institution?.toLowerCase() === orig.institution?.toLowerCase() || e.id === orig.id)) {
              updatedData.education.push(orig);
            }
          });
        }
        if (resumeData.workExperience.length > 0 && updatedData.workExperience.length < resumeData.workExperience.length) {
          console.warn("[ATS Optimize] Restoring missing work experience to prevent data loss");
          resumeData.workExperience.forEach(orig => {
            if (!updatedData.workExperience.some(w => w.company?.toLowerCase() === orig.company?.toLowerCase() || w.id === orig.id)) {
              updatedData.workExperience.push(orig);
            }
          });
        }
        if (resumeData.skills.length > 0 && updatedData.skills.length < resumeData.skills.length) {
          console.warn("[ATS Optimize] Restoring missing skills to prevent data loss");
          resumeData.skills.forEach(orig => {
            if (!updatedData.skills.some(s => s.name?.toLowerCase() === orig.name?.toLowerCase() || s.id === orig.id)) {
              updatedData.skills.push(orig);
            }
          });
        }
        if (resumeData.certifications.length > 0 && updatedData.certifications.length < resumeData.certifications.length) {
          resumeData.certifications.forEach(orig => {
            if (!updatedData.certifications.some(c => c.name?.toLowerCase() === orig.name?.toLowerCase() || c.id === orig.id)) {
              updatedData.certifications.push(orig);
            }
          });
        }
        if (resumeData.languages.length > 0 && updatedData.languages.length < resumeData.languages.length) {
          resumeData.languages.forEach(orig => {
            if (!updatedData.languages.some(l => l.name?.toLowerCase() === orig.name?.toLowerCase() || l.id === orig.id)) {
              updatedData.languages.push(orig);
            }
          });
        }
        if (resumeData.customSections.length > 0 && updatedData.customSections.length < resumeData.customSections.length) {
          resumeData.customSections.forEach(orig => {
            if (!updatedData.customSections.some(cs => cs.title?.toLowerCase() === orig.title?.toLowerCase() || cs.id === orig.id)) {
              updatedData.customSections.push(orig);
            }
          });
        }

        setResumeData(updatedData);
        setShowAtsOptimizeModal(false);
        if (result.isFallback) {
          triggerToast('Formatted with standard ATS template (Gemini API was rate-limited)');
        } else {
          triggerToast('Resume optimized successfully for ATS compliance!');
        }
      }
    } catch (err: any) {
      alert('ATS optimization error: ' + (err.message || 'Unknown error'));
    } finally {
      setIsAILoading(false);
    }
  };

  const userRole = (getStorageItem("userRole") || "").toLowerCase();
  const userType = (getStorageItem("userType") || "").toLowerCase();
  const isStudentOrFresher = userRole === 'student' || userRole === 'fresher' || userType === 'student' || userType === 'fresher' || resumeData.workExperience.length === 0;
  const isTemplateAtsFriendly = activeTemplateId.startsWith('tmpl-ats-');
  const shouldShowAtsWarning = showAtsWarning;

  useEffect(() => {
    if (onAtsWarningChange) {
      onAtsWarningChange(shouldShowAtsWarning);
    }
  }, [shouldShowAtsWarning, onAtsWarningChange]);

  return (
    <div className={`resume-builder-pro ${isFullscreen ? 'fullscreen-mode' : ''}`}>
      {/* 1. Resume Builder Header (Identity & Action Buttons) */}
      <div className="nav-header no-print">
        <div className="brand">
          <FileText className="brand-icon" size={18} />
          <h1>Resume Builder Pro</h1>
        </div>
        <div className="nav-actions">
          <button 
            type="button"
            className="btn btn-secondary btn-header-action" 
            onClick={() => setIsFullscreen(!isFullscreen)}
            title={isFullscreen ? "Exit Fullscreen" : "Go Fullscreen"}
          >
            {isFullscreen ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            <span>{isFullscreen ? "Exit" : "Full"}</span>
          </button>

          {onClose && (
            <button 
              type="button"
              className="btn btn-secondary btn-header-action btn-exit" 
              onClick={onClose}
              title="Close Resume Builder"
            >
              <X size={13} />
              <span>Exit</span>
            </button>
          )}
        </div>
      </div>

      {/* 2. Mobile View Switcher (Sleek Segmented Pill) */}
      <div className="mobile-view-selector no-print">
        <div className="mobile-segmented-control">
          <button 
            type="button" 
            className={`view-btn ${mobileView === 'editor' ? 'active' : ''}`}
            onClick={() => setMobileView('editor')}
          >
            <PenLine size={13} />
            <span>Editor</span>
          </button>
          <button 
            type="button" 
            className={`view-btn ${mobileView === 'preview' ? 'active' : ''}`}
            onClick={() => setMobileView('preview')}
          >
            <Eye size={13} />
            <span>Preview</span>
          </button>
        </div>
      </div>

      {/* 3. ATS Advisory Notice (Ultra-compact, minimum spacing) */}
      {showAtsWarning && mobileView !== 'preview' && (
        <div className="ats-notice-bar no-print">
          <div className="ats-notice-content">
            <AlertTriangle size={12} className="ats-notice-icon" />
            <span className="ats-notice-text">
              If you are a fresher or a college student, then select ATS templates.
              <button 
                type="button"
                className="ats-notice-cta"
                onClick={() => {
                  setActiveTab('templates');
                  setSelectedTemplateCategory('ATS Friendly');
                  triggerToast('Filtered ATS Friendly templates');
                }}
              >
                Select ATS &rarr;
              </button>
            </span>
          </div>
          <button 
            type="button"
            className="ats-notice-dismiss"
            onClick={() => setShowAtsWarning(false)}
            title="Dismiss notice"
          >
            <X size={11} />
          </button>
        </div>
      )}

      <div className="app-container">
        {/* 1. LEFT SIDEBAR PANEL */}
        <aside className={`sidebar-panel no-print ${mobileView === 'editor' ? 'mobile-visible' : 'mobile-hidden'}`} style={{ position: 'relative' }}>
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
                onConfirm={(opts) => setConfirmDialog({ isOpen: true, ...opts })}
              />
            )}

            {activeTab === 'templates' && (
              <TemplateSelector
                activeTemplateId={activeTemplateId}
                onSelectTemplate={handleSelectTemplate}
                selectedCategory={selectedTemplateCategory}
                onCategoryChange={setSelectedTemplateCategory}
              />
            )}

            {activeTab === 'style' && (
              <StyleCustomizer 
                style={currentStyle} 
                onChangeStyle={setCurrentStyle} 
                isAtsFriendly={isTemplateAtsFriendly}
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

          {/* AI Resume Assistant Modal */}
          {showAIModal && (
            <>
              <div 
                className="ai-modal-backdrop"
                onClick={() => { if (!isAILoading) { setShowAIModal(false); } }}
              />
              <div className="no-print ai-modal-body">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '2rem', height: '2rem', borderRadius: '0.5rem',
                      background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Sparkles size={14} color="#fff" />
                    </div>
                    <h3 className="ai-modal-title">AI Resume Assistant</h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { if (!isAILoading) setShowAIModal(false); }}
                    className="ai-modal-close-btn"
                  >
                    <X size={18} />
                  </button>
                </div>

                {aiModalStep === 'choice' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <p className="ai-modal-desc">
                      Select your desired data source for AI auto-fill. You can generate details from a resume file or analyze your web portfolio page.
                    </p>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          setAiSourceMode('resume');
                          setMissingSectionsList(["summary", "workExperience", "education", "projects", "skills", "languages", "certifications"]);
                          if (accountResumeText) {
                            setIsUsingAccountResume(true);
                            const textFileName = (accountResumeName || 'Account_Resume.pdf').replace(/\.[^/.]+$/, "") + ".txt";
                            const file = new File([accountResumeText], textFileName, { type: 'text/plain' });
                            setResumeUploadFile(file);
                          } else {
                            setIsUsingAccountResume(false);
                            setResumeUploadFile(null);
                          }
                          setAiModalStep('upload');
                        }}
                        className="ai-modal-choice-btn-primary"
                        style={{ textAlign: 'left', padding: '0.85rem 1rem' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <FileText size={16} color="#a78bfa" />
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#a78bfa' }}>Resume File</span>
                        </div>
                        <span className="ai-modal-desc" style={{ fontSize: '0.75rem', display: 'block', margin: 0 }}>
                          Upload a PDF, DOCX, or text file. If you already have a resume saved in your account, it will be loaded automatically.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAiSourceMode('portfolio');
                          setAiModalStep('portfolio_input');
                          setMissingSectionsList(["summary", "workExperience", "education", "projects", "skills", "languages", "certifications"]);
                        }}
                        className="ai-modal-choice-btn-secondary"
                        style={{ textAlign: 'left', padding: '0.85rem 1rem' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <Globe size={16} color="#38bdf8" />
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#38bdf8' }}>
                            Web Portfolio {portfolioInputUrl ? '(Detected)' : ''}
                          </span>
                        </div>
                        <span className="ai-modal-desc" style={{ fontSize: '0.75rem', display: 'block', margin: 0 }}>
                          Provide your portfolio website URL. AI will extract work experience, projects, and skills to generate your resume.
                        </span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          setAiSourceMode('both');
                          setMissingSectionsList(["summary", "workExperience", "education", "projects", "skills", "languages", "certifications"]);
                          if (accountResumeText) {
                            setIsUsingAccountResume(true);
                            const textFileName = (accountResumeName || 'Account_Resume.pdf').replace(/\.[^/.]+$/, "") + ".txt";
                            const file = new File([accountResumeText], textFileName, { type: 'text/plain' });
                            setResumeUploadFile(file);
                          } else {
                            setIsUsingAccountResume(false);
                            setResumeUploadFile(null);
                          }
                          setAiModalStep('both_input');
                        }}
                        className="ai-modal-choice-btn-accent"
                        style={{ textAlign: 'left', padding: '0.85rem 1rem' }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                          <Sparkles size={16} color="#34d399" />
                          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#34d399' }}>
                            Resume + Web Portfolio (Both)
                          </span>
                        </div>
                        <span className="ai-modal-desc" style={{ fontSize: '0.75rem', display: 'block', margin: 0 }}>
                          Provide BOTH your resume file and web portfolio URL. AI will compare, cross-reference, and merge the best sections of both.
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {aiModalStep === 'upload' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                    <p className="ai-modal-desc" style={{ margin: 0 }}>
                      Choose your account resume or upload a new resume file (<strong>PDF, TXT, DOCX</strong>):
                    </p>

                    {accountResumeText && (
                      <div
                        style={{
                          padding: '0.85rem 1rem',
                          borderRadius: '0.5rem',
                          background: isUsingAccountResume ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                          border: isUsingAccountResume ? '1.5px solid rgba(139, 92, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '0.6rem',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onClick={() => {
                          setIsUsingAccountResume(true);
                          const textFileName = (accountResumeName || 'Account_Resume.pdf').replace(/\.[^/.]+$/, "") + ".txt";
                          const file = new File([accountResumeText], textFileName, { type: 'text/plain' });
                          setResumeUploadFile(file);
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                          <Check size={16} color={isUsingAccountResume ? "#a78bfa" : "#64748b"} />
                          <div>
                            <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-main)', display: 'block' }}>
                              Saved Profile Resume: {accountResumeName}
                            </span>
                            <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                              From your account profile
                            </span>
                          </div>
                        </div>
                        {isUsingAccountResume && (
                          <span style={{ fontSize: '0.7rem', background: '#8b5cf6', color: '#fff', padding: '0.15rem 0.5rem', borderRadius: '9999px', fontWeight: 700 }}>
                            Active
                          </span>
                        )}
                      </div>
                    )}

                    <div 
                      className="ai-modal-upload-box"
                      style={!isUsingAccountResume && resumeUploadFile ? { borderColor: '#8b5cf6', background: 'rgba(139, 92, 246, 0.08)' } : {}}
                      onClick={() => document.getElementById('ai-resume-file-input-sidebar')?.click()}
                    >
                      <input
                        type="file"
                        id="ai-resume-file-input-sidebar"
                        accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            if (file.size > 10 * 1024 * 1024) {
                              alert("File size exceeds 10MB limit. Please upload a smaller file.");
                              return;
                            }
                            setResumeUploadFile(file);
                            setIsUsingAccountResume(false);
                          }
                        }}
                        style={{ display: 'none' }}
                      />
                      <FileText size={32} color="#8b5cf6" style={{ opacity: 0.8 }} />
                      <span className="ai-modal-upload-text">
                        {!isUsingAccountResume && resumeUploadFile ? resumeUploadFile.name : 'Upload New Resume File'}
                      </span>
                      <span className="ai-modal-upload-sub">
                        {!isUsingAccountResume && resumeUploadFile ? `${(resumeUploadFile.size / 1024 / 1024).toFixed(2)} MB (Ready to import)` : 'Click to select PDF, DOCX, or TXT from your device'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setAiModalStep('choice')}
                        className="ai-modal-back-btn"
                        disabled={isAILoading}
                      >Back</button>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button
                          type="button"
                          onClick={() => {
                            if (!resumeUploadFile) {
                              alert("Please upload a resume file first.");
                              return;
                            }
                            handleAIGenerate();
                          }}
                          disabled={isAILoading || !resumeUploadFile}
                          style={{
                            padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 700,
                            background: isAILoading ? 'rgba(16, 185, 129, 0.4)' : 'linear-gradient(135deg, #10b981, #059669)',
                            border: 'none', borderRadius: '0.5rem', color: '#fff',
                            cursor: (isAILoading || !resumeUploadFile) ? 'not-allowed' : 'pointer',
                            opacity: (!resumeUploadFile && !isAILoading) ? 0.6 : 1,
                            display: 'flex', alignItems: 'center', gap: '0.35rem',
                            boxShadow: '0 0 15px rgba(16, 185, 129, 0.25)'
                          }}
                        >
                          <Sparkles size={14} style={isAILoading ? { animation: 'spin 1s linear infinite' } : {}} />
                          {isAILoading ? 'Extracting...' : 'Autofill Now'}
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            if (!resumeUploadFile) {
                              alert("Please upload a resume file first.");
                              return;
                            }
                            setAiModalStep('notes');
                          }}
                          disabled={isAILoading || !resumeUploadFile}
                          style={{
                            padding: '0.5rem 0.9rem', fontSize: '0.8rem', fontWeight: 600,
                            background: 'rgba(139, 92, 246, 0.2)',
                            border: '1px solid rgba(139, 92, 246, 0.4)',
                            borderRadius: '0.5rem', color: '#a78bfa',
                            cursor: (isAILoading || !resumeUploadFile) ? 'not-allowed' : 'pointer'
                          }}
                        >Customize &gt;</button>
                      </div>
                    </div>
                  </div>
                )}

                {aiModalStep === 'both_input' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <p className="ai-modal-desc">
                      Upload your resume and enter your web portfolio URL. AI will cross-reference and merge information from both documents.
                    </p>

                    {/* Resume Upload Box (reused from upload step) */}
                    <div>
                      <label className="ai-modal-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Resume / CV Document</label>
                      {accountResumeText && (
                        <div
                          style={{
                            padding: '0.75rem 0.85rem',
                            borderRadius: '0.5rem',
                            marginBottom: '0.6rem',
                            background: isUsingAccountResume ? 'rgba(139, 92, 246, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                            border: isUsingAccountResume ? '1.5px solid rgba(139, 92, 246, 0.6)' : '1px solid rgba(255, 255, 255, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            gap: '0.5rem',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => {
                            setIsUsingAccountResume(true);
                            const textFileName = (accountResumeName || 'Account_Resume.pdf').replace(/\.[^/.]+$/, "") + ".txt";
                            const file = new File([accountResumeText], textFileName, { type: 'text/plain' });
                            setResumeUploadFile(file);
                          }}
                        >
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', minWidth: 0 }}>
                            <Check size={14} color={isUsingAccountResume ? "#a78bfa" : "#64748b"} />
                            <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-main)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              Saved Profile Resume: {accountResumeName}
                            </span>
                          </div>
                          {isUsingAccountResume && (
                            <span style={{ fontSize: '0.68rem', background: '#8b5cf6', color: '#fff', padding: '0.1rem 0.45rem', borderRadius: '9999px', fontWeight: 700 }}>
                              Active
                            </span>
                          )}
                        </div>
                      )}

                      <div 
                        className="ai-modal-upload-box"
                        onClick={() => document.getElementById('ai-resume-file-input-both')?.click()}
                        style={{
                          padding: '0.85rem 0.5rem',
                          minHeight: '75px',
                          ...(!isUsingAccountResume && resumeUploadFile ? { borderColor: '#8b5cf6', background: 'rgba(139, 92, 246, 0.08)' } : {})
                        }}
                      >
                        <input
                          type="file"
                          id="ai-resume-file-input-both"
                          accept=".pdf,.txt,.doc,.docx,.png,.jpg,.jpeg,.webp"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              if (file.size > 10 * 1024 * 1024) {
                                alert("File size exceeds 10MB limit. Please upload a smaller file.");
                                return;
                              }
                              setResumeUploadFile(file);
                              setIsUsingAccountResume(false);
                            }
                          }}
                          style={{ display: 'none' }}
                        />
                        <FileText size={24} color="#8b5cf6" style={{ opacity: 0.8, marginBottom: '0.25rem' }} />
                        <span className="ai-modal-upload-text" style={{ fontSize: '0.8rem' }}>
                          {!isUsingAccountResume && resumeUploadFile ? resumeUploadFile.name : 'Upload New Resume File (PDF, DOCX, TXT)'}
                        </span>
                        <span className="ai-modal-upload-sub" style={{ fontSize: '0.7rem' }}>
                          {!isUsingAccountResume && resumeUploadFile ? `${(resumeUploadFile.size / 1024 / 1024).toFixed(2)} MB (Ready to import)` : 'Click to select PDF or DOCX file'}
                        </span>
                      </div>
                    </div>

                    {/* Portfolio Input (reused from portfolio_input step) */}
                    <div>
                      <label className="ai-modal-label" style={{ marginBottom: '0.4rem', display: 'block' }}>Portfolio Website URL</label>
                      <input
                        type="url"
                        value={portfolioInputUrl}
                        onChange={(e) => setPortfolioInputUrl(e.target.value)}
                        placeholder="e.g. https://yourportfolio.com"
                        className="ai-modal-input"
                      />
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setAiModalStep('choice')}
                        className="ai-modal-back-btn"
                      >Back</button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!resumeUploadFile) {
                            alert("Please upload or fetch a resume file first.");
                            return;
                          }
                          if (!portfolioInputUrl.trim()) {
                            alert("Please enter your portfolio URL.");
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

                {aiModalStep === 'portfolio_input' && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                    <p className="ai-modal-desc">
                      Enter your portfolio website URL, target role, and target company. AI will crawl and extract the content to generate your resume details.
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                      <div>
                        <label className="ai-modal-label">Portfolio Website URL</label>
                        <input
                          type="url"
                          value={portfolioInputUrl}
                          onChange={(e) => setPortfolioInputUrl(e.target.value)}
                          placeholder="e.g. https://yourportfolio.com"
                          className="ai-modal-input"
                        />
                      </div>

                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                        <label className="ai-modal-label">Job Search Target Mode</label>
                        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <button
                            type="button"
                            onClick={() => setAiRoleMode('specified')}
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              background: aiRoleMode === 'specified' ? '#8b5cf6' : 'transparent',
                              color: aiRoleMode === 'specified' ? '#ffffff' : '#9ca3af',
                              transition: 'all 0.2s'
                            }}
                          >
                            Role Specified
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiRoleMode('fresher')}
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              background: aiRoleMode === 'fresher' ? '#8b5cf6' : 'transparent',
                              color: aiRoleMode === 'fresher' ? '#ffffff' : '#9ca3af',
                              transition: 'all 0.2s'
                            }}
                          >
                            Without Role (Fresher Mode)
                          </button>
                        </div>
                      </div>

                      {aiRoleMode === 'specified' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                          <div>
                            <label className="ai-modal-label">Target Role</label>
                            <input
                              type="text"
                              value={aiTargetRoles}
                              onChange={(e) => setAiTargetRoles(e.target.value)}
                              placeholder="e.g. Frontend Developer"
                              className="ai-modal-input"
                            />
                          </div>

                          <div>
                            <label className="ai-modal-label">Target Company</label>
                            <input
                              type="text"
                              value={aiTargetCompanies}
                              onChange={(e) => setAiTargetCompanies(e.target.value)}
                              placeholder="e.g. Google"
                              className="ai-modal-input"
                            />
                          </div>
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => setAiModalStep('choice')}
                        className="ai-modal-back-btn"
                        disabled={isAILoading}
                      >Back</button>
                      <button
                        type="button"
                        onClick={() => {
                          if (!portfolioInputUrl.trim()) {
                            alert("Please enter your portfolio URL first.");
                            return;
                          }
                          handleAIGenerate();
                        }}
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
                )}

                {aiModalStep === 'notes' && (
                  <>
                    {resumeUploadFile ? (
                      <div className="ai-modal-info-box">
                        <Check size={14} color="#10b981" />
                        <span>Ready to import from: <strong>{resumeUploadFile.name}</strong></span>
                      </div>
                    ) : (
                      <p className="ai-modal-desc" style={{ fontSize: '0.78rem', margin: '0 0 1.25rem 0' }}>
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
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginBottom: '0.5rem' }}>
                        <label className="ai-modal-label">Job Search Target Mode</label>
                        <div style={{ display: 'flex', gap: '0.5rem', background: 'rgba(255, 255, 255, 0.05)', padding: '4px', borderRadius: '6px', border: '1px solid rgba(255, 255, 255, 0.1)' }}>
                          <button
                            type="button"
                            onClick={() => setAiRoleMode('specified')}
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              background: aiRoleMode === 'specified' ? '#8b5cf6' : 'transparent',
                              color: aiRoleMode === 'specified' ? '#ffffff' : '#9ca3af',
                              transition: 'all 0.2s'
                            }}
                          >
                            Role Specified
                          </button>
                          <button
                            type="button"
                            onClick={() => setAiRoleMode('fresher')}
                            style={{
                              flex: 1,
                              padding: '6px 12px',
                              fontSize: '0.78rem',
                              fontWeight: 600,
                              borderRadius: '4px',
                              border: 'none',
                              cursor: 'pointer',
                              background: aiRoleMode === 'fresher' ? '#8b5cf6' : 'transparent',
                              color: aiRoleMode === 'fresher' ? '#ffffff' : '#9ca3af',
                              transition: 'all 0.2s'
                            }}
                          >
                            Without Role (Fresher Mode)
                          </button>
                        </div>
                      </div>

                      {aiRoleMode === 'specified' && (
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.55rem' }}>
                          <div>
                            <label className="ai-modal-label">Target Roles</label>
                            <input
                              type="text"
                              value={aiTargetRoles}
                              onChange={(e) => setAiTargetRoles(e.target.value)}
                              placeholder="e.g. Frontend Engineer"
                              className="ai-modal-input"
                            />
                          </div>

                          <div>
                            <label className="ai-modal-label">Target Companies</label>
                            <input
                              type="text"
                              value={aiTargetCompanies}
                              onChange={(e) => setAiTargetCompanies(e.target.value)}
                              placeholder="e.g. Top Tech Companies"
                              className="ai-modal-input"
                            />
                          </div>
                        </div>
                      )}

                      {missingSectionsList.includes("summary") && (
                        <div>
                          <label className="ai-modal-label">
                            Profile Summary Notes {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesSummary}
                            onChange={(e) => setAiNotesSummary(e.target.value)}
                            placeholder="Key expertise, leadership focus, or areas to highlight in your summary paragraph."
                            rows={3}
                            className="ai-modal-input"
                            style={{ resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif" }}
                          />
                        </div>
                      )}

                      {missingSectionsList.includes("workExperience") && (
                        <div>
                          <label className="ai-modal-label">
                            Work Experience Notes {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesExperience}
                            onChange={(e) => setAiNotesExperience(e.target.value)}
                            placeholder={"Describe roles, companies, and achievements.\nExample:\n- Dev at Google (2022-present): built React UI pages, optimized speed 30%."}
                            rows={4}
                            className="ai-modal-input"
                            style={{ resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif" }}
                          />
                        </div>
                      )}

                      {missingSectionsList.includes("education") && (
                        <div>
                          <label className="ai-modal-label">
                            Education Details {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesEducation}
                            onChange={(e) => setAiNotesEducation(e.target.value)}
                            placeholder="Degrees, institutions, CGPA, percentage, coursework, or years (e.g. Master's in CS, Stanford, 2022)."
                            rows={3}
                            className="ai-modal-input"
                            style={{ resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif" }}
                          />
                        </div>
                      )}

                      {missingSectionsList.includes("projects") && (
                        <div>
                          <label className="ai-modal-label">
                            Projects Details {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesProjects}
                            onChange={(e) => setAiNotesProjects(e.target.value)}
                            placeholder="Specify projects, tech stacks, role, and results (e.g. E-Commerce Next.js app with Stripe backend)."
                            rows={3}
                            className="ai-modal-input"
                            style={{ resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif" }}
                          />
                        </div>
                      )}

                      {missingSectionsList.includes("skills") && (
                        <div>
                          <label className="ai-modal-label">
                            Skills & Keywords {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesSkills}
                            onChange={(e) => setAiNotesSkills(e.target.value)}
                            placeholder="List skills and tools you want categorized (e.g. JavaScript, Python, AWS, Docker, Git)."
                            rows={3}
                            className="ai-modal-input"
                            style={{ resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif" }}
                          />
                        </div>
                      )}

                      {missingSectionsList.includes("languages") && (
                        <div>
                          <label className="ai-modal-label">
                            Languages Spoken {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesLanguages}
                            onChange={(e) => setAiNotesLanguages(e.target.value)}
                            placeholder="Languages and fluency level (e.g. English - Native, Spanish - Conversational)."
                            rows={2}
                            className="ai-modal-input"
                            style={{ resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif" }}
                          />
                        </div>
                      )}

                      {missingSectionsList.includes("certifications") && (
                        <div>
                          <label className="ai-modal-label">
                            Certifications {resumeUploadFile ? '(Optional override)' : '(Empty)'}
                          </label>
                          <textarea
                            value={aiNotesCertifications}
                            onChange={(e) => setAiNotesCertifications(e.target.value)}
                            placeholder="AWS Solutions Architect from Amazon (2023), Scrum Master from Scrum.org (2022)."
                            rows={2}
                            className="ai-modal-input"
                            style={{ resize: 'vertical', lineHeight: 1.4, fontFamily: "'Inter', sans-serif" }}
                          />
                        </div>
                      )}
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                      <button
                        type="button"
                        onClick={() => {
                          if (aiSourceMode === 'both') {
                            setAiModalStep('both_input');
                          } else if (resumeUploadFile) {
                            setAiModalStep('upload');
                          } else {
                            setAiModalStep('choice');
                          }
                        }}
                        disabled={isAILoading}
                        className="ai-modal-back-btn"
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

          {/* CUSTOM CONFIRMATION MODAL (Renders inside aside to cover only the edit column) */}
          {confirmDialog.isOpen && (
            <>
              <div 
                className="ai-modal-backdrop"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                style={{ position: 'absolute', zIndex: 9998 }}
              />
              <div className="no-print ai-modal-body" style={{ position: 'absolute', zIndex: 9999, maxWidth: '380px' }}>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'flex-start', marginBottom: '1.25rem' }}>
                  <div style={{
                    width: '2rem', height: '2rem', borderRadius: '0.5rem',
                    background: confirmDialog.type === 'info' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                    border: confirmDialog.type === 'info' ? '1px solid rgba(59, 130, 246, 0.2)' : '1px solid rgba(239, 68, 68, 0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                  }}>
                    {confirmDialog.type === 'info' ? (
                      <Info size={16} color="#3b82f6" />
                    ) : (
                      <AlertTriangle size={16} color="#ef4444" />
                    )}
                  </div>
                  <div>
                    <h3 className="ai-modal-title" style={{ fontSize: '1rem', fontWeight: 800 }}>{confirmDialog.title}</h3>
                    <p className="ai-modal-desc" style={{ fontSize: '0.78rem', marginTop: '0.35rem', lineHeight: '1.4' }}>{confirmDialog.message}</p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--panel-border)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                    className="ai-modal-back-btn"
                    style={{ fontSize: '0.75rem', padding: '0.4rem 0.85rem' }}
                  >
                    {confirmDialog.cancelText || "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      confirmDialog.onConfirm();
                      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                    }}
                    style={{
                      padding: '0.4rem 1rem', fontSize: '0.75rem', fontWeight: 700,
                      background: confirmDialog.type === 'info' ? 'rgba(59, 130, 246, 1)' : 'rgb(220, 38, 38)',
                      border: 'none', borderRadius: '0.5rem', color: '#fff',
                      cursor: 'pointer',
                      boxShadow: confirmDialog.type === 'info' ? '0 0 15px rgba(59, 130, 246, 0.2)' : '0 0 15px rgba(220, 38, 38, 0.2)'
                    }}
                  >
                    {confirmDialog.confirmText || "Confirm"}
                  </button>
                </div>
              </div>
            </>
          )}
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
          <div className="no-print preview-toolbar" style={{
            background: 'var(--app-bg)', // Opaque main color to completely hide scrolling content underneath
            borderBottom: '1px solid var(--panel-border)',
            padding: '0.75rem 1rem',
            position: 'sticky',
            top: 0,
            zIndex: 10,
            width: '100%',
            boxSizing: 'border-box'
          }}>
            {/* Mobile Toolbar Header: Single permanent row on mobile, hidden on desktop */}
            <div className="mobile-toolbar-header" style={{
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              gap: '0.5rem'
            }}>
              {/* LEFT: Save, Download, Folder buttons */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  title="Save Resume"
                  style={{
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                    height: '2rem',
                    borderRadius: '6px'
                  }}
                >
                  <Save size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintGuide(true)}
                  title="Download as PDF / Print"
                  style={{
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                    backgroundColor: '#10b981',
                    border: '1px solid #059669',
                    color: '#fff',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    height: '2rem'
                  }}
                >
                  <Download size={14} />
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowSavedResumesModal(true)}
                  title="My Saved Resumes"
                  style={{
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    background: 'transparent',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-main)',
                    height: '2rem',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Folder size={14} />
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleCreateBlankResume}
                  title="Create New Resume"
                  style={{
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    background: 'transparent',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-main)',
                    height: '2rem',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} />
                </button>
              </div>

              {/* RIGHT: ATS AI Optimizer + Info Note icon */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexShrink: 0 }}>
                {isTemplateAtsFriendly && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setAtsTargetRole(resumeData.personalInfo.title || aiTargetRoles || '');
                      setAtsTargetCompany(aiTargetCompanies || getStorageItem("targetCompany") || 'Top Tech Companies');
                      setShowAtsOptimizeModal(true);
                    }}
                    title="Optimize with AI for ATS compliance and layout"
                    style={{
                      padding: '0.4rem 0.6rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.25rem',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
                      backgroundColor: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      color: '#c084fc',
                      cursor: 'pointer',
                      height: '2rem'
                    }}
                  >
                    <Sparkles size={14} />
                    <span>ATS</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowInfoTip(!showInfoTip); }}
                  title="Show editing tip"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    width: '2rem',
                    height: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    color: showInfoTip ? 'var(--input-focus)' : 'var(--text-muted)',
                    boxSizing: 'border-box'
                  }}
                >
                  <Info size={14} />
                  {showInfoTip && (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: '2.5rem',
                        right: 0,
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--panel-border)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.7rem',
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Info size={12} className="brand-icon" style={{ flexShrink: 0 }} />
                      <span>Click any text directly on the page to edit inline!</span>
                    </div>
                  )}
                </button>
              </div>
            </div>

            {/* Actions panel: Hidden when collapsed, slides down when expanded */}
            <div className={`toolbar-actions-container ${isToolbarExpanded ? 'expanded' : 'collapsed'}`}>
              {/* Left Actions */}
              <div className="left-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', minWidth: 'auto' }}>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleSave}
                  title="Save Resume"
                  style={{
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
                    height: '2rem',
                    borderRadius: '6px'
                  }}
                >
                  <Save size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setShowPrintGuide(true)}
                  title="Download as PDF / Print"
                  style={{
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(16, 185, 129, 0.2)',
                    backgroundColor: '#10b981',
                    border: '1px solid #059669',
                    color: '#fff',
                    cursor: 'pointer',
                    borderRadius: '6px',
                    height: '2rem'
                  }}
                >
                  <Download size={14} />
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setShowSavedResumesModal(true)}
                  title="My Saved Resumes"
                  style={{
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    background: 'transparent',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-main)',
                    height: '2rem',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Folder size={14} />
                </button>
                <button
                  type="button"
                  className="btn"
                  onClick={handleCreateBlankResume}
                  title="Create New Resume"
                  style={{
                    padding: '0.4rem 0.6rem',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                    background: 'transparent',
                    border: '1px solid var(--panel-border)',
                    color: 'var(--text-main)',
                    height: '2rem',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  <Plus size={14} />
                </button>

                {/* ATS AI Optimizer positioned next to My Resumes */}
                {isTemplateAtsFriendly && (
                  <button
                    type="button"
                    className="btn"
                    onClick={() => {
                      setAtsTargetRole(resumeData.personalInfo.title || aiTargetRoles || '');
                      setAtsTargetCompany(aiTargetCompanies || getStorageItem("targetCompany") || 'Top Tech Companies');
                      setShowAtsOptimizeModal(true);
                    }}
                    title="Optimize with AI for ATS compliance and layout"
                    style={{
                      padding: '0.4rem 0.8rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.35rem',
                      boxShadow: '0 4px 12px rgba(139, 92, 246, 0.2)',
                      backgroundColor: 'rgba(139, 92, 246, 0.15)',
                      border: '1px solid rgba(139, 92, 246, 0.3)',
                      borderRadius: '8px',
                      color: '#c084fc',
                      cursor: 'pointer',
                      height: '2rem'
                    }}
                  >
                    <Sparkles size={14} />
                    <span>ATS AI Optimizer</span>
                  </button>
                )}
              </div>

              {/* Center Section: Active file name */}
              <div className="center-actions" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                {activeResumeId && (
                  <div style={{
                    background: 'transparent',
                    border: '1px solid var(--panel-border)',
                    padding: '0.4rem 0.6rem',
                    borderRadius: '8px',
                    fontSize: '0.7rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    whiteSpace: 'nowrap'
                  }} title={savedResumes.find(r => r.id === activeResumeId)?.title}>
                    <FileText size={12} style={{ color: 'var(--input-focus)', flexShrink: 0 }} />
                    <span style={{ marginRight: '0.2rem' }}>Editing:</span>
                    <strong style={{ color: 'var(--text-main)' }}>
                      {savedResumes.find(r => r.id === activeResumeId)?.title}
                    </strong>
                  </div>
                )}
              </div>

              {/* Right Actions - Visible on Desktop, hidden on Mobile */}
              <div className="right-actions" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap', justifyContent: 'flex-end', minWidth: 'auto' }}>
                <div style={{
                  background: 'transparent',
                  border: '1px solid var(--panel-border)',
                  padding: '0.3rem 0.5rem',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  height: '2rem',
                  boxSizing: 'border-box'
                }}>
                  <button 
                    type="button"
                    className="btn-icon" 
                    onClick={() => { setZoom(Math.max(0.35, zoom - 0.05)); setIsManualZoom(true); }} 
                    style={{ padding: '0.2rem', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                  >
                    <ZoomOut size={14} />
                  </button>
                  <span 
                    onClick={() => setIsManualZoom(false)}
                    title="Click to reset to Auto Fit"
                    style={{ 
                      fontSize: '0.75rem', 
                      fontWeight: 600, 
                      color: isManualZoom ? 'var(--text-muted)' : 'var(--input-focus)', 
                      minWidth: '35px', 
                      textAlign: 'center',
                      cursor: 'pointer',
                      userSelect: 'none'
                    }}
                  >
                    {Math.round(zoom * 100)}%
                  </span>
                  <button 
                    type="button"
                    className="btn-icon" 
                    onClick={() => { setZoom(Math.min(1.2, zoom + 0.05)); setIsManualZoom(true); }}
                    style={{ padding: '0.2rem', background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', color: 'var(--text-muted)' }}
                  >
                    <ZoomIn size={14} />
                  </button>
                </div>

                {/* Info Tip popover button */}
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setShowInfoTip(!showInfoTip); }}
                  title="Show editing tip"
                  style={{
                    background: 'transparent',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '8px',
                    width: '2rem',
                    height: '2rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    position: 'relative',
                    color: showInfoTip ? 'var(--input-focus)' : 'var(--text-muted)',
                    boxSizing: 'border-box'
                  }}
                >
                  <Info size={14} />
                  {showInfoTip && (
                    <div 
                      onClick={(e) => e.stopPropagation()}
                      style={{
                        position: 'absolute',
                        top: '2.5rem',
                        right: 0,
                        background: 'var(--panel-bg)',
                        border: '1px solid var(--panel-border)',
                        padding: '0.5rem 0.75rem',
                        borderRadius: '8px',
                        fontSize: '0.7rem',
                        color: 'var(--text-main)',
                        whiteSpace: 'nowrap',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                        zIndex: 20,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem'
                      }}
                    >
                      <Info size={12} className="brand-icon" style={{ flexShrink: 0 }} />
                      <span>Click any text directly on the page to edit inline!</span>
                    </div>
                  )}
                </button>
              </div>

            </div>
          </div>

          {/* Scrollable canvas area positioned strictly below the header */}
          <div 
            style={{
              flex: 1,
              overflow: 'auto',
              WebkitOverflowScrolling: 'touch',
              overscrollBehavior: 'contain',
              touchAction: 'pan-x pan-y pinch-zoom',
              width: '100%',
              paddingTop: '10px', // Exact 10px spacing from the header bottom edge
              display: 'block'
            }}
          >
            {/* Centering Wrapper and Scaled A4 sheets */}
            <div
              ref={containerRef}
              className="resume-preview-container-wrapper"
              style={{
                minWidth: '100%',
                width: 'max-content',
                minHeight: `${contentHeight * zoom}px`,
                position: 'relative',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                margin: '0 auto',
                paddingLeft: '16px',
                paddingRight: '16px',
                paddingBottom: '2.5rem',
                boxSizing: 'border-box'
              }}
            >
              <div
                className="resume-pages-scaler"
                style={{
                  display: 'block',
                  textAlign: 'left',
                  width: `${794 * zoom}px`,
                  height: `${contentHeight * zoom}px`,
                  position: 'relative',
                  verticalAlign: 'top',
                  flexShrink: 0,
                  margin: '0 auto'
                }}
              >
                <div 
                  className="resume-pages-wrapper"
                  style={{
                    width: '794px',
                    height: `${contentHeight}px`,
                    transform: `scale(${zoom})`,
                    transformOrigin: 'top left',
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    boxSizing: 'border-box'
                  }}
                >
                  <ResumePreview 
                    data={resumeData}
                    style={currentStyle}
                    onChangeData={setResumeData}
                    onChangeStyle={setCurrentStyle}
                    onHeightChange={setContentHeight}
                  />
                </div>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSavedResumesModal(false);
                        handleCreateBlankResume();
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
                      onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                      style={{
                        background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '0.375rem',
                        padding: '0.35rem 0.65rem',
                        fontSize: '0.72rem',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.25rem',
                        transition: 'opacity 0.2s ease',
                      }}
                    >
                      <Plus size={12} />
                      <span>Create New</span>
                    </button>
                    <button 
                      type="button" onClick={() => setShowSavedResumesModal(false)}
                      style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                    >
                      <X size={18} />
                    </button>
                  </div>
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

                          <div style={{ display: 'flex', gap: '0.35rem', flexShrink: 0, alignItems: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleLoadResume(resume.id)}
                              className="btn-load"
                              title="Load / View"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', padding: 0 }}
                            >
                              <Eye size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDownloadSavedResume(resume.id)}
                              className="btn-load"
                              title="Download"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', padding: 0 }}
                            >
                              <Download size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleRenameResume(resume.id)}
                              className="btn-rename"
                              style={{ height: '2rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 0.5rem' }}
                            >Rename</button>
                            <button
                              type="button"
                              onClick={() => handleDeleteResume(resume.id)}
                              className="btn-delete"
                              title="Delete"
                              style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '2rem', height: '2rem', padding: 0 }}
                            >
                              <Trash2 size={14} />
                            </button>
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

          {/* CONFIRMATION DIALOG MODAL */}
          {confirmDialog.isOpen && (
            <>
              <div 
                className="modal-backdrop no-print"
                onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                style={{
                  position: 'fixed', inset: 0, zIndex: 10000,
                  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)'
                }} 
              />
              <div 
                className="saved-resumes-modal no-print"
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10001,
                  maxWidth: '420px',
                  width: '90%',
                  boxSizing: 'border-box'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                    background: confirmDialog.type === 'info' ? 'rgba(59, 130, 246, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: confirmDialog.type === 'info' ? '#3b82f6' : '#ef4444', flexShrink: 0
                  }}>
                    {confirmDialog.type === 'info' ? (
                      <Info size={20} />
                    ) : (
                      <AlertTriangle size={20} />
                    )}
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      {confirmDialog.title}
                    </h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      {confirmDialog.message}
                    </p>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--panel-border)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    {confirmDialog.cancelText || "Cancel"}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const onConf = confirmDialog.onConfirm;
                      setConfirmDialog(prev => ({ ...prev, isOpen: false }));
                      if (onConf) onConf();
                    }}
                    style={{
                      padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 700,
                      background: confirmDialog.type === 'info' ? 'var(--primary-color, #3b82f6)' : '#ef4444',
                      color: '#fff', border: 'none', borderRadius: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    {confirmDialog.confirmText || "Delete"}
                  </button>
                </div>
              </div>
            </>
          )}

          {/* CUSTOM PROMPT DIALOG MODAL (webapp popup) */}
          {promptDialog.isOpen && (
            <>
              <div 
                className="modal-backdrop no-print"
                onClick={() => setPromptDialog(prev => ({ ...prev, isOpen: false }))}
                style={{
                  position: 'fixed', inset: 0, zIndex: 10002,
                  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)'
                }} 
              />
              <div 
                className="saved-resumes-modal no-print"
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10003,
                  maxWidth: '420px',
                  width: '90%',
                  boxSizing: 'border-box',
                  background: '#16161a',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: '1rem',
                  padding: '1.5rem',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 10px 10px -5px rgba(0, 0, 0, 0.4)'
                }}
              >
                <div style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: '#fff', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <FileText size={18} color="var(--input-focus, #3b82f6)" />
                    {promptDialog.title}
                  </h3>
                  <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.8rem', color: '#94a3b8', lineHeight: 1.4 }}>
                    {promptDialog.message}
                  </p>
                </div>

                <div style={{ marginBottom: '1.25rem' }}>
                  <input
                    type="text"
                    value={promptValue}
                    onChange={(e) => setPromptValue(e.target.value)}
                    placeholder="Enter title..."
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      background: 'rgba(0,0,0,0.2)',
                      border: '1px solid rgba(255,255,255,0.1)',
                      borderRadius: '0.5rem',
                      padding: '0.65rem 0.85rem',
                      color: '#fff',
                      fontSize: '0.85rem',
                      outline: 'none',
                    }}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const onConf = promptDialog.onConfirm;
                        setPromptDialog(prev => ({ ...prev, isOpen: false }));
                        if (onConf) onConf(promptValue);
                      }
                    }}
                    autoFocus
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setPromptDialog(prev => ({ ...prev, isOpen: false }))}
                    style={{ padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const onConf = promptDialog.onConfirm;
                      setPromptDialog(prev => ({ ...prev, isOpen: false }));
                      if (onConf) onConf(promptValue);
                    }}
                    style={{
                      padding: '0.45rem 0.9rem', fontSize: '0.8rem', fontWeight: 700,
                      background: 'var(--input-focus, #3b82f6)', color: '#fff', border: 'none', borderRadius: '0.5rem',
                      cursor: 'pointer'
                    }}
                  >
                    Confirm
                  </button>
                </div>
              </div>
            </>
          )}

          {/* OFFLINE STORAGE NOTIFICATION POPUP */}
          {showOfflineAlert && (
            <>
              <div 
                className="modal-backdrop no-print"
                onClick={() => setShowOfflineAlert(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 10002,
                  background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)'
                }} 
              />
              <div 
                className="saved-resumes-modal no-print"
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10003,
                  maxWidth: '420px',
                  width: '90%',
                  boxSizing: 'border-box',
                  border: '1px solid #f59e0b',
                  boxShadow: '0 10px 25px -5px rgba(245, 158, 11, 0.3)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '2.5rem', height: '2.5rem', borderRadius: '50%',
                    background: 'rgba(245, 158, 11, 0.15)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#f59e0b', flexShrink: 0
                  }}>
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-main)' }}>
                      Storage Server Offline
                    </h3>
                  </div>
                </div>

                <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: '1.25rem' }}>
                  <p style={{ margin: '0 0 0.5rem 0' }}>
                    <strong>Warning:</strong> {s3ErrorMsg || "Failed to reach the AWS S3 storage server."}
                  </p>
                  <p style={{ margin: 0 }}>
                    Your changes will be temporarily saved <strong>locally</strong> in your browser. 
                    <span style={{ color: '#ef4444' }}> Note: This local data will be deleted if you log out of your account.</span> Once S3 becomes available again, local resumes will be automatically migrated to S3.
                  </p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem' }}>
                  <button 
                    type="button" 
                    className="btn btn-secondary" 
                    onClick={() => setShowOfflineAlert(false)}
                    style={{ padding: '0.5rem 1rem', fontSize: '0.8rem', fontWeight: 600 }}
                  >
                    I Understand
                  </button>
                </div>
              </div>
            </>
          )}

          {/* AI VERIFICATION ALERT MODAL */}
          {showVerifyAlertModal && (
            <>
              <div 
                className="modal-backdrop no-print"
                onClick={() => setShowVerifyAlertModal(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 10000,
                  background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)'
                }} 
              />
              <div 
                className="saved-resumes-modal no-print"
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10001,
                  maxWidth: '440px',
                  width: '90%',
                  boxSizing: 'border-box',
                  background: 'var(--panel-bg, #0f172a)',
                  border: '1px solid var(--panel-border, #1e293b)',
                  borderRadius: '16px',
                  padding: '1.5rem',
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1rem' }}>
                  <div style={{
                    width: '2.75rem', height: '2.75rem', borderRadius: '50%',
                    background: 'rgba(99, 102, 241, 0.15)', border: '1px solid rgba(99, 102, 241, 0.3)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#6366f1', flexShrink: 0
                  }}>
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-main)' }}>
                      Verify Extracted Information
                    </h3>
                    <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                      AI Auto-Fill Completed
                    </p>
                  </div>
                </div>

                <div style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.25)',
                  borderRadius: '10px',
                  padding: '0.85rem 1rem',
                  fontSize: '0.82rem',
                  color: 'var(--text-main)',
                  lineHeight: 1.5,
                  marginBottom: '1.25rem',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '0.6rem'
                }}>
                  <AlertTriangle size={18} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                  <span>
                    Please verify your information once, as AI can occasionally make small mistakes or formatting errors.
                  </span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--panel-border)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowVerifyAlertModal(false)}
                    style={{
                      padding: '0.55rem 1.25rem', fontSize: '0.82rem', fontWeight: 700,
                      background: 'linear-gradient(135deg, #6366f1, #4f46e5)',
                      color: '#fff', border: 'none', borderRadius: '0.5rem',
                      cursor: 'pointer', boxShadow: '0 0 15px rgba(99, 102, 241, 0.3)'
                    }}
                  >
                    Got it, Review Resume
                  </button>
                </div>
              </div>
            </>
          )}
          {/* ATS AI OPTIMIZER MODAL */}
          {showAtsOptimizeModal && (
            <>
              <div 
                className="ai-modal-backdrop"
                onClick={() => { if (!isAILoading) { setShowAtsOptimizeModal(false); } }}
              />
              <div className="no-print ai-modal-body" style={{ maxWidth: '450px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <div style={{
                      width: '2rem', height: '2rem', borderRadius: '0.5rem',
                      background: 'linear-gradient(135deg, #a855f7, #6366f1)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                      <Sparkles size={14} color="#fff" />
                    </div>
                    <h3 className="ai-modal-title">ATS AI Optimizer</h3>
                  </div>
                  <button 
                    type="button" 
                    onClick={() => { if (!isAILoading) setShowAtsOptimizeModal(false); }}
                    className="ai-modal-close-btn"
                  >
                    <X size={18} />
                  </button>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '1.5rem' }}>
                  <p className="ai-modal-desc" style={{ fontSize: '0.78rem', margin: 0 }}>
                    Gemini will restructure, optimize, and compress your information to fit clean ATS formats and page constraints.
                  </p>

                  <div>
                    <label className="ai-modal-label">Target Role</label>
                    <input
                      type="text"
                      value={atsTargetRole}
                      onChange={(e) => setAtsTargetRole(e.target.value)}
                      placeholder="e.g. Frontend Engineer"
                      className="ai-modal-input"
                    />
                  </div>

                  <div>
                    <label className="ai-modal-label">Target Company</label>
                    <input
                      type="text"
                      value={atsTargetCompany}
                      onChange={(e) => setAtsTargetCompany(e.target.value)}
                      placeholder="e.g. Google"
                      className="ai-modal-input"
                    />
                  </div>

                  <div>
                    <label className="ai-modal-label">Target Page Count</label>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '0.25rem' }}>
                      <button
                        type="button"
                        onClick={() => setAtsTargetPages('1')}
                        className={atsTargetPages === '1' ? 'ai-modal-choice-btn-primary' : 'ai-modal-choice-btn-secondary'}
                        style={{ padding: '0.6rem', textAlign: 'center', height: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center', cursor: 'pointer' }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: atsTargetPages === '1' ? 'var(--input-focus)' : 'inherit' }}>Single Page</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>(Recommended for freshers)</span>
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setAtsTargetPages('2')}
                        className={atsTargetPages === '2' ? 'ai-modal-choice-btn-primary' : 'ai-modal-choice-btn-secondary'}
                        style={{ padding: '0.6rem', textAlign: 'center', height: 'auto', display: 'flex', flexDirection: 'column', gap: '0.2rem', alignItems: 'center', cursor: 'pointer' }}
                      >
                        <span style={{ fontSize: '0.85rem', fontWeight: 700, color: atsTargetPages === '2' ? 'var(--input-focus)' : 'inherit' }}>Two Pages</span>
                        <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>(For detailed experience)</span>
                      </button>
                    </div>
                  </div>
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.5rem', borderTop: '1px solid var(--panel-border)', paddingTop: '1rem' }}>
                  <button
                    type="button"
                    onClick={() => setShowAtsOptimizeModal(false)}
                    disabled={isAILoading}
                    className="ai-modal-back-btn"
                  >Cancel</button>
                  <button
                    type="button"
                    onClick={handleATSOptimize}
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
                    {isAILoading ? 'Optimizing...' : 'Optimize & Restructure'}
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
