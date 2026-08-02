/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { WidgetConfig, AdapterMode } from './types';
import {
  loadSavedLayout,
  saveLayoutToStorage,
  loadSavedSettings,
  saveSettingsToStorage,
  DashboardSettings
} from './utils/layoutStorage';

import {
  INITIAL_GLOBAL_INDICES,
  INITIAL_HEATMAP_DATA,
  generateAAPL60Sessions,
  INITIAL_PRECIOUS_METALS,
  WORLD_SESSIONS,
  INITIAL_TAPE_TICKS,
  INITIAL_MARKET_NEWS
} from './data/mockMarketData';

import { marketDataAdapter } from './services/dataAdapter';
import { TerminalHeader } from './components/TerminalHeader';
import { CanvasWorkspace } from './components/CanvasWorkspace';

// Check for live mode from URL params or storage
const shouldUseLiveMode = () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'live') return true;
  const storedMode = localStorage.getItem('bloomberg-mode');
  return storedMode === 'live';
};

export default function App() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(loadSavedLayout);
  const [settings, setSettings] = useState<DashboardSettings>(loadSavedSettings);
  const [isLiveMode, setIsLiveMode] = useState(shouldUseLiveMode());

  const [marketState, setMarketState] = useState(() => {
    const mode: AdapterMode = isLiveMode ? 'live' : 'simulated';
    return {
      indices: INITIAL_GLOBAL_INDICES,
      heatmap: INITIAL_HEATMAP_DATA,
      aaplCandles: generateAAPL60Sessions(),
      currentAAPLPrice: 228.50,
      metals: INITIAL_PRECIOUS_METALS,
      tape: INITIAL_TAPE_TICKS,
      mode,
      speed: 1,
      volatility: 1
    };
  });

  // Initialize Data Adapter and subscribe
  useEffect(() => {
    // Initialize with all data types
    marketDataAdapter.init(
      INITIAL_GLOBAL_INDICES,
      INITIAL_HEATMAP_DATA,
      generateAAPL60Sessions(),
      INITIAL_PRECIOUS_METALS,
      INITIAL_TAPE_TICKS,
      WORLD_SESSIONS,
      INITIAL_MARKET_NEWS
    );

    const unsubscribe = marketDataAdapter.subscribe(newState => {
      setMarketState(newState);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Save layout to localStorage on changes
  useEffect(() => {
    saveLayoutToStorage(widgets);
  }, [widgets]);

  // Save settings to localStorage on changes
  useEffect(() => {
    saveSettingsToStorage(settings);
  }, [settings]);

  // Adapter Controls
  const setDataMode = (mode: AdapterMode) => {
    marketDataAdapter.setMode(mode);
    setIsLiveMode(mode === 'live');
    localStorage.setItem('bloomberg-mode', mode);
  };

  const setSpeed = (speed: number) => {
    marketDataAdapter.setSpeed(speed);
  };

  // Dynamically select theme glow style
  const themeClass = settings.themeColor === 'amber'
    ? 'text-amber-500'
    : settings.themeColor === 'cyan'
    ? 'text-cyan-400'
    : settings.themeColor === 'monochrome'
    ? 'text-slate-200'
    : 'text-emerald-500';

  return (
    <div className={`min-h-screen bg-[#030407] ${themeClass} flex flex-col ${settings.crtScanlines ? 'crt-overlay' : ''}`}>
      {/* Status Bar - shows live mode indicator */}
      {isLiveMode && (
        <div className="bg-emerald-900/20 border-b border-emerald-500 px-4 py-1 text-sm">
          <span className="text-emerald-400">● LIVE DATA MODE</span>
          <span className="text-slate-500 ml-2">(Connected to Real Market Data)</span>
        </div>
      )}

      {/* Header Bar */}
      <TerminalHeader
        widgets={widgets}
        setWidgets={setWidgets}
        settings={settings}
        setSettings={setSettings}
        dataMode={marketState.mode}
        setDataMode={setDataMode}
        speed={marketState.speed}
        setSpeed={setSpeed}
        liveModeActive={isLiveMode}
      />

      {/* Main Drag & Drop Canvas Dashboard Workspace */}
      <CanvasWorkspace
        widgets={widgets}
        setWidgets={setWidgets}
        settings={settings}
        data={{
          indices: marketState.indices,
          heatmap: marketState.heatmap,
          aaplCandles: marketState.aaplCandles,
          currentAAPLPrice: marketState.currentAAPLPrice,
          metals: marketState.metals,
          sessions: WORLD_SESSIONS,
          tape: marketState.tape,
          news: INITIAL_MARKET_NEWS
        }}
      />
    </div>
  );
}