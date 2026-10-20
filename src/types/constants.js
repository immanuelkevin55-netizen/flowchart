export const SHAPE_TYPES = {
  PROCESS: 'process',
  DECISION: 'decision',
  TERMINATOR: 'terminator',
  SUBPROCESS: 'subprocess',
  DATABASE: 'database',
  DOCUMENT: 'document',
  DATA: 'data',
  PREPARATION: 'preparation',
  CALLOUT: 'callout',
  TEXTBOX: 'textbox'
};

export const CONNECTOR_TYPES = {
  ORTHOGONAL: 'orthogonal',
  STRAIGHT: 'straight',
  CURVED: 'curved'
};

export const THEMES = {
  EXECUTIVE_NAVY: {
    id: 'EXECUTIVE_NAVY',
    name: 'Executive Navy',
    isDark: true,
    bg: '#0F172A',
    surface: '#1E293B',
    titleColor: '#F8FAFC',
    subtitleColor: '#94A3B8',
    primary: {
      fill: '#1E293B',
      stroke: '#38BDF8',
      textColor: '#F8FAFC'
    },
    decision: {
      fill: '#1E3A8A',
      stroke: '#60A5FA',
      textColor: '#EFF6FF'
    },
    terminator: {
      fill: '#065F46',
      stroke: '#34D399',
      textColor: '#ECFDF5'
    },
    accent: {
      fill: '#7C3AED',
      stroke: '#C084FC',
      textColor: '#FAF5FF'
    },
    connector: '#38BDF8',
    gridColor: 'rgba(255, 255, 255, 0.07)'
  },
  MODERN_PURPLE: {
    id: 'MODERN_PURPLE',
    name: 'Vibrant Indigo & Violet',
    isDark: true,
    bg: '#0B0F19',
    surface: '#151D2E',
    titleColor: '#FFFFFF',
    subtitleColor: '#A5B4FC',
    primary: {
      fill: '#1E1B4B',
      stroke: '#818CF8',
      textColor: '#EEF2FF'
    },
    decision: {
      fill: '#4C1D95',
      stroke: '#C084FC',
      textColor: '#F5F3FF'
    },
    terminator: {
      fill: '#064E3B',
      stroke: '#34D399',
      textColor: '#ECFDF5'
    },
    accent: {
      fill: '#831843',
      stroke: '#F472B6',
      textColor: '#FDF2F8'
    },
    connector: '#818CF8',
    gridColor: 'rgba(255, 255, 255, 0.06)'
  },
  DARK_EMERALD: {
    id: 'DARK_EMERALD',
    name: 'Cyber Emerald',
    isDark: true,
    bg: '#081313',
    surface: '#0F2424',
    titleColor: '#F0FDFA',
    subtitleColor: '#5EEAD4',
    primary: {
      fill: '#113537',
      stroke: '#2DD4BF',
      textColor: '#F0FDFA'
    },
    decision: {
      fill: '#134E4A',
      stroke: '#14B8A6',
      textColor: '#CCFBF1'
    },
    terminator: {
      fill: '#065F46',
      stroke: '#34D399',
      textColor: '#ECFDF5'
    },
    accent: {
      fill: '#1E293B',
      stroke: '#38BDF8',
      textColor: '#F8FAFC'
    },
    connector: '#2DD4BF',
    gridColor: 'rgba(45, 212, 191, 0.08)'
  },
  CLEAN_LIGHT: {
    id: 'CLEAN_LIGHT',
    name: 'Corporate Clean Light',
    isDark: false,
    bg: '#F8FAFC',
    surface: '#FFFFFF',
    titleColor: '#0F172A',
    subtitleColor: '#475569',
    primary: {
      fill: '#EFF6FF',
      stroke: '#2563EB',
      textColor: '#1E293B'
    },
    decision: {
      fill: '#FEF3C7',
      stroke: '#D97706',
      textColor: '#78350F'
    },
    terminator: {
      fill: '#ECFDF5',
      stroke: '#059669',
      textColor: '#064E3B'
    },
    accent: {
      fill: '#F3E8FF',
      stroke: '#7C3AED',
      textColor: '#581C87'
    },
    connector: '#2563EB',
    gridColor: 'rgba(0, 0, 0, 0.06)'
  },
  EDITORIAL_WARM: {
    id: 'EDITORIAL_WARM',
    name: 'Warm Editorial Sand',
    isDark: false,
    bg: '#FDFCFA',
    surface: '#FFFFFF',
    titleColor: '#27272A',
    subtitleColor: '#71717A',
    primary: {
      fill: '#FFFFFF',
      stroke: '#D97706',
      textColor: '#1C1917'
    },
    decision: {
      fill: '#FFFBEB',
      stroke: '#B45309',
      textColor: '#78350F'
    },
    terminator: {
      fill: '#F4F4F5',
      stroke: '#52525B',
      textColor: '#18181B'
    },
    accent: {
      fill: '#FEF2F2',
      stroke: '#DC2626',
      textColor: '#991B1B'
    },
    connector: '#D97706',
    gridColor: 'rgba(120, 113, 108, 0.08)'
  }
};

export const DEFAULT_CANVAS_WIDTH = 1600;
export const DEFAULT_CANVAS_HEIGHT = 900;
