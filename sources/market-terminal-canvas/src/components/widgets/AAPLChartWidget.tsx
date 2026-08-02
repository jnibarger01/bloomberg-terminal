import React, { useState, useRef, useEffect } from 'react';
import { CandleData } from '../../types';
import { LineChart, Eye, EyeOff, BarChart2, Activity } from 'lucide-react';

interface Props {
  candles: CandleData[];
  currentLivePrice: number;
}

export const AAPLChartWidget: React.FC<Props> = ({ candles, currentLivePrice }) => {
  const [showMA20, setShowMA20] = useState(true);
  const [showMA50, setShowMA50] = useState(true);
  const [showVolume, setShowVolume] = useState(true);
  const [showRSI, setShowRSI] = useState(true);
  const [showMACD, setShowMACD] = useState(false);
  
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Active candle displayed in OHLC bar (hovered or latest)
  const activeCandle = hoveredIndex !== null && candles[hoveredIndex]
    ? candles[hoveredIndex]
    : candles[candles.length - 1];

  const firstPrice = candles[0]?.open || 200;
  const currentPrice = activeCandle?.close || currentLivePrice;
  const sessionChangePct = ((currentPrice - firstPrice) / firstPrice) * 100;

  // Render chart on Canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || candles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width = canvas.clientWidth * window.devicePixelRatio;
    const height = canvas.height = canvas.clientHeight * window.devicePixelRatio;

    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
    const cssWidth = canvas.clientWidth;
    const cssHeight = canvas.clientHeight;

    ctx.clearRect(0, 0, cssWidth, cssHeight);

    // Layout partitioning:
    // Main Chart height: ~60%
    // Volume height: ~15%
    // RSI / MACD sub-chart height: ~25%
    const mainHeight = cssHeight * (showRSI || showMACD ? 0.55 : 0.75);
    const subHeight = cssHeight - mainHeight - 10;

    // Price Bounds
    const prices = candles.flatMap(c => [c.low, c.high]);
    if (showMA20) candles.forEach(c => c.ma20 && prices.push(c.ma20));
    if (showMA50) candles.forEach(c => c.ma50 && prices.push(c.ma50));

    const minPrice = Math.min(...prices) * 0.99;
    const maxPrice = Math.max(...prices) * 1.01;
    const priceRange = maxPrice - minPrice || 1;

    // Grid lines
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);

    // Horizontal Price Grids
    const gridSteps = 5;
    for (let i = 0; i <= gridSteps; i++) {
      const y = (mainHeight / gridSteps) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(cssWidth - 50, y);
      ctx.stroke();

      const priceVal = maxPrice - (i / gridSteps) * priceRange;
      ctx.fillStyle = '#64748b';
      ctx.font = '10px JetBrains Mono';
      ctx.fillText(`$${priceVal.toFixed(1)}`, cssWidth - 45, y + 3);
    }

    ctx.setLineDash([]);

    // Candle bar width
    const paddingRight = 50;
    const availableWidth = cssWidth - paddingRight;
    const barWidth = Math.max(3, availableWidth / candles.length);
    const candleWidth = Math.max(2, barWidth * 0.7);

    // Draw Candlesticks & Volume
    const maxVol = Math.max(...candles.map(c => c.volume));

    candles.forEach((candle, i) => {
      const x = i * barWidth + barWidth / 2;
      const openY = mainHeight - ((candle.open - minPrice) / priceRange) * mainHeight;
      const closeY = mainHeight - ((candle.close - minPrice) / priceRange) * mainHeight;
      const highY = mainHeight - ((candle.high - minPrice) / priceRange) * mainHeight;
      const lowY = mainHeight - ((candle.low - minPrice) / priceRange) * mainHeight;

      const isUp = candle.close >= candle.open;
      const color = isUp ? '#10b981' : '#f43f5e';

      // Draw Wick
      ctx.strokeStyle = color;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x, highY);
      ctx.lineTo(x, lowY);
      ctx.stroke();

      // Draw Body
      ctx.fillStyle = color;
      const bodyY = Math.min(openY, closeY);
      const bodyH = Math.max(2, Math.abs(openY - closeY));
      ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyH);

      // Volume Bar
      if (showVolume) {
        const volHeight = (candle.volume / maxVol) * (mainHeight * 0.2);
        ctx.fillStyle = isUp ? 'rgba(16, 185, 129, 0.25)' : 'rgba(244, 63, 94, 0.25)';
        ctx.fillRect(x - candleWidth / 2, mainHeight - volHeight, candleWidth, volHeight);
      }
    });

    // Draw MA20 (Gold / Amber)
    if (showMA20) {
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      candles.forEach((candle, i) => {
        if (candle.ma20) {
          const x = i * barWidth + barWidth / 2;
          const y = mainHeight - ((candle.ma20 - minPrice) / priceRange) * mainHeight;
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // Draw MA50 (Purple)
    if (showMA50) {
      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      candles.forEach((candle, i) => {
        if (candle.ma50) {
          const x = i * barWidth + barWidth / 2;
          const y = mainHeight - ((candle.ma50 - minPrice) / priceRange) * mainHeight;
          if (!started) { ctx.moveTo(x, y); started = true; }
          else ctx.lineTo(x, y);
        }
      });
      ctx.stroke();
    }

    // Sub-chart Panel (RSI or MACD)
    if (showRSI || showMACD) {
      const subTop = mainHeight + 10;
      ctx.strokeStyle = '#1e293b';
      ctx.beginPath();
      ctx.moveTo(0, subTop);
      ctx.lineTo(cssWidth, subTop);
      ctx.stroke();

      if (showRSI) {
        // RSI (14) Line & 70/30 bands
        const rsiTop = subTop;
        const rsiH = subHeight;

        // 70 and 30 guide lines
        const y70 = rsiTop + rsiH * 0.3;
        const y30 = rsiTop + rsiH * 0.7;

        ctx.strokeStyle = 'rgba(239, 68, 68, 0.4)';
        ctx.beginPath(); ctx.moveTo(0, y70); ctx.lineTo(cssWidth - 50, y70); ctx.stroke();

        ctx.strokeStyle = 'rgba(16, 185, 129, 0.4)';
        ctx.beginPath(); ctx.moveTo(0, y30); ctx.lineTo(cssWidth - 50, y30); ctx.stroke();

        ctx.fillStyle = '#38bdf8';
        ctx.font = '10px JetBrains Mono';
        ctx.fillText('RSI (14)', 5, rsiTop + 12);
        ctx.fillText('70', cssWidth - 45, y70 + 3);
        ctx.fillText('30', cssWidth - 45, y30 + 3);

        // RSI curve
        ctx.strokeStyle = '#38bdf8';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        let started = false;
        candles.forEach((candle, i) => {
          if (candle.rsi !== undefined) {
            const x = i * barWidth + barWidth / 2;
            const y = rsiTop + rsiH * (1 - candle.rsi / 100);
            if (!started) { ctx.moveTo(x, y); started = true; }
            else ctx.lineTo(x, y);
          }
        });
        ctx.stroke();
      }
    }

    // Draw Crosshair
    if (hoveredIndex !== null && candles[hoveredIndex]) {
      const x = hoveredIndex * barWidth + barWidth / 2;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 3]);

      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, cssHeight);
      ctx.stroke();

      ctx.setLineDash([]);
    }

  }, [candles, showMA20, showMA50, showVolume, showRSI, showMACD, hoveredIndex]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const availableWidth = rect.width - 50;
    const idx = Math.floor((mouseX / availableWidth) * candles.length);
    if (idx >= 0 && idx < candles.length) {
      setHoveredIndex(idx);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-950/80 text-slate-200 select-none overflow-hidden">
      {/* Top Controls & Technical Toggles */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-2 bg-slate-900 border-b border-slate-800 text-xs font-mono">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-amber-400" />
          <span className="font-bold text-slate-200">INDICATORS:</span>
          <button
            onClick={() => setShowMA20(!showMA20)}
            className={`px-2 py-0.5 rounded text-[10px] ${
              showMA20 ? 'bg-amber-950 text-amber-400 border border-amber-600' : 'bg-slate-800 text-slate-500'
            }`}
          >
            MA20
          </button>
          <button
            onClick={() => setShowMA50(!showMA50)}
            className={`px-2 py-0.5 rounded text-[10px] ${
              showMA50 ? 'bg-purple-950 text-purple-400 border border-purple-600' : 'bg-slate-800 text-slate-500'
            }`}
          >
            MA50
          </button>
          <button
            onClick={() => setShowVolume(!showVolume)}
            className={`px-2 py-0.5 rounded text-[10px] ${
              showVolume ? 'bg-emerald-950 text-emerald-400 border border-emerald-600' : 'bg-slate-800 text-slate-500'
            }`}
          >
            VOL
          </button>
          <button
            onClick={() => setShowRSI(!showRSI)}
            className={`px-2 py-0.5 rounded text-[10px] ${
              showRSI ? 'bg-cyan-950 text-cyan-400 border border-cyan-600' : 'bg-slate-800 text-slate-500'
            }`}
          >
            RSI(14)
          </button>
        </div>

        <div className="text-[11px] text-slate-400">
          60-SESSIONS (DAILY)
        </div>
      </div>

      {/* OHLC Bar */}
      <div className="p-2 bg-slate-900/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-2 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="font-bold text-amber-400 text-sm">AAPL</span>
          <span className="text-slate-400">DATE: <strong className="text-slate-200">{activeCandle?.time}</strong></span>
          <span>O: <strong className="text-slate-200">${activeCandle?.open.toFixed(2)}</strong></span>
          <span>H: <strong className="text-emerald-400">${activeCandle?.high.toFixed(2)}</strong></span>
          <span>L: <strong className="text-rose-400">${activeCandle?.low.toFixed(2)}</strong></span>
          <span>C: <strong className="text-slate-100">${activeCandle?.close.toFixed(2)}</strong></span>
        </div>

        <div className="flex items-center gap-3">
          <span>VOL: <strong className="text-slate-300">{(activeCandle?.volume / 1000000).toFixed(1)}M</strong></span>
          <span className={`font-bold ${sessionChangePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            60-SESS: {sessionChangePct >= 0 ? '+' : ''}{sessionChangePct.toFixed(2)}%
          </span>
        </div>
      </div>

      {/* Main Chart Canvas Container */}
      <div
        ref={containerRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoveredIndex(null)}
        className="flex-1 w-full h-full relative p-2 cursor-crosshair"
      >
        <canvas ref={canvasRef} className="w-full h-full block" />
      </div>
    </div>
  );
};
