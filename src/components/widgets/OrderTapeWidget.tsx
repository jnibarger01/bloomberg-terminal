import React, { useState } from 'react';
import { TapeTick } from '../../types';
import { Terminal, Filter, Zap } from 'lucide-react';

interface Props {
  tape: TapeTick[];
}

export const OrderTapeWidget: React.FC<Props> = ({ tape }) => {
  const [selectedTicker, setSelectedTicker] = useState<string>('ALL');

  const filteredTape = selectedTicker === 'ALL'
    ? tape
    : tape.filter(t => t.ticker === selectedTicker);

  return (
    <div className="flex flex-col h-full bg-slate-950/80 text-slate-200 select-none overflow-hidden font-mono">
      {/* Control Header */}
      <div className="p-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-emerald-400">
          <Zap className="w-3.5 h-3.5" />
          <span className="font-bold text-slate-200">LIVE ORDER TAPE</span>
        </div>

        <div className="flex items-center gap-1 text-[11px]">
          <Filter className="w-3 h-3 text-slate-500" />
          <select
            value={selectedTicker}
            onChange={e => setSelectedTicker(e.target.value)}
            className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-300 focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">ALL TICKERS</option>
            <option value="AAPL">AAPL</option>
            <option value="NVDA">NVDA</option>
            <option value="MSFT">MSFT</option>
            <option value="XAU/USD">XAU/USD</option>
            <option value="XOM">XOM</option>
          </select>
        </div>
      </div>

      {/* Tape Stream List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar text-xs">
        {filteredTape.map(tick => {
          const isBuy = tick.type === 'BUY';
          return (
            <div
              key={tick.id}
              className={`flex items-center justify-between p-1.5 rounded border transition-all duration-200 ${
                isBuy
                  ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
                  : 'bg-rose-950/30 border-rose-900/40 text-rose-300'
              }`}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">{tick.timestamp}</span>
                <span className="font-bold tracking-wider">{tick.ticker}</span>
                <span className={`px-1 rounded text-[9px] font-bold ${isBuy ? 'bg-emerald-900/80 text-emerald-200' : 'bg-rose-900/80 text-rose-200'}`}>
                  {tick.type}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-slate-400">{tick.size.toLocaleString()} SHARES</span>
                <span className="font-bold text-slate-100">${tick.price.toFixed(2)}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer Status */}
      <div className="p-1.5 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
        <span>SPEED: 1.0 SEC/TICK</span>
        <span>LATENCY: 12ms</span>
      </div>
    </div>
  );
};
