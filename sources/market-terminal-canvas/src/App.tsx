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

import { marketDataAdapter, DataState } from './services/dataAdapter';
import { TerminalHeader } from './components/TerminalHeader';
import { CanvasWorkspace } from './components/CanvasWorkspace';

export default function App() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(loadSavedLayout);
  const [settings, setSettings] = useState<DashboardSettings>(loadSavedSettings);

  const [marketState, setMarketState] = useState<DataState>(() => {
    return {
      indices: INITIAL_GLOBAL_INDICES,
      heatmap: INITIAL_HEATMAP_DATA,
      aaplCandles: generateAAPL60Sessions(),
      currentAAPLPrice: 228.50,
      metals: INITIAL_PRECIOUS_METALS,
      tape: INITIAL_TAPE_TICKS,
      mode: 'simulated',
      speed: 1,
      volatility: 1
    };
  });

  // Initialize Data Adapter and subscribe
  useEffect(() => {
    marketDataAdapter.init(
      INITIAL_GLOBAL_INDICES,
      INITIAL_HEATMAP_DATA,
      generateAAPL60Sessions(),
      INITIAL_PRECIOUS_METALS,
      INITIAL_TAPE_TICKS
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
