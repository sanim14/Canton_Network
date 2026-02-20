import React from 'react';

interface AllocationItem {
  coinId: string;
  symbol: string;
  name: string;
  weight: number;
}

interface AllocationEditorProps {
  allocations: AllocationItem[];
  onChange: (allocations: AllocationItem[]) => void;
  onRemove: (coinId: string) => void;
}

const COLORS = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#38bdf8', '#fb923c', '#e879f9'];

const AllocationEditor: React.FC<AllocationEditorProps> = ({ allocations, onChange, onRemove }) => {
  const total = allocations.reduce((s, a) => s + a.weight, 0);
  const remaining = 100 - total;

  const updateWeight = (coinId: string, weight: number) => {
    onChange(allocations.map(a => a.coinId === coinId ? { ...a, weight } : a));
  };

  return (
    <div>
      {allocations.map((alloc, idx) => (
        <div key={alloc.coinId} style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '8px 0', borderBottom: '1px solid var(--border)',
        }}>
          <span style={{
            width: 8, height: 8, borderRadius: '50%',
            background: COLORS[idx % COLORS.length], flexShrink: 0,
          }} />
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 600,
            width: 60, textTransform: 'uppercase',
          }}>
            {alloc.symbol}
          </span>
          <input
            type="range" className="ts-range"
            min={0} max={100} value={alloc.weight}
            onChange={e => updateWeight(alloc.coinId, +e.target.value)}
            style={{ flex: 1 }}
          />
          <span style={{
            fontFamily: 'var(--mono)', fontSize: 14, fontWeight: 700,
            width: 45, textAlign: 'right',
            color: COLORS[idx % COLORS.length],
          }}>
            {alloc.weight}%
          </span>
          <button
            onClick={() => onRemove(alloc.coinId)}
            style={{
              background: 'none', border: 'none', color: 'var(--text-3)',
              cursor: 'pointer', padding: 2, fontSize: 16, lineHeight: 1,
            }}
          >
            &times;
          </button>
        </div>
      ))}

      {/* Allocation bar */}
      {allocations.length > 0 && (
        <div style={{ marginTop: 12 }}>
          <div style={{
            display: 'flex', height: 10, borderRadius: 4,
            overflow: 'hidden', background: 'var(--surface-2)',
          }}>
            {allocations.map((alloc, idx) => (
              <div key={alloc.coinId} style={{
                width: `${alloc.weight}%`,
                background: COLORS[idx % COLORS.length],
                height: '100%',
                transition: 'width 0.2s ease',
              }} />
            ))}
          </div>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            marginTop: 6, fontFamily: 'var(--mono)', fontSize: 11,
          }}>
            <span style={{ color: 'var(--text-3)' }}>Total: {total}%</span>
            <span style={{
              color: remaining === 0 ? 'var(--success)' : remaining < 0 ? 'var(--danger)' : 'var(--warning)',
              fontWeight: 600,
            }}>
              {remaining === 0 ? 'Balanced' : remaining > 0 ? `${remaining}% remaining` : `${Math.abs(remaining)}% over`}
            </span>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllocationEditor;
