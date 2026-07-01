import React, { useState, useMemo } from 'react';
import { TEMPLATES } from './templates';
import type { ResumeTemplate } from './types';
import { Search, Grid, Info } from 'lucide-react';

interface TemplateSelectorProps {
  activeTemplateId: string;
  onSelectTemplate: (template: ResumeTemplate) => void;
}

type CategoryType = 'All' | 'Professional' | 'Modern' | 'Creative' | 'Academic' | 'Technical' | 'Minimalist';

export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  activeTemplateId,
  onSelectTemplate
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<CategoryType>('All');

  const categories: CategoryType[] = ['All', 'Professional', 'Modern', 'Creative', 'Academic', 'Technical', 'Minimalist'];

  const filteredTemplates = useMemo(() => {
    return TEMPLATES.filter(tmpl => {
      const matchesSearch = tmpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            tmpl.description.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = selectedCategory === 'All' || tmpl.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });
  }, [searchQuery, selectedCategory]);

  // Renders a stylized thumbnail representation of the template's layout style
  const renderTemplateMock = (tmpl: ResumeTemplate) => {
    const layout = tmpl.style.layout;
    const header = tmpl.style.headerStyle;
    const paletteId = tmpl.style.colorPaletteId;

    // Map color values for the mock representation
    let primaryColor = '#3b82f6';

    if (paletteId === 'classic-navy') primaryColor = '#1e3a8a';
    else if (paletteId === 'emerald-modern') primaryColor = '#059669';
    else if (paletteId === 'sunset-orange') primaryColor = '#ea580c';
    else if (paletteId === 'royal-purple') primaryColor = '#7c3aed';
    else if (paletteId === 'dark-noir') primaryColor = '#0f172a';
    else if (paletteId === 'monochrome-slate') primaryColor = '#4b5563';
    else if (paletteId === 'teal-clean') primaryColor = '#0891b2';
    else if (paletteId === 'warm-burgundy') primaryColor = '#be123c';

    const hasHeaderBanner = header === 'bold-banner';
    const isSidebarLayout = layout === 'left-sidebar' || layout === 'right-sidebar';
    const isThreeCol = layout === 'three-column';

    return (
      <div className="template-preview-mock" style={{ border: activeTemplateId === tmpl.id ? `1.5px solid ${primaryColor}` : '1px solid rgba(255,255,255,0.08)' }}>
        {/* Banner Mock Header */}
        {hasHeaderBanner ? (
          <div style={{ height: '22px', backgroundColor: primaryColor, borderRadius: '2px', width: '100%', marginBottom: '3px' }} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px' }}>
            {header === 'split-profile' && <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: primaryColor }} />}
            <div style={{ height: '7px', backgroundColor: primaryColor, borderRadius: '1px', width: '45%' }} />
          </div>
        )}

        {/* Columns Mock */}
        {isSidebarLayout ? (
          <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
            {layout === 'left-sidebar' && <div style={{ width: '28%', background: paletteId === 'dark-noir' ? '#0f172a' : 'rgba(255, 255, 255, 0.05)', borderRadius: '1px' }} />}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
              <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', width: '90%' }} />
              <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', width: '80%' }} />
              <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', width: '85%' }} />
            </div>
            {layout === 'right-sidebar' && <div style={{ width: '28%', background: 'rgba(255, 255, 255, 0.05)', borderRadius: '1px' }} />}
          </div>
        ) : isThreeCol ? (
          <div style={{ display: 'flex', gap: '3px', flex: 1 }}>
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '1px' }} />
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '1px' }} />
            <div style={{ flex: 1, background: 'rgba(255,255,255,0.05)', borderRadius: '1px' }} />
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '3px', flex: 1 }}>
            <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', width: '100%' }} />
            <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', width: '95%' }} />
            <div style={{ height: '5px', background: 'rgba(255,255,255,0.06)', width: '70%' }} />
          </div>
        )}
      </div>
    );
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }} className="font-sans">
      {/* Search Header */}
      <div style={{ position: 'relative', marginBottom: '1rem' }}>
        <input
          type="text"
          placeholder="Search templates..."
          className="form-input"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          style={{ paddingLeft: '2.25rem' }}
        />
        <Search size={16} style={{ position: 'absolute', left: '0.85rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
      </div>

      {/* Category Tags */}
      <div className="category-filters">
        {categories.map(cat => (
          <button
            key={cat}
            className={`filter-badge ${selectedCategory === cat ? 'active' : ''}`}
            onClick={() => setSelectedCategory(cat)}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Templates List */}
      <div style={{ flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.75rem', marginBottom: '0.75rem' }}>
          <Grid size={12} />
          <span>Showing {filteredTemplates.length} templates</span>
        </div>

        <div className="templates-grid">
          {filteredTemplates.map(tmpl => {
            const isActive = activeTemplateId === tmpl.id;
            return (
              <div
                key={tmpl.id}
                className={`template-card ${isActive ? 'active' : ''}`}
                onClick={() => onSelectTemplate(tmpl)}
                title={tmpl.description}
              >
                {renderTemplateMock(tmpl)}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.25rem', gap: '4px' }}>
                  <span className="template-card-name">{tmpl.name}</span>
                  <div title={tmpl.description} style={{ color: 'var(--text-muted)', cursor: 'help', flexShrink: 0 }}>
                    <Info size={11} />
                  </div>
                </div>
                <span className="template-card-tag">{tmpl.category}</span>
              </div>
            );
          })}
        </div>

        {filteredTemplates.length === 0 && (
          <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-muted)' }}>
            <p style={{ fontSize: '0.9rem', margin: 0 }}>No templates matched your search.</p>
          </div>
        )}
      </div>
    </div>
  );
};
