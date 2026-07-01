import React from 'react';
import type { ResumeStyle, LayoutType, HeaderStyle, DividerStyle, FontSize, SpacingSize, MarginSize } from './types';
import { COLOR_PALETTES, FONT_FAMILIES } from './templates';
import { Type, Palette, Layout, Columns, Sliders, ToggleLeft, ToggleRight } from 'lucide-react';

interface StyleCustomizerProps {
  style: ResumeStyle;
  onChangeStyle: (updatedStyle: ResumeStyle) => void;
}

export const StyleCustomizer: React.FC<StyleCustomizerProps> = ({ style, onChangeStyle }) => {
  const updateStyleField = <K extends keyof ResumeStyle>(field: K, value: ResumeStyle[K]) => {
    onChangeStyle({
      ...style,
      [field]: value
    });
  };

  const layouts: { id: LayoutType; name: string }[] = [
    { id: 'single-column', name: '1 Column' },
    { id: 'left-sidebar', name: 'Left Bar' },
    { id: 'right-sidebar', name: 'Right Bar' },
    { id: 'split-header', name: 'Split Head' },
    { id: 'three-column', name: '3 Columns' }
  ];

  const headers: { id: HeaderStyle; name: string }[] = [
    { id: 'minimalist', name: 'Minimal' },
    { id: 'bold-banner', name: 'Banner' },
    { id: 'split-profile', name: 'Profile' },
    { id: 'accent-line', name: 'Accent' }
  ];

  const dividers: { id: DividerStyle; name: string }[] = [
    { id: 'simple', name: 'Simple' },
    { id: 'accent-block', name: 'Block' },
    { id: 'pill-badges', name: 'Pills' },
    { id: 'timeline', name: 'Timeline' }
  ];

  const fontSizes: { id: FontSize; name: string }[] = [
    { id: 'sm', name: 'Small' },
    { id: 'md', name: 'Medium' },
    { id: 'lg', name: 'Large' }
  ];

  const spacings: { id: SpacingSize; name: string }[] = [
    { id: 'compact', name: 'Compact' },
    { id: 'normal', name: 'Normal' },
    { id: 'relaxed', name: 'Relaxed' }
  ];

  const margins: { id: MarginSize; name: string }[] = [
    { id: 'narrow', name: 'Narrow' },
    { id: 'normal', name: 'Normal' },
    { id: 'wide', name: 'Wide' }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }} className="font-sans">
      
      {/* 1. Color Palette Selector */}
      <div>
        <div className="customizer-section-title">
          <Palette size={13} />
          <span>Color Palettes</span>
        </div>
        <div className="preset-grid">
          {COLOR_PALETTES.map(palette => (
            <button
              key={palette.id}
              className={`color-option-btn ${style.colorPaletteId === palette.id ? 'active' : ''}`}
              onClick={() => updateStyleField('colorPaletteId', palette.id)}
              title={palette.name}
            >
              <div className="color-option-split">
                <div className="color-option-bar" style={{ backgroundColor: palette.primary }} />
                <div className="color-option-bar" style={{ backgroundColor: palette.secondary }} />
                <div className="color-option-bar" style={{ backgroundColor: palette.accent }} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. Typography Selector */}
      <div>
        <div className="customizer-section-title">
          <Type size={13} />
          <span>Typography</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem' }}>
          {FONT_FAMILIES.map(font => (
            <button
              key={font.id}
              className={`font-option-btn ${style.fontFamilyId === font.id ? 'active' : ''}`}
              onClick={() => updateStyleField('fontFamilyId', font.id)}
              style={{ fontFamily: font.id === 'fira-code' ? 'monospace' : font.id === 'playfair' ? 'serif' : 'sans-serif' }}
            >
              {font.name}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Page Layout Selector */}
      <div>
        <div className="customizer-section-title">
          <Layout size={13} />
          <span>Structure Layout</span>
        </div>
        <div className="toggle-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.25rem' }}>
          {layouts.map(layout => (
            <button
              key={layout.id}
              className={`toggle-btn ${style.layout === layout.id ? 'active' : ''}`}
              onClick={() => updateStyleField('layout', layout.id)}
            >
              {layout.name}
            </button>
          ))}
        </div>
      </div>

      {/* 4. Header Style Selector */}
      <div>
        <div className="customizer-section-title">
          <Columns size={13} />
          <span>Header Style</span>
        </div>
        <div className="toggle-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem', marginBottom: '0.5rem' }}>
          {headers.map(header => (
            <button
              key={header.id}
              className={`toggle-btn ${style.headerStyle === header.id ? 'active' : ''}`}
              onClick={() => updateStyleField('headerStyle', header.id)}
            >
              {header.name}
            </button>
          ))}
        </div>
      </div>

      {/* 5. Section Dividers Selector */}
      <div>
        <div className="customizer-section-title">
          <Columns size={13} />
          <span>Section Dividers</span>
        </div>
        <div className="toggle-group" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.25rem' }}>
          {dividers.map(divider => (
            <button
              key={divider.id}
              className={`toggle-btn ${style.dividerStyle === divider.id ? 'active' : ''}`}
              onClick={() => updateStyleField('dividerStyle', divider.id)}
            >
              {divider.name}
            </button>
          ))}
        </div>
      </div>

      {/* 6. General Spacings and Sizing controls */}
      <div>
        <div className="customizer-section-title">
          <Sliders size={13} />
          <span>Sizing & Margins</span>
        </div>

        {/* Font size toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Text Size</span>
          <div className="toggle-group" style={{ width: '210px' }}>
            {fontSizes.map(size => (
              <button
                key={size.id}
                className={`toggle-btn ${style.fontSize === size.id ? 'active' : ''}`}
                onClick={() => updateStyleField('fontSize', size.id)}
              >
                {size.name}
              </button>
            ))}
          </div>
        </div>

        {/* Section spacing toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Spacing</span>
          <div className="toggle-group" style={{ width: '210px' }}>
            {spacings.map(space => (
              <button
                key={space.id}
                className={`toggle-btn ${style.spacing === space.id ? 'active' : ''}`}
                onClick={() => updateStyleField('spacing', space.id)}
              >
                {space.name}
              </button>
            ))}
          </div>
        </div>

        {/* Page Margins toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Page Margins</span>
          <div className="toggle-group" style={{ width: '210px' }}>
            {margins.map(margin => (
              <button
                key={margin.id}
                className={`toggle-btn ${style.margins === margin.id ? 'active' : ''}`}
                onClick={() => updateStyleField('margins', margin.id)}
              >
                {margin.name}
              </button>
            ))}
          </div>
        </div>

        {/* Toggle Avatars */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.75rem', paddingTop: '0.75rem', borderTop: '1px solid var(--panel-border)' }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Show Profile Image</span>
          <button
            onClick={() => updateStyleField('showAvatars', !style.showAvatars)}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: style.showAvatars ? '#3b82f6' : 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center'
            }}
          >
            {style.showAvatars ? <ToggleRight size={28} /> : <ToggleLeft size={28} />}
          </button>
        </div>
      </div>

    </div>
  );
};
