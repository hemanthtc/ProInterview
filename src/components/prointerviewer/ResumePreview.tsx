import React from 'react';
import type { ResumeData, ResumeStyle, WorkExperience, Education, Project, Skill, Language, Certification } from './types';
import { COLOR_PALETTES, FONT_FAMILIES } from './templates';
import { Mail, Phone, MapPin, Globe } from 'lucide-react';

interface ResumePreviewProps {
  data: ResumeData;
  style: ResumeStyle;
  onChangeData: (updatedData: ResumeData) => void;
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
  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
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

  return React.createElement(
    tagName,
    {
      className: `editable-element ${className}`,
      contentEditable: true,
      suppressContentEditableWarning: true,
      onBlur: handleBlur,
      onKeyDown: handleKeyDown,
      "data-placeholder": placeholder,
      style: { 
        display: tagName === 'span' ? 'inline-block' : 'block',
        minWidth: value ? 'none' : '60px',
        ...style
      }
    },
    value
  );
};

export const ResumePreview: React.FC<ResumePreviewProps> = ({ data, style, onChangeData }) => {
  const activePalette = COLOR_PALETTES.find(p => p.id === style.colorPaletteId) || COLOR_PALETTES[0];
  const activeFont = FONT_FAMILIES.find(f => f.id === style.fontFamilyId) || FONT_FAMILIES[0];

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
      education: data.education.map(item => item.id === id ? { ...item, [field]: value } : item)
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

  // --- SECTIONS RENDERERS ---

  const renderHeader = () => {
    const { personalInfo } = data;
    const headerClass = `resume-header header-${style.headerStyle}`;

    const contactGrid = (
      <div className="contact-grid">
        {personalInfo.email && (
          <div className="contact-item">
            <Mail size={12} />
            <EditableText value={personalInfo.email} onChange={(val) => handleUpdatePersonalInfo('email', val)} placeholder="Email" />
          </div>
        )}
        {personalInfo.phone && (
          <div className="contact-item">
            <Phone size={12} />
            <EditableText value={personalInfo.phone} onChange={(val) => handleUpdatePersonalInfo('phone', val)} placeholder="Phone" />
          </div>
        )}
        {personalInfo.location && (
          <div className="contact-item">
            <MapPin size={12} />
            <EditableText value={personalInfo.location} onChange={(val) => handleUpdatePersonalInfo('location', val)} placeholder="Location" />
          </div>
        )}
        {personalInfo.website && (
          <div className="contact-item">
            <Globe size={12} />
            <EditableText value={personalInfo.website} onChange={(val) => handleUpdatePersonalInfo('website', val)} placeholder="Website" />
          </div>
        )}
        {personalInfo.linkedin && (
          <div className="contact-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/><rect width="4" height="12" x="2" y="9"/><circle cx="4" cy="4" r="2"/></svg>
            <EditableText value={personalInfo.linkedin} onChange={(val) => handleUpdatePersonalInfo('linkedin', val)} placeholder="LinkedIn" />
          </div>
        )}
        {personalInfo.github && (
          <div className="contact-item">
            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>
            <EditableText value={personalInfo.github} onChange={(val) => handleUpdatePersonalInfo('github', val)} placeholder="GitHub" />
          </div>
        )}
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
              placeholder="Professional Title" 
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

  const renderSectionTitle = (title: string) => {
    return (
      <div className="section-title-wrap">
        <h3 className="section-title">{title}</h3>
      </div>
    );
  };

  const renderSummary = () => {
    if (style.visibleSections?.summary === false) return null;
    if (!data.personalInfo.summary) return null;
    return (
      <section className="resume-section">
        {renderSectionTitle("Profile Summary")}
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

  const renderExperience = () => {
    if (style.visibleSections?.experience === false) return null;
    if (data.workExperience.length === 0) return null;
    return (
      <section className="resume-section">
        {renderSectionTitle("Work Experience")}
        <div className="section-list">
          {data.workExperience.map(exp => (
            <div key={exp.id} className="resume-item">
              <div className="resume-item-top">
                <EditableText 
                  tagName="span"
                  value={exp.position}
                  onChange={(val) => handleUpdateWorkExp(exp.id, 'position', val)}
                  placeholder="Position"
                  className="resume-item-role"
                />
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
          ))}
        </div>
      </section>
    );
  };

  const renderEducation = () => {
    if (style.visibleSections?.education === false) return null;
    if (data.education.length === 0) return null;
    return (
      <section className="resume-section">
        {renderSectionTitle("Education")}
        <div className="section-list">
          {data.education.map(edu => (
            <div key={edu.id} className="resume-item">
              <div className="resume-item-top">
                <span className="resume-item-role">
                  <EditableText value={edu.degree} onChange={(val) => handleUpdateEdu(edu.id, 'degree', val)} placeholder="Degree" />
                  {' in '}
                  <EditableText value={edu.fieldOfStudy} onChange={(val) => handleUpdateEdu(edu.id, 'fieldOfStudy', val)} placeholder="Field of Study" />
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
              {edu.description && (
                <EditableText 
                  tagName="p"
                  value={edu.description}
                  onChange={(val) => handleUpdateEdu(edu.id, 'description', val)}
                  placeholder="Additional descriptions..."
                  className="resume-item-desc"
                  multiline={true}
                />
              )}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderProjects = () => {
    if (style.visibleSections?.projects === false) return null;
    if (data.projects.length === 0) return null;
    return (
      <section className="resume-section">
        {renderSectionTitle("Projects")}
        <div className="section-list">
          {data.projects.map(proj => (
            <div key={proj.id} className="resume-item">
              <div className="resume-item-top">
                <EditableText 
                  tagName="span"
                  value={proj.name}
                  onChange={(val) => handleUpdateProj(proj.id, 'name', val)}
                  placeholder="Project Name"
                  style={{ fontWeight: 700 }}
                />
                {proj.link && (
                  <EditableText 
                    tagName="span"
                    value={proj.link}
                    onChange={(val) => handleUpdateProj(proj.id, 'link', val)}
                    placeholder="Project Link"
                    style={{ fontWeight: 400, fontSize: '0.8em', color: 'var(--accent-color)' }}
                  />
                )}
              </div>
              <div className="resume-item-sub" style={{ fontSize: '0.85em' }}>
                <EditableText 
                  tagName="span"
                  value={proj.role}
                  onChange={(val) => handleUpdateProj(proj.id, 'role', val)}
                  placeholder="Your Role"
                />
                <span style={{ fontSize: '0.95em', color: 'var(--text-color)', opacity: 0.8 }}>
                  Tech: {proj.technologies.join(', ')}
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
          ))}
        </div>
      </section>
    );
  };

  const renderSkills = () => {
    if (style.visibleSections?.skills === false) return null;
    if (data.skills.length === 0) return null;
    return (
      <section className="resume-section">
        {renderSectionTitle("Skills")}
        <div className="skills-wrap">
          {data.skills.map(skill => (
            <span key={skill.id} className="skill-tag">
              <EditableText value={skill.name} onChange={(val) => handleUpdateSkill(skill.id, 'name', val)} placeholder="Skill" />
              {skill.level && (
                <span style={{ opacity: 0.65, fontSize: '0.85em' }}>
                  {' ('}
                  <EditableText value={skill.level} onChange={(val) => handleUpdateSkill(skill.id, 'level', val)} placeholder="Level" />
                  {')'}
                </span>
              )}
            </span>
          ))}
        </div>
      </section>
    );
  };

  const renderLanguages = () => {
    if (style.visibleSections?.languages === false) return null;
    if (data.languages.length === 0) return null;
    return (
      <section className="resume-section">
        {renderSectionTitle("Languages")}
        <div className="skills-wrap">
          {data.languages.map(lang => (
            <span key={lang.id} className="skill-tag" style={{ background: 'transparent', border: '1px solid var(--divider-color)' }}>
              <EditableText value={lang.name} onChange={(val) => handleUpdateLang(lang.id, 'name', val)} placeholder="Language" />
              {lang.proficiency && (
                <span style={{ opacity: 0.7, fontSize: '0.85em' }}>
                  {': '}
                  <EditableText value={lang.proficiency} onChange={(val) => handleUpdateLang(lang.id, 'proficiency', val)} placeholder="Level" />
                </span>
              )}
            </span>
          ))}
        </div>
      </section>
    );
  };

  const renderCertifications = () => {
    if (style.visibleSections?.certifications === false) return null;
    if (data.certifications.length === 0) return null;
    return (
      <section className="resume-section">
        {renderSectionTitle("Certifications")}
        <div className="section-list">
          {data.certifications.map(cert => (
            <div key={cert.id} className="resume-item" style={{ gap: 0 }}>
              <div className="resume-item-top" style={{ fontWeight: 600 }}>
                <span>
                  <EditableText value={cert.name} onChange={(val) => handleUpdateCert(cert.id, 'name', val)} placeholder="Cert Name" />
                  {cert.issuer && (
                    <>
                      {' — '}
                      <EditableText value={cert.issuer} onChange={(val) => handleUpdateCert(cert.id, 'issuer', val)} placeholder="Issuer" style={{ color: 'var(--secondary-color)', fontWeight: 500 }} />
                    </>
                  )}
                </span>
                <span className="resume-item-date" style={{ fontWeight: 400, fontSize: '0.85em', color: 'var(--secondary-color)' }}>
                  <EditableText value={cert.date} onChange={(val) => handleUpdateCert(cert.id, 'date', val)} placeholder="YYYY-MM" />
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderCustomSections = () => {
    return data.customSections.map(sect => {
      if (sect.items.length === 0) return null;
      return (
        <section key={sect.id} className="resume-section">
          {renderSectionTitle(sect.title)}
          <div className="section-list">
            {sect.items.map(item => (
              <div key={item.id} className="resume-item">
                <div className="resume-item-top">
                  <EditableText 
                    tagName="span"
                    value={item.title}
                    onChange={(val) => handleUpdateCustomSection(sect.id, item.id, 'title', val)}
                    placeholder="Title"
                    style={{ fontWeight: 700 }}
                  />
                  <span className="resume-item-date" style={{ fontWeight: 400, fontSize: '0.85em', color: 'var(--secondary-color)' }}>
                    <EditableText value={item.date} onChange={(val) => handleUpdateCustomSection(sect.id, item.id, 'date', val)} placeholder="Date / Range" />
                  </span>
                </div>
                {item.subtitle && (
                  <div className="resume-item-sub">
                    <EditableText 
                      tagName="span"
                      value={item.subtitle}
                      onChange={(val) => handleUpdateCustomSection(sect.id, item.id, 'subtitle', val)}
                      placeholder="Subtitle"
                      className="resume-item-org"
                    />
                  </div>
                )}
                {item.description && (
                  <EditableText 
                    tagName="p"
                    value={item.description}
                    onChange={(val) => handleUpdateCustomSection(sect.id, item.id, 'description', val)}
                    placeholder="Description..."
                    className="resume-item-desc"
                    multiline={true}
                  />
                )}
              </div>
            ))}
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
    return (
      <div className="resume-body">
        {renderSummary()}
        {renderExperience()}
        {renderEducation()}
        {renderProjects()}
        {renderSkills()}
        {renderLanguages()}
        {renderCertifications()}
        {renderCustomSections()}
      </div>
    );
  };

  return (
    <div 
      className={`resume-page ${activeFont.class}`} 
      style={compiledVariables}
      id="print-resume-page"
    >
      {renderHeader()}
      {renderLayoutContent()}
    </div>
  );
};
