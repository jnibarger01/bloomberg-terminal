import React, { useEffect, useState } from 'react';
import type {
  AdapterMode,
  ConnectionState,
  DataOrigin,
  ThemeColor,
  WidgetConfig,
  WidgetType
} from '../types';
import { PRESET_LAYOUTS, type DashboardSettings } from '../utils/layoutStorage';
import { generateOfflineZipBundle } from '../utils/zipExporter';
import { setApiKey } from '../services/dataAdapter';
import { Terminal, Download, Plus, Tv, Zap, Play, Pause } from 'lucide-react';

interface Props {
  widgets: WidgetConfig[];
  setWidgets: (widgets: WidgetConfig[]) => void;
  settings: DashboardSettings;
  setSettings: React.Dispatch<React.SetStateAction<DashboardSettings>>;
  dataMode: AdapterMode;
  setDataMode: (mode: AdapterMode) => void;
  connectionState: ConnectionState;
  dataOrigin: DataOrigin;
  connectionError: string | null;
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
  connectionState,
  dataOrigin,
  connectionError,
  speed,
  setSpeed
}) => {
  const [utcTime, setUtcTime] = useState('');
  const [isAddingWidget, setIsAddingWidget] = useState(false);
  const [apiKeyDraft, setApiKeyDraft] = useState(() => localStorage.getItem('bloomberg-api-key') || '');

  useEffect(() => {
    const updateTime = () => setUtcTime(new Date().toISOString().replace('T', ' ').substring(0, 19) + ' UTC');
    updateTime();
    const interval = globalThis.setInterval(updateTime, 1000);
    return () => globalThis.clearInterval(interval);
  }, []);

  const handleAddWidget = (type: WidgetType, title: string) => {
    const maxY = widgets.reduce((current, widget) => Math.max(current, widget.position.y + widget.position.h), 0);
    setWidgets([...widgets, {
      id: `w-${type}-${Date.now().toString().slice(-4)}`,
      type,
      title,
      position: { x: 0, y: maxY, w: 6, h: 5, minW: 3, minH: 3 }
    }]);
    setIsAddingWidget(false);
  };

  const handlePresetSelect = (presetId: string) => {
    const preset = PRESET_LAYOUTS.find((item) => item.id === presetId);
    if (preset) setWidgets([...preset.widgets]);
  };

  const toggleDataMode = () => setDataMode(dataMode === 'simulated' ? 'live' : 'simulated');
  const saveApiKey = () => {
    const normalized = apiKeyDraft.trim();
    if (!normalized) return;
    localStorage.setItem('bloomberg-api-key', normalized);
    setApiKey(normalized);
    if (dataMode === 'live') setDataMode('live');
  };

  const feedLabel = dataMode === 'simulated'
    ? 'SIMULATED DATA'
    : connectionState === 'connecting'
      ? 'PROVIDER CONNECTING'
      : connectionState === 'connected'
        ? 'PROVIDER CONNECTED'
        : connectionState === 'degraded'
          ? 'PROVIDER DEGRADED'
          : 'PROVIDER FAILED';

  const statusDotClass = dataMode === 'simulated'
    ? 'bg-slate-500'
    : connectionState === 'connected'
      ? 'bg-emerald-500'
      : connectionState === 'connecting'
        ? 'bg-cyan-500 animate-pulse'
        : connectionState === 'degraded'
          ? 'bg-amber-500'
          : 'bg-rose-500';

  return (
    <header className="bg-slate-950 border-b border-slate-800 p-2 sm:p-3 text-slate-200 font-mono select-none shadow-md z-30">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-1.5 bg-emerald-950 border border-emerald-600 rounded text-emerald-400">
            <Terminal className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-sm sm:text-base tracking-wider text-emerald-400 glow-green">
                TERMINAL // CANVAS MARKET DASHBOARD
              </h1>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-700/60 font-bold hidden sm:inline-block">v2.6</span>
            </div>
            <div className="flex items-center gap-3 text-[11px] text-slate-400">
              <span className="text-amber-400 font-bold">{utcTime}</span>
              <span className="hidden md:inline text-slate-600">|</span>
              <span className="hidden md:flex items-center gap-1" title={connectionError || undefined}>
                <span className={`w-2 h-2 rounded-full ${statusDotClass} inline-block`} />
                FEED: {feedLabel}
                <span className="text-slate-600">({dataOrigin})</span>
              </span>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={toggleDataMode}
            className={`px-2.5 py-1 rounded text-xs flex items-center gap-1 font-mono transition-colors ${
              dataMode === 'live'
                ? 'bg-emerald-900 text-emerald-300 border border-emerald-600 hover:bg-emerald-800'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-emerald-400'
            }`}
            title="Toggle provider mode"
          >
            <Zap className="w-3.5 h-3.5" />
            <span className="hidden xl:inline">{dataMode === 'live' ? 'PROVIDER' : 'SIM'} DATA</span>
          </button>

          <div className="flex items-center bg-slate-900 border border-slate-800 rounded p-1 text-xs">
            <span className="text-[10px] text-slate-500 px-1 font-bold">SPEED:</span>
            <button
              onClick={() => setSpeed(speed === 0 ? 1 : 0)}
              className={`p-1 rounded hover:bg-slate-800 ${speed === 0 ? 'text-rose-400 font-bold' : 'text-slate-400'}`}
              title={speed === 0 ? 'Resume updates' : 'Pause updates'}
            >
              {speed === 0 ? <Play className="w-3.5 h-3.5" /> : <Pause className="w-3.5 h-3.5" />}
            </button>
            {[1, 2, 5].map((value) => (
              <button
                key={value}
                onClick={() => setSpeed(value)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${speed === value ? 'bg-emerald-950 text-emerald-400 border border-emerald-700' : 'text-slate-400 hover:text-slate-200'}`}
              >{value}X</button>
            ))}
          </div>

          <div className="hidden lg:flex items-center bg-slate-900 border border-slate-800 rounded p-1 text-xs">
            <span className="text-[10px] text-slate-500 px-1 font-bold">THEME:</span>
            {(['green', 'amber', 'cyan', 'monochrome'] as ThemeColor[]).map((theme) => (
              <button
                key={theme}
                onClick={() => setSettings((current) => ({ ...current, themeColor: theme }))}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold capitalize ${
                  settings.themeColor === theme
                    ? theme === 'green'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                      : theme === 'amber'
                        ? 'bg-amber-950 text-amber-400 border border-amber-700'
                        : theme === 'cyan'
                          ? 'bg-cyan-950 text-cyan-400 border border-cyan-700'
                          : 'bg-slate-800 text-slate-100 border border-slate-600'
                    : 'text-slate-500 hover:text-slate-300'
                }`}
              >{theme}</button>
            ))}
          </div>

          <button
            onClick={() => setSettings((current) => ({ ...current, crtScanlines: !current.crtScanlines }))}
            className={`p-1.5 rounded border text-xs flex items-center gap-1 font-mono ${settings.crtScanlines ? 'bg-amber-950 text-amber-400 border border-amber-600' : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'}`}
            title="Toggle CRT scanlines"
          >
            <Tv className="w-3.5 h-3.5" />
            <span className="hidden xl:inline text-[10px]">CRT</span>
          </button>

          <input
            type="password"
            value={apiKeyDraft}
            placeholder="Backend API key"
            autoComplete="off"
            onChange={(event) => setApiKeyDraft(event.currentTarget.value)}
            onKeyDown={(event) => { if (event.key === 'Enter') saveApiKey(); }}
            className="hidden lg:block px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 focus:outline-none focus:border-emerald-600 font-mono"
          />

          <select
            onChange={(event) => handlePresetSelect(event.target.value)}
            defaultValue=""
            className="px-2 py-1 bg-slate-900 border border-slate-800 rounded text-xs text-slate-300 focus:outline-none focus:border-emerald-600 font-mono"
          >
            <option value="" disabled>LAYOUT PRESETS...</option>
            {PRESET_LAYOUTS.map((preset) => <option key={preset.id} value={preset.id}>{preset.label}</option>)}
          </select>

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
                <div className="px-2 py-1 text-[10px] text-slate-500 font-bold border-b border-slate-800">AVAILABLE CANVAS WIDGETS</div>
                {[
                  ['global_indices', 'Global Indices', 'GLOBAL BENCHMARK ETF PROXIES'],
                  ['sector_heatmap', 'Sector Heatmap', 'SECTOR HEATMAP'],
                  ['aapl_chart', 'AAPL Chart', 'AAPL // 60-SESSION CANDLESTICK'],
                  ['precious_metals', 'Commodity Proxies', 'COMMODITY ETF PROXIES'],
                  ['world_clocks', 'World Session Clocks', 'WORLD SESSION CLOCKS'],
                  ['order_tape', 'Market Activity Tape', 'MARKET ACTIVITY TAPE'],
                  ['market_news', 'Market News', 'MARKET NEWS WIRE']
                ].map(([type, label, title]) => (
                  <button
                    key={type}
                    onClick={() => handleAddWidget(type as WidgetType, title)}
                    className="w-full text-left px-2 py-1.5 hover:bg-slate-800 text-slate-200 rounded text-xs font-mono"
                  >{label}</button>
                ))}
              </div>
            )}
          </div>

          <button
            onClick={() => generateOfflineZipBundle(widgets)}
            className="px-2.5 py-1 bg-cyan-950 hover:bg-cyan-900 text-cyan-300 border border-cyan-600 rounded text-xs font-bold flex items-center gap-1.5 transition-colors"
            title="Download offline simulated-data package"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">OFFLINE .ZIP</span>
          </button>
        </div>
      </div>
    </header>
  );
};
