import React, { useEffect, useMemo, useState } from 'react';
import type { AdapterMode } from '../../types';
import { INSTRUMENT_REGISTRY } from '../../market-data/instruments/registry';
import { fetchWatchlistQuotes, type WatchlistResult } from '../../services/watchlist';

interface Props { instrumentIds?: string[]; dataMode: AdapterMode; }
const defaults = INSTRUMENT_REGISTRY.filter((entry) => entry.providerSymbol && !entry.needsResolution).slice(0, 6).map((entry) => entry.id);

export const WatchlistWidget: React.FC<Props> = ({ instrumentIds = defaults, dataMode }) => {
  const [selected, setSelected] = useState(instrumentIds);
  const [result, setResult] = useState<WatchlistResult>({ items: [], errors: [], status: 'unavailable' });
  const [loading, setLoading] = useState(false);
  const entries = useMemo(() => INSTRUMENT_REGISTRY.filter((entry) => entry.providerSymbol && !entry.needsResolution), []);

  useEffect(() => {
    if (dataMode !== 'live' || !localStorage.getItem('bloomberg-api-key')) return;
    let cancelled = false;
    setLoading(true);
    fetchWatchlistQuotes(selected, { apiKey: localStorage.getItem('bloomberg-api-key') ?? '' })
      .then((next) => { if (!cancelled) setResult(next); })
      .catch((error) => { if (!cancelled) setResult({ items: [], errors: [{ code: 'WATCHLIST_ERROR', message: error instanceof Error ? error.message : String(error) }], status: 'unavailable' }); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [dataMode, selected]);

  const toggle = (id: string) => setSelected((current) => current.includes(id) ? current.filter((item) => item !== id) : [...current, id].slice(0, 20));
  return <div className="flex flex-col h-full min-h-[220px] bg-slate-950 text-xs font-mono">
    <div className="p-2 border-b border-slate-800 text-slate-500">CONFIGURE SYMBOLS <span className="text-slate-700">({selected.length}/20)</span></div>
    <div className="flex flex-wrap gap-1 p-2 border-b border-slate-900">{entries.map((entry) => <button key={entry.id} onClick={() => toggle(entry.id)} className={`px-1.5 py-0.5 rounded border ${selected.includes(entry.id) ? 'border-emerald-600 text-emerald-300 bg-emerald-950/50' : 'border-slate-800 text-slate-500'}`}>{entry.displaySymbol}</button>)}</div>
    {dataMode !== 'live' && <div className="p-3 text-amber-400">SWITCH TO PROVIDER MODE TO LOAD PROTECTED QUOTES.</div>}
    {dataMode === 'live' && !loading && result.items.length === 0 && result.errors.length === 0 && <div className="p-3 text-slate-500">NO QUOTES AVAILABLE.</div>}
    {loading && <div className="p-3 text-cyan-400">LOADING PROVIDER QUOTES...</div>}
    <div className="overflow-auto">{result.items.map((quote) => <div key={quote.instrumentId} className="grid grid-cols-[1fr_auto_auto] gap-3 px-3 py-2 border-b border-slate-900"><span className="text-slate-300">{INSTRUMENT_REGISTRY.find((entry) => entry.id === quote.instrumentId)?.displaySymbol ?? quote.instrumentId}</span><span className="text-slate-100">{quote.price.toFixed(2)}</span><span className={Number(quote.changePercent ?? 0) >= 0 ? 'text-emerald-400' : 'text-rose-400'}>{quote.changePercent == null ? '—' : `${quote.changePercent.toFixed(2)}%`}</span></div>)}</div>
    {result.errors.length > 0 && <div className="p-2 text-amber-400 border-t border-amber-900/50">PARTIAL FEED: {result.errors.map((error, index) => <div key={`${error.code}-${index}`}>{error.symbol ?? 'request'} — {error.message}</div>)}</div>}
  </div>;
};
