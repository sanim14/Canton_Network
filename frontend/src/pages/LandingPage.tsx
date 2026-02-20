import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';

const WALKTHROUGH_STEPS = [
  {
    title: 'Create Strategy',
    desc: 'DAO members allocate treasury across any tokens with private weights.',
    mockup: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ color: '#818cf8', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>New Strategy</div>
        <div style={{ padding: '8px 12px', background: '#13131e', borderRadius: 6, border: '1px solid #1c1c2e' }}>
          <span style={{ color: '#94a3b8' }}>Name:</span> <span style={{ color: '#e2e8f0' }}>Balanced Growth</span>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, padding: '6px 10px', background: '#818cf822', borderRadius: 6, textAlign: 'center' as const, color: '#818cf8', fontSize: 11 }}>ETH 40%</div>
          <div style={{ flex: 1, padding: '6px 10px', background: '#fbbf2422', borderRadius: 6, textAlign: 'center' as const, color: '#fbbf24', fontSize: 11 }}>BTC 35%</div>
          <div style={{ flex: 1, padding: '6px 10px', background: '#34d39922', borderRadius: 6, textAlign: 'center' as const, color: '#34d399', fontSize: 11 }}>USDC 25%</div>
        </div>
      </div>
    ),
  },
  {
    title: 'Allocations Hidden',
    desc: 'Canton privacy ensures allocation weights are only visible to authorized parties.',
    mockup: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ color: '#f87171', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Public View</div>
        <div style={{ padding: '10px 14px', background: '#f8717108', borderRadius: 8, border: '1px solid #f8717118', display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
          <span className="ts-shimmer" style={{ fontSize: 14, letterSpacing: 1 }}>████████████</span>
          <span style={{ marginLeft: 'auto', fontSize: 9, fontWeight: 700, color: '#f87171', letterSpacing: 2, textTransform: 'uppercase' as const, padding: '2px 8px', background: '#f8717118', borderRadius: 3, border: '1px solid #f8717133' }}>CLASSIFIED</span>
        </div>
        <div style={{ fontSize: 10, color: '#64748b', fontStyle: 'italic' }}>Only the strategy creator can see their own allocation weights</div>
      </div>
    ),
  },
  {
    title: 'Performance Published',
    desc: 'Epoch returns are computed and published publicly while keeping allocations private.',
    mockup: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ color: '#34d399', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Public Metrics</div>
        <svg viewBox="0 0 300 80" style={{ width: '100%' }}>
          <line x1="0" y1="40" x2="300" y2="40" stroke="#1e293b" strokeWidth="1" />
          <path d="M 0 60 L 60 50 L 120 30 L 180 35 L 240 20 L 300 15" fill="none" stroke="#818cf8" strokeWidth="2" className="ts-draw-line" />
          <path d="M 0 55 L 60 45 L 120 40 L 180 50 L 240 45 L 300 30" fill="none" stroke="#34d399" strokeWidth="2" className="ts-draw-line" style={{ animationDelay: '0.3s' }} />
        </svg>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11 }}>
          <span style={{ color: '#818cf8' }}>Strategy A: <b style={{ color: '#34d399' }}>+12.4%</b></span>
          <span style={{ color: '#34d399' }}>Strategy B: <b style={{ color: '#34d399' }}>+8.7%</b></span>
        </div>
      </div>
    ),
  },
  {
    title: 'Community Votes',
    desc: 'DAO members cast elimination votes during the voting phase.',
    mockup: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ color: '#fbbf24', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Vote Tally</div>
        {[
          { name: 'Degen Yield', votes: 2, max: 2 },
          { name: 'Momentum Alpha', votes: 1, max: 2 },
        ].map((v, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ width: 100, fontSize: 11, color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{v.name}</span>
            <div style={{ flex: 1, height: 6, background: '#13131e', borderRadius: 3, overflow: 'hidden' }}>
              <div style={{ width: `${(v.votes / v.max) * 100}%`, height: '100%', background: '#f87171', borderRadius: 3, transition: 'width 0.5s ease' }} />
            </div>
            <span style={{ fontSize: 12, fontWeight: 700, color: '#e2e8f0', width: 20, textAlign: 'right' }}>{v.votes}</span>
          </div>
        ))}
      </div>
    ),
  },
  {
    title: 'Elimination',
    desc: 'The strategy with the most votes is eliminated. Surviving strategies compete in the next epoch.',
    mockup: (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div style={{ color: '#f87171', fontSize: 11, fontWeight: 700, textTransform: 'uppercase' as const, letterSpacing: 1 }}>Elimination Result</div>
        <div style={{ padding: '12px 16px', background: '#f8717111', borderRadius: 8, border: '1px solid #f8717122', display: 'flex', alignItems: 'center', gap: 12 }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          <div>
            <div style={{ color: '#f87171', fontWeight: 600, textDecoration: 'line-through' }}>Degen Yield</div>
            <div style={{ fontSize: 10, color: '#64748b' }}>Eliminated in Epoch 3 with 2 votes</div>
          </div>
        </div>
        <div style={{ fontSize: 10, color: '#34d399' }}>2 strategies remaining</div>
      </div>
    ),
  },
];

const LandingPage: React.FC = () => {
  const [step, setStep] = useState(0);

  const nextStep = useCallback(() => {
    setStep(s => (s + 1) % WALKTHROUGH_STEPS.length);
  }, []);

  useEffect(() => {
    const timer = setInterval(nextStep, 2000);
    return () => clearInterval(timer);
  }, [nextStep]);

  const current = WALKTHROUGH_STEPS[step];

  return (
    <div className="ts-landing">
      {/* Nav */}
      <nav className="ts-landing-nav">
        <div className="ts-landing-nav-brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
            <circle cx="12" cy="16" r="1.5"/>
          </svg>
          <span style={{ fontFamily: 'var(--mono)', fontWeight: 700, fontSize: 16 }}>Treasury Sandbox</span>
        </div>
        <div className="ts-landing-nav-links">
          <Link to="/login" className="ts-hero-cta-primary" style={{ padding: '10px 24px', fontSize: 13 }}>
            Select Party
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="ts-hero">
        <div className="ts-hero-lock">
          <svg width="72" height="72" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1">
            <rect x="3" y="11" width="18" height="11" rx="2"/>
            <path d="M7 11V7a5 5 0 0110 0v4"/>
            <circle cx="12" cy="16" r="1.5"/>
          </svg>
        </div>
        <div className="ts-hero-badge">Canton L1 Privacy dApp</div>
        <h1>
          <span className="ts-gradient-text">Privacy-Preserving</span>
          <br />
          Treasury Management
        </h1>
        <p className="ts-hero-sub">
          DAOs test treasury allocation strategies confidentially. Allocations remain private while
          performance metrics and governance votes are selectively visible to different roles.
        </p>
        <div className="ts-hero-ctas">
          <Link to="/login" className="ts-hero-cta-primary">
            Select Party
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
          </Link>
          <a href="#walkthrough" className="ts-hero-cta-secondary">
            See How It Works
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 5v14M19 12l-7 7-7-7"/>
            </svg>
          </a>
        </div>
      </section>

      {/* Features */}
      <section className="ts-features">
        <div className="ts-features-title">Key Capabilities</div>
        <div className="ts-features-grid">
          <div className="ts-feature-card">
            <div className="ts-feature-icon" style={{ background: '#818cf822' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5">
                <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
              </svg>
            </div>
            <h3>Confidential Strategies</h3>
            <p>
              Treasury allocation weights are private per-contract on Canton.
              Only the strategy creator can see their own allocations. Other parties see CLASSIFIED.
            </p>
          </div>
          <div className="ts-feature-card">
            <div className="ts-feature-icon" style={{ background: '#34d39922' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="1.5">
                <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>
              </svg>
            </div>
            <h3>Public Performance</h3>
            <p>
              Epoch returns, cumulative performance, and drawdown metrics are published
              transparently so all DAO members can evaluate strategies fairly.
            </p>
          </div>
          <div className="ts-feature-card">
            <div className="ts-feature-icon" style={{ background: '#fbbf2422' }}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
            </div>
            <h3>Democratic Governance</h3>
            <p>
              DAO members participate in elimination rounds, voting to remove
              underperforming strategies each epoch. Fully on-chain and transparent.
            </p>
          </div>
        </div>
      </section>

      {/* Walkthrough */}
      <section className="ts-walkthrough" id="walkthrough">
        <div className="ts-walkthrough-title">How It Works</div>
        <div className="ts-walkthrough-browser">
          <div className="ts-walkthrough-toolbar">
            <span className="ts-toolbar-dot" style={{ background: '#f87171' }} />
            <span className="ts-toolbar-dot" style={{ background: '#fbbf24' }} />
            <span className="ts-toolbar-dot" style={{ background: '#34d399' }} />
            <span style={{ flex: 1, textAlign: 'center', fontFamily: 'var(--mono)', fontSize: 11, color: '#64748b' }}>
              treasury-sandbox.canton.network
            </span>
          </div>
          <div className="ts-walkthrough-content">
            <div className="ts-walkthrough-step" key={step}>
              <div className="ts-walkthrough-step-num">Step {step + 1} of {WALKTHROUGH_STEPS.length}</div>
              <h3>{current.title}</h3>
              <p>{current.desc}</p>
              <div className="ts-walkthrough-mockup">
                {current.mockup}
              </div>
            </div>
          </div>
          <div className="ts-walkthrough-dots">
            {WALKTHROUGH_STEPS.map((_, i) => (
              <button
                key={i}
                className={`ts-walkthrough-dot ${i === step ? 'active' : ''}`}
                onClick={() => setStep(i)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="ts-landing-footer">
        <span>Built for ETHDenver 2026 — Canton L1 Privacy dApp Prize</span>
        <span className="ts-footer-dot" />
        <span>Powered by Daml + Canton Network</span>
      </footer>
    </div>
  );
};

export default LandingPage;
