import React from 'react';
import type { Strategy, PerformanceReport } from '../../types';

interface StrategyCardProps {
  strategy: Strategy;
  rank: number;
  perf?: PerformanceReport;
  livePrices?: Record<string, { usdPrice: number; usd24hChange: number }>;
  isDemoMode?: boolean;
}

const TOKEN_COLORS: Record<string, string> = {
  bitcoin: '#f7931a',
  ethereum: '#627eea',
  solana: '#9945ff',
  'usd-coin': '#2775ca',
  tether: '#26a17b',
  'binancecoin': '#f3ba2f',
  cardano: '#0033ad',
  polkadot: '#e6007a',
  avalanche: '#e84142',
};

function getTokenColor(coinId: string, index: number): string {
  const fallback = ['#818cf8', '#34d399', '#fbbf24', '#f87171', '#a78bfa', '#60a5fa'];
  return TOKEN_COLORS[coinId] ?? fallback[index % fallback.length];
}

function formatCoinId(coinId: string): string {
  const short: Record<string, string> = {
    bitcoin: 'BTC', ethereum: 'ETH', solana: 'SOL',
    'usd-coin': 'USDC', tether: 'USDT', 'binancecoin': 'BNB',
    cardano: 'ADA', polkadot: 'DOT', avalanche: 'AVAX',
  };
  return short[coinId] ?? coinId.slice(0, 5).toUpperCase();
}

const StrategyCard: React.FC<StrategyCardProps> = ({ strategy: s, rank: i, perf, livePrices, isDemoMode }) => {
  const cum = perf?.cumulativeReturn ?? 0;
  const dd = perf?.maxDrawdown ?? 0;
  const er = perf?.epochReturn ?? 0;
  const eliminated = s.status === 'Eliminated';

  return (
    <div
      className={`ts-card ${eliminated ? 'ts-card-eliminated' : ''}`}
      style={{ '--rank-glow': eliminated ? '#f8717133' : i === 0 ? '#818cf833' : 'transparent' } as React.CSSProperties}
    >
      <div className="ts-card-top">
        <div className="ts-card-rank">
          {eliminated ? (
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          ) : i === 0 ? (
            <span className="ts-medal ts-gold">1</span>
          ) : i === 1 ? (
            <span className="ts-medal ts-silver">2</span>
          ) : (
            <span className="ts-medal ts-bronze">{i + 1}</span>
          )}
        </div>
        <div>
          <div className="ts-card-name" style={eliminated ? { textDecoration: 'line-through', opacity: 0.5 } : {}}>
            {s.name}
          </div>
          {s.creatorParty && (
            <span style={{
              fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)',
            }}>
              by {s.creatorParty}
            </span>
          )}
        </div>
      </div>
      <div className={`ts-card-metrics ${isDemoMode && !s.isAllocationsVisible ? 'ts-demo-sensitive' : ''}`}>
        <div className="ts-metric">
          <span className="ts-metric-label">Cumulative</span>
          <span className={`ts-metric-value ${cum >= 0 ? 'ts-positive' : 'ts-negative'}`}>
            {(cum * 100).toFixed(2)}%
          </span>
        </div>
        <div className="ts-metric">
          <span className="ts-metric-label">Epoch Return</span>
          <span className={`ts-metric-value ${er >= 0 ? 'ts-positive' : 'ts-negative'}`}>
            {(er * 100).toFixed(2)}%
          </span>
        </div>
        <div className="ts-metric">
          <span className="ts-metric-label">Max Drawdown</span>
          <span className="ts-metric-value ts-negative">{(dd * 100).toFixed(2)}%</span>
        </div>
      </div>
      <div className="ts-card-alloc">
        <span className="ts-alloc-label">Allocations</span>
        {s.isAllocationsVisible && s.allocations ? (
          <div className="ts-alloc-visible">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
            </svg>
            {Object.entries(s.allocations).map(([coinId, weight], idx) => {
              const price = livePrices?.[coinId];
              return (
                <React.Fragment key={coinId}>
                  {idx > 0 && <span className="ts-alloc-divider">|</span>}
                  <span className="ts-alloc-item" style={{ color: getTokenColor(coinId, idx) }}>
                    {formatCoinId(coinId)} <b>{(weight * 100).toFixed(0)}%</b>
                    {price && (
                      <span className={`ts-live-price ${price.usd24hChange >= 0 ? 'ts-live-price-up' : 'ts-live-price-down'}`}
                        style={{ marginLeft: 4 }}>
                        ${price.usdPrice.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        {' '}{price.usd24hChange >= 0 ? '+' : ''}{price.usd24hChange.toFixed(1)}%
                      </span>
                    )}
                  </span>
                </React.Fragment>
              );
            })}
          </div>
        ) : (
          <div className={`ts-alloc-hidden ${isDemoMode ? 'ts-demo-blur-overlay' : ''}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2">
              <rect x="3" y="11" width="18" height="11" rx="2" /><path d="M7 11V7a5 5 0 0110 0v4" />
            </svg>
            <span className="ts-redacted">████████████████</span>
            <span className="ts-classified-tag">CLASSIFIED</span>
          </div>
        )}
      </div>
    </div>
  );
};

export default StrategyCard;
