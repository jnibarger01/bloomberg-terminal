import React, { useState } from 'react';
import { PreciousMetal } from '../../types';
import { Coins, Flame, ArrowUpRight, ArrowDownRight, Scale } from 'lucide-react';

interface Props {
  metals: PreciousMetal[];
}

export const PreciousMetalsWidget: React.FC<Props> = ({ metals }) => {
  const [activeTab, setActiveTab] = useState<'All' | 'Metals' | 'Energy'>('All');

  const gold = metals.find(m => m.symbol.includes('XAU'));
  const silver = metals.find(m => m.symbol.includes('XAG'));
  const goldSilverRatio = gold && silver && silver.price > 0
    ? (gold.price / silver.price).toFixed(2)
    : '81.35';

  const filtered = metals.filter(
    m => activeTab === 'All' || m.category === activeTab
  );

  return (
    <div className="flex flex-col h-full bg-slate-950/80 text-slate-200 select-none overflow-hidden">
      {/* Category Tabs & Ratio Banner */}
      <div className="p-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Coins className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-slate-300">COMMODITIES:</span>
          {(['All', 'Metals', 'Energy'] as const).map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-2 py-0.5 rounded text-[10px] ${
                activeTab === tab
                  ? 'bg-amber-950 text-amber-400 border border-amber-600 font-bold'
                  : 'bg-slate-800 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Gold/Silver Ratio Tile */}
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-950/40 border border-amber-800/60 rounded text-[11px] font-mono text-amber-300">
          <Scale className="w-3.5 h-3.5 text-amber-400" />
          <span>GOLD/SILVER RATIO:</span>
          <strong className="text-amber-200 font-bold">{goldSilverRatio}x</strong>
        </div>
      </div>

      {/* Commodity List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {filtered.map(item => {
          const isUp = item.changePercent >= 0;
          const range = item.high24h - item.low24h || 1;
          const pctPos = Math.min(100, Math.max(0, ((item.price - item.low24h) / range) * 100));

          const flashClass = item.flash === 'up'
            ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200'
            : item.flash === 'down'
            ? 'border-rose-500 bg-rose-950/40 text-rose-200'
            : 'border-slate-800 bg-slate-900/60 hover:border-slate-700';

          return (
            <div
              key={item.symbol}
              className={`p-2.5 rounded border transition-all duration-300 ${flashClass}`}
            >
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-xs text-slate-100 font-mono tracking-wide">
                    {item.symbol}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    ({item.unit})
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-mono font-bold text-sm text-slate-100">
                      ${item.price.toFixed(item.price < 10 ? 2 : 2)}
                    </div>
                    <div className={`flex items-center justify-end gap-0.5 text-[10px] font-mono font-bold ${isUp ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span>{isUp ? '+' : ''}{item.change.toFixed(2)}</span>
                      <span>({isUp ? '+' : ''}{item.changePercent.toFixed(2)}%)</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bid / Ask & 24h Range Bar */}
              <div className="grid grid-cols-2 gap-2 text-[10px] font-mono text-slate-400 bg-slate-950/50 p-1.5 rounded border border-slate-800/80 mt-1">
                <div>
                  BID: <strong className="text-slate-200">${item.bid.toFixed(2)}</strong> | ASK: <strong className="text-slate-200">${item.ask.toFixed(2)}</strong>
                </div>

                {/* 24h Range Progress Bar */}
                <div className="flex items-center gap-1.5">
                  <span>24H L: ${item.low24h.toFixed(1)}</span>
                  <div className="flex-1 h-1.5 bg-slate-800 rounded-full relative overflow-hidden">
                    <div
                      className={`h-full ${isUp ? 'bg-emerald-500' : 'bg-rose-500'}`}
                      style={{ width: `${pctPos}%` }}
                    />
                  </div>
                  <span>H: ${item.high24h.toFixed(1)}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Info */}
      <div className="p-1.5 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between font-mono">
        <span>LIVE COMMODITIES TAPE</span>
        <span>INTERVAL: REALTIME SPOT TICK</span>
      </div>
    </div>
  );
};
