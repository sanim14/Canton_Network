import React, { useState, useRef, useCallback, useMemo } from 'react';
import type { PerformanceReport, Strategy } from '../../types';
import { STRAT_LINE_COLORS } from '../../types';

interface PerformanceChartProps {
  performance: PerformanceReport[];
  strategies: Strategy[];
}

const PerformanceChart: React.FC<PerformanceChartProps> = ({ performance, strategies }) => {
  const [hover, setHover] = useState<{ x: number; y: number; data: PerformanceReport[] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 800, H = 320, PAD = { t: 20, r: 30, b: 40, l: 60 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  const grouped = useMemo(() => {
    const m: Record<string, PerformanceReport[]> = {};
    for (const p of performance) {
      (m[p.strategyId] ??= []).push(p);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.epoch - b.epoch);
    return m;
  }, [performance]);

  const epochs = useMemo(() => {
    const set = new Set<number>();
    for (const p of performance) set.add(p.epoch);
    return [...set].sort((a, b) => a - b);
  }, [performance]);

  const minVal = useMemo(() => Math.min(0, ...performance.map(p => p.cumulativeReturn)), [performance]);
  const maxVal = useMemo(() => Math.max(0.01, ...performance.map(p => p.cumulativeReturn)), [performance]);
  const range = maxVal - minVal || 0.01;

  const scaleX = (epoch: number) => PAD.l + ((epoch - (epochs[0] ?? 1)) / Math.max(1, (epochs[epochs.length - 1] ?? 1) - (epochs[0] ?? 1))) * plotW;
  const scaleY = (val: number) => PAD.t + plotH - ((val - minVal) / range) * plotH;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || epochs.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const scaleRatio = W / rect.width;
    const adjustedX = mx * scaleRatio;
    let closest = epochs[0];
    let minDist = Infinity;
    for (const ep of epochs) {
      const d = Math.abs(scaleX(ep) - adjustedX);
      if (d < minDist) { minDist = d; closest = ep; }
    }
    const data = performance.filter(p => p.epoch === closest);
    setHover({ x: scaleX(closest), y: 0, data });
  }, [epochs, performance]); // eslint-disable-line react-hooks/exhaustive-deps

  const stratIds = Object.keys(grouped);

  if (performance.length === 0) {
    return (
      <div className="ts-empty">
        No performance data yet. Advance epochs to generate performance reports.
      </div>
    );
  }

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="ts-chart-svg" onMouseMove={handleMouseMove} onMouseLeave={() => setHover(null)}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const val = minVal + frac * range;
        const y = scaleY(val);
        return <g key={frac}>
          <line x1={PAD.l} y1={y} x2={W - PAD.r} y2={y} stroke="#1e293b" strokeWidth="1" />
          <text x={PAD.l - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11" fontFamily="IBM Plex Mono">{(val * 100).toFixed(1)}%</text>
        </g>;
      })}
      {/* Zero line */}
      <line x1={PAD.l} y1={scaleY(0)} x2={W - PAD.r} y2={scaleY(0)} stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4" />
      {/* X-axis labels */}
      {epochs.map(ep => (
        <text key={ep} x={scaleX(ep)} y={H - 8} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="IBM Plex Mono">{ep}</text>
      ))}
      {/* Lines */}
      {stratIds.map((sid, idx) => {
        const pts = grouped[sid];
        if (!pts || pts.length < 2) return null;
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.epoch)} ${scaleY(p.cumulativeReturn)}`).join(' ');
        const name = strategies.find(s => s.strategyId === sid)?.name ?? sid;
        const color = STRAT_LINE_COLORS[idx % STRAT_LINE_COLORS.length];
        return <g key={sid}>
          <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${color}44)` }} />
          {pts.map(p => <circle key={p.epoch} cx={scaleX(p.epoch)} cy={scaleY(p.cumulativeReturn)} r="3" fill={color} stroke="#0a0a0f" strokeWidth="1.5" />)}
          {pts.length > 0 && <text x={scaleX(pts[pts.length - 1].epoch) + 6} y={scaleY(pts[pts.length - 1].cumulativeReturn) + 4} fill={color} fontSize="10" fontFamily="IBM Plex Mono" fontWeight="600">{name}</text>}
        </g>;
      })}
      {/* Hover line */}
      {hover && <>
        <line x1={hover.x} y1={PAD.t} x2={hover.x} y2={H - PAD.b} stroke="#475569" strokeWidth="1" strokeDasharray="3 3" />
        {hover.data.map((d, i) => {
          const color = STRAT_LINE_COLORS[stratIds.indexOf(d.strategyId) % STRAT_LINE_COLORS.length];
          return <g key={i}>
            <circle cx={hover.x} cy={scaleY(d.cumulativeReturn)} r="5" fill={color} stroke="#0a0a0f" strokeWidth="2" />
            <rect x={hover.x + 10} y={scaleY(d.cumulativeReturn) - 12 + i * 20} width={140} height={18} rx={4} fill="#1e293b" stroke="#334155" strokeWidth="0.5" />
            <text x={hover.x + 16} y={scaleY(d.cumulativeReturn) + 1 + i * 20} fill="#e2e8f0" fontSize="10" fontFamily="IBM Plex Mono">{d.strategyName}: {(d.cumulativeReturn * 100).toFixed(2)}%</text>
          </g>;
        })}
      </>}
    </svg>
  );
};

export default PerformanceChart;
