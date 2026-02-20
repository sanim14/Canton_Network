import React from 'react';

interface Template {
  id: string;
  name: string;
  description: string;
  tokens: { coinId: string; symbol: string; name: string; weight: number }[];
}

const TEMPLATES: Template[] = [
  {
    id: 'bluechip',
    name: 'DeFi Blue Chip',
    description: 'Large-cap crypto with stablecoin hedge',
    tokens: [
      { coinId: 'ethereum', symbol: 'ETH', name: 'Ethereum', weight: 40 },
      { coinId: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', weight: 35 },
      { coinId: 'usd-coin', symbol: 'USDC', name: 'USD Coin', weight: 25 },
    ],
  },
  {
    id: 'l1index',
    name: 'L1 Index',
    description: 'Diversified across top layer-1 chains',
    tokens: [
      { coinId: 'ethereum', symbol: 'ETH', name: 'Ethereum', weight: 30 },
      { coinId: 'solana', symbol: 'SOL', name: 'Solana', weight: 25 },
      { coinId: 'bitcoin', symbol: 'BTC', name: 'Bitcoin', weight: 25 },
      { coinId: 'avalanche-2', symbol: 'AVAX', name: 'Avalanche', weight: 20 },
    ],
  },
  {
    id: 'stable',
    name: 'Stablecoin Yield',
    description: 'Capital preservation with stable assets',
    tokens: [
      { coinId: 'usd-coin', symbol: 'USDC', name: 'USD Coin', weight: 40 },
      { coinId: 'tether', symbol: 'USDT', name: 'Tether', weight: 30 },
      { coinId: 'dai', symbol: 'DAI', name: 'Dai', weight: 30 },
    ],
  },
  {
    id: 'custom',
    name: 'Custom',
    description: 'Build your own allocation from scratch',
    tokens: [],
  },
];

interface TemplateSelectorProps {
  selected: string | null;
  onSelect: (template: Template) => void;
}

const TemplateSelector: React.FC<TemplateSelectorProps> = ({ selected, onSelect }) => (
  <div style={{
    display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8,
    marginBottom: 16,
  }}>
    {TEMPLATES.map(t => (
      <button
        key={t.id}
        onClick={() => onSelect(t)}
        style={{
          padding: '10px 14px', borderRadius: 8,
          background: selected === t.id ? 'var(--accent-dim)' : 'var(--surface-2)',
          border: `1px solid ${selected === t.id ? '#818cf844' : 'var(--border)'}`,
          color: 'var(--text)', textAlign: 'left', cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
      >
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 12, fontWeight: 700,
          color: selected === t.id ? 'var(--accent)' : 'var(--text)',
          marginBottom: 2,
        }}>
          {t.name}
        </div>
        <div style={{
          fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)',
        }}>
          {t.description}
        </div>
      </button>
    ))}
  </div>
);

export { TEMPLATES };
export type { Template };
export default TemplateSelector;
