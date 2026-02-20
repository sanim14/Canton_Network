import React, { useState } from 'react';
import TokenSelector from './TokenSelector';
import AllocationEditor from './AllocationEditor';

interface AllocationItem {
  coinId: string;
  symbol: string;
  name: string;
  weight: number;
}

interface CreateStrategyModalProps {
  onClose: () => void;
  onCreate: (name: string, alloc: Record<string, number>) => void;
}

const CreateStrategyModal: React.FC<CreateStrategyModalProps> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);

  const total = allocations.reduce((s, a) => s + a.weight, 0);
  const valid = name.trim() && allocations.length > 0 && total === 100;

  const addToken = (token: { id: string; symbol: string; name: string }) => {
    if (allocations.find(a => a.coinId === token.id)) return;
    const remaining = 100 - total;
    setAllocations([...allocations, {
      coinId: token.id,
      symbol: token.symbol,
      name: token.name,
      weight: Math.min(remaining, Math.floor(100 / (allocations.length + 1))),
    }]);
  };

  const removeToken = (coinId: string) => {
    setAllocations(allocations.filter(a => a.coinId !== coinId));
  };

  const handleCreate = () => {
    const alloc: Record<string, number> = {};
    for (const a of allocations) {
      alloc[a.coinId] = a.weight / 100;
    }
    onCreate(name, alloc);
  };

  // Quick-add presets
  const presets = [
    { label: 'BTC/ETH Split', tokens: [
      { coinId: 'bitcoin', symbol: 'btc', name: 'Bitcoin', weight: 50 },
      { coinId: 'ethereum', symbol: 'eth', name: 'Ethereum', weight: 50 },
    ]},
    { label: 'Blue Chip', tokens: [
      { coinId: 'bitcoin', symbol: 'btc', name: 'Bitcoin', weight: 40 },
      { coinId: 'ethereum', symbol: 'eth', name: 'Ethereum', weight: 30 },
      { coinId: 'solana', symbol: 'sol', name: 'Solana', weight: 30 },
    ]},
    { label: 'Stablecoin Heavy', tokens: [
      { coinId: 'bitcoin', symbol: 'btc', name: 'Bitcoin', weight: 20 },
      { coinId: 'ethereum', symbol: 'eth', name: 'Ethereum', weight: 20 },
      { coinId: 'usd-coin', symbol: 'usdc', name: 'USD Coin', weight: 60 },
    ]},
  ];

  return (
    <div className="ts-modal-overlay" onClick={onClose}>
      <div className="ts-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
        <div className="ts-modal-header">
          <h3>Create New Strategy</h3>
          <button className="ts-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="ts-modal-body">
          <label className="ts-label">Strategy Name</label>
          <input
            className="ts-input" value={name}
            onChange={e => setName(e.target.value)}
            placeholder="e.g. Balanced Growth"
          />

          <label className="ts-label" style={{ marginTop: 16 }}>Quick Presets</label>
          <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
            {presets.map(p => (
              <button
                key={p.label}
                className="ts-btn ts-btn-ghost"
                style={{ fontSize: 11, padding: '4px 10px' }}
                onClick={() => setAllocations(p.tokens)}
              >
                {p.label}
              </button>
            ))}
          </div>

          <label className="ts-label">Add Token</label>
          <TokenSelector
            onSelect={addToken}
            excludeIds={allocations.map(a => a.coinId)}
          />

          {allocations.length > 0 && (
            <>
              <label className="ts-label" style={{ marginTop: 16 }}>Allocations</label>
              <AllocationEditor
                allocations={allocations}
                onChange={setAllocations}
                onRemove={removeToken}
              />
            </>
          )}
        </div>
        <div className="ts-modal-footer">
          <button className="ts-btn ts-btn-ghost" onClick={onClose}>Cancel</button>
          <button
            className="ts-btn ts-btn-accent" disabled={!valid}
            onClick={handleCreate}
          >
            Create Strategy
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreateStrategyModal;
