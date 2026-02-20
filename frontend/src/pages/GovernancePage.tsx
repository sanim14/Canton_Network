import React from 'react';
import { useTreasuryContext } from '../contexts/TreasuryContext';
import VotePanel from '../components/governance/VotePanel';
import VoteTally from '../components/governance/VoteTally';
import EliminationHistory from '../components/governance/EliminationHistory';

const GovernancePage: React.FC = () => {
  const {
    epoch, strategies, eliminations,
    isMember, voteTally, castVote,
  } = useTreasuryContext();

  return (
    <>
      <div className="ts-page-header">
        <h1 className="ts-page-title">Governance</h1>
        <p className="ts-page-subtitle">Vote on strategy eliminations and view governance history</p>
      </div>

      <section className="ts-section">
        <div className="ts-section-header">
          <h2>Voting</h2>
          <span className={`ts-phase-tag ts-phase-${epoch?.phase?.toLowerCase()}`}>
            {epoch?.phase === 'Voting' ? 'Voting Open' : 'Voting Closed'}
          </span>
        </div>
        <div className="ts-gov-grid">
          <div className="ts-gov-panel">
            {isMember && epoch?.phase === 'Voting' ? (
              <VotePanel strategies={strategies.filter(s => s.status === 'Active')} onVote={castVote} />
            ) : isMember ? (
              <div className="ts-gov-info">Voting is not currently open. Wait for the Voting phase.</div>
            ) : (
              <div className="ts-gov-info">Only DAO members can cast votes.</div>
            )}
          </div>
          <VoteTally voteTally={voteTally} strategies={strategies} epoch={epoch} />
        </div>
      </section>

      <EliminationHistory eliminations={eliminations} strategies={strategies} />
    </>
  );
};

export default GovernancePage;
