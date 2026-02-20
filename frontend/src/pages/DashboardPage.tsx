import React, { useState } from 'react';
import { useTreasuryContext } from '../contexts/TreasuryContext';
import StrategyGrid from '../components/strategy/StrategyGrid';
import PerformanceChart from '../components/performance/PerformanceChart';
import CreateStrategyModal from '../components/strategy/CreateStrategyModal';

const DashboardPage: React.FC = () => {
  const {
    strategies, performance, rankedStrategies, latestPerf,
    isMember, hasActiveStrategy, partyLabel, partyColor, createStrategy,
  } = useTreasuryContext();
  const [showCreate, setShowCreate] = useState(false);

  // Members can create if they don't have an active strategy
  const canCreate = isMember && !hasActiveStrategy;

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

      <StrategyGrid
        strategies={rankedStrategies}
        latestPerf={latestPerf}
        canCreate={canCreate}
        onCreateClick={() => setShowCreate(true)}
      />

      <section className="ts-section">
        <div className="ts-section-header"><h2>Performance Over Time</h2></div>
        <div className="ts-chart-wrap">
          <PerformanceChart performance={performance} strategies={strategies} />
        </div>
      </section>

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

export default DashboardPage;
