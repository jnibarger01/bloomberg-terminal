import { WidgetConfig, ThemeColor } from '../types';

export const LOCAL_STORAGE_KEY_LAYOUT = 'terminal_canvas_layout_v1';
export const LOCAL_STORAGE_KEY_THEME = 'terminal_canvas_theme_v1';
export const LOCAL_STORAGE_KEY_SETTINGS = 'terminal_canvas_settings_v1';

export interface DashboardSettings {
  crtScanlines: boolean;
  backgroundStyle: 'grid' | 'dots' | 'solid';
  snapToGrid: boolean;
  themeColor: ThemeColor;
}

export const DEFAULT_SETTINGS: DashboardSettings = {
  crtScanlines: false,
  backgroundStyle: 'grid',
  snapToGrid: true,
  themeColor: 'green'
};

export const DEFAULT_WIDGETS_BLOOMBERG: WidgetConfig[] = [
  {
    id: 'w-indices',
    type: 'global_indices',
    title: 'GLOBAL INDICES & BENCHMARKS',
    position: { x: 0, y: 0, w: 6, h: 6, minW: 3, minH: 4 }
  },
  {
    id: 'w-aapl-chart',
    type: 'aapl_chart',
    title: 'AAPL // 60-SESSION CANDLESTICK & INDICATORS',
    position: { x: 6, y: 0, w: 6, h: 6, minW: 4, minH: 5 }
  },
  {
    id: 'w-heatmap',
    type: 'sector_heatmap',
    title: 'SECTOR HEATMAP // TECH, ENERGY, FINANCIALS',
    position: { x: 0, y: 6, w: 7, h: 6, minW: 4, minH: 4 }
  },
  {
    id: 'w-metals',
    type: 'precious_metals',
    title: 'PRECIOUS METALS & COMMODITIES SPOT',
    position: { x: 7, y: 6, w: 5, h: 6, minW: 3, minH: 4 }
  },
  {
    id: 'w-world-clocks',
    type: 'world_clocks',
    title: 'WORLD MARKET SESSION CLOCKS & OVERLAPS',
    position: { x: 0, y: 12, w: 7, h: 5, minW: 4, minH: 4 }
  },
  {
    id: 'w-order-tape',
    type: 'order_tape',
    title: 'LIVE ORDER TAPE & TICK FEED',
    position: { x: 7, y: 12, w: 5, h: 5, minW: 3, minH: 3 }
  }
];

export const PRESET_LAYOUTS: { id: string; label: string; widgets: WidgetConfig[] }[] = [
  {
    id: 'bloomberg',
    label: 'Standard Bloomberg Layout',
    widgets: DEFAULT_WIDGETS_BLOOMBERG
  },
  {
    id: 'chart_focused',
    label: 'Chart & Sector Deep-Dive',
    widgets: [
      {
        id: 'w-aapl-chart',
        type: 'aapl_chart',
        title: 'AAPL // 60-SESSION CANDLESTICK & INDICATORS',
        position: { x: 0, y: 0, w: 8, h: 7, minW: 4, minH: 5 }
      },
      {
        id: 'w-heatmap',
        type: 'sector_heatmap',
        title: 'SECTOR HEATMAP // TECH, ENERGY, FINANCIALS',
        position: { x: 8, y: 0, w: 4, h: 7, minW: 4, minH: 4 }
      },
      {
        id: 'w-indices',
        type: 'global_indices',
        title: 'GLOBAL INDICES & BENCHMARKS',
        position: { x: 0, y: 7, w: 6, h: 5, minW: 3, minH: 4 }
      },
      {
        id: 'w-metals',
        type: 'precious_metals',
        title: 'PRECIOUS METALS & COMMODITIES SPOT',
        position: { x: 6, y: 7, w: 6, h: 5, minW: 3, minH: 4 }
      }
    ]
  },
  {
    id: 'macro_global',
    label: 'Macro & World Clocks',
    widgets: [
      {
        id: 'w-world-clocks',
        type: 'world_clocks',
        title: 'WORLD MARKET SESSION CLOCKS & OVERLAPS',
        position: { x: 0, y: 0, w: 12, h: 5, minW: 4, minH: 4 }
      },
      {
        id: 'w-indices',
        type: 'global_indices',
        title: 'GLOBAL INDICES & BENCHMARKS',
        position: { x: 0, y: 5, w: 6, h: 6, minW: 3, minH: 4 }
      },
      {
        id: 'w-metals',
        type: 'precious_metals',
        title: 'PRECIOUS METALS & COMMODITIES SPOT',
        position: { x: 6, y: 5, w: 6, h: 6, minW: 3, minH: 4 }
      }
    ]
  }
];

export function loadSavedLayout(): WidgetConfig[] {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_LAYOUT);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to load layout from localStorage:', e);
  }
  return DEFAULT_WIDGETS_BLOOMBERG;
}

export function saveLayoutToStorage(widgets: WidgetConfig[]) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_LAYOUT, JSON.stringify(widgets));
  } catch (e) {
    console.warn('Failed to save layout to localStorage:', e);
  }
}

export function loadSavedSettings(): DashboardSettings {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY_SETTINGS);
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    }
  } catch (e) {
    console.warn('Failed to load settings from localStorage:', e);
  }
  return DEFAULT_SETTINGS;
}

export function saveSettingsToStorage(settings: DashboardSettings) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY_SETTINGS, JSON.stringify(settings));
  } catch (e) {
    console.warn('Failed to save settings to localStorage:', e);
  }
}
