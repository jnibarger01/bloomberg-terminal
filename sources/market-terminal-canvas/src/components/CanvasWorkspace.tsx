import React, { useState } from 'react';
import {
  WidgetConfig,
  MarketIndex,
  HeatmapItem,
  CandleData,
  PreciousMetal,
  WorldSession,
  TapeTick,
  NewsItem
} from '../types';
import { DashboardSettings } from '../utils/layoutStorage';

import { GlobalIndicesWidget } from './widgets/GlobalIndicesWidget';
import { HeatmapWidget } from './widgets/HeatmapWidget';
import { AAPLChartWidget } from './widgets/AAPLChartWidget';
import { PreciousMetalsWidget } from './widgets/PreciousMetalsWidget';
import { WorldClockWidget } from './widgets/WorldClockWidget';
import { OrderTapeWidget } from './widgets/OrderTapeWidget';
import { MarketNewsWidget } from './widgets/MarketNewsWidget';

import {
  GripHorizontal,
  Minus,
  Maximize2,
  Minimize2,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  ArrowUpDown
} from 'lucide-react';

interface Props {
  widgets: WidgetConfig[];
  setWidgets: React.Dispatch<React.SetStateAction<WidgetConfig[]>>;
  settings: DashboardSettings;
  data: {
    indices: MarketIndex[];
    heatmap: HeatmapItem[];
    aaplCandles: CandleData[];
    currentAAPLPrice: number;
    metals: PreciousMetal[];
    sessions: WorldSession[];
    tape: TapeTick[];
    news: NewsItem[];
  };
}

export const CanvasWorkspace: React.FC<Props> = ({
  widgets,
  setWidgets,
  settings,
  data
}) => {
  const [draggedWidgetId, setDraggedWidgetId] = useState<string | null>(null);
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null);

  // Toggle Minimized state
  const toggleMinimize = (id: string) => {
    setWidgets(prev =>
      prev.map(w => (w.id === id ? { ...w, isMinimized: !w.isMinimized } : w))
    );
  };

  // Toggle Maximized state
  const toggleMaximize = (id: string) => {
    setWidgets(prev =>
      prev.map(w => (w.id === id ? { ...w, isMaximized: !w.isMaximized } : w))
    );
  };

  // Remove Widget
  const removeWidget = (id: string) => {
    setWidgets(prev => prev.filter(w => w.id !== id));
  };

  // Resize Width / Height
  const updateWidgetSize = (id: string, deltaW: number, deltaH: number) => {
    setWidgets(prev =>
      prev.map(w => {
        if (w.id === id) {
          const newW = Math.min(12, Math.max(3, w.position.w + deltaW));
          const newH = Math.min(12, Math.max(3, w.position.h + deltaH));
          return {
            ...w,
            position: { ...w.position, w: newW, h: newH }
          };
        }
        return w;
      })
    );
  };

  // Move Widget position up or down in list order
  const moveWidgetOrder = (id: string, direction: 'up' | 'down') => {
    const idx = widgets.findIndex(w => w.id === id);
    if (idx < 0) return;
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
    if (targetIdx < 0 || targetIdx >= widgets.length) return;

    const updated = [...widgets];
    const temp = updated[idx];
    updated[idx] = updated[targetIdx];
    updated[targetIdx] = temp;
    setWidgets(updated);
  };

  // Drag & Drop reordering
  const handleDragStart = (e: React.DragEvent, id: string) => {
    setDraggedWidgetId(id);
    e.dataTransfer.setData('text/plain', id);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIdx(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedWidgetId) return;

    const sourceIndex = widgets.findIndex(w => w.id === draggedWidgetId);
    if (sourceIndex >= 0 && sourceIndex !== targetIndex) {
      const updated = [...widgets];
      const [moved] = updated.splice(sourceIndex, 1);
      updated.splice(targetIndex, 0, moved);
      setWidgets(updated);
    }

    setDraggedWidgetId(null);
    setDragOverIdx(null);
  };

  // Get theme border colors based on setting
  const getThemeBorderClass = () => {
    switch (settings.themeColor) {
      case 'amber':
        return 'border-amber-900/60 shadow-[0_0_15px_rgba(245,158,11,0.1)]';
      case 'cyan':
        return 'border-cyan-900/60 shadow-[0_0_15px_rgba(6,182,212,0.1)]';
      case 'monochrome':
        return 'border-slate-700 shadow-[0_0_15px_rgba(255,255,255,0.05)]';
      default:
        return 'border-emerald-900/60 shadow-[0_0_15px_rgba(16,185,129,0.1)]';
    }
  };

  const getThemeHeaderClass = () => {
    switch (settings.themeColor) {
      case 'amber':
        return 'bg-amber-950/40 text-amber-300 border-amber-900/50';
      case 'cyan':
        return 'bg-cyan-950/40 text-cyan-300 border-cyan-900/50';
      case 'monochrome':
        return 'bg-slate-900 text-slate-200 border-slate-700';
      default:
        return 'bg-emerald-950/40 text-emerald-300 border-emerald-900/50';
    }
  };

  const bgStyleClass = settings.backgroundStyle === 'dots'
    ? 'canvas-dots-bg'
    : settings.backgroundStyle === 'solid'
    ? 'bg-black'
    : 'canvas-grid-bg';

  return (
    <main className={`flex-1 p-3 sm:p-4 min-h-[calc(100vh-64px)] ${bgStyleClass} relative overflow-y-auto`}>
      {/* 12-Column Responsive Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 max-w-[1600px] mx-auto items-start">
        {widgets.map((widget, index) => {
          // Calculate column span based on w (1-12)
          const colSpanMap: Record<number, string> = {
            1: 'md:col-span-1',
            2: 'md:col-span-2',
            3: 'md:col-span-3',
            4: 'md:col-span-4',
            5: 'md:col-span-5',
            6: 'md:col-span-6',
            7: 'md:col-span-7',
            8: 'md:col-span-8',
            9: 'md:col-span-9',
            10: 'md:col-span-10',
            11: 'md:col-span-11',
            12: 'md:col-span-12'
          };

          const colSpanClass = colSpanMap[widget.position.w] || 'md:col-span-6';

          // Height estimation based on position h
          const heightPx = widget.isMinimized ? 'h-auto' : `${widget.position.h * 64}px`;

          const isMaximized = widget.isMaximized;

          if (isMaximized) {
            return (
              <div
                key={widget.id}
                className="fixed inset-4 z-50 bg-slate-950 border-2 border-emerald-500 rounded-lg shadow-2xl flex flex-col overflow-hidden"
              >
                {/* Maximized Header */}
                <div className={`p-2.5 flex items-center justify-between border-b ${getThemeHeaderClass()}`}>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-sm tracking-wider font-mono">{widget.title}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-950 border border-emerald-600 text-emerald-300 font-mono font-bold">
                      MAXIMIZED VIEW
                    </span>
                  </div>

                  <button
                    onClick={() => toggleMaximize(widget.id)}
                    className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                    title="Restore View"
                  >
                    <Minimize2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Maximized Content */}
                <div className="flex-1 overflow-hidden">
                  {renderWidgetContent(widget.type, data)}
                </div>
              </div>
            );
          }

          return (
            <div
              key={widget.id}
              draggable
              onDragStart={e => handleDragStart(e, widget.id)}
              onDragOver={e => handleDragOver(e, index)}
              onDrop={e => handleDrop(e, index)}
              style={{ minHeight: widget.isMinimized ? '42px' : `${widget.position.h * 60}px` }}
              className={`${colSpanClass} bg-slate-950/90 border rounded-md flex flex-col transition-all duration-200 ${getThemeBorderClass()} ${
                dragOverIdx === index ? 'border-amber-500 ring-2 ring-amber-500/30' : ''
              }`}
            >
              {/* Window Header */}
              <div
                className={`p-2 flex items-center justify-between border-b cursor-grab active:cursor-grabbing font-mono text-xs select-none rounded-t-md ${getThemeHeaderClass()}`}
              >
                <div className="flex items-center gap-2 min-w-0 pr-2">
                  <GripHorizontal className="w-4 h-4 text-slate-500 shrink-0" />
                  <span className="font-bold tracking-wider truncate text-slate-100">
                    {widget.title}
                  </span>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {/* Position Order Buttons */}
                  <button
                    onClick={() => moveWidgetOrder(widget.id, 'up')}
                    disabled={index === 0}
                    className="p-1 hover:bg-slate-800/80 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30"
                    title="Move Left/Up"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => moveWidgetOrder(widget.id, 'down')}
                    disabled={index === widgets.length - 1}
                    className="p-1 hover:bg-slate-800/80 rounded text-slate-400 hover:text-slate-200 disabled:opacity-30"
                    title="Move Right/Down"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>

                  {/* Minimize Button */}
                  <button
                    onClick={() => toggleMinimize(widget.id)}
                    className="p-1 hover:bg-slate-800/80 rounded text-slate-400 hover:text-slate-200"
                    title={widget.isMinimized ? 'Expand' : 'Minimize'}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>

                  {/* Maximize Button */}
                  <button
                    onClick={() => toggleMaximize(widget.id)}
                    className="p-1 hover:bg-slate-800/80 rounded text-slate-400 hover:text-slate-200"
                    title="Maximize View"
                  >
                    <Maximize2 className="w-3.5 h-3.5" />
                  </button>

                  {/* Close Widget Button */}
                  <button
                    onClick={() => removeWidget(widget.id)}
                    className="p-1 hover:bg-rose-950 hover:text-rose-400 rounded text-slate-500"
                    title="Close Widget"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Window Body */}
              {!widget.isMinimized && (
                <div className="flex-1 min-h-[220px] flex flex-col overflow-hidden">
                  {renderWidgetContent(widget.type, data)}
                </div>
              )}

              {/* Window Footer / Canvas Resizer Controls */}
              {!widget.isMinimized && (
                <div className="px-2 py-1 bg-slate-950/80 border-t border-slate-900 text-[10px] font-mono text-slate-500 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span>GRID: {widget.position.w}x{widget.position.h}</span>
                    <button
                      onClick={() => updateWidgetSize(widget.id, -1, 0)}
                      className="hover:text-slate-300 font-bold px-1"
                      title="Narrow Width"
                    >
                      -W
                    </button>
                    <button
                      onClick={() => updateWidgetSize(widget.id, 1, 0)}
                      className="hover:text-slate-300 font-bold px-1"
                      title="Widen Width"
                    >
                      +W
                    </button>
                    <button
                      onClick={() => updateWidgetSize(widget.id, 0, -1)}
                      className="hover:text-slate-300 font-bold px-1"
                      title="Reduce Height"
                    >
                      -H
                    </button>
                    <button
                      onClick={() => updateWidgetSize(widget.id, 0, 1)}
                      className="hover:text-slate-300 font-bold px-1"
                      title="Increase Height"
                    >
                      +H
                    </button>
                  </div>

                  <span className="text-slate-600">DRAG HEADER TO MOVE</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Empty State */}
      {widgets.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center font-mono">
          <div className="p-4 rounded-full bg-slate-900 border border-slate-800 text-emerald-400 mb-3">
            <Plus className="w-8 h-8" />
          </div>
          <h2 className="text-lg font-bold text-slate-200 mb-1">NO CANVAS WIDGETS ACTIVE</h2>
          <p className="text-xs text-slate-500 max-w-sm mb-4">
            Click "ADD WIDGET" in the top bar or load a layout preset to monitor global markets.
          </p>
        </div>
      )}
    </main>
  );
};

// Render matching Widget component
function renderWidgetContent(type: WidgetConfig['type'], data: any) {
  switch (type) {
    case 'global_indices':
      return <GlobalIndicesWidget indices={data.indices} />;
    case 'sector_heatmap':
      return <HeatmapWidget heatmapData={data.heatmap} />;
    case 'aapl_chart':
      return (
        <AAPLChartWidget
          candles={data.aaplCandles}
          currentLivePrice={data.currentAAPLPrice}
        />
      );
    case 'precious_metals':
      return <PreciousMetalsWidget metals={data.metals} />;
    case 'world_clocks':
      return <WorldClockWidget sessions={data.sessions} />;
    case 'order_tape':
      return <OrderTapeWidget tape={data.tape} />;
    case 'market_news':
      return <MarketNewsWidget news={data.news} />;
    default:
      return <div className="p-4 text-xs font-mono text-slate-500">Unknown Widget Type</div>;
  }
}
