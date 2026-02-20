import React from 'react';
import StrategyCard from './StrategyCard';
import type { Strategy, PerformanceReport } from '../../types';

interface StrategyGridProps {
  strategies: Strategy[];
  latestPerf: Record<string, PerformanceReport>;
  canCreate: boolean;
  onCreateClick: () => void;
}

const StrategyGrid: React.FC<StrategyGridProps> = ({ strategies, latestPerf, canCreate, onCreateClick }) => (
  <section className="ts-section">
    <div className="ts-section-header">
      <h2>Strategy Leaderboard</h2>
      {canCreate && (
        <button className="ts-btn ts-btn-accent" onClick={onCreateClick}>
          + New Strategy
        </button>
      )}
    </div>
    <div className="ts-cards-grid">
      {strategies.map((s, i) => (
        <StrategyCard key={s.strategyId} strategy={s} rank={i} perf={latestPerf[s.strategyId]} />
      ))}
    </div>
  </section>
);

export default StrategyGrid;
