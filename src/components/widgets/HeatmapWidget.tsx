import React, { useState } from 'react';
import type { HeatmapItem } from '../../types';
import { Layers, Info } from 'lucide-react';

interface Props {
  heatmapData: HeatmapItem[];
}

export const HeatmapWidget: React.FC<Props> = ({ heatmapData }) => {
  const [selectedSector, setSelectedSector] = useState<'All' | 'AI & Tech' | 'Energy' | 'Financials'>('All');
  const [hoveredTicker, setHoveredTicker] = useState<HeatmapItem | null>(null);
  const filtered = heatmapData.filter((item) => selectedSector === 'All' || item.sector === selectedSector);

  const getTileBg = (change: number) => {
    if (change >= 4) return 'bg-emerald-600 text-slate-950 font-black border-emerald-400';
    if (change >= 2) return 'bg-emerald-700/90 text-emerald-100 border-emerald-500/60';
    if (change > 0) return 'bg-emerald-900/70 text-emerald-300 border-emerald-700/50';
    if (change === 0) return 'bg-slate-800 text-slate-300 border-slate-700';
    if (change > -2) return 'bg-rose-900/70 text-rose-300 border-rose-700/50';
    if (change > -4) return 'bg-rose-700/90 text-rose-100 border-rose-500/60';
    return 'bg-rose-600 text-slate-950 font-black border-rose-400';
  };

  const formatMarketCap = (value: number | null) => value === null ? 'N/A' : `$${value.toLocaleString()}B`;

  return (
    <div className="flex flex-col h-full bg-slate-950/80 text-slate-200 select-none overflow-hidden relative">
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1.5">
          <Layers className="w-3.5 h-3.5 text-cyan-400" />
          <span className="font-bold tracking-wider text-slate-300">SECTORS:</span>
          {(['All', 'AI & Tech', 'Energy', 'Financials'] as const).map((sector) => (
            <button
              key={sector}
              onClick={() => setSelectedSector(sector)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${selectedSector === sector ? 'bg-cyan-950 text-cyan-400 border border-cyan-700/60 font-semibold' : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'}`}
            >{sector}</button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400">
          <span className="w-2.5 h-2.5 bg-rose-600 rounded-xs inline-block" /> -4%
          <span className="w-2.5 h-2.5 bg-slate-800 rounded-xs inline-block ml-1" /> 0%
          <span className="w-2.5 h-2.5 bg-emerald-600 rounded-xs inline-block ml-1" /> +4%
        </div>
      </div>

      <div className="flex-1 p-2 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-1.5 auto-rows-fr h-full min-h-[220px]">
          {filtered.map((item) => {
            const isUp = item.changePercent >= 0;
            const colSpan = (item.marketCapBillions ?? 0) > 2000 ? 'col-span-2 row-span-2' : 'col-span-1 row-span-1';
            return (
              <div
                key={item.ticker}
                onMouseEnter={() => setHoveredTicker(item)}
                onMouseLeave={() => setHoveredTicker(null)}
                className={`p-2 rounded border flex flex-col justify-between transition-all duration-200 cursor-pointer hover:scale-[1.02] hover:z-10 ${getTileBg(item.changePercent)} ${colSpan}`}
              >
                <div className="flex items-center justify-between w-full">
                  <span className="font-mono font-bold text-xs tracking-wider">{item.ticker}</span>
                  <span className="text-[10px] opacity-75 font-mono">{formatMarketCap(item.marketCapBillions)}</span>
                </div>
                <div className="my-1">
                  <div className="text-[11px] font-mono truncate opacity-90 font-medium">{item.name}</div>
                  <div className="font-mono font-bold text-sm tracking-tight mt-0.5">${item.price.toFixed(2)}</div>
                </div>
                <div className="text-[11px] font-mono font-bold self-end">{isUp ? '+' : ''}{item.changePercent.toFixed(2)}%</div>
              </div>
            );
          })}
        </div>
        {filtered.length === 0 && (
          <div className="h-full min-h-[180px] flex items-center justify-center text-xs text-slate-500 font-mono text-center px-4">
            NO PROVIDER HEATMAP DATA AVAILABLE
          </div>
        )}
      </div>

      <div className="p-2 bg-slate-900 border-t border-slate-800 text-xs font-mono flex items-center justify-between text-slate-400">
        {hoveredTicker ? (
          <div className="flex items-center gap-3 text-slate-200">
            <span className="font-bold text-emerald-400">{hoveredTicker.ticker}</span>
            <span>{hoveredTicker.name}</span>
            <span className="text-slate-400">SECTOR: {hoveredTicker.sector}</span>
            <span className="text-amber-400">MCAP: {formatMarketCap(hoveredTicker.marketCapBillions)}</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-500">
            <Info className="w-3.5 h-3.5" />
            <span>MARKET CAP IS REPORTED ONLY WHEN THE PROVIDER RETURNS marketCapitalization</span>
          </div>
        )}
      </div>
    </div>
  );
};
