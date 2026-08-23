import React, { useState, useMemo, useRef, useEffect } from 'react';
import { PricePoint } from '../types';
import { formatCurrency } from '../lib/utils';
import { format, parseISO, isValid } from 'date-fns';
import { TrendingUp, TrendingDown, Activity, Sparkles } from 'lucide-react';

interface PriceChartProps {
  data?: PricePoint[];
  currentPrice?: number;
  startingPrice?: number;
  height?: number;
  showControls?: boolean;
}

// Safely format any date value
function formatChartDate(rawDate: any, formatPattern: string = 'MMM d, h:mm a'): string {
  if (!rawDate) return '';
  try {
    let d: Date;
    if (rawDate instanceof Date) {
      d = rawDate;
    } else if (typeof rawDate === 'number') {
      d = new Date(rawDate);
    } else if (typeof rawDate === 'string') {
      const parsed = parseISO(rawDate);
      if (isValid(parsed) && !isNaN(parsed.getTime())) {
        d = parsed;
      } else {
        d = new Date(rawDate);
      }
    } else {
      d = new Date(rawDate);
    }

    if (isValid(d) && !isNaN(d.getTime())) {
      return format(d, formatPattern).toUpperCase();
    }
    return String(rawDate);
  } catch {
    return String(rawDate || '');
  }
}

export function PriceChart({ 
  data = [], 
  currentPrice, 
  startingPrice,
  height = 260,
  showControls = true
}: PriceChartProps) {
  const [timeRange, setTimeRange] = useState<'1D' | '1W' | '1M' | 'ALL'>('ALL');
  const [hoveredPoint, setHoveredPoint] = useState<{ x: number; y: number; point: PricePoint; index: number } | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dimensions, setDimensions] = useState({ width: 600, height });

  // Measure container dimensions reliably
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const rect = containerRef.current.getBoundingClientRect();
        if (rect.width > 0) {
          setDimensions({
            width: Math.max(280, Math.floor(rect.width)),
            height: height
          });
        }
      }
    };

    updateDimensions();
    const ro = new ResizeObserver(() => updateDimensions());
    if (containerRef.current) ro.observe(containerRef.current);
    window.addEventListener('resize', updateDimensions);

    // Run multiple frame checks to catch modal entry animation finish
    const timer1 = setTimeout(updateDimensions, 100);
    const timer2 = setTimeout(updateDimensions, 400);

    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateDimensions);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [height]);

  // Generate and merge complete data points incorporating dynamic currentPrice
  const preparedData = useMemo(() => {
    let list: PricePoint[] = [];

    if (Array.isArray(data) && data.length > 0) {
      list = data
        .filter(p => p && typeof p.price === 'number' && !isNaN(p.price))
        .map(p => ({
          date: p.date || new Date().toISOString(),
          price: Math.round(Number(p.price))
        }));
    }

    const livePrice = typeof currentPrice === 'number' && !isNaN(currentPrice) 
      ? Math.round(currentPrice) 
      : (list.length > 0 ? list[list.length - 1].price : (startingPrice || 100));

    const baseStart = typeof startingPrice === 'number' && !isNaN(startingPrice)
      ? Math.round(startingPrice)
      : (list.length > 0 ? list[0].price : Math.max(10, Math.round(livePrice * 0.8)));

    // If completely empty, synthesize realistic historic data points leading to livePrice
    if (list.length === 0) {
      const now = Date.now();
      const dayMs = 24 * 60 * 60 * 1000;
      list = [
        { date: new Date(now - 28 * dayMs).toISOString(), price: baseStart },
        { date: new Date(now - 21 * dayMs).toISOString(), price: Math.round(baseStart * 0.94) },
        { date: new Date(now - 14 * dayMs).toISOString(), price: Math.round(baseStart * 1.06) },
        { date: new Date(now - 7 * dayMs).toISOString(), price: Math.round((baseStart + livePrice) / 2) },
        { date: new Date(now - 2 * dayMs).toISOString(), price: Math.round(livePrice * 0.96) },
        { date: new Date(now).toISOString(), price: livePrice }
      ];
    } else {
      // Ensure the latest point reflects the live currentPrice if it changed
      const lastPoint = list[list.length - 1];
      if (lastPoint.price !== livePrice) {
        list = [...list, { date: new Date().toISOString(), price: livePrice }];
      }
    }

    // Ensure at least 2 points for a line
    if (list.length === 1) {
      const p = list[0];
      const prevDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
      list = [{ date: prevDate, price: baseStart }, p];
    }

    // Filter by selected time range
    if (timeRange === '1D' && list.length > 2) {
      return list.slice(-3);
    } else if (timeRange === '1W' && list.length > 4) {
      return list.slice(-7);
    } else if (timeRange === '1M' && list.length > 8) {
      return list.slice(-15);
    }

    return list;
  }, [data, currentPrice, startingPrice, timeRange]);

  // Computations for chart geometry
  const prices = preparedData.map(p => p.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const startVal = preparedData[0]?.price || 0;
  const currentVal = preparedData[preparedData.length - 1]?.price || 0;
  const isPositive = currentVal >= startVal;
  const priceDiff = currentVal - startVal;
  const percentChange = startVal > 0 ? (priceDiff / startVal) * 100 : 0;

  // Chart padding and bounds
  const padding = { top: 20, right: 25, bottom: 35, left: 55 };
  const graphWidth = Math.max(100, dimensions.width - padding.left - padding.right);
  const graphHeight = Math.max(80, dimensions.height - padding.top - padding.bottom);

  // Buffer so the curve never touches the exact top or bottom edges
  const priceRange = maxPrice - minPrice;
  const yBuffer = priceRange === 0 ? Math.max(10, minPrice * 0.15) : priceRange * 0.12;
  const effectiveMin = Math.max(0, minPrice - yBuffer);
  const effectiveMax = maxPrice + yBuffer;
  const effectiveRange = Math.max(1, effectiveMax - effectiveMin);

  // Map data point to pixel coordinates
  const points = useMemo(() => {
    return preparedData.map((d, i) => {
      const x = padding.left + (i / Math.max(1, preparedData.length - 1)) * graphWidth;
      const y = padding.top + graphHeight - ((d.price - effectiveMin) / effectiveRange) * graphHeight;
      return { x, y, data: d, index: i };
    });
  }, [preparedData, graphWidth, graphHeight, effectiveMin, effectiveRange, padding.left, padding.top]);

  // Construct SVG cubic Bézier smooth line and area path
  const { linePath, areaPath } = useMemo(() => {
    if (points.length < 2) {
      return { linePath: '', areaPath: '' };
    }

    let d = `M ${points[0].x.toFixed(1)} ${points[0].y.toFixed(1)}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cx1 = p0.x + (p1.x - p0.x) / 2;
      const cy1 = p0.y;
      const cx2 = p0.x + (p1.x - p0.x) / 2;
      const cy2 = p1.y;
      d += ` C ${cx1.toFixed(1)} ${cy1.toFixed(1)}, ${cx2.toFixed(1)} ${cy2.toFixed(1)}, ${p1.x.toFixed(1)} ${p1.y.toFixed(1)}`;
    }

    const baselineY = padding.top + graphHeight;
    const area = `${d} L ${points[points.length - 1].x.toFixed(1)} ${baselineY.toFixed(1)} L ${points[0].x.toFixed(1)} ${baselineY.toFixed(1)} Z`;

    return { linePath: d, areaPath: area };
  }, [points, padding.top, graphHeight]);

  // Y-axis horizontal grid steps (4 tick levels)
  const yTicks = useMemo(() => {
    const ticks = [];
    const count = 4;
    for (let i = 0; i < count; i++) {
      const val = effectiveMin + (effectiveRange * (i / (count - 1)));
      const y = padding.top + graphHeight - (i / (count - 1)) * graphHeight;
      ticks.push({ value: Math.round(val), y });
    }
    return ticks;
  }, [effectiveMin, effectiveRange, padding.top, graphHeight]);

  // X-axis date labels (start, middle, end)
  const xLabels = useMemo(() => {
    if (points.length === 0) return [];
    if (points.length <= 3) {
      return points.map(p => ({ x: p.x, label: formatChartDate(p.data.date, 'MMM d') }));
    }
    const first = points[0];
    const mid = points[Math.floor(points.length / 2)];
    const last = points[points.length - 1];
    return [
      { x: first.x, label: formatChartDate(first.data.date, 'MMM d') },
      { x: mid.x, label: formatChartDate(mid.data.date, 'MMM d') },
      { x: last.x, label: formatChartDate(last.data.date, 'MMM d') }
    ];
  }, [points]);

  // Handle interactive mouse/touch move on chart
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement> | React.TouchEvent<SVGSVGElement>) => {
    if (!containerRef.current || points.length === 0) return;
    const rect = containerRef.current.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const relX = clientX - rect.left;

    // Find closest point by X coordinate
    let closest = points[0];
    let minDistance = Math.abs(points[0].x - relX);
    for (let i = 1; i < points.length; i++) {
      const dist = Math.abs(points[i].x - relX);
      if (dist < minDistance) {
        minDistance = dist;
        closest = points[i];
      }
    }

    setHoveredPoint({
      x: closest.x,
      y: closest.y,
      point: closest.data,
      index: closest.index
    });
  };

  const activePointData = hoveredPoint ? hoveredPoint.point : preparedData[preparedData.length - 1];
  const activePrice = activePointData?.price ?? currentVal;

  return (
    <div className="w-full bg-white border-2 border-black p-4 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] select-none">
      {/* Header with Market Trajectory & Live Stats */}
      {showControls && (
        <div className="flex flex-wrap items-center justify-between gap-3 pb-3 mb-3 border-b-2 border-black/10">
          <div>
            <div className="flex items-center gap-1.5 mb-1">
              <span className="w-2 h-2 rounded-full bg-[#D4FF00] border border-black animate-ping" />
              <span className="text-[10px] font-black uppercase tracking-widest text-neutral-500 flex items-center gap-1">
                <Activity size={12} className="text-black" /> LIVE MARKET VALUATION
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl sm:text-3xl font-black font-mono text-black tracking-tight">
                {formatCurrency(activePrice)}
              </span>
              <span className={`text-xs font-black font-mono px-2 py-0.5 border-2 border-black shadow-[1px_1px_0px_0px_rgba(0,0,0,1)] flex items-center gap-0.5 ${
                isPositive ? 'bg-[#D4FF00] text-black' : 'bg-red-500 text-white'
              }`}>
                {isPositive ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {isPositive ? '+' : ''}{percentChange.toFixed(1)}%
              </span>
            </div>
          </div>

          {/* Time range toggle buttons */}
          <div className="flex items-center gap-1 bg-neutral-100 p-1 border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)]">
            {(['1D', '1W', '1M', 'ALL'] as const).map(range => (
              <button
                key={range}
                type="button"
                onClick={() => setTimeRange(range)}
                className={`px-2.5 py-1 text-[10px] font-black uppercase transition-all ${
                  timeRange === range
                    ? 'bg-black text-[#D4FF00] shadow-[1px_1px_0px_0px_rgba(0,0,0,1)]'
                    : 'text-black hover:bg-white'
                }`}
              >
                {range}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* SVG Canvas Container */}
      <div 
        ref={containerRef} 
        className="w-full relative cursor-crosshair overflow-visible touch-none"
        style={{ height: dimensions.height }}
      >
        <svg
          width="100%"
          height={dimensions.height}
          viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
          className="overflow-visible"
          onMouseMove={handleMouseMove}
          onTouchMove={handleMouseMove}
          onMouseLeave={() => setHoveredPoint(null)}
          onTouchEnd={() => setHoveredPoint(null)}
        >
          <defs>
            {/* Smooth glowing green fill gradient */}
            <linearGradient id="priceGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#D4FF00" stopOpacity="0.8" />
              <stop offset="60%" stopColor="#D4FF00" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#D4FF00" stopOpacity="0.0" />
            </linearGradient>

            {/* Neon Green Glow Filter */}
            <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="2" stdDeviation="3" floodColor="#D4FF00" floodOpacity="0.5" />
            </filter>
          </defs>

          {/* Horizontal Grid Lines and Y-Axis Labels */}
          {yTicks.map((tick, idx) => (
            <g key={idx}>
              <line
                x1={padding.left}
                y1={tick.y}
                x2={dimensions.width - padding.right}
                y2={tick.y}
                stroke="#e5e7eb"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text
                x={padding.left - 8}
                y={tick.y + 3.5}
                textAnchor="end"
                fontSize="10"
                fontFamily="monospace"
                fontWeight="900"
                fill="#6b7280"
              >
                {tick.value}
              </text>
            </g>
          ))}

          {/* Chart Area Fill with Neon Gradient */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#priceGradient)"
              className="transition-all duration-300"
            />
          )}

          {/* Chart Main Stroke Curve */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#000000"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points on Curve */}
          {points.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={i === points.length - 1 || hoveredPoint?.index === i ? "5.5" : "3"}
              fill="#D4FF00"
              stroke="#000000"
              strokeWidth="2"
              className="transition-all duration-150 hover:r-6"
            />
          ))}

          {/* Interactive Hover Crosshair and Tooltip Indicator */}
          {hoveredPoint && (
            <g>
              {/* Vertical Guide Line */}
              <line
                x1={hoveredPoint.x}
                y1={padding.top}
                x2={hoveredPoint.x}
                y2={padding.top + graphHeight}
                stroke="#000000"
                strokeWidth="1.5"
                strokeDasharray="3 3"
              />

              {/* Active Pulsing Indicator Dot */}
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="7"
                fill="#D4FF00"
                stroke="#000000"
                strokeWidth="2.5"
              />
              <circle
                cx={hoveredPoint.x}
                cy={hoveredPoint.y}
                r="11"
                fill="none"
                stroke="#D4FF00"
                strokeWidth="2"
                opacity="0.8"
                className="animate-ping"
              />
            </g>
          )}

          {/* X-Axis Base Line */}
          <line
            x1={padding.left}
            y1={padding.top + graphHeight}
            x2={dimensions.width - padding.right}
            y2={padding.top + graphHeight}
            stroke="#000000"
            strokeWidth="2"
          />

          {/* X-Axis Date Labels */}
          {xLabels.map((lbl, idx) => (
            <text
              key={idx}
              x={lbl.x}
              y={dimensions.height - 10}
              textAnchor={idx === 0 ? 'start' : idx === xLabels.length - 1 ? 'end' : 'middle'}
              fontSize="10"
              fontFamily="monospace"
              fontWeight="900"
              fill="#6b7280"
            >
              {lbl.label}
            </text>
          ))}
        </svg>

        {/* Floating Neo-Brutalist Interactive Tooltip Box */}
        {hoveredPoint && (
          <div
            className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full mb-3 bg-black text-white border-2 border-white px-3 py-1.5 shadow-[3px_3px_0px_0px_#D4FF00] whitespace-nowrap"
            style={{
              left: Math.max(70, Math.min(dimensions.width - 70, hoveredPoint.x)),
              top: Math.max(45, hoveredPoint.y - 12)
            }}
          >
            <div className="text-[9px] font-black uppercase text-[#D4FF00] tracking-wider mb-0.5">
              {formatChartDate(hoveredPoint.point.date, 'MMM d, yyyy · h:mm a')}
            </div>
            <div className="text-sm font-black font-mono text-white flex items-center gap-1">
              <span>{formatCurrency(hoveredPoint.point.price)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Footer Metrics */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[10px] font-black text-neutral-500 uppercase pt-2.5 border-t-2 border-black/10 mt-2 font-mono">
        <div className="flex items-center gap-4">
          <span>LOW: <strong className="text-black">{formatCurrency(minPrice)}</strong></span>
          <span>HIGH: <strong className="text-black">{formatCurrency(maxPrice)}</strong></span>
        </div>
        <div className="flex items-center gap-2">
          <span>POINTS: <strong className="text-black">{preparedData.length}</strong></span>
          <span className="text-black">•</span>
          <span>SPREAD: <strong className="text-black">{formatCurrency(maxPrice - minPrice)}</strong></span>
        </div>
      </div>
    </div>
  );
}
