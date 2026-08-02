import React, { useState } from 'react';
import { MarketIndex } from '../../types';
import { TrendingUp, TrendingDown, Search, Globe } from 'lucide-react';

interface Props {
  indices: MarketIndex[];
}

export const GlobalIndicesWidget: React.FC<Props> = ({ indices }) => {
  const [regionFilter, setRegionFilter] = useState<'All' | 'Americas' | 'Europe' | 'Asia'>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'change' | 'name'>('default');

  const filtered = indices
    .filter(idx => regionFilter === 'All' || idx.region === regionFilter)
    .filter(idx => 
      idx.symbol.toLowerCase().includes(searchQuery.toLowerCase()) || 
      idx.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

  if (sortBy === 'change') {
    filtered.sort((a, b) => b.changePercent - a.changePercent);
  } else if (sortBy === 'name') {
    filtered.sort((a, b) => a.symbol.localeCompare(b.symbol));
  }

  return (
    <div className="flex flex-col h-full bg-slate-950/80 text-slate-200 select-none overflow-hidden">
      {/* Widget Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2.5 bg-slate-900/90 border-b border-slate-800 text-xs">
        <div className="flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-emerald-400" />
          <span className="font-bold tracking-wider text-slate-300">REGION:</span>
          {(['All', 'Americas', 'Europe', 'Asia'] as const).map(reg => (
            <button
              key={reg}
              onClick={() => setRegionFilter(reg)}
              className={`px-2 py-0.5 rounded text-[11px] font-mono transition-colors ${
                regionFilter === reg
                  ? 'bg-emerald-950 text-emerald-400 border border-emerald-700/60 font-semibold'
                  : 'bg-slate-800/60 text-slate-400 hover:text-slate-200 hover:bg-slate-800'
              }`}
            >
              {reg}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="w-3 h-3 absolute left-2 top-1.5 text-slate-500" />
            <input
              type="text"
              placeholder="SEARCH INDEX..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="pl-6 pr-2 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-emerald-300 placeholder-slate-600 focus:outline-none focus:border-emerald-600 w-28 sm:w-36"
            />
          </div>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value as any)}
            className="px-1.5 py-0.5 bg-slate-900 border border-slate-800 rounded text-[11px] font-mono text-slate-300 focus:outline-none focus:border-emerald-600"
          >
            <option value="default">SORT: REGION</option>
            <option value="change">SORT: % CHANGE</option>
            <option value="name">SORT: NAME</option>
          </select>
        </div>
      </div>

      {/* Indices Grid / Table */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5 custom-scrollbar">
        {filtered.map(idx => {
          const isUp = idx.changePercent >= 0;
          const minVal = Math.min(...idx.sparkline);
          const maxVal = Math.max(...idx.sparkline);
          const range = maxVal - minVal || 1;
          
          // Generate SVG Sparkline Points
          const sparkPoints = idx.sparkline
            .map((val, i) => {
              const x = (i / (idx.sparkline.length - 1)) * 60;
              const y = 20 - ((val - minVal) / range) * 16;
              return `${x.toFixed(1)},${y.toFixed(1)}`;
            })
            .join(' ');

          const flashClass = idx.flash === 'up'
            ? 'bg-emerald-950/60 border-emerald-500/80 text-emerald-300'
            : idx.flash === 'down'
            ? 'bg-rose-950/60 border-rose-500/80 text-rose-300'
            : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700';

          return (
            <div
              key={idx.symbol}
              className={`flex items-center justify-between p-2 rounded border transition-all duration-300 ${flashClass}`}
            >
              {/* Symbol & Name */}
              <div className="flex-1 min-w-0 pr-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-bold text-xs tracking-wide text-slate-200 font-mono">
                    {idx.symbol}
                  </span>
                  <span className="text-[10px] px-1 rounded bg-slate-800 text-slate-400 uppercase">
                    {idx.region}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 truncate font-mono">
                  {idx.name}
                </div>
              </div>

              {/* Sparkline Canvas SVG */}
              <div className="w-16 h-6 hidden sm:block mx-2 shrink-0">
                <svg className="w-full h-full overflow-visible">
                  <polyline
                    fill="none"
                    stroke={isUp ? '#10b981' : '#f43f5e'}
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points={sparkPoints}
                  />
                </svg>
              </div>

              {/* Price & Change */}
              <div className="text-right shrink-0">
                <div className="font-mono font-bold text-xs text-slate-100">
                  {idx.price.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div
                  className={`flex items-center justify-end gap-0.5 text-[11px] font-mono font-semibold ${
                    isUp ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {isUp ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                  <span>{isUp ? '+' : ''}{idx.change.toFixed(2)}</span>
                  <span>({isUp ? '+' : ''}{idx.changePercent.toFixed(2)}%)</span>
                </div>
              </div>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-600 font-mono">
            NO MATCHING INDICES FOUND FOR "{searchQuery}"
          </div>
        )}
      </div>

      {/* Ticker Tape Summary Footer */}
      <div className="p-1.5 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between font-mono">
        <span>TOTAL BENCHMARKS: {indices.length}</span>
        <span>GAINERS: {indices.filter(i => i.changePercent >= 0).length} | LOSERS: {indices.filter(i => i.changePercent < 0).length}</span>
      </div>
    </div>
  );
};
