import React from 'react';
import { useTreasuryContext } from '../contexts/TreasuryContext';
import { PARTY_META } from '../types';

const SettingsPage: React.FC = () => {
  const { partyId, partyLabel, partyColor, isMember, isOperator, epoch } = useTreasuryContext();

  return (
    <>
      <div className="ts-page-header">
        <h1 className="ts-page-title ts-gradient-heading">Settings</h1>
        <p className="ts-page-subtitle">Profile information and DAO configuration</p>
      </div>

      <div className="ts-settings-grid">
        <div className="ts-settings-card">
          <h3>Current Profile</h3>
          <div className="ts-settings-row">
            <span className="ts-settings-label">Party</span>
            <span className="ts-settings-value" style={{ color: partyColor }}>
              {partyLabel}
            </span>
          </div>
          <div className="ts-settings-row">
            <span className="ts-settings-label">Party ID</span>
            <span className="ts-settings-value">{partyId}</span>
          </div>
          <div className="ts-settings-row">
            <span className="ts-settings-label">Can View Own Allocations</span>
            <span className="ts-settings-value">
              {isMember
                ? <span style={{ color: '#34d399' }}>Yes</span>
                : <span style={{ color: '#f87171' }}>No</span>
              }
            </span>
          </div>
          <div className="ts-settings-row">
            <span className="ts-settings-label">Can Create Strategies</span>
            <span className="ts-settings-value">
              {isMember
                ? <span style={{ color: '#34d399' }}>Yes (1 active max)</span>
                : <span style={{ color: '#f87171' }}>No</span>
              }
            </span>
          </div>
          <div className="ts-settings-row">
            <span className="ts-settings-label">Can Vote</span>
            <span className="ts-settings-value">
              {isMember
                ? <span style={{ color: '#34d399' }}>Yes</span>
                : <span style={{ color: '#f87171' }}>No</span>
              }
            </span>
          </div>
          <div className="ts-settings-row">
            <span className="ts-settings-label">Can Manage Epochs</span>
            <span className="ts-settings-value">
              {isOperator
                ? <span style={{ color: '#34d399' }}>Yes</span>
                : <span style={{ color: '#f87171' }}>No</span>
              }
            </span>
          </div>
        </div>

        <div className="ts-settings-card">
          <h3>DAO Configuration</h3>
          <div className="ts-settings-row">
            <span className="ts-settings-label">Current Epoch</span>
            <span className="ts-settings-value" style={{ color: '#818cf8' }}>{epoch?.currentEpoch ?? '-'}</span>
          </div>
          <div className="ts-settings-row">
            <span className="ts-settings-label">Total Epochs</span>
            <span className="ts-settings-value">{epoch?.totalEpochs ?? '-'}</span>
          </div>
          <div className="ts-settings-row">
            <span className="ts-settings-label">Current Phase</span>
            <span className="ts-settings-value">{epoch?.phase ?? '-'}</span>
          </div>
          <div className="ts-settings-row">
            <span className="ts-settings-label">Privacy Model</span>
            <span className="ts-settings-value">Canton Per-Contract</span>
          </div>
          <div className="ts-settings-row">
            <span className="ts-settings-label">Network</span>
            <span className="ts-settings-value">Canton L1</span>
          </div>
        </div>

        <div className="ts-settings-card">
          <h3>Party Registry</h3>
          {Object.entries(PARTY_META).map(([key, meta]) => (
            <div className="ts-settings-row" key={key}>
              <span className="ts-settings-label" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: meta.color, flexShrink: 0 }} />
                {meta.label}
              </span>
              <span className="ts-settings-value" style={{ fontSize: 11, color: '#64748b' }}>{meta.description}</span>
            </div>
          ))}
        </div>

        {/* Risk Philosophy */}
        <div className="ts-settings-card ts-risk-philosophy">
          <h3>Risk Philosophy</h3>
          <div className="ts-risk-columns">
            <div className="ts-risk-col">
              <h4>Measured</h4>
              <div className="ts-risk-item">
                <div className="ts-risk-item-label">Epoch Return</div>
                <div className="ts-risk-item-desc">
                  Weighted sum of token price changes within a single epoch, based on the strategy's allocation percentages.
                </div>
              </div>
              <div className="ts-risk-item">
                <div className="ts-risk-item-label">Cumulative Return</div>
                <div className="ts-risk-item-desc">
                  Compounded product of all epoch returns since strategy creation. Captures long-term performance.
                </div>
              </div>
              <div className="ts-risk-item">
                <div className="ts-risk-item-label">Max Drawdown</div>
                <div className="ts-risk-item-desc">
                  Largest peak-to-trough decline in the cumulative return series. Measures worst-case loss exposure.
                </div>
              </div>
            </div>
            <div className="ts-risk-col">
              <h4>Philosophy</h4>
              <div className="ts-risk-item">
                <div className="ts-risk-item-label">Allocations are Private</div>
                <div className="ts-risk-item-desc">
                  Prevents front-running and copycat strategies. Each strategist competes on merit, not information asymmetry.
                </div>
              </div>
              <div className="ts-risk-item">
                <div className="ts-risk-item-label">Performance is Public</div>
                <div className="ts-risk-item-desc">
                  Ensures accountability. All DAO members can evaluate strategy results fairly for governance decisions.
                </div>
              </div>
              <div className="ts-risk-item">
                <div className="ts-risk-item-label">Democratic Elimination</div>
                <div className="ts-risk-item-desc">
                  Prevents capital concentration risk. Underperformers are removed by collective vote, not unilateral decision.
                </div>
              </div>
              <div className="ts-risk-item">
                <div className="ts-risk-item-label">Strategy Renewal</div>
                <div className="ts-risk-item-desc">
                  Eliminated strategists can immediately resubmit. Encourages adaptation and continuous improvement.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default SettingsPage;
