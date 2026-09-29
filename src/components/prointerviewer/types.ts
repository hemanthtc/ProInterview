export interface PersonalInfo {
  name: string;
  title: string;
  email: string;
  phone: string;
  location: string;
  website: string;
  linkedin: string;
  github: string;
  avatar: string; // Base64 dataURL or image URL
  summary: string;
}

export interface WorkExperience {
  id: string;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string; // Bullet points or text description
  hidden?: boolean;
}

export interface Education {
  id: string;
  institution: string;
  degree: string;
  fieldOfStudy: string;
  location: string;
  startDate: string;
  endDate: string;
  cgpa?: string;
  percentage?: string;
  description: string;
  hidden?: boolean;
  degreeType?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  link: string;
  role: string;
  hidden?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  level: string; // e.g. "Beginner", "Intermediate", "Advanced", "Expert", or ""
  category: string; // e.g. "Languages", "Frameworks", "Design"
  hidden?: boolean;
}

export interface Language {
  id: string;
  name: string;
  proficiency: string; // e.g. "Native", "Fluent", "Conversational", "Basic"
  hidden?: boolean;
}

export interface Certification {
  id: string;
  name: string;
  issuer: string;
  date: string;
  link: string;
  description?: string;
  hidden?: boolean;
}

export interface CustomSectionItem {
  id: string;
  title: string;
  subtitle: string;
  date: string;
  description: string;
  hidden?: boolean;
}

export interface CustomSection {
  id: string;
  title: string;
  items: CustomSectionItem[];
}

export interface ResumeData {
  personalInfo: PersonalInfo;
  workExperience: WorkExperience[];
  education: Education[];
  projects: Project[];
  skills: Skill[];
  languages: Language[];
  certifications: Certification[];
  customSections: CustomSection[];
}

export type LayoutType = 'single-column' | 'left-sidebar' | 'right-sidebar' | 'split-header' | 'three-column';
export type HeaderStyle = 'minimalist' | 'bold-banner' | 'split-profile' | 'accent-line';
export type DividerStyle = 'simple' | 'accent-block' | 'pill-badges' | 'timeline';
export type FontSize = 'sm' | 'md' | 'lg';
export type SpacingSize = 'compact' | 'normal' | 'relaxed';
export type MarginSize = 'narrow' | 'normal' | 'wide';

export interface ColorPalette {
  id: string;
  name: string;
  primary: string; // e.g. hex or hsl
  secondary: string;
  accent: string;
  text: string;
  background: string;
  sidebarBg?: string; // used for two-column layouts
  sidebarText?: string;
  bannerBg?: string; // used for bold banner header
  bannerText?: string;
}

export interface FontFamily {
  id: string;
  name: string;
  class: string; // css class name or font-family string
  importUrl?: string; // google fonts import url if needed
}

export interface ResumeStyle {
  layout: LayoutType;
  headerStyle: HeaderStyle;
  colorPaletteId: string;
  fontFamilyId: string;
  dividerStyle: DividerStyle;
  fontSize: FontSize;
  spacing: SpacingSize;
  margins: MarginSize;
  showAvatars: boolean;
  sectionOrder?: string[];
  visibleSections?: {
    summary?: boolean;
    experience?: boolean;
    education?: boolean;
    projects?: boolean;
    skills?: boolean;
    languages?: boolean;
    certifications?: boolean;
  };
}

export interface ResumeTemplate {
  id: string;
  name: string;
  category: 'Modern' | 'Creative' | 'Professional' | 'Academic' | 'Technical' | 'Minimalist' | 'ATS Friendly';
  description: string;
  style: ResumeStyle;
}
