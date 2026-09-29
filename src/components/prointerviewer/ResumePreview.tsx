import React from 'react';
import type { ResumeData, ResumeStyle, WorkExperience, Education, Project, Skill, Language, Certification, CustomSection, CustomSectionItem } from './types';
import { COLOR_PALETTES, FONT_FAMILIES } from './templates';
import { Mail, Phone, MapPin, Globe, Pencil, Plus, Trash2, X, ChevronUp, ChevronDown, Eye, EyeOff, Sparkles } from 'lucide-react';
import { VoiceAIWriterModal } from './VoiceAIWriterModal';
const generateUniqueId = (prefix: string) => `${prefix}-new-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

interface ResumePreviewProps {
  data: ResumeData;
  style: ResumeStyle;
  onChangeData: (updatedData: ResumeData) => void;
  onChangeStyle?: (updatedStyle: ResumeStyle) => void;
  onHeightChange?: (height: number) => void;
}

// Inline Editable Text Component to avoid cursor jump
interface EditableTextProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
  className?: string;
  tagName?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span' | 'div';
  multiline?: boolean;
  style?: React.CSSProperties;
}

const EditableText: React.FC<EditableTextProps> = ({
  value,
  onChange,
  placeholder = "",
  className = "",
  tagName = "span",
  multiline = false,
  style = {}
}) => {
  const [isFocused, setIsFocused] = React.useState(false);
  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    setIsFocused(false);
    const text = e.target.innerText;
    if (text !== value) {
      onChange(text);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (!multiline && e.key === 'Enter') {
      e.preventDefault();
      (e.target as HTMLElement).blur();
    }
  };

  const innerElement = React.createElement(
    tagName,
    {
      className: `editable-element ${className}`,
      contentEditable: true,
      suppressContentEditableWarning: true,
      onFocus: () => setIsFocused(true),
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      "data-placeholder": placeholder,
      style: { 
        display: tagName === 'span' ? 'inline-block' : 'block',
        minWidth: value ? 'none' : '40px',
        outline: 'none',
        paddingRight: tagName === 'span' ? '4px' : '0',
        ...style
      }
    },
    value
  );

  const wrapperTag = tagName === 'span' ? 'span' : 'div';

  return React.createElement(
    wrapperTag,
    {
      className: "editable-text-wrapper group relative inline-flex items-center",
      style: {
        position: 'relative',
        display: tagName === 'span' ? 'inline-flex' : 'flex',
        width: tagName === 'span' ? 'auto' : '100%',
        maxWidth: '100%'
      }
    },
    innerElement,
    React.createElement(
      'span',
      {
        className: "no-print edit-pencil-icon opacity-0 group-hover:opacity-100 transition-opacity text-purple-400/70",
        style: {
          position: 'absolute',
          left: tagName === 'span' ? '-14px' : '-16px',
          top: '50%',
          transform: 'translateY(-50%)',
          pointerEvents: 'none',
          display: isFocused ? 'none' : 'inline-flex',
          marginRight: '4px',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10
        }
      },
      React.createElement(Pencil, { size: 10 })
    )
  );
};

export const ResumePreview: React.FC<ResumePreviewProps> = ({ data, style, onChangeData, onChangeStyle, onHeightChange }) => {
  const activePalette = COLOR_PALETTES.find(p => p.id === style.colorPaletteId) || COLOR_PALETTES[0];
  const activeFont = FONT_FAMILIES.find(f => f.id === style.fontFamilyId) || FONT_FAMILIES[0];

  const pageRef = React.useRef<HTMLDivElement>(null);
  const [activeItemMenuId, setActiveItemMenuId] = React.useState<string | null>(null);

  const [voiceAiOpen, setVoiceAiOpen] = React.useState(false);
  const [voiceAiConfig, setVoiceAiConfig] = React.useState<{
    itemId: string;
    section: 'workExperience' | 'projects' | 'customSections';
    title: string;
    top: number;
    left: number;
    right: number;
    customSectionId?: string;
  } | null>(null);

  const handleOpenVoiceAI = (
    itemId: string,
    section: 'workExperience' | 'projects' | 'customSections',
    title: string,
    top: number,
    left: number,
    right: number,
    customSectionId?: string
  ) => {
    setVoiceAiConfig({ itemId, section, title, top, left, right, customSectionId });
    setVoiceAiOpen(true);
  };

  const handleVoiceAiGenerate = (text: string) => {
    if (!voiceAiConfig) return;
    const { itemId, section, customSectionId } = voiceAiConfig;
    if (section === 'workExperience') {
      handleUpdateWorkExp(itemId, 'description', text);
    } else if (section === 'projects') {
      handleUpdateProj(itemId, 'description', text);
    } else if (section === 'customSections' && customSectionId) {
      handleUpdateCustomSection(customSectionId, itemId, 'description', text);
    }
    setVoiceAiOpen(false);
    setVoiceAiConfig(null);
  };

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('.control-toggle-btn')) {
        return;
      }
      setActiveItemMenuId(null);
    };
    document.addEventListener('click', handleOutsideClick);
    return () => {
      document.removeEventListener('click', handleOutsideClick);
    };
  }, []);

  React.useEffect(() => {
    if (!pageRef.current) return;

    const measure = () => {
      if (!pageRef.current) return;
      const contentHeight = pageRef.current.scrollHeight;
      if (onHeightChange) {
        onHeightChange(contentHeight);
      }
    };

    measure();
    const timer = setTimeout(measure, 150);
    
    let resizeObserver: ResizeObserver | null = null;
    if (typeof window !== 'undefined' && 'ResizeObserver' in window) {
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(pageRef.current);
    }

    return () => {
      clearTimeout(timer);
      if (resizeObserver) {
        resizeObserver.disconnect();
      }
    };
  }, [data, style, onHeightChange]);

  // Compile CSS Variables based on Style Configuration
  const compiledVariables = {
    '--primary-color': activePalette.primary,
    '--secondary-color': activePalette.secondary,
    '--accent-color': activePalette.accent,
    '--text-color': activePalette.text,
    '--bg-color': activePalette.background,
    '--sidebar-bg': activePalette.sidebarBg || 'transparent',
    '--sidebar-text': activePalette.sidebarText || activePalette.text,
    '--banner-bg': activePalette.bannerBg || activePalette.primary,
    '--banner-text': activePalette.bannerText || '#ffffff',
    '--divider-color': style.layout === 'left-sidebar' && activePalette.id === 'dark-noir' ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.1)',
    // Fonts scale sizing
    '--font-size': style.fontSize === 'sm' ? '12px' : style.fontSize === 'lg' ? '16px' : '14px',
    '--line-height': style.fontSize === 'sm' ? '1.4' : style.fontSize === 'lg' ? '1.6' : '1.5',
    // Section gaps
    '--section-gap': style.spacing === 'compact' ? '0.8rem' : style.spacing === 'relaxed' ? '2.1rem' : '1.4rem',
    // Page padding
    '--page-padding': style.margins === 'narrow' ? '1.6rem' : style.margins === 'wide' ? '3.6rem' : '2.6rem',
  } as React.CSSProperties;

  // Inline updates handlers for state
  const handleUpdatePersonalInfo = (field: keyof typeof data.personalInfo, value: string) => {
    onChangeData({
      ...data,
      personalInfo: {
        ...data.personalInfo,
        [field]: value
      }
    });
  };

  const handleUpdateWorkExp = (id: string, field: keyof WorkExperience, value: any) => {
    onChangeData({
      ...data,
      workExperience: data.workExperience.map(item => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const handleUpdateEdu = (id: string, field: keyof Education, value: any) => {
    onChangeData({
      ...data,
      education: data.education.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'degree') {
            const val = String(value);
            const valLower = val.toLowerCase();
            let newType = item.degreeType;
            if (valLower.includes("10th") || valLower.includes("secondary")) {
              newType = "10th";
            } else if (valLower.includes("12th") || valLower.includes("high school")) {
              newType = "12th";
            } else if (
              valLower.includes("bachelor") || valLower.includes("master") ||
              valLower.includes("degree") || valLower.includes("b.e.") ||
              valLower.includes("b.tech") || valLower.includes("m.tech") ||
              valLower.includes("phd") || valLower.includes("doctorate") ||
              valLower.includes("ug") || valLower.includes("pg")
            ) {
              newType = "";
            }
            updated.degreeType = newType;
          }
          return updated;
        }
        return item;
      })
    });
  };

  const handleUpdateProj = (id: string, field: keyof Project, value: any) => {
    onChangeData({
      ...data,
      projects: data.projects.map(item => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const handleUpdateSkill = (id: string, field: keyof Skill, value: any) => {
    onChangeData({
      ...data,
      skills: data.skills.map(item => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const handleUpdateLang = (id: string, field: keyof Language, value: any) => {
    onChangeData({
      ...data,
      languages: data.languages.map(item => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const handleUpdateCert = (id: string, field: keyof Certification, value: any) => {
    onChangeData({
      ...data,
      certifications: data.certifications.map(item => item.id === id ? { ...item, [field]: value } : item)
    });
  };

  const handleUpdateCustomSection = (sectId: string, itemId: string, field: string, value: any) => {
    onChangeData({
      ...data,
      customSections: data.customSections.map(sect => {
        if (sect.id === sectId) {
          return {
            ...sect,
            items: sect.items.map(item => item.id === itemId ? { ...item, [field]: value } : item)
          };
        }
        return sect;
      })
    });
  };
  // --- VISIBILITY & SWAPPING CONTROLS ---
  const handleToggleItemVisibility = (itemId: string, listKey: 'workExperience' | 'education' | 'projects' | 'skills' | 'languages' | 'certifications' | 'customSections', customSectionId?: string) => {
    if (listKey === 'customSections' && customSectionId) {
      const updatedCustom = data.customSections.map(sect => {
        if (sect.id === customSectionId) {
          return {
            ...sect,
            items: sect.items.map(item => item.id === itemId ? { ...item, hidden: !item.hidden } : item)
          };
        }
        return sect;
      });
      onChangeData({ ...data, customSections: updatedCustom });
    } else if (listKey !== 'customSections') {
      const list = (data as any)[listKey] as any[];
      const updatedList = list.map(item => item.id === itemId ? { ...item, hidden: !item.hidden } : item);
      onChangeData({ ...data, [listKey]: updatedList });
    }
  };

  const handleMoveItem = (itemId: string, listKey: 'workExperience' | 'education' | 'projects' | 'skills' | 'languages' | 'certifications' | 'customSections', direction: 'up' | 'down', customSectionId?: string) => {
    if (listKey === 'customSections' && customSectionId) {
      const updatedCustom = data.customSections.map(sect => {
        if (sect.id === customSectionId) {
          const list = [...sect.items];
          const idx = list.findIndex(item => item.id === itemId);
          if (idx === -1) return sect;
          const target = direction === 'up' ? idx - 1 : idx + 1;
          if (target >= 0 && target < list.length) {
            const temp = list[idx];
            list[idx] = list[target];
            list[target] = temp;
          }
          return { ...sect, items: list };
        }
        return sect;
      });
      onChangeData({ ...data, customSections: updatedCustom });
    } else if (listKey !== 'customSections') {
      const list = [...((data as any)[listKey] as any[])];
      const idx = list.findIndex(item => item.id === itemId);
      if (idx === -1) return;
      const target = direction === 'up' ? idx - 1 : idx + 1;
      if (target >= 0 && target < list.length) {
        const temp = list[idx];
        list[idx] = list[target];
        list[target] = temp;
        onChangeData({ ...data, [listKey]: list });
      }
    }
  };

  const handleMoveSection = (sectionName: string, direction: 'up' | 'down') => {
    if (!onChangeStyle) return;
    const defaultOrder = ['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'certifications'];
    const currentOrder = [...(style.sectionOrder || defaultOrder)];
    const idx = currentOrder.indexOf(sectionName);
    if (idx === -1) return;
    const target = direction === 'up' ? idx - 1 : idx + 1;
    if (target >= 0 && target < currentOrder.length) {
      const temp = currentOrder[idx];
      currentOrder[idx] = currentOrder[target];
      currentOrder[target] = temp;
      onChangeStyle({
        ...style,
        sectionOrder: currentOrder
      });
    }
  };

  const handleToggleSectionVisibility = (sectionName: 'summary' | 'experience' | 'education' | 'projects' | 'skills' | 'languages' | 'certifications') => {
    if (!onChangeStyle) return;
    const visible = style.visibleSections || {};
    onChangeStyle({
      ...style,
      visibleSections: {
        ...visible,
        [sectionName]: visible[sectionName as keyof typeof visible] === false ? true : false
      }
    });
  };


  // --- ADD / DELETE MUTATIONS FOR PREVIEW EDITOR ---
  const handleAddWorkExp = () => {
    const newExp: WorkExperience = {
      id: generateUniqueId('exp'),
      company: "Company Name",
      position: "Job Position",
      location: "Location",
      startDate: "Start Date",
      endDate: "End Date",
      current: false,
      description: "• Accomplished task X\n• Led project Y\n• Solved problem Z"
    };
    onChangeData({
      ...data,
      workExperience: [...data.workExperience, newExp]
    });
  };

  const handleDeleteWorkExp = (id: string) => {
    onChangeData({
      ...data,
      workExperience: data.workExperience.filter(item => item.id !== id)
    });
  };

  const handleAddEdu = () => {
    const newEdu: Education = {
      id: generateUniqueId('edu'),
      institution: "University Name",
      degree: "Degree",
      fieldOfStudy: "Field of Study",
      location: "Location",
      startDate: "Start Date",
      endDate: "End Date",
      cgpa: "",
      percentage: "",
      description: ""
    };
    onChangeData({
      ...data,
      education: [...data.education, newEdu]
    });
  };

  const handleDeleteEdu = (id: string) => {
    onChangeData({
      ...data,
      education: data.education.filter(item => item.id !== id)
    });
  };

  const handleAddProj = () => {
    const newProj: Project = {
      id: generateUniqueId('proj'),
      name: "Project Name",
      role: "Role",
      technologies: ["Tech 1", "Tech 2"],
      link: "Project Link",
      description: "Describe the project, challenges faced and results."
    };
    onChangeData({
      ...data,
      projects: [...data.projects, newProj]
    });
  };

  const handleDeleteProj = (id: string) => {
    onChangeData({
      ...data,
      projects: data.projects.filter(item => item.id !== id)
    });
  };

  const handleAddSkill = () => {
    const newSkill: Skill = {
      id: generateUniqueId('skill'),
      name: "New Skill",
      level: "Expert",
      category: ""
    };
    onChangeData({
      ...data,
      skills: [...data.skills, newSkill]
    });
  };

  const handleDeleteSkill = (id: string) => {
    onChangeData({
      ...data,
      skills: data.skills.filter(item => item.id !== id)
    });
  };

  const handleAddLang = () => {
    const newLang: Language = {
      id: generateUniqueId('lang'),
      name: "New Language",
      proficiency: "Fluent"
    };
    onChangeData({
      ...data,
      languages: [...data.languages, newLang]
    });
  };

  const handleDeleteLang = (id: string) => {
    onChangeData({
      ...data,
      languages: data.languages.filter(item => item.id !== id)
    });
  };

  const handleAddCert = () => {
    const newCert: Certification = {
      id: generateUniqueId('cert'),
      name: "Certification Name",
      issuer: "Issuer Org",
      date: "YYYY-MM",
      link: ""
    };
    onChangeData({
      ...data,
      certifications: [...data.certifications, newCert]
    });
  };

  const handleDeleteCert = (id: string) => {
    onChangeData({
      ...data,
      certifications: data.certifications.filter(item => item.id !== id)
    });
  };

  const handleAddCustomItem = (sectId: string) => {
    const newItem: CustomSectionItem = {
      id: generateUniqueId('custom-item'),
      title: "New Item Title",
      subtitle: "Subtitle / Org",
      date: "Date",
      description: "Description..."
    };
    onChangeData({
      ...data,
      customSections: data.customSections.map(sect => {
        if (sect.id === sectId) {
          return {
            ...sect,
            items: [...sect.items, newItem]
          };
        }
        return sect;
      })
    });
  };

  const handleDeleteCustomItem = (sectId: string, itemId: string) => {
    onChangeData({
      ...data,
      customSections: data.customSections.map(sect => {
        if (sect.id === sectId) {
          return {
            ...sect,
            items: sect.items.filter(item => item.id !== itemId)
          };
        }
        return sect;
      })
    });
  };

  const handleDeleteCustomSection = (sectId: string) => {
    onChangeData({
      ...data,
      customSections: data.customSections.filter(sect => sect.id !== sectId)
    });
  };

  const handleAddCustomSection = () => {
    const newSection: CustomSection = {
      id: `custom-sect-new-${Date.now()}`,
      title: "Voluntary Work & Activities",
      items: [
        {
          id: `custom-item-new-${Date.now()}`,
          title: "Role / Activity Title",
          subtitle: "Organization Name",
          date: "Date Range",
          description: "Describe your custom details."
        }
      ]
    };
    onChangeData({
      ...data,
      customSections: [...data.customSections, newSection]
    });
  };

  const handleRenameCustomSection = (sectId: string, newTitle: string) => {
    onChangeData({
      ...data,
      customSections: data.customSections.map(sect =>
        sect.id === sectId ? { ...sect, title: newTitle } : sect
      )
    });
  };

  // --- SECTIONS RENDERERS ---

  const renderHeader = () => {
    const { personalInfo } = data;
    const headerClass = `resume-header header-${style.headerStyle}`;

    const contactGrid = (
      <div className="contact-grid-wrapper">
        <div className="contact-grid">
          {/* Email and Phone are mandatory and always render */}
          <div className="contact-item">
            <Mail size={12} />
            <EditableText value={personalInfo.email || "email@example.com"} onChange={(val) => handleUpdatePersonalInfo('email', val)} placeholder="Email" />
          </div>
          <div className="contact-item">
            <Phone size={12} />
            <EditableText value={personalInfo.phone || "+123-456-7890"} onChange={(val) => handleUpdatePersonalInfo('phone', val)} placeholder="Phone" />
          </div>
          
          {personalInfo.location && (
            <div className="contact-item" style={{ position: 'relative' }}>
              <MapPin size={12} />
              <EditableText value={personalInfo.location} onChange={(val) => handleUpdatePersonalInfo('location', val)} placeholder="Location" />
              <button className="no-print contact-remove-btn" onClick={() => handleUpdatePersonalInfo('location', '')} title="Remove Location" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'inline-flex', padding: '1px', marginLeft: '2px', opacity: 0.6, transition: 'opacity 0.15s' }}><X size={10} /></button>
            </div>
          )}
          {personalInfo.website && (
            <div className="contact-item" style={{ position: 'relative' }}>
              <Globe size={12} />
              <EditableText value={personalInfo.website} onChange={(val) => handleUpdatePersonalInfo('website', val)} placeholder="Website" />
              <button className="no-print contact-remove-btn" onClick={() => handleUpdatePersonalInfo('website', '')} title="Remove Website" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'inline-flex', padding: '1px', marginLeft: '2px', opacity: 0.6, transition: 'opacity 0.15s' }}><X size={10} /></button>
            </div>
          )}
          {personalInfo.linkedin && (
            <div className="contact-item" style={{ position: 'relative' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
              <EditableText value={personalInfo.linkedin} onChange={(val) => handleUpdatePersonalInfo('linkedin', val)} placeholder="LinkedIn" />
              <button className="no-print contact-remove-btn" onClick={() => handleUpdatePersonalInfo('linkedin', '')} title="Remove LinkedIn" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'inline-flex', padding: '1px', marginLeft: '2px', opacity: 0.6, transition: 'opacity 0.15s' }}><X size={10} /></button>
            </div>
          )}
          {personalInfo.github && (
            <div className="contact-item" style={{ position: 'relative' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
              <EditableText value={personalInfo.github} onChange={(val) => handleUpdatePersonalInfo('github', val)} placeholder="GitHub" />
              <button className="no-print contact-remove-btn" onClick={() => handleUpdatePersonalInfo('github', '')} title="Remove GitHub" style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'inline-flex', padding: '1px', marginLeft: '2px', opacity: 0.6, transition: 'opacity 0.15s' }}><X size={10} /></button>
            </div>
          )}
        </div>
        
        {/* Toggle to add other links/location/website */}
        <div className="no-print add-links-container" style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', alignItems: 'center', marginTop: '0.4rem', fontSize: '0.72rem' }}>
          {!personalInfo.location && (
            <button className="no-print resume-addlink-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, color: '#7c3aed', background: '#ede9fe', border: '1px dashed #c4b5fd', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => handleUpdatePersonalInfo('location', 'New York, NY')}>
              <Plus size={10} /> Add Location
            </button>
          )}
          {!personalInfo.website && (
            <button className="no-print resume-addlink-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, color: '#7c3aed', background: '#ede9fe', border: '1px dashed #c4b5fd', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => handleUpdatePersonalInfo('website', 'https://myportfolio.com')}>
              <Plus size={10} /> Add Website
            </button>
          )}
          {!personalInfo.linkedin && (
            <button className="no-print resume-addlink-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, color: '#7c3aed', background: '#ede9fe', border: '1px dashed #c4b5fd', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => handleUpdatePersonalInfo('linkedin', 'https://linkedin.com/in/username')}>
              <Plus size={10} /> Add LinkedIn
            </button>
          )}
          {!personalInfo.github && (
            <button className="no-print resume-addlink-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '4px 10px', fontSize: '0.72rem', fontWeight: 600, color: '#7c3aed', background: '#ede9fe', border: '1px dashed #c4b5fd', borderRadius: '4px', cursor: 'pointer', transition: 'all 0.2s ease' }} onClick={() => handleUpdatePersonalInfo('github', 'https://github.com/username')}>
              <Plus size={10} /> Add GitHub
            </button>
          )}
        </div>
      </div>
    );

    return (
      <header className={headerClass}>
        {style.headerStyle === 'split-profile' && style.showAvatars && personalInfo.avatar ? (
          <div className="avatar-box">
            <img src={personalInfo.avatar} alt="Profile" />
          </div>
        ) : null}

        <div className="header-details">
          <div className="name-title">
            <EditableText 
              tagName="h1" 
              value={personalInfo.name} 
              onChange={(val) => handleUpdatePersonalInfo('name', val)} 
              placeholder="Your Name" 
              style={{ fontSize: '2.25em', fontWeight: 800, margin: '0 0 0.15rem 0', color: style.headerStyle === 'bold-banner' ? 'var(--banner-text)' : 'var(--primary-color)', lineHeight: 1.1 }} 
            />
            <EditableText 
              tagName="h2" 
              value={personalInfo.title} 
              onChange={(val) => handleUpdatePersonalInfo('title', val)} 
              placeholder="Add Professional Title Here" 
              style={{ fontSize: '1.2em', fontWeight: 500, margin: 0, color: style.headerStyle === 'bold-banner' ? 'var(--banner-text)' : 'var(--secondary-color)', opacity: 0.95 }} 
            />
          </div>
          {style.headerStyle !== 'accent-line' && style.headerStyle !== 'bold-banner' && contactGrid}
        </div>

        {style.headerStyle === 'accent-line' && <div className="accent-bar" />}
        {(style.headerStyle === 'accent-line' || style.headerStyle === 'bold-banner') && contactGrid}
      </header>
    );
  };

  const renderSectionTitle = (title: string, sectionKey?: string, onRename?: (val: string) => void, onDelete?: () => void) => {
    return (
      <div className="section-title-wrap group" style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
        {onRename ? (
          <h3 className="section-title" style={{ display: 'inline-block', margin: 0 }}>
            <EditableText value={title} onChange={onRename} placeholder="Section Title" />
          </h3>
        ) : (
          <h3 className="section-title" style={{ margin: 0 }}>{title}</h3>
        )}
        
        <div className="no-print section-controls" style={{ display: 'flex', alignItems: 'center', gap: '4px', zIndex: 10 }}>
          {sectionKey && (
            <>
              <button
                type="button"
                className="control-btn"
                onClick={() => handleToggleSectionVisibility(sectionKey as any)}
                title="Hide Section"
                style={{ padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', color: '#6b7280' }}
              >
                <EyeOff size={13} />
              </button>
              <button
                type="button"
                className="control-btn"
                onClick={() => handleMoveSection(sectionKey, 'up')}
                title="Move Section Up"
                style={{ padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', color: '#6b7280' }}
              >
                <ChevronUp size={13} />
              </button>
              <button
                type="button"
                className="control-btn"
                onClick={() => handleMoveSection(sectionKey, 'down')}
                title="Move Section Down"
                style={{ padding: '2px', border: 'none', background: 'transparent', cursor: 'pointer', display: 'inline-flex', color: '#6b7280' }}
              >
                <ChevronDown size={13} />
              </button>
            </>
          )}
          {onDelete && (
            <button
              type="button"
              className="no-print section-delete-btn"
              onClick={onDelete}
              title="Delete Section"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '2px',
                background: 'transparent',
                border: 'none',
                color: '#ef4444',
                cursor: 'pointer',
                fontSize: '0.75rem',
                fontWeight: 600
              }}
            >
              <Trash2 size={10} />
              <span>Delete</span>
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderSummary = () => {
    if (style.visibleSections?.summary === false) {
      return (
        <div className="no-print" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className="no-print resume-turnon-btn"
            style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => handleToggleSectionVisibility('summary')}
          >
            <Plus size={10} /> Turn On Summary Section
          </button>
        </div>
      );
    }
    if (!data.personalInfo.summary) return null;
    return (
      <section className="resume-section">
        {renderSectionTitle("Profile Summary", "summary")}
        <EditableText 
          tagName="p"
          value={data.personalInfo.summary}
          onChange={(val) => handleUpdatePersonalInfo('summary', val)}
          placeholder="Write a brief professional summary..."
          className="resume-item-desc"
          multiline={true}
          style={{ margin: 0 }}
        />
      </section>
    );
  };

  const renderItemControls = (
    itemId: string,
    sectionKey: string,
    isHidden: boolean,
    onDelete: () => void,
    customSectionId?: string
  ) => {
    const isMenuOpen = activeItemMenuId === itemId;

    return (
      <div className="no-print resume-item-controls-wrapper" style={{ position: 'absolute', top: '0px', right: '0px', zIndex: 30 }}>
        <button
          type="button"
          className="control-toggle-btn"
          onClick={(e) => {
            e.stopPropagation();
            setActiveItemMenuId(isMenuOpen ? null : itemId);
          }}
          title="Item Options"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '4px',
            border: '1px solid rgba(0,0,0,0.1)',
            background: '#ffffff',
            borderRadius: '50%',
            cursor: 'pointer',
            color: '#6b7280',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            width: '22px',
            height: '22px',
            transition: 'all 0.2s'
          }}
        >
          <svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="8" y1="12" x2="16" y2="12" />
          </svg>
        </button>

        {isMenuOpen && (
          <div
            className="item-vertical-menu"
            onClick={(e) => e.stopPropagation()}
            style={{
              position: 'absolute',
              top: '0px',
              right: '26px',
              display: 'flex',
              flexDirection: 'column',
              gap: '2px',
              background: '#ffffff',
              border: '1px solid rgba(0,0,0,0.15)',
              borderRadius: '6px',
              padding: '4px',
              zIndex: 100,
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '100px'
            }}
          >
            <button
              type="button"
              className="menu-item-btn"
              onClick={() => {
                handleToggleItemVisibility(itemId, sectionKey as any, customSectionId);
                setActiveItemMenuId(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
                color: '#374151',
                width: '100%',
                textAlign: 'left',
                borderRadius: '4px'
              }}
            >
              {isHidden ? <Eye size={11} style={{ color: '#ef4444' }} /> : <EyeOff size={11} style={{ color: '#10b981' }} />}
              <span>{isHidden ? "Unhide" : "Hide"}</span>
            </button>
            <button
              type="button"
              className="menu-item-btn"
              onClick={() => {
                handleMoveItem(itemId, sectionKey as any, 'up', customSectionId);
                setActiveItemMenuId(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
                color: '#374151',
                width: '100%',
                textAlign: 'left',
                borderRadius: '4px'
              }}
            >
              <ChevronUp size={11} />
              <span>Move Up</span>
            </button>
            <button
              type="button"
              className="menu-item-btn"
              onClick={() => {
                handleMoveItem(itemId, sectionKey as any, 'down', customSectionId);
                setActiveItemMenuId(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
                color: '#374151',
                width: '100%',
                textAlign: 'left',
                borderRadius: '4px'
              }}
            >
              <ChevronDown size={11} />
              <span>Move Down</span>
            </button>
            <button
              type="button"
              className="menu-item-btn"
              onClick={() => {
                onDelete();
                setActiveItemMenuId(null);
              }}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 8px',
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                fontSize: '11px',
                fontWeight: 500,
                color: '#ef4444',
                width: '100%',
                textAlign: 'left',
                borderRadius: '4px'
              }}
            >
              <Trash2 size={11} />
              <span>Delete</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  const renderExperience = () => {
    if (!data.workExperience || data.workExperience.length === 0) return null;
    if (style.visibleSections?.experience === false) {
      return (
        <div className="no-print" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className="no-print resume-turnon-btn"
            style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => handleToggleSectionVisibility('experience')}
          >
            <Plus size={10} /> Turn On Work Experience Section
          </button>
        </div>
      );
    }
    return (
      <section className="resume-section">
        {renderSectionTitle("Work Experience", "experience")}
        <div className="section-list">
          {data.workExperience.map(exp => (
            <div key={exp.id} className={`resume-item-wrap group ${exp.hidden ? 'resume-item-hidden' : ''}`}>
              {renderItemControls(exp.id, 'workExperience', !!exp.hidden, () => handleDeleteWorkExp(exp.id))}
              <div className="resume-item">
                <div className="resume-item-top">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <EditableText 
                      tagName="span"
                      value={exp.position}
                      onChange={(val) => handleUpdateWorkExp(exp.id, 'position', val)}
                      placeholder="Position"
                      className="resume-item-role"
                    />
                    <button
                      type="button"
                      className="no-print ai-write-item-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        handleOpenVoiceAI(
                          exp.id,
                          'workExperience',
                          `${exp.position || 'Position'} at ${exp.company || 'Company'}`,
                          rect.top,
                          rect.left,
                          rect.right
                        );
                      }}
                      title="Write description with AI voice"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(139, 92, 246, 0.4)',
                        padding: 0,
                        flexShrink: 0
                      }}
                    >
                      <Sparkles size={10} />
                    </button>
                  </span>
                  <span className="resume-item-date" style={{ fontWeight: 400, fontSize: '0.85em', color: 'var(--secondary-color)' }}>
                    <EditableText value={exp.startDate} onChange={(val) => handleUpdateWorkExp(exp.id, 'startDate', val)} placeholder="YYYY-MM" />
                    {' - '}
                    {exp.current ? 'Present' : <EditableText value={exp.endDate} onChange={(val) => handleUpdateWorkExp(exp.id, 'endDate', val)} placeholder="YYYY-MM" />}
                  </span>
                </div>
                <div className="resume-item-sub">
                  <EditableText 
                    tagName="span"
                    value={exp.company}
                    onChange={(val) => handleUpdateWorkExp(exp.id, 'company', val)}
                    placeholder="Company"
                    className="resume-item-org"
                  />
                  <EditableText 
                    tagName="span"
                    value={exp.location}
                    onChange={(val) => handleUpdateWorkExp(exp.id, 'location', val)}
                    placeholder="Location"
                  />
                </div>
                <EditableText 
                  tagName="p"
                  value={exp.description}
                  onChange={(val) => handleUpdateWorkExp(exp.id, 'description', val)}
                  placeholder="Bullet points and accomplishments..."
                  className="resume-item-desc"
                  multiline={true}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="no-print resume-preview-add-btn"
            onClick={handleAddWorkExp}
          >
            <Plus size={10} />
            <span>Add Experience</span>
          </button>
        </div>
      </section>
    );
  };

  const renderEducation = () => {
    if (!data.education || data.education.length === 0) return null;
    if (style.visibleSections?.education === false) {
      return (
        <div className="no-print" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className="no-print resume-turnon-btn"
            style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => handleToggleSectionVisibility('education')}
          >
            <Plus size={10} /> Turn On Education Section
          </button>
        </div>
      );
    }
    return (
      <section className="resume-section">
        {renderSectionTitle("Education", "education")}
        <div className="section-list">
          {data.education.map(edu => (
            <div key={edu.id} className={`resume-item-wrap group ${edu.hidden ? 'resume-item-hidden' : ''}`}>
              {renderItemControls(edu.id, 'education', !!edu.hidden, () => handleDeleteEdu(edu.id))}
              <div className="resume-item">
                <div className="resume-item-top">
                  <span className="resume-item-role">
                    <EditableText value={edu.degree} onChange={(val) => handleUpdateEdu(edu.id, 'degree', val)} placeholder="Degree" />
                    {edu.fieldOfStudy && edu.fieldOfStudy.trim() ? (
                      <>
                        {' in '}
                        <EditableText value={edu.fieldOfStudy} onChange={(val) => handleUpdateEdu(edu.id, 'fieldOfStudy', val)} placeholder="Field of Study" />
                      </>
                    ) : null}
                  </span>
                  <span className="resume-item-date" style={{ fontWeight: 400, fontSize: '0.85em', color: 'var(--secondary-color)' }}>
                    <EditableText value={edu.startDate} onChange={(val) => handleUpdateEdu(edu.id, 'startDate', val)} placeholder="YYYY-MM" />
                    {' - '}
                    <EditableText value={edu.endDate} onChange={(val) => handleUpdateEdu(edu.id, 'endDate', val)} placeholder="YYYY-MM" />
                  </span>
                </div>
                <div className="resume-item-sub">
                  <EditableText 
                    tagName="span"
                    value={edu.institution}
                    onChange={(val) => handleUpdateEdu(edu.id, 'institution', val)}
                    placeholder="Institution"
                    className="resume-item-org"
                  />
                  <span>
                    {edu.cgpa && (
                      <>
                        CGPA: <EditableText value={edu.cgpa} onChange={(val) => handleUpdateEdu(edu.id, 'cgpa', val)} placeholder="CGPA" />
                        {(edu.percentage || edu.location) && ' | '}
                      </>
                    )}
                    {edu.percentage && (
                      <>
                        Percentage: <EditableText value={edu.percentage} onChange={(val) => handleUpdateEdu(edu.id, 'percentage', val)} placeholder="Percentage" />
                        {edu.location && ' | '}
                      </>
                    )}
                    <EditableText value={edu.location} onChange={(val) => handleUpdateEdu(edu.id, 'location', val)} placeholder="Location" />
                  </span>
                </div>
                <EditableText 
                  tagName="p"
                  value={edu.description || ""}
                  onChange={(val) => handleUpdateEdu(edu.id, 'description', val)}
                  placeholder="Additional descriptions, courses, GPA..."
                  className="resume-item-desc"
                  multiline={true}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="no-print resume-preview-add-btn"
            onClick={handleAddEdu}
          >
            <Plus size={10} />
            <span>Add Education</span>
          </button>
        </div>
      </section>
    );
  };

  const renderProjects = () => {
    if (!data.projects || data.projects.length === 0) return null;
    if (style.visibleSections?.projects === false) {
      return (
        <div className="no-print" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className="no-print resume-turnon-btn"
            style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => handleToggleSectionVisibility('projects')}
          >
            <Plus size={10} /> Turn On Projects Section
          </button>
        </div>
      );
    }
    return (
      <section className="resume-section">
        {renderSectionTitle("Projects", "projects")}
        <div className="section-list">
          {data.projects.map(proj => (
            <div key={proj.id} className={`resume-item-wrap group ${proj.hidden ? 'resume-item-hidden' : ''}`}>
              {renderItemControls(proj.id, 'projects', !!proj.hidden, () => handleDeleteProj(proj.id))}
              <div className="resume-item">
                <div className="resume-item-top">
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                    <EditableText 
                      tagName="span"
                      value={proj.name}
                      onChange={(val) => handleUpdateProj(proj.id, 'name', val)}
                      placeholder="Project Name"
                      style={{ fontWeight: 700 }}
                    />
                    <button
                      type="button"
                      className="no-print ai-write-item-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        handleOpenVoiceAI(
                          proj.id,
                          'projects',
                          `Project: ${proj.name || 'Unnamed Project'}`,
                          rect.top,
                          rect.left,
                          rect.right
                        );
                      }}
                      title="Write description with AI voice"
                      style={{
                        background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                        color: '#ffffff',
                        border: 'none',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        boxShadow: '0 1px 3px rgba(139, 92, 246, 0.4)',
                        padding: 0,
                        flexShrink: 0
                      }}
                    >
                      <Sparkles size={10} />
                    </button>
                  </span>
                  <EditableText 
                    tagName="span"
                    value={proj.link || ""}
                    onChange={(val) => handleUpdateProj(proj.id, 'link', val)}
                    placeholder="Project Link"
                    style={{ fontWeight: 400, fontSize: '0.85em', color: 'var(--accent-color)' }}
                  />
                </div>
                <div className="resume-item-sub" style={{ fontSize: '0.85em' }}>
                  <EditableText 
                    tagName="span"
                    value={proj.role}
                    onChange={(val) => handleUpdateProj(proj.id, 'role', val)}
                    placeholder="Your Role"
                  />
                  <span style={{ fontSize: '0.95em', color: 'var(--text-color)', opacity: 0.8 }}>
                    Tech: <EditableText 
                      tagName="span"
                      value={proj.technologies.join(', ')}
                      onChange={(val) => {
                        const arrayVal = val.split(',').map(s => s.trim()).filter(Boolean);
                        handleUpdateProj(proj.id, 'technologies', arrayVal);
                      }}
                      placeholder="React, TypeScript, etc."
                    />
                  </span>
                </div>
                <EditableText 
                  tagName="p"
                  value={proj.description}
                  onChange={(val) => handleUpdateProj(proj.id, 'description', val)}
                  placeholder="Project Description..."
                  className="resume-item-desc"
                  multiline={true}
                />
              </div>
            </div>
          ))}
          <button
            type="button"
            className="no-print resume-preview-add-btn"
            onClick={handleAddProj}
          >
            <Plus size={10} />
            <span>Add Project</span>
          </button>
        </div>
      </section>
    );
  };

  const renderSkills = () => {
    if (!data.skills || data.skills.length === 0) return null;
    if (style.visibleSections?.skills === false) {
      return (
        <div className="no-print" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className="no-print resume-turnon-btn"
            style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => handleToggleSectionVisibility('skills')}
          >
            <Plus size={10} /> Turn On Skills Section
          </button>
        </div>
      );
    }
    return (
      <section className="resume-section">
        {renderSectionTitle("Skills", "skills")}
        <div className="skills-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {data.skills.map(skill => (
            <span key={skill.id} className={`skill-tag ${skill.hidden ? 'resume-item-hidden' : ''}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <EditableText value={skill.name} onChange={(val) => handleUpdateSkill(skill.id, 'name', val)} placeholder="Skill" />
              {skill.level && (
                <span style={{ opacity: 0.65, fontSize: '0.85em' }}>
                  {' ('}
                  <EditableText value={skill.level} onChange={(val) => handleUpdateSkill(skill.id, 'level', val)} placeholder="Level" />
                  {')'}
                </span>
              )}
              <button
                type="button"
                className="no-print skill-visibility-btn"
                onClick={() => handleToggleItemVisibility(skill.id, 'skills')}
                title={skill.hidden ? "Unhide Skill" : "Hide Skill"}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: skill.hidden ? '#ef4444' : '#10b981', display: 'inline-flex', padding: '2px', alignItems: 'center' }}
              >
                {skill.hidden ? <EyeOff size={10} /> : <Eye size={10} />}
              </button>
              <button
                type="button"
                className="no-print skill-delete-btn"
                onClick={() => handleDeleteSkill(skill.id)}
                title="Delete Skill"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '1px 2px',
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  opacity: 0.5,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            type="button"
            className="no-print resume-preview-add-btn"
            onClick={handleAddSkill}
            style={{ margin: 0, padding: '2px 6px', height: 'auto' }}
          >
            <Plus size={10} />
            <span>Add Skill</span>
          </button>
        </div>
      </section>
    );
  };

  const renderLanguages = () => {
    if (!data.languages || data.languages.length === 0) return null;
    if (style.visibleSections?.languages === false) {
      return (
        <div className="no-print" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className="no-print resume-turnon-btn"
            style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => handleToggleSectionVisibility('languages')}
          >
            <Plus size={10} /> Turn On Languages Section
          </button>
        </div>
      );
    }
    return (
      <section className="resume-section">
        {renderSectionTitle("Languages", "languages")}
        <div className="skills-wrap" style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
          {data.languages.map(lang => (
            <span key={lang.id} className={`skill-tag ${lang.hidden ? 'resume-item-hidden' : ''}`} style={{ background: 'transparent', border: '1px solid var(--divider-color)', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              <EditableText value={lang.name} onChange={(val) => handleUpdateLang(lang.id, 'name', val)} placeholder="Language" />
              {lang.proficiency && (
                <span style={{ opacity: 0.7, fontSize: '0.85em' }}>
                  {': '}
                  <EditableText value={lang.proficiency} onChange={(val) => handleUpdateLang(lang.id, 'proficiency', val)} placeholder="Level" />
                </span>
              )}
              <button
                type="button"
                className="no-print skill-visibility-btn"
                onClick={() => handleToggleItemVisibility(lang.id, 'languages')}
                title={lang.hidden ? "Unhide Language" : "Hide Language"}
                style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: lang.hidden ? '#ef4444' : '#10b981', display: 'inline-flex', padding: '2px', alignItems: 'center' }}
              >
                {lang.hidden ? <EyeOff size={10} /> : <Eye size={10} />}
              </button>
              <button
                type="button"
                className="no-print skill-delete-btn"
                onClick={() => handleDeleteLang(lang.id)}
                title="Delete Language"
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  cursor: 'pointer',
                  padding: '1px 2px',
                  margin: 0,
                  display: 'inline-flex',
                  alignItems: 'center',
                  opacity: 0.5,
                  transition: 'opacity 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.opacity = '1'}
                onMouseLeave={(e) => e.currentTarget.style.opacity = '0.5'}
              >
                <X size={10} />
              </button>
            </span>
          ))}
          <button
            type="button"
            className="no-print resume-preview-add-btn"
            onClick={handleAddLang}
            style={{ margin: 0, padding: '2px 6px', height: 'auto' }}
          >
            <Plus size={10} />
            <span>Add Language</span>
          </button>
        </div>
      </section>
    );
  };

  const renderCertifications = () => {
    if (!data.certifications || data.certifications.length === 0) return null;
    if (style.visibleSections?.certifications === false) {
      return (
        <div className="no-print" style={{ marginTop: '0.5rem', marginBottom: '1rem' }}>
          <button
            type="button"
            className="no-print resume-turnon-btn"
            style={{ border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
            onClick={() => handleToggleSectionVisibility('certifications')}
          >
            <Plus size={10} /> Turn On Certifications Section
          </button>
        </div>
      );
    }
    return (
      <section className="resume-section">
        {renderSectionTitle("Certifications", "certifications")}
        <div className="section-list">
          {data.certifications.map(cert => (
            <div key={cert.id} className={`resume-item-wrap group ${cert.hidden ? 'resume-item-hidden' : ''}`}>
              {renderItemControls(cert.id, 'certifications', !!cert.hidden, () => handleDeleteCert(cert.id))}
              <div className="resume-item" style={{ gap: 0 }}>
                <div className="resume-item-top" style={{ fontWeight: 600 }}>
                  <span>
                    <EditableText value={cert.name} onChange={(val) => handleUpdateCert(cert.id, 'name', val)} placeholder="Cert Name" />
                    {cert.issuer && cert.issuer.trim() ? (
                      <span style={{ color: 'var(--secondary-color)', fontWeight: 500 }}>
                        {' — '}
                        <EditableText value={cert.issuer} onChange={(val) => handleUpdateCert(cert.id, 'issuer', val)} placeholder="Issuer Org" />
                      </span>
                    ) : null}
                  </span>
                  <span className="resume-item-date" style={{ fontWeight: 400, fontSize: '0.85em', color: 'var(--secondary-color)' }}>
                    <EditableText value={cert.date} onChange={(val) => handleUpdateCert(cert.id, 'date', val)} placeholder="YYYY-MM" />
                  </span>
                </div>
                {cert.description && (
                  <div className="resume-item-desc" style={{ fontSize: '0.88em', marginTop: '2px', color: 'var(--text-color)', opacity: 0.9 }}>
                    <EditableText 
                      tagName="p"
                      value={cert.description}
                      onChange={(val) => handleUpdateCert(cert.id, 'description', val)}
                      placeholder="Workshop details or description..."
                      multiline={true}
                    />
                  </div>
                )}
              </div>
            </div>
          ))}
          <button
            type="button"
            className="no-print resume-preview-add-btn"
            onClick={handleAddCert}
          >
            <Plus size={10} />
            <span>Add Certification</span>
          </button>
        </div>
      </section>
    );
  };

  const renderCustomSections = () => {
    return data.customSections.filter(sect => sect.items && sect.items.length > 0).map(sect => {
      return (
        <section key={sect.id} className="resume-section">
          {renderSectionTitle(
            sect.title,
            undefined,
            (val) => handleRenameCustomSection(sect.id, val),
            () => handleDeleteCustomSection(sect.id)
          )}
          <div className="section-list">
            {sect.items.map(item => (
              <div key={item.id} className={`resume-item-wrap group ${item.hidden ? 'resume-item-hidden' : ''}`}>
                {renderItemControls(item.id, 'customSections', !!item.hidden, () => handleDeleteCustomItem(sect.id, item.id), sect.id)}
                <div className="resume-item">
                  <div className="resume-item-top">
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                      <EditableText 
                        tagName="span"
                        value={item.title}
                        onChange={(val) => handleUpdateCustomSection(sect.id, item.id, 'title', val)}
                        placeholder="Title"
                        style={{ fontWeight: 700 }}
                      />
                      <button
                        type="button"
                        className="no-print ai-write-item-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          const rect = e.currentTarget.getBoundingClientRect();
                          handleOpenVoiceAI(
                            item.id,
                            'customSections',
                            `${item.title || 'Unnamed Item'} at ${item.subtitle || sect.title}`,
                            rect.top,
                            rect.left,
                            rect.right,
                            sect.id
                          );
                        }}
                        title="Write description with AI voice"
                        style={{
                          background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                          color: '#ffffff',
                          border: 'none',
                          borderRadius: '50%',
                          width: '18px',
                          height: '18px',
                          display: 'inline-flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: '0 1px 3px rgba(139, 92, 246, 0.4)',
                          padding: 0,
                          flexShrink: 0
                        }}
                      >
                        <Sparkles size={10} />
                      </button>
                    </span>
                    <span className="resume-item-date" style={{ fontWeight: 400, fontSize: '0.85em', color: 'var(--secondary-color)' }}>
                      <EditableText value={item.date} onChange={(val) => handleUpdateCustomSection(sect.id, item.id, 'date', val)} placeholder="Date / Range" />
                    </span>
                  </div>
                  <div className="resume-item-sub">
                    <EditableText 
                      tagName="span"
                      value={item.subtitle || ""}
                      onChange={(val) => handleUpdateCustomSection(sect.id, item.id, 'subtitle', val)}
                      placeholder="Subtitle / Organization"
                      className="resume-item-org"
                    />
                  </div>
                  <EditableText 
                    tagName="p"
                    value={item.description || ""}
                    onChange={(val) => handleUpdateCustomSection(sect.id, item.id, 'description', val)}
                    placeholder="Description..."
                    className="resume-item-desc"
                    multiline={true}
                  />
                </div>
              </div>
            ))}
            <button
              type="button"
              className="no-print resume-preview-add-btn"
              onClick={() => handleAddCustomItem(sect.id)}
            >
              <Plus size={10} />
              <span>Add Item</span>
            </button>
          </div>
        </section>
      );
    });
  };

  // --- LAYOUT ARRANGERS ---

  const renderLayoutContent = () => {
    const layout = style.layout;

    if (layout === 'left-sidebar' || layout === 'right-sidebar') {
      const sidebarContent = (
        <div className="resume-sidebar-col">
          {renderSkills()}
          {renderLanguages()}
          {renderCertifications()}
        </div>
      );

      const mainContent = (
        <div className="resume-main-col">
          {renderSummary()}
          {renderExperience()}
          {renderEducation()}
          {renderProjects()}
          {renderCustomSections()}
        </div>
      );

      return (
        <div className={`layout-${layout}`}>
          {layout === 'left-sidebar' ? (
            <>
              <div className="layout-two-column-bg">{sidebarContent}</div>
              {mainContent}
            </>
          ) : (
            <>
              {mainContent}
              <div className="layout-two-column-bg">{sidebarContent}</div>
            </>
          )}
        </div>
      );
    }

    if (layout === 'three-column') {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
          {renderSummary()}
          <div className="layout-three-column-grid">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
              {renderExperience()}
              {renderCustomSections()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
              {renderEducation()}
              {renderProjects()}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--section-gap)' }}>
              {renderSkills()}
              {renderLanguages()}
              {renderCertifications()}
            </div>
          </div>
        </div>
      );
    }

    // Default: single column layout
    const order = style.sectionOrder || ['summary', 'experience', 'education', 'projects', 'skills', 'languages', 'certifications'];
    return (
      <div className="resume-body">
        {order.map(section => {
          let content: React.ReactNode = null;
          switch (section) {
            case 'summary': content = renderSummary(); break;
            case 'experience': content = renderExperience(); break;
            case 'education': content = renderEducation(); break;
            case 'projects': content = renderProjects(); break;
            case 'skills': content = renderSkills(); break;
            case 'languages': content = renderLanguages(); break;
            case 'certifications': content = renderCertifications(); break;
          }
          return <React.Fragment key={section}>{content}</React.Fragment>;
        })}
        {renderCustomSections()}
      </div>
    );
  };


  const activeMarginValue = style.margins === 'narrow' ? '1.6rem' : style.margins === 'wide' ? '3.6rem' : '2.6rem';

  return (
    <div 
      ref={pageRef}
      className={`resume-page ${activeFont.class} divider-${style.dividerStyle}`} 
      style={{ ...compiledVariables, height: 'auto', minHeight: '1123px' }}
      id="print-resume-page"
    >
      <style dangerouslySetInnerHTML={{ __html: `
        /* Direct Preview Editor Styles */
        .resume-preview-add-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 4px 8px;
          font-size: 11px;
          font-weight: 600;
          color: var(--primary-color) !important;
          background: transparent !important;
          border: 1px dashed var(--primary-color) !important;
          border-radius: 4px;
          cursor: pointer;
          margin-top: 6px;
          margin-bottom: 6px;
          transition: all 0.2s ease;
          line-height: 1;
        }
        .resume-preview-add-btn:hover {
          background: var(--primary-color) !important;
          color: #ffffff !important;
          opacity: 0.9;
        }
        .resume-item-wrap {
          position: relative;
          padding-right: 28px;
        }
        .resume-item-date {
          position: relative !important;
          margin-right: 0px !important;
        }
        .resume-item-link {
          position: relative !important;
        }
        .control-toggle-btn {
          z-index: 50 !important;
        }
        .control-toggle-btn:hover {
          background: rgba(0, 0, 0, 0.05) !important;
          color: var(--primary-color) !important;
        }
        .menu-item-btn:hover {
          background: rgba(0, 0, 0, 0.05) !important;
        }
        .section-controls {
          display: flex;
          align-items: center;
          gap: 2px;
          opacity: 1;
        }
        .section-controls button {
          padding: 3px !important;
          border-radius: 3px !important;
          transition: background 0.15s ease, color 0.15s ease;
        }
        .section-controls button:hover {
          background: rgba(0,0,0,0.06) !important;
          color: #111827 !important;
        }
        .resume-turnon-btn {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          padding: 6px 14px;
          font-size: 0.78rem;
          font-weight: 600;
          color: #7c3aed;
          background: #ede9fe;
          border: 1px dashed #c4b5fd !important;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s ease;
        }
        .resume-turnon-btn:hover {
          background: #ddd6fe;
          color: #5b21b6;
        }
        .resume-addlink-btn:hover {
          background: #ddd6fe !important;
          color: #5b21b6 !important;
        }
        .resume-item-hidden {
          opacity: 0.4 !important;
          border: 1px dashed #ef4444 !important;
          background: rgba(239, 68, 68, 0.02) !important;
          border-radius: 4px;
          padding: 4px;
          position: relative;
        }
        .resume-item-hidden::before {
          content: "Hidden from Export";
          position: absolute;
          top: 2px;
          left: 2px;
          background: #ef4444;
          color: #ffffff;
          font-size: 8px;
          font-weight: 700;
          padding: 1px 3px;
          border-radius: 2px;
          pointer-events: none;
          z-index: 9;
        }
        .resume-item-delete-btn {
          position: absolute;
          top: 0;
          right: -24px;
          background: transparent !important;
          border: none !important;
          color: #ef4444 !important;
          cursor: pointer;
          opacity: 0;
          transition: all 0.2s ease;
          padding: 4px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 4px;
        }
        .resume-item-wrap:hover .resume-item-delete-btn {
          opacity: 0.8;
        }
        .resume-item-delete-btn:hover {
          opacity: 1 !important;
          background: rgba(239, 68, 68, 0.1) !important;
        }
        .section-title-wrap {
          position: relative;
        }
        .section-delete-btn {
          background: transparent !important;
          border: none !important;
          color: #ef4444 !important;
          cursor: pointer;
          opacity: 1;
          transition: all 0.2s ease;
          padding: 2px 6px;
          font-size: 10px;
          font-weight: 600;
          display: inline-flex;
          align-items: center;
          gap: 2px;
          border-radius: 4px;
        }
        .section-delete-btn:hover {
          background: rgba(239, 68, 68, 0.1) !important;
        }

        @media print {
          :root,
          html,
          body,
          .resume-builder-pro,
          .app-container,
          .preview-canvas-container,
          .resume-preview-container-wrapper,
          .resume-pages-scaler,
          .resume-pages-wrapper {
            background: #ffffff !important;
            background-color: #ffffff !important;
            color: #000000 !important;
            color-scheme: light !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            position: static !important;
            transform: none !important;
            overflow: visible !important;
          }
          @page {
            size: A4;
            margin: ${activeMarginValue} !important;
          }
          .resume-page,
          #print-resume-page {
            padding: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            height: auto !important;
            min-height: 0 !important;
            max-height: none !important;
            box-sizing: border-box !important;
            overflow: visible !important;
            position: static !important;
          }
          .resume-page .header-bold-banner {
            margin-top: 0 !important;
            margin-left: 0 !important;
            margin-right: 0 !important;
          }
          .resume-page .layout-two-column-bg {
            margin-top: 0 !important;
            margin-bottom: 0 !important;
            margin-left: 0 !important;
          }
          .resume-page .resume-section {
            margin-top: 0.6rem !important;
            break-inside: auto !important;
            page-break-inside: auto !important;
          }
          .resume-page .section-title-wrap {
            margin-bottom: 0.35rem !important;
            break-after: avoid !important;
            page-break-after: avoid !important;
          }
          .no-print,
          .edit-pencil-icon,
          .resume-preview-add-btn,
          .resume-item-delete-btn,
          .section-delete-btn,
          .skill-delete-btn,
          .resume-item-controls-wrapper,
          .resume-item-hidden,
          .skill-visibility-btn {
            display: none !important;
          }
          .resume-item-wrap {
            padding-right: 0px !important;
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
          .editable-element[data-placeholder]:empty::before {
            display: none !important;
            content: "" !important;
          }
        }
      `}} />
      {renderHeader()}
      {renderLayoutContent()}
      <div className="no-print" style={{ display: 'flex', justifyContent: 'center', marginTop: '1rem', width: '100%' }}>
        <button
          type="button"
          className="no-print resume-preview-add-btn"
          onClick={handleAddCustomSection}
          style={{ padding: '6px 12px', fontSize: '12px' }}
        >
          <Plus size={12} />
          <span>Add Custom/Voluntary Section</span>
        </button>
      </div>

      {voiceAiOpen && voiceAiConfig && (
        <VoiceAIWriterModal
          isOpen={voiceAiOpen}
          onClose={() => {
            setVoiceAiOpen(false);
            setVoiceAiConfig(null);
          }}
          onGenerate={handleVoiceAiGenerate}
          title={voiceAiConfig.title}
          section={voiceAiConfig.section}
          top={voiceAiConfig.top}
          left={voiceAiConfig.left}
          right={voiceAiConfig.right}
        />
      )}
    </div>
  );
};
