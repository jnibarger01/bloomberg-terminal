import React, { useState } from 'react';
import type { PreciousMetal } from '../../types';
import { Coins, ArrowUpRight, ArrowDownRight, Info } from 'lucide-react';

interface Props {
  metals: PreciousMetal[];
}

const formatPrice = (value: number | null) => value === null ? 'N/A' : `$${value.toFixed(2)}`;

export const PreciousMetalsWidget: React.FC<Props> = ({ metals }) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Metals' | 'Energy'>('All');
  const filtered = metals.filter((item) => activeTab === 'All' || item.category === activeTab);

  return (
    <div className="flex flex-col h-full bg-slate-950/80 text-slate-200 select-none overflow-hidden">
      <div className="p-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-slate-300">MARKET PROXIES:</span>
          {(['All', 'Metals', 'Energy'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 rounded text-[10px] ${activeTab === tab ? 'bg-amber-950 text-amber-400 border border-amber-600 font-bold' : 'bg-slate-800 text-slate-400 hover:text-slate-200'}`}
            >{tab}</button>
          ))}
        </div>
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-950 border border-slate-700 rounded text-[10px] text-slate-400">
          <Info className="w-3 h-3" />
          US-LISTED ETF QUOTES — NOT SPOT PRICES
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {filtered.map((item) => {
          const isUp = item.changePercent >= 0;
          const range = item.high24h - item.low24h || 1;
          const pctPos = Math.min(100, Math.max(0, ((item.price - item.low24h) / range) * 100));
          const flashClass = item.flash === 'up'
            ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
            : item.flash === 'down'
              ? 'border-rose-500 bg-rose-950/40 text-rose-200'
              : 'border-slate-800 bg-slate-900/60 hover:border-slate-700';
          return (
            <div key={item.symbol} className={`p-2.5 rounded border transition-all duration-300 ${flashClass}`}>
              <div className="flex items-center justify-between mb-1.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-slate-100 font-mono tracking-wide">{item.symbol}</span>
                    {item.sourceSymbol && <span className="text-[10px] text-cyan-400 font-mono">{item.sourceSymbol}</span>}
                    <span className="text-[10px] text-slate-400 font-mono">({item.unit})</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-mono mt-0.5">{item.name}</div>
                </div>
                <div className="text-right">
                  <div className="font-mono font-bold text-sm text-slate-100">${item.price.toFixed(2)}</div>
                  <div className={`flex items-center justify-end gap-0.5 text-[10px] font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    <span>{isUp ? '+' : ''}{item.change.toFixed(2)}</span>
                    <span>({isUp ? '+' : ''}{item.changePercent.toFixed(2)}%)</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/50 p-1.5 rounded border border-slate-800/80 mt-1">
                <div>
                  BID: <strong className="text-slate-200">{formatPrice(item.bid)}</strong> | ASK: <strong className="text-slate-200">{formatPrice(item.ask)}</strong>
                </div>
                <div className="flex items-center gap-1.5">
                  <span>L: ${item.low24h.toFixed(2)}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full relative overflow-hidden">
                    <div className={`h-full ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: `${pctPos}%` }} />
                  </div>
                  <span>H: ${item.high24h.toFixed(2)}</span>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="h-full min-h-[180px] flex items-center justify-center text-xs text-slate-500 font-mono text-center px-4">
            NO PROVIDER QUOTES AVAILABLE FOR THIS CATEGORY
          </div>
        )}
      </div>

      <div className="p-1.5 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between font-mono">
        <span>PROVIDER SNAPSHOTS OR SIMULATED MODE</span>
        <span>NO SYNTHETIC FALLBACK IN PROVIDER MODE</span>
      </div>
    </div>
  );
};
