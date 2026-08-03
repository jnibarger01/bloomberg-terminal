/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import type { AdapterMode, WidgetConfig } from './types';
import {
  loadSavedLayout,
  saveLayoutToStorage,
  loadSavedSettings,
  saveSettingsToStorage,
  type DashboardSettings
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
import { marketDataAdapter, type DataState } from './services/dataAdapter';
import { TerminalHeader } from './components/TerminalHeader';
import { CanvasWorkspace } from './components/CanvasWorkspace';

const shouldUseLiveMode = () => {
  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('mode') === 'live') return true;
  return localStorage.getItem('bloomberg-mode') === 'live';
};

export default function App() {
  const [widgets, setWidgets] = useState<WidgetConfig[]>(loadSavedLayout);
  const [settings, setSettings] = useState<DashboardSettings>(loadSavedSettings);
  const initialMode: AdapterMode = shouldUseLiveMode() ? 'live' : 'simulated';
  const initialCandles = generateAAPL60Sessions();

  const [marketState, setMarketState] = useState<DataState>({
    indices: INITIAL_GLOBAL_INDICES,
    heatmap: INITIAL_HEATMAP_DATA,
    aaplCandles: initialCandles,
    currentAAPLPrice: initialCandles.at(-1)?.close ?? 0,
    metals: INITIAL_PRECIOUS_METALS,
    tape: INITIAL_TAPE_TICKS,
    sessions: WORLD_SESSIONS,
    news: INITIAL_MARKET_NEWS,
    mode: initialMode,
    connectionState: initialMode === 'live' ? 'connecting' : 'connected',
    dataOrigin: 'simulated',
    connectionError: null,
    lastSuccessfulUpdate: null,
    speed: 1,
    volatility: 1
  });

  useEffect(() => {
    const unsubscribe = marketDataAdapter.subscribe(setMarketState);
    void marketDataAdapter.init(
      INITIAL_GLOBAL_INDICES,
      INITIAL_HEATMAP_DATA,
      generateAAPL60Sessions(),
      INITIAL_PRECIOUS_METALS,
      INITIAL_TAPE_TICKS,
      WORLD_SESSIONS,
      INITIAL_MARKET_NEWS,
      initialMode
    );

    return () => {
      unsubscribe();
      marketDataAdapter.stopSimulation();
    };
  }, []);

  useEffect(() => saveLayoutToStorage(widgets), [widgets]);
  useEffect(() => saveSettingsToStorage(settings), [settings]);

  const setDataMode = (mode: AdapterMode) => {
    localStorage.setItem('bloomberg-mode', mode);
    void marketDataAdapter.setMode(mode);
  };

  const setSpeed = (speed: number) => marketDataAdapter.setSpeed(speed);

  const themeClass = settings.themeColor === 'amber'
    ? 'text-amber-500'
    : settings.themeColor === 'cyan'
      ? 'text-cyan-400'
      : settings.themeColor === 'monochrome'
        ? 'text-slate-200'
        : 'text-emerald-500';

  const statusClass = marketState.connectionState === 'connected'
    ? 'bg-emerald-900/20 border-emerald-500 text-emerald-300'
    : marketState.connectionState === 'connecting'
      ? 'bg-cyan-900/20 border-cyan-500 text-cyan-300'
      : marketState.connectionState === 'degraded'
        ? 'bg-amber-900/20 border-amber-500 text-amber-300'
        : 'bg-rose-900/20 border-rose-500 text-rose-300';

  return (
    <div className={`min-h-screen bg-[#030407] ${themeClass} flex flex-col ${settings.crtScanlines ? 'crt-overlay' : ''}`}>
      {marketState.mode === 'live' && (
        <div className={`border-b px-4 py-1 text-xs font-mono ${statusClass}`}>
          <strong>{marketState.connectionState.toUpperCase()}</strong>
          <span className="ml-2">
            {marketState.connectionState === 'connecting' && 'Contacting protected market-data backend.'}
            {marketState.connectionState === 'connected' && 'Provider datasets connected.'}
            {marketState.connectionState === 'degraded' && 'Some provider datasets are unavailable; no synthetic fallback is being shown.'}
            {marketState.connectionState === 'failed' && 'Provider data unavailable; live datasets are empty.'}
          </span>
          {marketState.connectionError && (
            <span className="ml-2 text-slate-400">{marketState.connectionError}</span>
          )}
        </div>
      )}

      <TerminalHeader
        widgets={widgets}
        setWidgets={setWidgets}
        settings={settings}
        setSettings={setSettings}
        dataMode={marketState.mode}
        setDataMode={setDataMode}
        connectionState={marketState.connectionState}
        dataOrigin={marketState.dataOrigin}
        connectionError={marketState.connectionError}
        speed={marketState.speed}
        setSpeed={setSpeed}
      />

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
          sessions: marketState.sessions,
          tape: marketState.tape,
          news: marketState.news
        }}
      />
    </div>
  );
}
