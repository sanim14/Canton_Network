import React, { useState, useEffect, useRef } from 'react';

interface Token {
  id: string;
  symbol: string;
  name: string;
  thumb: string | null;
}

interface TokenSelectorProps {
  onSelect: (token: Token) => void;
  excludeIds?: string[];
}

const TokenSelector: React.FC<TokenSelectorProps> = ({ onSelect, excludeIds = [] }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Token[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const r = await fetch(`/api/tokens/search?q=${encodeURIComponent(query)}`);
        const data = await r.json();
        setResults(data.filter((t: Token) => !excludeIds.includes(t.id)));
        setOpen(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, [query, excludeIds]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={wrapperRef} style={{ position: 'relative' }}>
      <input
        className="ts-input"
        value={query}
        onChange={e => setQuery(e.target.value)}
        onFocus={() => results.length > 0 && setOpen(true)}
        placeholder="Search tokens (e.g. ethereum, uniswap)..."
        style={{ width: '100%' }}
      />
      {loading && (
        <div style={{
          position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
          fontFamily: 'var(--mono)', fontSize: 10, color: 'var(--text-3)',
        }}>
          Searching...
        </div>
      )}
      {open && results.length > 0 && (
        <div style={{
          position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 50,
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: '0 0 8px 8px', maxHeight: 200, overflowY: 'auto',
          boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
        }}>
          {results.map(token => (
            <button
              key={token.id}
              onClick={() => { onSelect(token); setQuery(''); setOpen(false); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '8px 12px',
                background: 'transparent', border: 'none', color: 'var(--text)',
                fontFamily: 'var(--mono)', fontSize: 12, cursor: 'pointer',
                textAlign: 'left',
                borderBottom: '1px solid var(--border)',
              }}
              onMouseEnter={e => (e.currentTarget.style.background = 'var(--surface-2)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              {token.thumb && (
                <img src={token.thumb} alt="" width={20} height={20} style={{ borderRadius: 4 }} />
              )}
              <span style={{ fontWeight: 600 }}>{token.name}</span>
              <span style={{ color: 'var(--text-3)', textTransform: 'uppercase' }}>{token.symbol}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default TokenSelector;
