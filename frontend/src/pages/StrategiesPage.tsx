import React, { useState } from 'react';
import { useTreasuryContext } from '../contexts/TreasuryContext';
import StrategyCard from '../components/strategy/StrategyCard';
import CreateStrategyModal from '../components/strategy/CreateStrategyModal';

const StrategiesPage: React.FC = () => {
  const {
    strategies, rankedStrategies, latestPerf,
    isMember, hasActiveStrategy, partyLabel, partyColor, createStrategy,
  } = useTreasuryContext();
  const [showCreate, setShowCreate] = useState(false);
  const [filter, setFilter] = useState<'all' | 'active' | 'eliminated'>('all');

  const canCreate = isMember && !hasActiveStrategy;

  const filtered = rankedStrategies.filter(s => {
    if (filter === 'active') return s.status === 'Active';
    if (filter === 'eliminated') return s.status === 'Eliminated';
    return true;
  });

  return (
    <>
      <div style={{
        padding: '8px 16px', borderRadius: 8, marginBottom: 16,
        background: partyColor + '11', border: `1px solid ${partyColor}33`,
        display: 'flex', alignItems: 'center', gap: 10,
        fontFamily: 'var(--mono)', fontSize: 12,
      }}>
        <span className="ts-role-dot" style={{ background: partyColor }} />
        <span>Viewing as <b>{partyLabel}</b></span>
        <span style={{ color: 'var(--text-3)' }}>
          {strategies.some(s => s.isAllocationsVisible) ?
            '— Your allocations are visible' :
            '— All allocations are CLASSIFIED'}
        </span>
      </div>

      <div className="ts-page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h1 className="ts-page-title">Strategies</h1>
            <p className="ts-page-subtitle">Manage and view treasury allocation strategies</p>
          </div>
          {canCreate && (
            <button className="ts-btn ts-btn-accent" onClick={() => setShowCreate(true)}>
              + New Strategy
            </button>
          )}
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['all', 'active', 'eliminated'] as const).map(f => (
          <button
            key={f}
            className={`ts-btn ${filter === f ? 'ts-btn-accent' : 'ts-btn-ghost'}`}
            onClick={() => setFilter(f)}
            style={{ textTransform: 'capitalize' }}
          >
            {f} ({f === 'all'
              ? rankedStrategies.length
              : rankedStrategies.filter(s => f === 'active' ? s.status === 'Active' : s.status === 'Eliminated').length
            })
          </button>
        ))}
      </div>

      <div className="ts-cards-grid">
        {filtered.map((s, i) => (
          <StrategyCard key={s.strategyId} strategy={s} rank={i} perf={latestPerf[s.strategyId]} />
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="ts-empty">No strategies match this filter.</div>
      )}

      {showCreate && (
        <CreateStrategyModal
          onClose={() => setShowCreate(false)}
          onCreate={async (name, alloc) => {
            const ok = await createStrategy(name, alloc);
            if (ok) setShowCreate(false);
          }}
        />
      )}
    </>
  );
};

export default StrategiesPage;
