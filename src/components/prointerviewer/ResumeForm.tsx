import React, { useState } from 'react';
import type { ResumeData, ResumeStyle, WorkExperience, Education, Skill, Language, Certification } from './types';
import { 
  User, Briefcase, GraduationCap, Code, Globe, Award, Plus, Trash2, ArrowUp, ArrowDown, ChevronDown, ChevronUp, Image as ImageIcon, Sparkles, ToggleLeft, ToggleRight, Sliders
} from 'lucide-react';
import { getStorageItem } from '../../utils/storage';

interface ResumeFormProps {
  data: ResumeData;
  onChangeData: (updatedData: ResumeData) => void;
  onAIAutofill?: () => void;
  isAILoading?: boolean;
  style: ResumeStyle;
  onChangeStyle: (updatedStyle: ResumeStyle) => void;
  onConfirm?: (options: { title: string; message: string; onConfirm: () => void }) => void;
}

export const ResumeForm: React.FC<ResumeFormProps> = ({ data, onChangeData, onAIAutofill, isAILoading, style, onChangeStyle, onConfirm }) => {
  const [expandedSection, setExpandedSection] = useState<string | null>(null);

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  const toggleSectionVisibility = (sectionKey: string) => {
    const visibleSections = style.visibleSections || {};
    const isVisible = visibleSections[sectionKey as keyof typeof visibleSections] ?? true;
    onChangeStyle({
      ...style,
      visibleSections: {
        ...visibleSections,
        [sectionKey]: !isVisible
      }
    });
  };

  const handleSyncFromAccount = () => {
    const storedName = getStorageItem("userName") || "";
    const storedEmail = getStorageItem("userIdentifier") || "";
    const storedPhone = getStorageItem("userPhone") || "";
    const storedPhoto = getStorageItem("userProfilePhoto") || "";
    const storedLinkedin = getStorageItem("userLinkedin") || "";
    const storedGithub = getStorageItem("userGithub") || "";
    const storedPortfolio = getStorageItem("userPortfolio") || "";
    
    // Read education data
    let educationList = [...data.education];
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
          startDate: "",
          endDate: storedEdu.ug.year || "",
          cgpa: scores.cgpa,
          percentage: scores.percentage,
          location: "",
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
          startDate: "",
          endDate: storedEdu.pg.year || "",
          cgpa: scores.cgpa,
          percentage: scores.percentage,
          location: "",
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
          startDate: "",
          endDate: storedEdu.twelfth.year || "",
          cgpa: scores.cgpa,
          percentage: scores.percentage,
          location: "",
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
          startDate: "",
          endDate: storedEdu.tenth.year || "",
          cgpa: scores.cgpa,
          percentage: scores.percentage,
          location: "",
          description: ""
        });
      }

      if (newEdu.length > 0) {
        educationList = newEdu;
      }
    } catch (e) {
      console.error("Failed to parse stored education details", e);
    }

    onChangeData({
      ...data,
      personalInfo: {
        ...data.personalInfo,
        name: storedName || data.personalInfo.name,
        email: storedEmail || data.personalInfo.email,
        phone: storedPhone || data.personalInfo.phone,
        avatar: storedPhoto || data.personalInfo.avatar,
        linkedin: storedLinkedin || data.personalInfo.linkedin,
        github: storedGithub || data.personalInfo.github,
        website: storedPortfolio || data.personalInfo.website
      },
      education: educationList
    });
  };

  // Helper to update personal info fields
  const handlePersonalChange = (field: keyof typeof data.personalInfo, value: string) => {
    onChangeData({
      ...data,
      personalInfo: {
        ...data.personalInfo,
        [field]: value
      }
    });
  };

  // Profile Picture Upload Handler (converts to base64)
  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (typeof reader.result === 'string') {
          handlePersonalChange('avatar', reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const removeAvatar = () => {
    handlePersonalChange('avatar', '');
  };

  // Generic List update functions
  const updateListField = <K extends keyof Omit<ResumeData, 'personalInfo' | 'customSections'>>(
    section: K,
    id: string,
    field: string,
    value: any
  ) => {
    const updatedList = (data[section] as any[]).map(item => 
      item.id === id ? { ...item, [field]: value } : item
    );
    onChangeData({
      ...data,
      [section]: updatedList
    });
  };

  const addListItem = <K extends keyof Omit<ResumeData, 'personalInfo' | 'customSections'>>(
    section: K,
    newItemTemplate: any
  ) => {
    onChangeData({
      ...data,
      [section]: [...(data[section] as any[]), { ...newItemTemplate, id: `${section}-${Date.now()}` }]
    });
  };

  const removeListItem = <K extends keyof Omit<ResumeData, 'personalInfo' | 'customSections'>>(
    section: K,
    id: string
  ) => {
    onChangeData({
      ...data,
      [section]: (data[section] as any[]).filter(item => item.id !== id)
    });
  };

  const reorderListItem = <K extends keyof Omit<ResumeData, 'personalInfo' | 'customSections'>>(
    section: K,
    index: number,
    direction: 'up' | 'down'
  ) => {
    const list = [...(data[section] as any[])];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex >= 0 && targetIndex < list.length) {
      const temp = list[index];
      list[index] = list[targetIndex];
      list[targetIndex] = temp;
      onChangeData({
        ...data,
        [section]: list
      });
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }} className="font-sans">
      
      {/* 1. PERSONAL DETAILS ACCORDION */}
      <div className="accordion-item">
        <div style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
          <button className="accordion-header" onClick={() => toggleSection('personal')} style={{ flex: 1 }}>
            <div className="accordion-header-left">
              <User size={16} />
              <span>Personal Information</span>
            </div>
            {expandedSection === 'personal' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          {onAIAutofill && (
            <button
              type="button"
              className="ai-autofill-btn"
              onClick={(e) => { e.stopPropagation(); onAIAutofill(); }}
              disabled={isAILoading}
              title="Autofill all resume fields using AI"
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem',
                padding: '0.4rem 0.65rem',
                marginRight: '0.5rem',
                fontSize: '0.7rem',
                fontWeight: 600,
                background: 'linear-gradient(135deg, #8b5cf6, #6366f1)',
                color: '#fff',
                border: 'none',
                borderRadius: '0.5rem',
                cursor: isAILoading ? 'wait' : 'pointer',
                opacity: isAILoading ? 0.7 : 1,
                whiteSpace: 'nowrap',
                transition: 'all 0.2s ease',
                boxShadow: '0 0 12px rgba(139, 92, 246, 0.3)',
                flexShrink: 0
              }}
            >
              <Sparkles size={12} style={isAILoading ? { animation: 'spin 1s linear infinite' } : {}} />
              <span>{isAILoading ? 'Generating...' : 'Autofill with AI'}</span>
            </button>
          )}
        </div>

        {expandedSection === 'personal' && (
          <div className="accordion-content">
            <button 
              type="button" 
              className="btn-add" 
              onClick={handleSyncFromAccount}
              style={{
                width: '100%', 
                marginBottom: '1rem', 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center', 
                gap: '0.4rem',
                fontSize: '0.8rem',
                padding: '0.45rem',
                border: '1px dashed var(--input-focus)',
                color: 'var(--input-focus)',
                background: 'rgba(59, 130, 246, 0.05)'
              }}
            >
              <ArrowDown size={14} className="animate-bounce" />
              <span>Import Profile & Photo from Account</span>
            </button>
            <div className="avatar-input-wrapper">
              <div className="avatar-preview-circle">
                {data.personalInfo.avatar ? (
                  <img src={data.personalInfo.avatar} alt="Avatar Preview" />
                ) : (
                  <ImageIcon size={20} style={{ color: 'var(--text-muted)' }} />
                )}
              </div>
              <div className="avatar-actions">
                <input
                  type="file"
                  id="avatar-upload"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  style={{ display: 'none' }}
                />
                <button 
                  className="btn btn-secondary" 
                  onClick={() => document.getElementById('avatar-upload')?.click()}
                  style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }}
                >
                  Upload Photo
                </button>
                {data.personalInfo.avatar && (
                  <button 
                    className="list-item-btn btn-delete" 
                    onClick={removeAvatar}
                    style={{ fontSize: '0.7rem', padding: '0.15rem' }}
                  >
                    Remove Photo
                  </button>
                )}
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  className="form-input"
                  value={data.personalInfo.name}
                  onChange={(e) => handlePersonalChange('name', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Professional Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={data.personalInfo.title}
                  onChange={(e) => handlePersonalChange('title', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  className="form-input"
                  value={data.personalInfo.email}
                  onChange={(e) => handlePersonalChange('email', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  className="form-input"
                  value={data.personalInfo.phone}
                  onChange={(e) => handlePersonalChange('phone', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Location (City, State)</label>
                <input
                  type="text"
                  className="form-input"
                  value={data.personalInfo.location}
                  onChange={(e) => handlePersonalChange('location', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">Website / Portfolio</label>
                <input
                  type="text"
                  className="form-input"
                  value={data.personalInfo.website}
                  onChange={(e) => handlePersonalChange('website', e.target.value)}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">LinkedIn URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={data.personalInfo.linkedin}
                  onChange={(e) => handlePersonalChange('linkedin', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">GitHub URL</label>
                <input
                  type="text"
                  className="form-input"
                  value={data.personalInfo.github}
                  onChange={(e) => handlePersonalChange('github', e.target.value)}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: 0 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                <label className="form-label" style={{ margin: 0 }}>Professional Summary</label>
                <button
                  type="button"
                  onClick={() => toggleSectionVisibility('summary')}
                  style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: (style.visibleSections?.summary ?? true) ? '#3b82f6' : 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem', padding: 0 }}
                  title="Toggle visibility on resume"
                >
                  <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{(style.visibleSections?.summary ?? true) ? 'Visible' : 'Hidden'}</span>
                  {(style.visibleSections?.summary ?? true) ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
                </button>
              </div>
              <textarea
                className="form-input"
                value={data.personalInfo.summary}
                onChange={(e) => handlePersonalChange('summary', e.target.value)}
                style={{ opacity: (style.visibleSections?.summary ?? true) ? 1 : 0.6 }}
              />
            </div>
          </div>
        )}
      </div>

      {/* 2. WORK EXPERIENCE ACCORDION */}
      <div className="accordion-item" style={{ opacity: (style.visibleSections?.experience ?? true) ? 1 : 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <button type="button" className="accordion-header" onClick={() => toggleSection('experience')} style={{ flex: 1, borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
            <div className="accordion-header-left">
              <Briefcase size={16} />
              <span>Work Experience</span>
            </div>
            {expandedSection === 'experience' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleSectionVisibility('experience'); }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: (style.visibleSections?.experience ?? true) ? '#3b82f6' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.75rem 1rem',
              borderLeft: '1px solid var(--panel-border)',
              height: '100%'
            }}
            title="Toggle section visibility on resume"
          >
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{(style.visibleSections?.experience ?? true) ? 'Visible' : 'Hidden'}</span>
            {(style.visibleSections?.experience ?? true) ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
        </div>

        {expandedSection === 'experience' && (
          <div className="accordion-content">
            {data.workExperience.map((exp, index) => (
              <div key={exp.id} className="list-item-card">
                <div className="list-item-header">
                  <span className="list-item-title">{exp.position || 'Untitled Role'} at {exp.company || 'New Company'}</span>
                  <div className="list-item-actions">
                    <button 
                      className="list-item-btn" 
                      onClick={() => reorderListItem('workExperience', index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      className="list-item-btn" 
                      onClick={() => reorderListItem('workExperience', index, 'down')}
                      disabled={index === data.workExperience.length - 1}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button 
                      className="list-item-btn btn-delete" 
                      onClick={() => removeListItem('workExperience', exp.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Company</label>
                    <input
                      type="text"
                      className="form-input"
                      value={exp.company}
                      onChange={(e) => updateListField('workExperience', exp.id, 'company', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Position / Job Title</label>
                    <input
                      type="text"
                      className="form-input"
                      value={exp.position}
                      onChange={(e) => updateListField('workExperience', exp.id, 'position', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="month"
                      className="form-input"
                      value={exp.startDate}
                      onChange={(e) => updateListField('workExperience', exp.id, 'startDate', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End Date</label>
                    <input
                      type="month"
                      className="form-input"
                      value={exp.endDate}
                      disabled={exp.current}
                      onChange={(e) => updateListField('workExperience', exp.id, 'endDate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <input
                    type="checkbox"
                    id={`current-exp-${exp.id}`}
                    checked={exp.current}
                    onChange={(e) => {
                      updateListField('workExperience', exp.id, 'current', e.target.checked);
                      if (e.target.checked) updateListField('workExperience', exp.id, 'endDate', '');
                    }}
                  />
                  <label htmlFor={`current-exp-${exp.id}`} className="form-label" style={{ margin: 0, cursor: 'pointer' }}>
                    I currently work here
                  </label>
                </div>

                <div className="form-group">
                  <label className="form-label">Location</label>
                  <input
                    type="text"
                    className="form-input"
                    value={exp.location}
                    onChange={(e) => updateListField('workExperience', exp.id, 'location', e.target.value)}
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description & Bullet Points</label>
                  <textarea
                    className="form-input"
                    value={exp.description}
                    placeholder="• Did action...&#10;• Accomplished Y..."
                    onChange={(e) => updateListField('workExperience', exp.id, 'description', e.target.value)}
                  />
                </div>
              </div>
            ))}

            <button 
              className="btn-add"
              onClick={() => addListItem('workExperience', { company: '', position: '', location: '', startDate: '', endDate: '', current: false, description: '' } as WorkExperience)}
            >
              <Plus size={14} />
              <span>Add Experience</span>
            </button>
          </div>
        )}
      </div>

      {/* 3. EDUCATION ACCORDION */}
      <div className="accordion-item" style={{ opacity: (style.visibleSections?.education ?? true) ? 1 : 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <button type="button" className="accordion-header" onClick={() => toggleSection('education')} style={{ flex: 1, borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
            <div className="accordion-header-left">
              <GraduationCap size={16} />
              <span>Education</span>
            </div>
            {expandedSection === 'education' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleSectionVisibility('education'); }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: (style.visibleSections?.education ?? true) ? '#3b82f6' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.75rem 1rem',
              borderLeft: '1px solid var(--panel-border)',
              height: '100%'
            }}
            title="Toggle section visibility on resume"
          >
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{(style.visibleSections?.education ?? true) ? 'Visible' : 'Hidden'}</span>
            {(style.visibleSections?.education ?? true) ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
        </div>

        {expandedSection === 'education' && (
          <div className="accordion-content">
            {data.education.map((edu, index) => (
              <div key={edu.id} className="list-item-card">
                <div className="list-item-header">
                  <span className="list-item-title">{edu.degree || 'New Degree'} in {edu.fieldOfStudy || 'New Field'}</span>
                  <div className="list-item-actions">
                    <button 
                      className="list-item-btn" 
                      onClick={() => reorderListItem('education', index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      className="list-item-btn" 
                      onClick={() => reorderListItem('education', index, 'down')}
                      disabled={index === data.education.length - 1}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button 
                      className="list-item-btn btn-delete" 
                      onClick={() => removeListItem('education', edu.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Institution / School</label>
                  <input
                    type="text"
                    className="form-input"
                    value={edu.institution}
                    onChange={(e) => updateListField('education', edu.id, 'institution', e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Degree (e.g. B.S., M.A.)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={edu.degree}
                      onChange={(e) => updateListField('education', edu.id, 'degree', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Field of Study</label>
                    <input
                      type="text"
                      className="form-input"
                      value={edu.fieldOfStudy}
                      onChange={(e) => updateListField('education', edu.id, 'fieldOfStudy', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Start Date</label>
                    <input
                      type="month"
                      className="form-input"
                      value={edu.startDate}
                      onChange={(e) => updateListField('education', edu.id, 'startDate', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">End/Graduation Date</label>
                    <input
                      type="month"
                      className="form-input"
                      value={edu.endDate}
                      onChange={(e) => updateListField('education', edu.id, 'endDate', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">CGPA</label>
                    <input
                      type="text"
                      className="form-input"
                      value={edu.cgpa || ''}
                      placeholder="e.g. 9.2 / 10"
                      onChange={(e) => updateListField('education', edu.id, 'cgpa', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Percentage</label>
                    <input
                      type="text"
                      className="form-input"
                      value={edu.percentage || ''}
                      placeholder="e.g. 88%"
                      onChange={(e) => updateListField('education', edu.id, 'percentage', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Location</label>
                    <input
                      type="text"
                      className="form-input"
                      value={edu.location}
                      onChange={(e) => updateListField('education', edu.id, 'location', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Additional Description</label>
                  <textarea
                    className="form-input"
                    value={edu.description}
                    onChange={(e) => updateListField('education', edu.id, 'description', e.target.value)}
                  />
                </div>
              </div>
            ))}

            <button 
              className="btn-add"
              onClick={() => addListItem('education', { institution: '', degree: '', fieldOfStudy: '', location: '', startDate: '', endDate: '', cgpa: '', percentage: '', description: '' } as Education)}
            >
              <Plus size={14} />
              <span>Add Education</span>
            </button>
          </div>
        )}
      </div>

      {/* 4. PROJECTS ACCORDION */}
      <div className="accordion-item" style={{ opacity: (style.visibleSections?.projects ?? true) ? 1 : 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <button type="button" className="accordion-header" onClick={() => toggleSection('projects')} style={{ flex: 1, borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
            <div className="accordion-header-left">
              <Code size={16} />
              <span>Projects</span>
            </div>
            {expandedSection === 'projects' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleSectionVisibility('projects'); }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: (style.visibleSections?.projects ?? true) ? '#3b82f6' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.75rem 1rem',
              borderLeft: '1px solid var(--panel-border)',
              height: '100%'
            }}
            title="Toggle section visibility on resume"
          >
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{(style.visibleSections?.projects ?? true) ? 'Visible' : 'Hidden'}</span>
            {(style.visibleSections?.projects ?? true) ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
        </div>

        {expandedSection === 'projects' && (
          <div className="accordion-content">
            {data.projects.map((proj, index) => (
              <div key={proj.id} className="list-item-card">
                <div className="list-item-header">
                  <span className="list-item-title">{proj.name || 'Untitled Project'}</span>
                  <div className="list-item-actions">
                    <button 
                      className="list-item-btn" 
                      onClick={() => reorderListItem('projects', index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      className="list-item-btn" 
                      onClick={() => reorderListItem('projects', index, 'down')}
                      disabled={index === data.projects.length - 1}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button 
                      className="list-item-btn btn-delete" 
                      onClick={() => removeListItem('projects', proj.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Project Name</label>
                    <input
                      type="text"
                      className="form-input"
                      value={proj.name}
                      onChange={(e) => updateListField('projects', proj.id, 'name', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Your Role</label>
                    <input
                      type="text"
                      className="form-input"
                      value={proj.role}
                      placeholder="e.g. Lead Developer"
                      onChange={(e) => updateListField('projects', proj.id, 'role', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Technologies (comma separated)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={proj.technologies.join(', ')}
                      placeholder="React, AWS, Node.js"
                      onChange={(e) => {
                        const arrayVal = e.target.value.split(',').map(s => s.trim()).filter(Boolean);
                        updateListField('projects', proj.id, 'technologies', arrayVal);
                      }}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Project Link URL</label>
                    <input
                      type="text"
                      className="form-input"
                      value={proj.link}
                      onChange={(e) => updateListField('projects', proj.id, 'link', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Description</label>
                  <textarea
                    className="form-input"
                    value={proj.description}
                    onChange={(e) => updateListField('projects', proj.id, 'description', e.target.value)}
                  />
                </div>
              </div>
            ))}

            <button 
              className="btn-add"
              onClick={() => addListItem('projects', { name: '', role: '', technologies: [], link: '', description: '' } as any)}
            >
              <Plus size={14} />
              <span>Add Project</span>
            </button>
          </div>
        )}
      </div>

      {/* 5. SKILLS ACCORDION */}
      <div className="accordion-item" style={{ opacity: (style.visibleSections?.skills ?? true) ? 1 : 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <button type="button" className="accordion-header" onClick={() => toggleSection('skills')} style={{ flex: 1, borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
            <div className="accordion-header-left">
              <Code size={16} />
              <span>Skills</span>
            </div>
            {expandedSection === 'skills' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleSectionVisibility('skills'); }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: (style.visibleSections?.skills ?? true) ? '#3b82f6' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.75rem 1rem',
              borderLeft: '1px solid var(--panel-border)',
              height: '100%'
            }}
            title="Toggle section visibility on resume"
          >
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{(style.visibleSections?.skills ?? true) ? 'Visible' : 'Hidden'}</span>
            {(style.visibleSections?.skills ?? true) ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
        </div>

        {expandedSection === 'skills' && (
          <div className="accordion-content">
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 30px', gap: '0.4rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span>Skill Name</span>
              <span>Category</span>
              <span>Level (Optional)</span>
              <span></span>
            </div>

            {data.skills.map((skill) => (
              <div key={skill.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 30px', gap: '0.4rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  value={skill.name}
                  placeholder="TypeScript"
                  onChange={(e) => updateListField('skills', skill.id, 'name', e.target.value)}
                  style={{ padding: '0.35rem 0.5rem' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={skill.category}
                  placeholder="Languages"
                  onChange={(e) => updateListField('skills', skill.id, 'category', e.target.value)}
                  style={{ padding: '0.35rem 0.5rem' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={skill.level}
                  placeholder="Advanced"
                  onChange={(e) => updateListField('skills', skill.id, 'level', e.target.value)}
                  style={{ padding: '0.35rem 0.5rem' }}
                />
                <button 
                  className="list-item-btn btn-delete" 
                  onClick={() => removeListItem('skills', skill.id)}
                  style={{ padding: '0.4rem' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            <button 
              className="btn-add"
              onClick={() => addListItem('skills', { name: '', category: '', level: '' } as Skill)}
              style={{ marginTop: '0.5rem' }}
            >
              <Plus size={14} />
              <span>Add Skill</span>
            </button>
          </div>
        )}
      </div>

      {/* 6. LANGUAGES ACCORDION */}
      <div className="accordion-item" style={{ opacity: (style.visibleSections?.languages ?? true) ? 1 : 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <button type="button" className="accordion-header" onClick={() => toggleSection('languages')} style={{ flex: 1, borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
            <div className="accordion-header-left">
              <Globe size={16} />
              <span>Languages</span>
            </div>
            {expandedSection === 'languages' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleSectionVisibility('languages'); }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: (style.visibleSections?.languages ?? true) ? '#3b82f6' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.75rem 1rem',
              borderLeft: '1px solid var(--panel-border)',
              height: '100%'
            }}
            title="Toggle section visibility on resume"
          >
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{(style.visibleSections?.languages ?? true) ? 'Visible' : 'Hidden'}</span>
            {(style.visibleSections?.languages ?? true) ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
        </div>

        {expandedSection === 'languages' && (
          <div className="accordion-content">
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 30px', gap: '0.4rem', fontWeight: 600, fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '0.5rem' }}>
              <span>Language</span>
              <span>Proficiency (e.g. Native, Fluent)</span>
              <span></span>
            </div>

            {data.languages.map((lang) => (
              <div key={lang.id} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 30px', gap: '0.4rem', marginBottom: '0.4rem', alignItems: 'center' }}>
                <input
                  type="text"
                  className="form-input"
                  value={lang.name}
                  placeholder="Spanish"
                  onChange={(e) => updateListField('languages', lang.id, 'name', e.target.value)}
                  style={{ padding: '0.35rem 0.5rem' }}
                />
                <input
                  type="text"
                  className="form-input"
                  value={lang.proficiency}
                  placeholder="Fluent"
                  onChange={(e) => updateListField('languages', lang.id, 'proficiency', e.target.value)}
                  style={{ padding: '0.35rem 0.5rem' }}
                />
                <button 
                  className="list-item-btn btn-delete" 
                  onClick={() => removeListItem('languages', lang.id)}
                  style={{ padding: '0.4rem' }}
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}

            <button 
              className="btn-add"
              onClick={() => addListItem('languages', { name: '', proficiency: '' } as Language)}
              style={{ marginTop: '0.5rem' }}
            >
              <Plus size={14} />
              <span>Add Language</span>
            </button>
          </div>
        )}
      </div>

      {/* 7. CERTIFICATIONS ACCORDION */}
      <div className="accordion-item" style={{ opacity: (style.visibleSections?.certifications ?? true) ? 1 : 0.6 }}>
        <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
          <button type="button" className="accordion-header" onClick={() => toggleSection('certifications')} style={{ flex: 1, borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
            <div className="accordion-header-left">
              <Award size={16} />
              <span>Certifications & Awards</span>
            </div>
            {expandedSection === 'certifications' ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); toggleSectionVisibility('certifications'); }}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: (style.visibleSections?.certifications ?? true) ? '#3b82f6' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              padding: '0.75rem 1rem',
              borderLeft: '1px solid var(--panel-border)',
              height: '100%'
            }}
            title="Toggle section visibility on resume"
          >
            <span style={{ fontSize: '0.65rem', fontWeight: 600 }}>{(style.visibleSections?.certifications ?? true) ? 'Visible' : 'Hidden'}</span>
            {(style.visibleSections?.certifications ?? true) ? <ToggleRight size={20} /> : <ToggleLeft size={20} />}
          </button>
        </div>

        {expandedSection === 'certifications' && (
          <div className="accordion-content">
            {data.certifications.map((cert, index) => (
              <div key={cert.id} className="list-item-card">
                <div className="list-item-header">
                  <span className="list-item-title">{cert.name || 'New Certification'}</span>
                  <div className="list-item-actions">
                    <button 
                      className="list-item-btn" 
                      onClick={() => reorderListItem('certifications', index, 'up')}
                      disabled={index === 0}
                    >
                      <ArrowUp size={14} />
                    </button>
                    <button 
                      className="list-item-btn" 
                      onClick={() => reorderListItem('certifications', index, 'down')}
                      disabled={index === data.certifications.length - 1}
                    >
                      <ArrowDown size={14} />
                    </button>
                    <button 
                      className="list-item-btn btn-delete" 
                      onClick={() => removeListItem('certifications', cert.id)}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Certification / Award Name</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cert.name}
                    onChange={(e) => updateListField('certifications', cert.id, 'name', e.target.value)}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Issuing Organization</label>
                    <input
                      type="text"
                      className="form-input"
                      value={cert.issuer}
                      onChange={(e) => updateListField('certifications', cert.id, 'issuer', e.target.value)}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Date Earned</label>
                    <input
                      type="month"
                      className="form-input"
                      value={cert.date}
                      onChange={(e) => updateListField('certifications', cert.id, 'date', e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Credential URL Link</label>
                  <input
                    type="text"
                    className="form-input"
                    value={cert.link}
                    onChange={(e) => updateListField('certifications', cert.id, 'link', e.target.value)}
                  />
                </div>
              </div>
            ))}

            <button 
              className="btn-add"
              onClick={() => addListItem('certifications', { name: '', issuer: '', date: '', link: '' } as Certification)}
            >
              <Plus size={14} />
              <span>Add Certification</span>
            </button>
          </div>
        )}
      </div>

      {/* 8. CUSTOM SECTIONS ACCORDION */}
      {data.customSections && data.customSections.map((sect, sectIndex) => (
        <div key={sect.id} className="accordion-item">
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <button type="button" className="accordion-header" onClick={() => toggleSection(sect.id)} style={{ flex: 1, borderRight: 'none', borderTopRightRadius: 0, borderBottomRightRadius: 0 }}>
              <div className="accordion-header-left">
                <Sliders size={16} />
                <span>{sect.title || 'Custom Section'}</span>
              </div>
              {expandedSection === sect.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                const deleteAction = () => {
                  const updatedSections = data.customSections.filter(s => s.id !== sect.id);
                  onChangeData({
                    ...data,
                    customSections: updatedSections
                  });
                };
                if (onConfirm) {
                  onConfirm({
                    title: "Delete Custom Section?",
                    message: `Delete the entire custom section "${sect.title}"? All items and contents under this section will be permanently deleted.`,
                    onConfirm: deleteAction
                  });
                } else if (window.confirm(`Delete the entire custom section "${sect.title}"?`)) {
                  deleteAction();
                }
              }}
              style={{
                background: 'transparent',
                border: 'none',
                cursor: 'pointer',
                color: '#ef4444',
                padding: '0.75rem 1rem',
                borderLeft: '1px solid var(--panel-border)',
                height: '100%'
              }}
              title="Delete custom section"
            >
              <Trash2 size={16} />
            </button>
          </div>

          {expandedSection === sect.id && (
            <div className="accordion-content">
              <div className="form-group">
                <label className="form-label">Section Title</label>
                <input
                  type="text"
                  className="form-input"
                  value={sect.title}
                  onChange={(e) => {
                    const updated = data.customSections.map(s => {
                      if (s.id === sect.id) {
                        return { ...s, title: e.target.value };
                      }
                      return s;
                    });
                    onChangeData({ ...data, customSections: updated });
                  }}
                />
              </div>

              {sect.items.map((item, itemIndex) => (
                <div key={item.id} className="list-item-card">
                  <div className="list-item-header">
                    <span className="list-item-title">{item.title || 'New Item'}</span>
                    <div className="list-item-actions">
                      <button 
                        type="button"
                        className="list-item-btn" 
                        onClick={() => {
                          if (itemIndex === 0) return;
                          const reordered = [...sect.items];
                          const temp = reordered[itemIndex];
                          reordered[itemIndex] = reordered[itemIndex - 1];
                          reordered[itemIndex - 1] = temp;
                          const updated = data.customSections.map(s => {
                            if (s.id === sect.id) return { ...s, items: reordered };
                            return s;
                          });
                          onChangeData({ ...data, customSections: updated });
                        }}
                        disabled={itemIndex === 0}
                      >
                        <ArrowUp size={14} />
                      </button>
                      <button 
                        type="button"
                        className="list-item-btn" 
                        onClick={() => {
                          if (itemIndex === sect.items.length - 1) return;
                          const reordered = [...sect.items];
                          const temp = reordered[itemIndex];
                          reordered[itemIndex] = reordered[itemIndex + 1];
                          reordered[itemIndex + 1] = temp;
                          const updated = data.customSections.map(s => {
                            if (s.id === sect.id) return { ...s, items: reordered };
                            return s;
                          });
                          onChangeData({ ...data, customSections: updated });
                        }}
                        disabled={itemIndex === sect.items.length - 1}
                      >
                        <ArrowDown size={14} />
                      </button>
                      <button 
                        type="button"
                        className="list-item-btn btn-delete" 
                        onClick={() => {
                          const filtered = sect.items.filter(i => i.id !== item.id);
                          const updated = data.customSections.map(s => {
                            if (s.id === sect.id) return { ...s, items: filtered };
                            return s;
                          });
                          onChangeData({ ...data, customSections: updated });
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Item Title</label>
                    <input
                      type="text"
                      className="form-input"
                      value={item.title}
                      onChange={(e) => {
                        const updatedItems = sect.items.map(i => {
                          if (i.id === item.id) return { ...i, title: e.target.value };
                          return i;
                        });
                        const updated = data.customSections.map(s => {
                          if (s.id === sect.id) return { ...s, items: updatedItems };
                          return s;
                        });
                        onChangeData({ ...data, customSections: updated });
                      }}
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group">
                      <label className="form-label">Subtitle / Organization</label>
                      <input
                        type="text"
                        className="form-input"
                        value={item.subtitle || ''}
                        onChange={(e) => {
                          const updatedItems = sect.items.map(i => {
                            if (i.id === item.id) return { ...i, subtitle: e.target.value };
                            return i;
                          });
                          const updated = data.customSections.map(s => {
                            if (s.id === sect.id) return { ...s, items: updatedItems };
                            return s;
                          });
                          onChangeData({ ...data, customSections: updated });
                        }}
                      />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Date / Range</label>
                      <input
                        type="text"
                        className="form-input"
                        value={item.date || ''}
                        onChange={(e) => {
                          const updatedItems = sect.items.map(i => {
                            if (i.id === item.id) return { ...i, date: e.target.value };
                            return i;
                          });
                          const updated = data.customSections.map(s => {
                            if (s.id === sect.id) return { ...s, items: updatedItems };
                            return s;
                          });
                          onChangeData({ ...data, customSections: updated });
                        }}
                      />
                    </div>
                  </div>

                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Description</label>
                    <textarea
                      className="form-input"
                      rows={3}
                      value={item.description || ''}
                      onChange={(e) => {
                        const updatedItems = sect.items.map(i => {
                          if (i.id === item.id) return { ...i, description: e.target.value };
                          return i;
                        });
                        const updated = data.customSections.map(s => {
                          if (s.id === sect.id) return { ...s, items: updatedItems };
                          return s;
                        });
                        onChangeData({ ...data, customSections: updated });
                      }}
                      style={{ resize: 'vertical' }}
                    />
                  </div>
                </div>
              ))}

              <button 
                type="button"
                className="btn-add"
                onClick={() => {
                  const newItem = {
                    id: `cust-item-${Date.now()}`,
                    title: '',
                    subtitle: '',
                    date: '',
                    description: ''
                  };
                  const updated = data.customSections.map(s => {
                    if (s.id === sect.id) return { ...s, items: [...s.items, newItem] };
                    return s;
                  });
                  onChangeData({ ...data, customSections: updated });
                }}
              >
                <Plus size={14} />
                <span>Add Item</span>
              </button>
            </div>
          )}
        </div>
      ))}

      {/* Button to add a new custom section altogether */}
      <button 
        type="button"
        className="btn-add"
        onClick={() => {
          const title = prompt("Enter a title for the new custom section (e.g., Volunteering, Patents):");
          if (!title) return;
          const newSect = {
            id: `cust-${Date.now()}`,
            title: title.trim(),
            items: []
          };
          onChangeData({
            ...data,
            customSections: [...(data.customSections || []), newSect]
          });
        }}
        style={{ marginTop: '0.75rem', width: '100%' }}
      >
        <Plus size={14} />
        <span>Add Custom Section</span>
      </button>

    </div>
  );
};
