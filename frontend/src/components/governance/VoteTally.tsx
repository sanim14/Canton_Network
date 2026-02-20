import React from 'react';
import type { Strategy, EpochState } from '../../types';

interface VoteTallyProps {
  voteTally: Record<string, number>;
  strategies: Strategy[];
  epoch: EpochState | null;
}

const VoteTally: React.FC<VoteTallyProps> = ({ voteTally, strategies, epoch }) => (
  <div className="ts-gov-panel">
    <div className="ts-tally-title">Vote Tally — Epoch {epoch?.currentEpoch ?? '?'}</div>
    {Object.keys(voteTally).length === 0 ? (
      <div className="ts-gov-info" style={{ marginTop: 12 }}>No votes cast yet this epoch.</div>
    ) : (
      <div className="ts-tally-bars">
        {Object.entries(voteTally).sort((a, b) => b[1] - a[1]).map(([sid, count]) => {
          const name = strategies.find(s => s.strategyId === sid)?.name ?? sid;
          const max = Math.max(...Object.values(voteTally));
          return (
            <div key={sid} className="ts-tally-row">
              <span className="ts-tally-name">{name}</span>
              <div className="ts-tally-bar-bg"><div className="ts-tally-bar-fill" style={{ width: `${(count / max) * 100}%` }} /></div>
              <span className="ts-tally-count">{count}</span>
            </div>
          );
        })}
      </div>
    )}
  </div>
);

export default VoteTally;
