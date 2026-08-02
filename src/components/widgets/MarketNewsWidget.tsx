import React from 'react';
import { NewsItem } from '../../types';
import { Newspaper, Radio } from 'lucide-react';

interface Props {
  news: NewsItem[];
}

export const MarketNewsWidget: React.FC<Props> = ({ news }) => {
  return (
    <div className="flex flex-col h-full bg-slate-950/80 text-slate-200 select-none overflow-hidden font-mono">
      <div className="p-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 text-amber-400">
          <Newspaper className="w-3.5 h-3.5" />
          <span className="font-bold text-slate-200">BREAKING TERMINAL WIRE</span>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
          <Radio className="w-3 h-3 animate-pulse" />
          <span>LIVE FEEDS</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
        {news.map(item => {
          let urgencyClass = 'bg-slate-900 border-slate-800 text-slate-300';
          if (item.urgency === 'FLASH') urgencyClass = 'bg-rose-950/60 border-rose-600 text-rose-200';
          if (item.urgency === 'HIGH') urgencyClass = 'bg-amber-950/50 border-amber-600/80 text-amber-200';

          return (
            <div
              key={item.id}
              className={`p-2 rounded border transition-all duration-200 ${urgencyClass}`}
            >
              <div className="flex items-center justify-between mb-1 text-[10px] text-slate-400">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-amber-400">{item.source}</span>
                  <span className="bg-slate-800 text-slate-300 px-1 rounded">{item.category}</span>
                </div>
                <span>{item.time}</span>
              </div>
              <div className="text-xs font-semibold leading-relaxed">
                {item.headline}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
