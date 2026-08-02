import React, { useState, useEffect } from 'react';
import {
  WidgetConfig,
  WidgetType,
  ThemeColor,
  AdapterMode
} from '../types';
import { PRESET_LAYOUTS, DashboardSettings } from '../utils/layoutStorage';
import { generateOfflineZipBundle } from '../utils/zipExporter';
import {
  Terminal,
  Download,
  RotateCcw,
  Plus,
  Tv,
  Grid,
  Zap,
  Play,
  Pause,
  Upload,
  SlidersHorizontal
} from 'lucide-react';

interface Props {
  widgets: WidgetConfig[];
  setWidgets: (widgets: WidgetConfig[]) => void;
  settings: DashboardSettings;
  setSettings: React.Dispatch<React.SetStateAction<DashboardSettings>>;
  dataMode: AdapterMode;
  setDataMode: (mode: AdapterMode) => void;
  speed: number;
  setSpeed: (speed: number) => void;
}

export const TerminalHeader: React.FC<Props> = ({
  widgets,
  setWidgets,
  settings,
  setSettings,
  dataMode,
  setDataMode,
  speed,
  setSpeed
}) => {
  const [utcTime, setUtcTime] = useState('');
  const [isAddingWidget, setIsAddingWidget] = useState(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setUtcTime(now.toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const handleAddWidget = (type: WidgetType, title: string) => {
    const newId = `w-${type}-${Date.now().toString().slice(-4)}`;
    
    // Calculate safe position below existing widgets
    let maxY = 0;
    widgets.forEach(w => {
      if (w.position.y + w.position.h > maxY) {
        maxY = w.position.y + w.position.h;
      }
    });

    const newWidget: WidgetConfig = {
      id: newId,
      type,
      title,
      position: { x: 0, y: maxY, w: 6, h: 5, minW: 3, minH: 3 }
    };

    setWidgets([...widgets, newWidget]);
    setIsAddingWidget(false);
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = PRESET_LAYOUTS.find(p => p.id === presetId);
    if (preset) {
      setWidgets([...preset.widgets]);
    }
  };

  const handleExportJson = () => {
    const jsonStr = JSON.stringify(widgets, null, 2);
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `terminal_layout_${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string);
        if (Array.isArray(parsed)) {
          setWidgets(parsed);
        }
      } catch (err) {
        alert('Invalid layout JSON file format.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <header className="bg-slate-950 border-b border-slate-800 p-2 sm:p-3 text-slate-200 font-mono select-none shadow-md z-30">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        {/* Brand & Status */}
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-950 border border-emerald-600 rounded text-emerald-400">
            <Terminal className="w-5 h-5 animate-pulse" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base tracking-wider text-emerald-400 glow-green">
                TERMINAL // CANVAS MARKET DASHBOARD
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 font-bold hidden sm:inline-block">
                v2.5
              </span>
            </div>

            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="text-amber-400 font-bold">{utcTime}</span>
              <span className="hidden md:inline text-slate-600">|</span>
              <span className="hidden md:flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block"></span>
                FEED: {dataMode === 'simulated' ? 'SIMULATED REALTIME' : 'LIVE REST'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Tick Speed Controls */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-1 text-xs">
            <span className="text-[10px] text-slate-500 px-1 font-bold">SPEED:</span>
            <button
              onClick={() => setSpeed(speed === 0 ? 1 : 0)}
              className={`p-1 rounded hover:bg-slate-800 ${speed === 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}
              title={speed === 0 ? 'Resume Ticks' : 'Pause Ticks'}
            >
              {speed === 0 ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            {[1, 2, 5].map(s => (
              <button
                key={s}
                onClick={() => setSpeed(s)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                  speed === s ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {s}X
              </button>
            ))}
          </div>

          {/* Theme Color Selector */}
          <div className="hidden lg:flex items-center bg-slate-900 border border-slate-800 rounded p-1 text-xs">
            <span className="text-[10px] text-slate-500 px-1 font-bold">THEME:</span>
            {(['green', 'amber', 'cyan', 'monochrome'] as ThemeColor[]).map(tc => (
              <button
                key={tc}
                onClick={() => setSettings(s => ({ ...s, themeColor: tc }))}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${
                  settings.themeColor === tc
                    ? tc === 'green' ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                    : tc === 'amber' ? 'bg-amber-950 text-amber-400 border border-amber-700'
                    : tc === 'cyan' ? 'bg-cyan-950 text-cyan-400 border border-cyan-700'
                    : 'bg-slate-800 text-slate-100 border border-slate-600'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >
                {tc}
              </button>
            ))}
          </div>

          {/* CRT Scanlines Toggle */}
          <button
            onClick={() => setSettings(s => ({ ...s, crtScanlines: !s.crtScanlines }))}
            className={`p-1.5 rounded border text-xs flex items-center gap-1 font-mono ${
              settings.crtScanlines
                ? 'bg-amber-950 text-amber-400 border border-amber-600'
                : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle CRT Scanlines Effect"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[10px]">CRT</span>
          </button>

          {/* Layout Presets Dropdown */}
          <select
            onChange={e => handlePresetSelect(e.target.value)}
            defaultValue=""
            className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 focus:outline-none focus:border-emerald-600 font-mono"
          >
            <option value="" disabled>LAYOUT PRESETS...</option>
            {PRESET_LAYOUTS.map(p => (
              <option key={p.id} value={p.id}>{p.label}</option>
            ))}
          </select>

          {/* Add Widget Button */}
          <div className="relative">
            <button
              onClick={() => setIsAddingWidget(!isAddingWidget)}
              className="px-2.5 py-1 bg-emerald-900/80 hover:bg-emerald-800 text-emerald-200 border border-emerald-600/80 rounded text-xs font-bold flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>ADD WIDGET</span>
            </button>

            {isAddingWidget && (
              <div className="absolute right-0 mt-1 w-56 bg-slate-900 border border-slate-700 rounded shadow-xl z-50 p-1 space-y-1 text-xs">
                <div className="px-2 py-1 text-[10px] text-slate-500 font-bold border-b border-slate-800">
                  AVAILABLE CANVAS WIDGETS
                </div>
                <button
                  onClick={() => handleAddWidget('global_indices', 'GLOBAL INDICES & BENCHMARKS')}
                  className="w-full text-left px-2 py-1.5 hover:bg-slate-800 text-slate-200 rounded text-xs font-mono"
                >
                  Global Indices
                </button>
                <button
                  onClick={() => handleAddWidget('sector_heatmap', 'SECTOR HEATMAP // TECH, ENERGY, FINANCIALS')}
                  className="w-full text-left px-2 py-1.5 hover:bg-slate-800 text-slate-200 rounded text-xs font-mono"
                >
                  Sector Heatmap
                </button>
                <button
                  onClick={() => handleAddWidget('aapl_chart', 'AAPL // 60-SESSION CANDLESTICK')}
                  className="w-full text-left px-2 py-1.5 hover:bg-slate-800 text-slate-200 rounded text-xs font-mono"
                >
                  AAPL 60-Session Chart
                </button>
                <button
                  onClick={() => handleAddWidget('precious_metals', 'PRECIOUS METALS & COMMODITIES')}
                  className="w-full text-left px-2 py-1.5 hover:bg-slate-800 text-slate-200 rounded text-xs font-mono"
                >
                  Precious Metals & Spot
                </button>
                <button
                  onClick={() => handleAddWidget('world_clocks', 'WORLD SESSION CLOCKS')}
                  className="w-full text-left px-2 py-1.5 hover:bg-slate-800 text-slate-200 rounded text-xs font-mono"
                >
                  World Session Clocks
                </button>
                <button
                  onClick={() => handleAddWidget('order_tape', 'LIVE ORDER TAPE STREAM')}
                  className="w-full text-left px-2 py-1.5 hover:bg-slate-800 text-slate-200 rounded text-xs font-mono"
                >
                  Order Tape Stream
                </button>
                <button
                  onClick={() => handleAddWidget('market_news', 'BREAKING TERMINAL WIRE')}
                  className="w-full text-left px-2 py-1.5 hover:bg-slate-800 text-slate-200 rounded text-xs font-mono"
                >
                  Market Wire Feed
                </button>
              </div>
            )}
          </div>

          {/* Export Offline ZIP Button */}
          <button
            onClick={() => generateOfflineZipBundle(widgets)}
            className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-600 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Download complete offline package with index.html, dependencies, and README"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">OFFLINE .ZIP</span>
          </button>
        </div>
      </div>
    </header>
  );
};
