import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { EpochState } from '../../types';
import { PARTY_META } from '../../types';
import { useAuth } from '../../contexts/AuthContext';

interface HeaderProps {
  epoch: EpochState | null;
  partyId: string;
  partyLabel: string;
  partyColor: string;
  isOperator: boolean;
  onAdvanceEpoch: () => void;
  onOpenVoting: () => void;
  onExecuteElim: () => void;
  onBootstrap: () => void;
}

const Header: React.FC<HeaderProps> = ({
  epoch, partyId, partyLabel, partyColor, isOperator,
  onAdvanceEpoch, onOpenVoting, onExecuteElim, onBootstrap,
}) => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const meta = PARTY_META[partyId];

  return (
    <header className="ts-header">
      <div className="ts-header-left">
        <div className="ts-header-center">
          {epoch && <>
            <div className="ts-epoch-badge">
              <span className="ts-epoch-num">EPOCH {epoch.currentEpoch}</span>
              <span className="ts-epoch-sep">/</span>
              <span className="ts-epoch-total">{epoch.totalEpochs}</span>
            </div>
            <span className={`ts-phase-tag ts-phase-${epoch.phase?.toLowerCase()}`}>{epoch.phase}</span>
          </>}
        </div>
      </div>
      <div className="ts-header-right">
        {isAuthenticated ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              display: 'flex', alignItems: 'center', gap: 8,
              padding: '4px 12px', borderRadius: 6,
              background: 'var(--surface-2)', border: '1px solid var(--border)',
            }}>
              <span className="ts-role-dot" style={{ background: partyColor }} />
              <span style={{ fontFamily: 'var(--mono)', fontSize: 12, color: 'var(--text)' }}>
                {partyLabel}
              </span>
              {meta && (
                <span style={{
                  fontFamily: 'var(--mono)', fontSize: 9, fontWeight: 700,
                  padding: '2px 6px', borderRadius: 3,
                  background: partyColor + '22', color: partyColor,
                  textTransform: 'uppercase', letterSpacing: 1,
                }}>
                  {meta.short}
                </span>
              )}
            </div>
            <button className="ts-btn ts-btn-ghost" onClick={() => { logout(); navigate('/login'); }} style={{ padding: '4px 10px' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
                <polyline points="16 17 21 12 16 7"/>
                <line x1="21" y1="12" x2="9" y2="12"/>
              </svg>
            </button>
          </div>
        ) : (
          <button
            className="ts-btn ts-btn-accent"
            onClick={() => navigate('/login')}
            style={{ padding: '4px 12px', fontSize: 11 }}
          >
            Select Party
          </button>
        )}

        {isOperator && (
          <div className="ts-header-actions">
            {!epoch && (
              <button className="ts-btn ts-btn-accent" onClick={onBootstrap}>
                Bootstrap DAO
              </button>
            )}
            {epoch && (
              <button className="ts-btn ts-btn-ghost" onClick={onAdvanceEpoch} title="Advance Epoch">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21" /></svg>
                <span>Advance</span>
              </button>
            )}
            {epoch?.phase === 'Reporting' && (
              <button className="ts-btn ts-btn-outline" onClick={onOpenVoting}>Open Voting</button>
            )}
            {epoch?.phase === 'Voting' && (
              <button className="ts-btn ts-btn-danger-outline" onClick={onExecuteElim}>Execute Elimination</button>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

export default Header;
