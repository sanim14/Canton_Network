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
        <h1 className="ts-page-title ts-gradient-heading">Governance</h1>
        <p className="ts-page-subtitle">Vote on strategy eliminations and view governance history</p>
      </div>

      {/* Incentive Cards */}
      <div className="ts-incentive-grid">
        <div className="ts-incentive-card ts-incentive-purple" style={{ borderTop: '2px solid #a78bfa' }}>
          <h3 style={{ color: '#a78bfa' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a78bfa" strokeWidth="2">
              <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
            </svg>
            Strategist Incentives
          </h3>
          <ul>
            <li>Maximize risk-adjusted returns to climb the leaderboard</li>
            <li>Survival through elimination rounds = proof of consistency</li>
            <li>Can immediately resubmit a new strategy after elimination</li>
            <li>Allocations remain private — competitors cannot copy your positions</li>
          </ul>
        </div>
        <div className="ts-incentive-card ts-incentive-yellow" style={{ borderTop: '2px solid #fbbf24' }}>
          <h3 style={{ color: '#fbbf24' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
            Voter Incentives
          </h3>
          <ul>
            <li>Stewards of the treasury — vote to protect collective capital</li>
            <li>Eliminate underperformers to concentrate capital in strong strategies</li>
            <li>Performance is public, but allocations are private — prevents collusion</li>
            <li>Democratic elimination encourages adaptation and accountability</li>
          </ul>
        </div>
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
