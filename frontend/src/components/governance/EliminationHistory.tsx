import React from 'react';
import type { EliminationResult, Strategy } from '../../types';

interface EliminationHistoryProps {
  eliminations: EliminationResult[];
  strategies: Strategy[];
}

const EliminationHistory: React.FC<EliminationHistoryProps> = ({ eliminations, strategies }) => (
  <section className="ts-section">
    <div className="ts-section-header"><h2>Elimination History</h2></div>
    {eliminations.length === 0 ? (
      <div className="ts-empty">No eliminations yet. Advance epochs and vote to eliminate strategies.</div>
    ) : (
      <div className="ts-table-wrap">
        <table className="ts-table">
          <thead>
            <tr><th>Epoch</th><th>Eliminated</th><th>Vote Tally</th></tr>
          </thead>
          <tbody>
            {eliminations.map((e, i) => (
              <tr key={i}>
                <td><span className="ts-epoch-cell">{e.epoch}</span></td>
                <td><span style={{ color: '#f87171' }}>{e.eliminatedStrategyName}</span></td>
                <td>
                  {Object.entries(e.voteTally).map(([k, v]) => {
                    const n = strategies.find(s => s.strategyId === k)?.name ?? k;
                    return <span key={k} className="ts-tally-chip">{n}: {v}</span>;
                  })}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);

export default EliminationHistory;
