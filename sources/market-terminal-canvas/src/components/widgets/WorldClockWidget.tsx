import React, { useState, useEffect } from 'react';
import { WorldSession } from '../../types';
import { Clock, Globe2, Sun, Moon } from 'lucide-react';

interface Props {
  sessions: WorldSession[];
}

export const WorldClockWidget: React.FC<Props> = ({ sessions }) => {
  const [now, setNow] = useState<Date>(new Date());

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const currentUtcHour = now.getUTCHours() + now.getUTCMinutes() / 60;

  const getSessionStatus = (s: WorldSession): { status: 'OPEN' | 'CLOSED' | 'PRE' | 'POST'; color: string } => {
    let open = s.openHourUTC;
    let close = s.closeHourUTC;

    let isOpen = false;
    if (close > open) {
      isOpen = currentUtcHour >= open && currentUtcHour < close;
    } else {
      // Overnight session
      isOpen = currentUtcHour >= open || currentUtcHour < close;
    }

    if (isOpen) {
      return { status: 'OPEN', color: 'bg-emerald-950 text-emerald-400 border-emerald-600' };
    }

    // Pre-market (1 hour before open)
    const preOpen = (open - 1 + 24) % 24;
    if (currentUtcHour >= preOpen && currentUtcHour < open) {
      return { status: 'PRE', color: 'bg-amber-950 text-amber-400 border-amber-600' };
    }

    return { status: 'CLOSED', color: 'bg-slate-800 text-slate-500 border-slate-700' };
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 text-slate-200 select-none overflow-hidden">
      {/* Top Banner */}
      <div className="p-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between text-xs font-mono">
        <div className="flex items-center gap-2 text-cyan-400">
          <Globe2 className="w-4 h-4" />
          <span className="font-bold text-slate-200">GLOBAL SESSIONS</span>
        </div>
        <div className="text-[11px] text-amber-400 font-bold font-mono">
          UTC: {now.toISOString().substring(11, 19)}
        </div>
      </div>

      {/* World Clock Cards Grid */}
      <div className="flex-1 overflow-y-auto p-2 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 custom-scrollbar">
        {sessions.map(s => {
          const statusInfo = getSessionStatus(s);
          
          // Format local time in timezone
          let localTimeStr = '--:--:--';
          let localDateStr = '';
          try {
            localTimeStr = now.toLocaleTimeString('en-US', { timeZone: s.timezone, hour12: false });
            localDateStr = now.toLocaleDateString('en-US', { timeZone: s.timezone, month: 'short', day: 'numeric' });
          } catch (e) {
            // fallback if timezone not supported
          }

          const localHour = parseInt(localTimeStr.split(':')[0] || '12', 10);
          const isDaytime = localHour >= 6 && localHour < 18;

          return (
            <div
              key={s.city}
              className="p-2.5 bg-slate-900/70 border border-slate-800 rounded flex flex-col justify-between"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  {isDaytime ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-indigo-400" />}
                  <span className="font-bold text-xs text-slate-100 font-mono tracking-wide">{s.city.toUpperCase()}</span>
                </div>
                <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded border font-bold ${statusInfo.color}`}>
                  {statusInfo.status}
                </span>
              </div>

              <div className="my-2 text-center">
                <div className="font-mono font-bold text-lg text-emerald-400 tracking-wider">
                  {localTimeStr}
                </div>
                <div className="text-[10px] text-slate-500 font-mono">
                  {localDateStr} (UTC{s.utcoffset >= 0 ? `+${s.utcoffset}` : s.utcoffset})
                </div>
              </div>

              <div className="text-[10px] font-mono text-slate-400 border-t border-slate-800/80 pt-1.5 flex justify-between">
                <span className="truncate">{s.exchange}</span>
                <span className="text-slate-500">{s.currency}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 24-Hour UTC Session Overlap Visualizer Timeline */}
      <div className="p-2 bg-slate-900 border-t border-slate-800 text-[10px] font-mono">
        <div className="flex justify-between text-slate-400 mb-1">
          <span>UTC SESSION OVERLAP TIMELINE</span>
          <span className="text-emerald-400">CURRENT: {Math.floor(currentUtcHour)}:00 UTC</span>
        </div>
        <div className="h-4 w-full bg-slate-950 border border-slate-800 rounded relative overflow-hidden flex">
          {/* Render 24 hour segments */}
          {Array.from({ length: 24 }).map((_, h) => {
            const isCurrent = Math.floor(currentUtcHour) === h;
            // Count active markets at this UTC hour
            const activeCount = sessions.filter(s => {
              if (s.closeHourUTC > s.openHourUTC) {
                return h >= s.openHourUTC && h < s.closeHourUTC;
              } else {
                return h >= s.openHourUTC || h < s.closeHourUTC;
              }
            }).length;

            let bg = 'bg-slate-900';
            if (activeCount === 1) bg = 'bg-emerald-950/70';
            if (activeCount >= 2) bg = 'bg-emerald-700/80'; // Overlap window!

            return (
              <div
                key={h}
                className={`flex-1 h-full border-r border-slate-800/50 relative ${bg}`}
                title={`UTC ${h}:00 - Active Markets: ${activeCount}`}
              >
                {isCurrent && (
                  <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-amber-400 z-10 shadow-[0_0_6px_rgba(245,158,11,1)]" />
                )}
              </div>
            );
          })}
        </div>
        <div className="flex justify-between text-[9px] text-slate-600 mt-1">
          <span>00:00 UTC</span>
          <span>06:00 UTC</span>
          <span>12:00 UTC</span>
          <span>18:00 UTC</span>
          <span>24:00 UTC</span>
        </div>
      </div>
    </div>
  );
};
