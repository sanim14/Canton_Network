import React, { useState } from 'react';
import type { Strategy } from '../../types';

interface VotePanelProps {
  strategies: Strategy[];
  onVote: (id: string) => void;
}

const VotePanel: React.FC<VotePanelProps> = ({ strategies, onVote }) => {
  const [selected, setSelected] = useState('');
  return (
    <div>
      <div className="ts-vote-title">Cast Elimination Vote</div>
      <div className="ts-vote-form">
        <select className="ts-select" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Select strategy to eliminate...</option>
          {strategies.map(s => <option key={s.strategyId} value={s.strategyId}>{s.name}</option>)}
        </select>
        <button className="ts-btn ts-btn-danger" disabled={!selected} onClick={() => { onVote(selected); setSelected(''); }}>
          Cast Vote
        </button>
      </div>
    </div>
  );
};

export default VotePanel;
