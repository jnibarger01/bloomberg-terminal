import React, { useState } from 'react';
import type { TapeTick } from '../../types';
import { Filter, Zap } from 'lucide-react';

interface Props {
  tape: TapeTick[];
}

export const OrderTapeWidget: React.FC<Props> = ({ tape }) => {
  const [selectedTicker, setSelectedTicker] = useState('ALL');
  const tickers = Array.from(new Set(tape.map((item) => item.ticker))).sort();
  const filteredTape = selectedTicker === 'ALL' ? tape : tape.filter((item) => item.ticker === selectedTicker);

  return (
    <div className="flex flex-col h-full bg-slate-950/80 text-slate-200 select-none overflow-hidden font-mono">
      <div className="p-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-emerald-400">
          <Zap className="w-3.5 h-3.5" />
          <span className="font-bold text-slate-200">MARKET ACTIVITY TAPE</span>
        </div>
        <div className="flex items-center gap-1 text-[11px]">
          <Filter className="w-3 h-3 text-slate-500" />
          <select
            value={selectedTicker}
            onChange={(event) => setSelectedTicker(event.target.value)}
            className="px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-300 focus:outline-none focus:border-emerald-600"
          >
            <option value="ALL">ALL TICKERS</option>
            {tickers.map((ticker) => <option key={ticker} value={ticker}>{ticker}</option>)}
          </select>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar text-xs">
        {filteredTape.map((tick) => {
          const isBuy = tick.type === 'BUY';
          const isSell = tick.type === 'SELL';
          const tone = isBuy
            ? 'bg-emerald-950/30 border-emerald-900/40 text-emerald-300'
            : isSell
              ? 'bg-rose-950/30 border-rose-900/40 text-rose-300'
              : 'bg-cyan-950/20 border-cyan-900/40 text-cyan-300';
          return (
            <div key={tick.id} className={`flex items-center justify-between p-1.5 rounded border ${tone}`}>
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-500">{tick.timestamp}</span>
                <span className="font-bold tracking-wider">{tick.ticker}</span>
                <span className="px-1 rounded text-[9px] font-bold bg-slate-900/80">{tick.type}</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-slate-400">{tick.size.toLocaleString()} UNITS</span>
                <span className="font-bold text-slate-100">${tick.price.toFixed(2)}</span>
              </div>
            </div>
          );
        })}

        {filteredTape.length === 0 && (
          <div className="h-full min-h-[180px] flex items-center justify-center text-xs text-slate-500 text-center px-4">
            NO PROVIDER TRADES AVAILABLE. SIMULATED TRADES ARE NOT USED AS A PROVIDER FALLBACK.
          </div>
        )}
      </div>

      <div className="p-1.5 bg-slate-900 border-t border-slate-800 text-[10px] text-slate-500 flex justify-between">
        <span>PROVIDER MODE: FINNHUB WEBSOCKET TRADES</span>
        <span>TRADE SIDE IS NOT INFERRED</span>
      </div>
    </div>
  );
};
