import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';

// ─── Types ───────────────────────────────────────────────────────────
interface PartyInfo { partyId: string; role: string; displayName: string }
interface EpochState { currentEpoch: number; totalEpochs: number; phase: string; contractId?: string }
interface Allocations { ethWeight: number; btcWeight: number; usdcWeight: number }
interface Strategy { strategyId: string; name: string; riskCategory: string; allocations: Allocations | null; status: string; isAllocationsVisible: boolean; contractId?: string }
interface PerformanceReport { strategyId: string; strategyName: string; riskCategory: string; epoch: number; epochReturn: number; cumulativeReturn: number; maxDrawdown: number }
interface Vote { voter: string; epoch: number; targetStrategyId: string; contractId?: string }
interface EliminationResult { epoch: number; eliminatedStrategyId: string; eliminatedStrategyName: string; voteTally: Record<string, number>; contractId?: string }

const ROLES = ['operator','strategyManager','voter1','voter2','voter3','auditor','publicObserver'] as const;
type Role = typeof ROLES[number];

const ROLE_META: Record<Role, { label: string; color: string; short: string }> = {
  operator:        { label: 'System Operator',   color: '#a78bfa', short: 'OP' },
  strategyManager: { label: 'Strategy Manager',  color: '#818cf8', short: 'SM' },
  voter1:          { label: 'DAO Voter 1',       color: '#34d399', short: 'V1' },
  voter2:          { label: 'DAO Voter 2',       color: '#34d399', short: 'V2' },
  voter3:          { label: 'DAO Voter 3',       color: '#34d399', short: 'V3' },
  auditor:         { label: 'Auditor',           color: '#fbbf24', short: 'AU' },
  publicObserver:  { label: 'Public Observer',   color: '#94a3b8', short: 'PB' },
};

const RISK_COLORS: Record<string, string> = {
  Conservative: '#60a5fa', Moderate: '#fbbf24', Aggressive: '#f87171',
};

const STRAT_LINE_COLORS = ['#818cf8','#34d399','#f87171','#fbbf24','#a78bfa'];

// ─── API helpers ─────────────────────────────────────────────────────
const api = {
  get:  async (path: string) => { const r = await fetch(`/api${path}`); return r.json(); },
  post: async (path: string, body?: unknown) => { const r = await fetch(`/api${path}`, { method:'POST', headers:{'Content-Type':'application/json'}, body: body ? JSON.stringify(body) : undefined }); return r.json(); },
  put:  async (path: string, body: unknown) => { const r = await fetch(`/api${path}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(body) }); return r.json(); },
};

// ─── App ─────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [party, setParty] = useState<PartyInfo | null>(null);
  const [epoch, setEpoch] = useState<EpochState | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [performance, setPerformance] = useState<PerformanceReport[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [eliminations, setEliminations] = useState<EliminationResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'ok'|'err' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const flash = useCallback((msg: string, type: 'ok'|'err' = 'ok') => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const refresh = useCallback(async () => {
    const [p, e, s, perf, elim] = await Promise.all([
      api.get('/current-party'),
      api.get('/epoch'),
      api.get('/strategies'),
      api.get('/performance'),
      api.get('/eliminations'),
    ]);
    setParty(p); setEpoch(e); setStrategies(s); setPerformance(perf); setEliminations(elim);
    if (e?.currentEpoch) {
      const v = await api.get(`/votes/${e.currentEpoch}`);
      setVotes(v);
    }
  }, []);

  useEffect(() => {
    (async () => {
      await api.post('/demo/seed');
      await refresh();
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const switchRole = async (role: string) => {
    await api.post('/party/switch', { role });
    await refresh();
    flash(`Switched to ${ROLE_META[role as Role]?.label ?? role}`);
  };

  const advanceEpoch = async () => {
    try { await api.post('/epoch/advance'); await refresh(); flash('Epoch advanced'); }
    catch { flash('Cannot advance epoch','err'); }
  };
  const openVoting = async () => {
    try { await api.post('/epoch/open-voting'); await refresh(); flash('Voting opened'); }
    catch { flash('Cannot open voting','err'); }
  };
  const executeElim = async () => {
    try { await api.post('/elimination/execute'); await refresh(); flash('Elimination executed'); }
    catch { flash('Cannot execute elimination','err'); }
  };
  const castVote = async (targetId: string) => {
    try { await api.post('/votes', { targetStrategyId: targetId }); await refresh(); flash('Vote cast'); }
    catch { flash('Cannot cast vote','err'); }
  };
  const createStrategy = async (name: string, risk: string, alloc: Allocations) => {
    try {
      await api.post('/strategies', { name, riskCategory: risk, allocations: alloc });
      await refresh(); setShowCreate(false); flash('Strategy created');
    } catch { flash('Failed to create strategy','err'); }
  };

  const currentRole = (party?.partyId ?? 'publicObserver') as Role;
  const isManager = currentRole === 'strategyManager';
  const isVoter = currentRole.startsWith('voter');
  const roleColor = ROLE_META[currentRole]?.color ?? '#94a3b8';

  // latest performance per strategy
  const latestPerf = useMemo(() => {
    const map: Record<string, PerformanceReport> = {};
    for (const p of performance) {
      if (!map[p.strategyId] || p.epoch > map[p.strategyId].epoch) map[p.strategyId] = p;
    }
    return map;
  }, [performance]);

  // sorted strategies by cumulative return desc
  const rankedStrategies = useMemo(() =>
    [...strategies].sort((a, b) => {
      const pa = latestPerf[a.strategyId]?.cumulativeReturn ?? -Infinity;
      const pb = latestPerf[b.strategyId]?.cumulativeReturn ?? -Infinity;
      return pb - pa;
    }),
  [strategies, latestPerf]);

  // vote tally for current epoch
  const voteTally = useMemo(() => {
    const t: Record<string, number> = {};
    for (const v of votes) t[v.targetStrategyId] = (t[v.targetStrategyId] ?? 0) + 1;
    return t;
  }, [votes]);

  if (loading) return <div style={{ background:'#07070c', color:'#e2e8f0', height:'100vh', display:'flex', alignItems:'center', justifyContent:'center', fontFamily:'IBM Plex Mono' }}>
    <div style={{ textAlign:'center' }}>
      <div style={{ fontSize:48, marginBottom:16 }}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/><circle cx="12" cy="16" r="1.5"/></svg>
      </div>
      <span style={{ letterSpacing:4, textTransform:'uppercase', fontSize:13, color:'#64748b' }}>Initializing Vault</span>
    </div>
  </div>;

  return <>
    <style>{globalCSS}</style>

    {/* ── Toast ── */}
    {toast && <div className={`ts-toast ${toast.type}`}>{toast.msg}</div>}

    {/* ── Header ── */}
    <header className="ts-header">
      <div className="ts-header-left">
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="1.5" style={{marginRight:10}}>
          <rect x="3" y="11" width="18" height="11" rx="2"/>
          <path d="M7 11V7a5 5 0 0110 0v4"/>
          <circle cx="12" cy="16" r="1.5"/>
        </svg>
        <span className="ts-logo">Treasury Sandbox</span>
        <span className="ts-logo-sub">Canton Privacy</span>
      </div>
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
      <div className="ts-header-right">
        <div className="ts-role-switcher">
          <span className="ts-role-dot" style={{ background: roleColor }} />
          <select value={currentRole} onChange={e => switchRole(e.target.value)} className="ts-role-select">
            {ROLES.map(r => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
          </select>
        </div>
        <div className="ts-header-actions">
          <button className="ts-btn ts-btn-ghost" onClick={advanceEpoch} title="Advance Epoch">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21"/></svg>
            <span>Advance</span>
          </button>
          {epoch?.phase === 'Reporting' && (
            <button className="ts-btn ts-btn-outline" onClick={openVoting}>Open Voting</button>
          )}
          {epoch?.phase === 'Voting' && (
            <button className="ts-btn ts-btn-danger-outline" onClick={executeElim}>Execute Elimination</button>
          )}
        </div>
      </div>
    </header>

    {/* ── Main ── */}
    <main className="ts-main">

      {/* ── Privacy Banner ── */}
      <div className="ts-privacy-banner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        <span>Viewing as <strong style={{color: roleColor}}>{ROLE_META[currentRole]?.label}</strong> — {
          strategies[0]?.isAllocationsVisible
            ? <span style={{color:'#34d399'}}>Allocation data is <strong>VISIBLE</strong></span>
            : <span style={{color:'#f87171'}}>Allocation data is <strong>CLASSIFIED</strong></span>
        }</span>
      </div>

      {/* ── Strategy Leaderboard ── */}
      <section className="ts-section">
        <div className="ts-section-header">
          <h2>Strategy Leaderboard</h2>
          {isManager && <button className="ts-btn ts-btn-accent" onClick={() => setShowCreate(true)}>+ New Strategy</button>}
        </div>
        <div className="ts-cards-grid">
          {rankedStrategies.map((s, i) => {
            const perf = latestPerf[s.strategyId];
            const cum = perf?.cumulativeReturn ?? 0;
            const dd = perf?.maxDrawdown ?? 0;
            const er = perf?.epochReturn ?? 0;
            const eliminated = s.status === 'Eliminated';
            const riskColor = RISK_COLORS[s.riskCategory] ?? '#94a3b8';
            return (
              <div key={s.strategyId} className={`ts-card ${eliminated ? 'ts-card-eliminated' : ''}`} style={{ '--rank-glow': eliminated ? '#f8717133' : i === 0 ? '#818cf833' : 'transparent' } as React.CSSProperties}>
                <div className="ts-card-top">
                  <div className="ts-card-rank">
                    {eliminated ? <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                    : i === 0 ? <span className="ts-medal ts-gold">1</span>
                    : i === 1 ? <span className="ts-medal ts-silver">2</span>
                    : <span className="ts-medal ts-bronze">{i+1}</span>}
                  </div>
                  <div>
                    <div className="ts-card-name" style={eliminated ? {textDecoration:'line-through', opacity:0.5} : {}}>{s.name}</div>
                    <span className="ts-risk-badge" style={{ color: riskColor, borderColor: riskColor+'66' }}>{s.riskCategory}</span>
                  </div>
                </div>
                <div className="ts-card-metrics">
                  <div className="ts-metric">
                    <span className="ts-metric-label">Cumulative</span>
                    <span className={`ts-metric-value ${cum >= 0 ? 'ts-positive' : 'ts-negative'}`}>{(cum*100).toFixed(2)}%</span>
                  </div>
                  <div className="ts-metric">
                    <span className="ts-metric-label">Epoch Return</span>
                    <span className={`ts-metric-value ${er >= 0 ? 'ts-positive' : 'ts-negative'}`}>{(er*100).toFixed(2)}%</span>
                  </div>
                  <div className="ts-metric">
                    <span className="ts-metric-label">Max Drawdown</span>
                    <span className="ts-metric-value ts-negative">{(dd*100).toFixed(2)}%</span>
                  </div>
                </div>
                <div className="ts-card-alloc">
                  <span className="ts-alloc-label">Allocations</span>
                  {s.isAllocationsVisible && s.allocations ? (
                    <div className="ts-alloc-visible">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#34d399" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                      <span className="ts-alloc-item">ETH <b>{(s.allocations.ethWeight*100).toFixed(0)}%</b></span>
                      <span className="ts-alloc-divider">|</span>
                      <span className="ts-alloc-item">BTC <b>{(s.allocations.btcWeight*100).toFixed(0)}%</b></span>
                      <span className="ts-alloc-divider">|</span>
                      <span className="ts-alloc-item">USDC <b>{(s.allocations.usdcWeight*100).toFixed(0)}%</b></span>
                    </div>
                  ) : (
                    <div className="ts-alloc-hidden">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/></svg>
                      <span className="ts-redacted">████████████████</span>
                      <span className="ts-classified-tag">CLASSIFIED</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ── Performance Chart ── */}
      <section className="ts-section">
        <div className="ts-section-header"><h2>Performance Over Time</h2></div>
        <div className="ts-chart-wrap">
          <PerformanceChart performance={performance} strategies={strategies} />
        </div>
      </section>

      {/* ── Governance ── */}
      <section className="ts-section">
        <div className="ts-section-header">
          <h2>Governance</h2>
          <span className={`ts-phase-tag ts-phase-${epoch?.phase?.toLowerCase()}`}>{epoch?.phase === 'Voting' ? 'Voting Open' : 'Voting Closed'}</span>
        </div>
        <div className="ts-gov-grid">
          {/* Vote Panel */}
          <div className="ts-gov-panel">
            {isVoter && epoch?.phase === 'Voting' ? (
              <VotePanel strategies={strategies.filter(s => s.status === 'Active')} onVote={castVote} />
            ) : isVoter ? (
              <div className="ts-gov-info">Voting is not currently open. Wait for the Voting phase.</div>
            ) : (
              <div className="ts-gov-info">Only DAO voters can cast votes. Switch to a voter role to participate.</div>
            )}
          </div>
          {/* Vote Tally */}
          <div className="ts-gov-panel">
            <div className="ts-tally-title">Vote Tally — Epoch {epoch?.currentEpoch ?? '?'}</div>
            {Object.keys(voteTally).length === 0 ? (
              <div className="ts-gov-info" style={{marginTop:12}}>No votes cast yet this epoch.</div>
            ) : (
              <div className="ts-tally-bars">
                {Object.entries(voteTally).sort((a,b) => b[1]-a[1]).map(([sid, count]) => {
                  const name = strategies.find(s => s.strategyId === sid)?.name ?? sid;
                  const max = Math.max(...Object.values(voteTally));
                  return <div key={sid} className="ts-tally-row">
                    <span className="ts-tally-name">{name}</span>
                    <div className="ts-tally-bar-bg"><div className="ts-tally-bar-fill" style={{width:`${(count/max)*100}%`}} /></div>
                    <span className="ts-tally-count">{count}</span>
                  </div>;
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* ── Elimination History ── */}
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
                    <td><span style={{color:'#f87171'}}>{e.eliminatedStrategyName}</span></td>
                    <td>{Object.entries(e.voteTally).map(([k,v]) => {
                      const n = strategies.find(s => s.strategyId === k)?.name ?? k;
                      return <span key={k} className="ts-tally-chip">{n}: {v}</span>;
                    })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="ts-footer">
        <span>Built for ETHDenver 2026 — Canton L1 Privacy dApp Prize</span>
        <span className="ts-footer-dot" />
        <span>Powered by Daml + Canton Network</span>
      </footer>
    </main>

    {/* ── Create Strategy Modal ── */}
    {showCreate && <CreateModal onClose={() => setShowCreate(false)} onCreate={createStrategy} />}
  </>;
};

// ─── Performance Chart ───────────────────────────────────────────────
const PerformanceChart: React.FC<{ performance: PerformanceReport[]; strategies: Strategy[] }> = ({ performance, strategies }) => {
  const [hover, setHover] = useState<{ x: number; y: number; data: PerformanceReport[] } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  const W = 800, H = 320, PAD = { t: 20, r: 30, b: 40, l: 60 };
  const plotW = W - PAD.l - PAD.r;
  const plotH = H - PAD.t - PAD.b;

  // Group performance by strategy
  const grouped = useMemo(() => {
    const m: Record<string, PerformanceReport[]> = {};
    for (const p of performance) {
      (m[p.strategyId] ??= []).push(p);
    }
    for (const k of Object.keys(m)) m[k].sort((a, b) => a.epoch - b.epoch);
    return m;
  }, [performance]);

  const epochs = useMemo(() => {
    const set = new Set<number>();
    for (const p of performance) set.add(p.epoch);
    return [...set].sort((a, b) => a - b);
  }, [performance]);

  const minVal = useMemo(() => Math.min(0, ...performance.map(p => p.cumulativeReturn)), [performance]);
  const maxVal = useMemo(() => Math.max(0.01, ...performance.map(p => p.cumulativeReturn)), [performance]);
  const range = maxVal - minVal || 0.01;

  const scaleX = (epoch: number) => PAD.l + ((epoch - (epochs[0] ?? 1)) / Math.max(1, (epochs[epochs.length-1] ?? 1) - (epochs[0] ?? 1))) * plotW;
  const scaleY = (val: number) => PAD.t + plotH - ((val - minVal) / range) * plotH;

  const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!svgRef.current || epochs.length === 0) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const scaleRatio = W / rect.width;
    const adjustedX = mx * scaleRatio;
    // Find closest epoch
    let closest = epochs[0];
    let minDist = Infinity;
    for (const ep of epochs) {
      const d = Math.abs(scaleX(ep) - adjustedX);
      if (d < minDist) { minDist = d; closest = ep; }
    }
    const data = performance.filter(p => p.epoch === closest);
    setHover({ x: scaleX(closest), y: 0, data });
  }, [epochs, performance]); // eslint-disable-line react-hooks/exhaustive-deps

  const stratIds = Object.keys(grouped);

  return (
    <svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} className="ts-chart-svg" onMouseMove={handleMouseMove} onMouseLeave={() => setHover(null)}>
      {/* Grid */}
      {[0, 0.25, 0.5, 0.75, 1].map(frac => {
        const val = minVal + frac * range;
        const y = scaleY(val);
        return <g key={frac}>
          <line x1={PAD.l} y1={y} x2={W-PAD.r} y2={y} stroke="#1e293b" strokeWidth="1"/>
          <text x={PAD.l - 8} y={y + 4} textAnchor="end" fill="#64748b" fontSize="11" fontFamily="IBM Plex Mono">{(val*100).toFixed(1)}%</text>
        </g>;
      })}
      {/* Zero line */}
      <line x1={PAD.l} y1={scaleY(0)} x2={W-PAD.r} y2={scaleY(0)} stroke="#334155" strokeWidth="1.5" strokeDasharray="4 4"/>
      {/* X-axis labels */}
      {epochs.map(ep => (
        <text key={ep} x={scaleX(ep)} y={H - 8} textAnchor="middle" fill="#64748b" fontSize="11" fontFamily="IBM Plex Mono">{ep}</text>
      ))}
      {/* Lines */}
      {stratIds.map((sid, idx) => {
        const pts = grouped[sid];
        if (!pts || pts.length < 2) return null;
        const d = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${scaleX(p.epoch)} ${scaleY(p.cumulativeReturn)}`).join(' ');
        const name = strategies.find(s => s.strategyId === sid)?.name ?? sid;
        const color = STRAT_LINE_COLORS[idx % STRAT_LINE_COLORS.length];
        return <g key={sid}>
          <path d={d} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ filter: `drop-shadow(0 0 4px ${color}44)` }}/>
          {pts.map(p => <circle key={p.epoch} cx={scaleX(p.epoch)} cy={scaleY(p.cumulativeReturn)} r="3" fill={color} stroke="#0a0a0f" strokeWidth="1.5"/>)}
          {/* Label at end */}
          {pts.length > 0 && <text x={scaleX(pts[pts.length-1].epoch) + 6} y={scaleY(pts[pts.length-1].cumulativeReturn) + 4} fill={color} fontSize="10" fontFamily="IBM Plex Mono" fontWeight="600">{name}</text>}
        </g>;
      })}
      {/* Hover line */}
      {hover && <>
        <line x1={hover.x} y1={PAD.t} x2={hover.x} y2={H-PAD.b} stroke="#475569" strokeWidth="1" strokeDasharray="3 3"/>
        {hover.data.map((d, i) => {
          const color = STRAT_LINE_COLORS[stratIds.indexOf(d.strategyId) % STRAT_LINE_COLORS.length];
          return <g key={i}>
            <circle cx={hover.x} cy={scaleY(d.cumulativeReturn)} r="5" fill={color} stroke="#0a0a0f" strokeWidth="2"/>
            <rect x={hover.x + 10} y={scaleY(d.cumulativeReturn) - 12 + i * 20} width={140} height={18} rx={4} fill="#1e293b" stroke="#334155" strokeWidth="0.5"/>
            <text x={hover.x + 16} y={scaleY(d.cumulativeReturn) + 1 + i * 20} fill="#e2e8f0" fontSize="10" fontFamily="IBM Plex Mono">{d.strategyName}: {(d.cumulativeReturn*100).toFixed(2)}%</text>
          </g>;
        })}
      </>}
    </svg>
  );
};

// ─── Vote Panel ──────────────────────────────────────────────────────
const VotePanel: React.FC<{ strategies: Strategy[]; onVote: (id: string) => void }> = ({ strategies, onVote }) => {
  const [selected, setSelected] = useState('');
  return (
    <div>
      <div className="ts-vote-title">Cast Elimination Vote</div>
      <div className="ts-vote-form">
        <select className="ts-select" value={selected} onChange={e => setSelected(e.target.value)}>
          <option value="">Select strategy to eliminate...</option>
          {strategies.map(s => <option key={s.strategyId} value={s.strategyId}>{s.name}</option>)}
        </select>
        <button className="ts-btn ts-btn-danger" disabled={!selected} onClick={() => { onVote(selected); setSelected(''); }}>
          Cast Vote
        </button>
      </div>
    </div>
  );
};

// ─── Create Strategy Modal ───────────────────────────────────────────
const CreateModal: React.FC<{ onClose: () => void; onCreate: (name: string, risk: string, alloc: Allocations) => void }> = ({ onClose, onCreate }) => {
  const [name, setName] = useState('');
  const [risk, setRisk] = useState('Moderate');
  const [eth, setEth] = useState(33);
  const [btc, setBtc] = useState(34);
  const usdc = 100 - eth - btc;
  const valid = name.trim() && usdc >= 0 && usdc <= 100;

  return (
    <div className="ts-modal-overlay" onClick={onClose}>
      <div className="ts-modal" onClick={e => e.stopPropagation()}>
        <div className="ts-modal-header">
          <h3>Create New Strategy</h3>
          <button className="ts-modal-close" onClick={onClose}>&times;</button>
        </div>
        <div className="ts-modal-body">
          <label className="ts-label">Strategy Name</label>
          <input className="ts-input" value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Balanced Growth" />

          <label className="ts-label">Risk Category</label>
          <select className="ts-select" value={risk} onChange={e => setRisk(e.target.value)}>
            <option>Conservative</option><option>Moderate</option><option>Aggressive</option>
          </select>

          <label className="ts-label">ETH Allocation: {eth}%</label>
          <input type="range" className="ts-range" min={0} max={100} value={eth} onChange={e => { const v = +e.target.value; setEth(v); if (v + btc > 100) setBtc(100 - v); }} />

          <label className="ts-label">BTC Allocation: {btc}%</label>
          <input type="range" className="ts-range" min={0} max={100 - eth} value={btc} onChange={e => setBtc(+e.target.value)} />

          <label className="ts-label">USDC Allocation: {usdc}%</label>
          <div className="ts-usdc-display">{usdc}% <span style={{color:'#64748b', fontSize:12}}>(auto-calculated)</span></div>

          <div className="ts-alloc-preview">
            <div className="ts-alloc-bar">
              <div style={{ width: `${eth}%`, background: '#818cf8', height: '100%', borderRadius: '4px 0 0 4px' }} />
              <div style={{ width: `${btc}%`, background: '#fbbf24', height: '100%' }} />
              <div style={{ width: `${usdc}%`, background: '#34d399', height: '100%', borderRadius: '0 4px 4px 0' }} />
            </div>
            <div className="ts-alloc-bar-labels">
              <span style={{color:'#818cf8'}}>ETH {eth}%</span>
              <span style={{color:'#fbbf24'}}>BTC {btc}%</span>
              <span style={{color:'#34d399'}}>USDC {usdc}%</span>
            </div>
          </div>
        </div>
        <div className="ts-modal-footer">
          <button className="ts-btn ts-btn-ghost" onClick={onClose}>Cancel</button>
          <button className="ts-btn ts-btn-accent" disabled={!valid} onClick={() => onCreate(name, risk, { ethWeight: eth/100, btcWeight: btc/100, usdcWeight: usdc/100 })}>Create Strategy</button>
        </div>
      </div>
    </div>
  );
};

// ─── Global CSS ──────────────────────────────────────────────────────
const globalCSS = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --bg: #07070c;
    --surface: #0e0e16;
    --surface-2: #13131e;
    --border: #1c1c2e;
    --border-2: #2a2a40;
    --text: #e2e8f0;
    --text-2: #94a3b8;
    --text-3: #64748b;
    --accent: #818cf8;
    --accent-dim: #818cf822;
    --success: #34d399;
    --warning: #fbbf24;
    --danger: #f87171;
    --mono: 'IBM Plex Mono', monospace;
    --sans: 'Instrument Sans', system-ui, sans-serif;
  }

  html { font-size: 15px; }
  body {
    margin: 0; padding: 0;
    background: var(--bg);
    color: var(--text);
    font-family: var(--sans);
    line-height: 1.5;
    -webkit-font-smoothing: antialiased;
    min-height: 100vh;
    /* Subtle scan-line texture */
    background-image:
      repeating-linear-gradient(0deg, transparent, transparent 2px, #ffffff01 2px, #ffffff01 4px);
  }

  /* ── Toast ── */
  .ts-toast {
    position: fixed; top: 20px; left: 50%; transform: translateX(-50%);
    z-index: 9999; padding: 10px 24px; border-radius: 8px;
    font-family: var(--mono); font-size: 13px; font-weight: 500;
    animation: tsSlideDown 0.3s ease;
    backdrop-filter: blur(12px);
  }
  .ts-toast.ok { background: #34d39922; border: 1px solid #34d39944; color: #34d399; }
  .ts-toast.err { background: #f8717122; border: 1px solid #f8717144; color: #f87171; }
  @keyframes tsSlideDown { from { opacity:0; transform: translateX(-50%) translateY(-10px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }

  /* ── Header ── */
  .ts-header {
    position: sticky; top: 0; z-index: 100;
    display: flex; align-items: center; justify-content: space-between;
    padding: 0 28px; height: 60px;
    background: #07070cee;
    backdrop-filter: blur(16px) saturate(1.2);
    border-bottom: 1px solid var(--border);
  }
  .ts-header-left { display: flex; align-items: center; gap: 4px; }
  .ts-logo { font-family: var(--mono); font-weight: 700; font-size: 16px; letter-spacing: -0.5px; color: var(--text); }
  .ts-logo-sub { font-family: var(--mono); font-size: 10px; color: var(--text-3); margin-left: 8px; text-transform: uppercase; letter-spacing: 2px; }
  .ts-header-center { display: flex; align-items: center; gap: 10px; }
  .ts-epoch-badge {
    display: flex; align-items: center; gap: 4px;
    padding: 4px 14px; border-radius: 6px;
    background: var(--surface-2); border: 1px solid var(--border);
    font-family: var(--mono); font-size: 13px;
  }
  .ts-epoch-num { color: var(--accent); font-weight: 700; }
  .ts-epoch-sep { color: var(--text-3); }
  .ts-epoch-total { color: var(--text-3); }
  .ts-phase-tag {
    font-family: var(--mono); font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 1.5px;
    padding: 3px 10px; border-radius: 4px;
  }
  .ts-phase-reporting { background: #818cf822; color: #818cf8; }
  .ts-phase-voting { background: #fbbf2422; color: #fbbf24; }
  .ts-phase-completed { background: #34d39922; color: #34d399; }
  .ts-header-right { display: flex; align-items: center; gap: 10px; }
  .ts-header-actions { display: flex; gap: 6px; }

  /* ── Role Switcher ── */
  .ts-role-switcher {
    display: flex; align-items: center; gap: 8px;
    padding: 4px 12px 4px 10px; border-radius: 6px;
    background: var(--surface-2); border: 1px solid var(--border);
  }
  .ts-role-dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .ts-role-select {
    background: transparent; border: none; color: var(--text);
    font-family: var(--mono); font-size: 12px; cursor: pointer;
    outline: none; appearance: none; padding-right: 16px;
    background-image: url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%2364748b' stroke-width='1.5' stroke-linecap='round'/%3E%3C/svg%3E");
    background-repeat: no-repeat; background-position: right center;
  }
  .ts-role-select option { background: #1a1a2e; color: var(--text); }

  /* ── Buttons ── */
  .ts-btn {
    display: inline-flex; align-items: center; gap: 6px;
    font-family: var(--mono); font-size: 12px; font-weight: 600;
    padding: 6px 14px; border-radius: 6px;
    border: 1px solid transparent; cursor: pointer;
    transition: all 0.15s ease;
    white-space: nowrap;
  }
  .ts-btn:disabled { opacity: 0.4; cursor: not-allowed; }
  .ts-btn-ghost { background: transparent; color: var(--text-2); border-color: var(--border); }
  .ts-btn-ghost:hover:not(:disabled) { background: var(--surface-2); color: var(--text); border-color: var(--border-2); }
  .ts-btn-outline { background: transparent; color: var(--accent); border-color: var(--accent); }
  .ts-btn-outline:hover:not(:disabled) { background: var(--accent-dim); }
  .ts-btn-accent { background: var(--accent); color: #fff; }
  .ts-btn-accent:hover:not(:disabled) { background: #6366f1; filter: brightness(1.15); }
  .ts-btn-danger { background: #dc262622; color: var(--danger); border-color: var(--danger); }
  .ts-btn-danger:hover:not(:disabled) { background: #dc262644; }
  .ts-btn-danger-outline { background: transparent; color: var(--danger); border-color: var(--danger); }
  .ts-btn-danger-outline:hover:not(:disabled) { background: #f8717116; }

  /* ── Main ── */
  .ts-main { max-width: 1200px; margin: 0 auto; padding: 20px 28px 60px; }

  /* ── Privacy Banner ── */
  .ts-privacy-banner {
    display: flex; align-items: center; gap: 10px;
    padding: 10px 18px; margin-bottom: 24px; border-radius: 8px;
    background: var(--surface); border: 1px solid var(--border);
    font-family: var(--mono); font-size: 12px; color: var(--text-2);
  }

  /* ── Sections ── */
  .ts-section { margin-bottom: 32px; }
  .ts-section-header {
    display: flex; align-items: center; justify-content: space-between;
    margin-bottom: 16px;
  }
  .ts-section-header h2 {
    font-family: var(--mono); font-size: 14px; font-weight: 700;
    text-transform: uppercase; letter-spacing: 2px; color: var(--text-2);
  }

  /* ── Strategy Cards ── */
  .ts-cards-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 16px; }
  .ts-card {
    background: var(--surface);
    border: 1px solid var(--border);
    border-radius: 12px; padding: 20px;
    transition: all 0.2s ease;
    position: relative; overflow: hidden;
    box-shadow: 0 0 20px var(--rank-glow, transparent);
  }
  .ts-card::before {
    content: '';
    position: absolute; top: 0; left: 0; right: 0; height: 2px;
    background: linear-gradient(90deg, var(--accent) 0%, transparent 100%);
    opacity: 0.5;
  }
  .ts-card:hover { border-color: var(--border-2); transform: translateY(-2px); }
  .ts-card-eliminated { opacity: 0.55; }
  .ts-card-eliminated::before { background: linear-gradient(90deg, var(--danger) 0%, transparent 100%); }
  .ts-card-top { display: flex; align-items: flex-start; gap: 12px; margin-bottom: 16px; }
  .ts-card-rank { flex-shrink: 0; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center; }
  .ts-medal {
    display: flex; align-items: center; justify-content: center;
    width: 32px; height: 32px; border-radius: 50%;
    font-family: var(--mono); font-weight: 700; font-size: 14px;
  }
  .ts-gold { background: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%); color: #1a1a2e; box-shadow: 0 0 12px #fbbf2444; }
  .ts-silver { background: linear-gradient(135deg, #94a3b8 0%, #64748b 100%); color: #1a1a2e; }
  .ts-bronze { background: linear-gradient(135deg, #a78bfa44 0%, #7c3aed33 100%); color: #a78bfa; border: 1px solid #a78bfa44; }
  .ts-card-name { font-family: var(--sans); font-weight: 700; font-size: 17px; margin-bottom: 4px; }
  .ts-risk-badge {
    font-family: var(--mono); font-size: 10px; font-weight: 600;
    text-transform: uppercase; letter-spacing: 1px;
    padding: 2px 8px; border-radius: 4px;
    border: 1px solid; display: inline-block;
  }
  .ts-card-metrics { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px; }
  .ts-metric { display: flex; flex-direction: column; }
  .ts-metric-label { font-family: var(--mono); font-size: 10px; color: var(--text-3); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 2px; }
  .ts-metric-value { font-family: var(--mono); font-size: 16px; font-weight: 700; }
  .ts-positive { color: var(--success); }
  .ts-negative { color: var(--danger); }

  /* ── Allocations ── */
  .ts-card-alloc {
    padding-top: 14px; border-top: 1px solid var(--border);
  }
  .ts-alloc-label {
    font-family: var(--mono); font-size: 10px; color: var(--text-3);
    text-transform: uppercase; letter-spacing: 1px; display: block; margin-bottom: 8px;
  }
  .ts-alloc-visible {
    display: flex; align-items: center; gap: 8px;
    font-family: var(--mono); font-size: 13px; color: var(--text-2);
    padding: 8px 12px; border-radius: 6px;
    background: #34d39908; border: 1px solid #34d39922;
  }
  .ts-alloc-item b { color: var(--text); margin-left: 3px; }
  .ts-alloc-divider { color: var(--text-3); }
  .ts-alloc-hidden {
    display: flex; align-items: center; gap: 8px;
    padding: 8px 12px; border-radius: 6px;
    background: #f8717108; border: 1px solid #f8717118;
    position: relative; overflow: hidden;
  }
  .ts-redacted {
    font-family: var(--mono); font-size: 14px; letter-spacing: 1px;
    color: #374151;
    filter: blur(3px);
    user-select: none;
  }
  .ts-classified-tag {
    font-family: var(--mono); font-size: 9px; font-weight: 700;
    color: #f87171; letter-spacing: 2px;
    text-transform: uppercase;
    padding: 2px 8px; border-radius: 3px;
    background: #f8717118; border: 1px solid #f8717133;
    margin-left: auto;
  }

  /* ── Chart ── */
  .ts-chart-wrap {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 20px; overflow: hidden;
  }
  .ts-chart-svg { width: 100%; height: auto; display: block; }

  /* ── Governance ── */
  .ts-gov-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
  @media (max-width: 768px) { .ts-gov-grid { grid-template-columns: 1fr; } }
  .ts-gov-panel {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 12px; padding: 20px;
  }
  .ts-gov-info { font-family: var(--mono); font-size: 12px; color: var(--text-3); }
  .ts-vote-title { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--text-2); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
  .ts-vote-form { display: flex; gap: 8px; }
  .ts-tally-title { font-family: var(--mono); font-size: 12px; font-weight: 700; color: var(--text-2); text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
  .ts-tally-bars { display: flex; flex-direction: column; gap: 8px; }
  .ts-tally-row { display: flex; align-items: center; gap: 10px; }
  .ts-tally-name { font-family: var(--mono); font-size: 12px; color: var(--text-2); width: 120px; flex-shrink: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
  .ts-tally-bar-bg { flex: 1; height: 8px; background: var(--surface-2); border-radius: 4px; overflow: hidden; }
  .ts-tally-bar-fill { height: 100%; background: var(--danger); border-radius: 4px; transition: width 0.3s ease; }
  .ts-tally-count { font-family: var(--mono); font-size: 13px; font-weight: 700; color: var(--text); width: 20px; text-align: right; }

  /* ── Form elements ── */
  .ts-select, .ts-input {
    flex: 1;
    padding: 8px 12px; border-radius: 6px;
    background: var(--surface-2); border: 1px solid var(--border);
    color: var(--text); font-family: var(--mono); font-size: 12px;
    outline: none; transition: border-color 0.15s;
  }
  .ts-select:focus, .ts-input:focus { border-color: var(--accent); }
  .ts-select option { background: #1a1a2e; }
  .ts-label { display: block; font-family: var(--mono); font-size: 11px; color: var(--text-3); text-transform: uppercase; letter-spacing: 1px; margin: 14px 0 6px; }
  .ts-range {
    width: 100%; appearance: none; height: 6px; border-radius: 3px;
    background: var(--surface-2); outline: none;
  }
  .ts-range::-webkit-slider-thumb {
    appearance: none; width: 16px; height: 16px; border-radius: 50%;
    background: var(--accent); cursor: pointer; border: 2px solid var(--bg);
  }

  /* ── Table ── */
  .ts-table-wrap { overflow-x: auto; }
  .ts-table {
    width: 100%; border-collapse: collapse;
    font-family: var(--mono); font-size: 13px;
  }
  .ts-table th {
    text-align: left; padding: 10px 16px;
    font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;
    color: var(--text-3); border-bottom: 1px solid var(--border);
    background: var(--surface);
  }
  .ts-table td { padding: 12px 16px; border-bottom: 1px solid var(--border); color: var(--text-2); }
  .ts-table tr:hover td { background: var(--surface-2); }
  .ts-epoch-cell {
    display: inline-flex; align-items: center; justify-content: center;
    width: 28px; height: 28px; border-radius: 6px;
    background: var(--accent-dim); color: var(--accent); font-weight: 700;
  }
  .ts-tally-chip {
    display: inline-block; padding: 2px 8px; margin-right: 6px;
    border-radius: 4px; font-size: 11px;
    background: var(--surface-2); border: 1px solid var(--border);
    color: var(--text-2);
  }
  .ts-empty {
    text-align: center; padding: 40px; color: var(--text-3);
    font-family: var(--mono); font-size: 13px;
    background: var(--surface); border: 1px solid var(--border); border-radius: 12px;
  }

  /* ── Modal ── */
  .ts-modal-overlay {
    position: fixed; inset: 0; z-index: 200;
    background: rgba(0,0,0,0.7); backdrop-filter: blur(8px);
    display: flex; align-items: center; justify-content: center;
    animation: tsFadeIn 0.2s ease;
  }
  .ts-modal {
    background: var(--surface); border: 1px solid var(--border);
    border-radius: 16px; width: 440px; max-width: 90vw;
    animation: tsScaleIn 0.2s ease;
  }
  .ts-modal-header {
    display: flex; align-items: center; justify-content: space-between;
    padding: 18px 24px; border-bottom: 1px solid var(--border);
  }
  .ts-modal-header h3 { font-family: var(--mono); font-size: 14px; font-weight: 700; }
  .ts-modal-close { background: none; border: none; color: var(--text-3); font-size: 24px; cursor: pointer; line-height: 1; }
  .ts-modal-close:hover { color: var(--text); }
  .ts-modal-body { padding: 18px 24px; }
  .ts-modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 14px 24px; border-top: 1px solid var(--border); }
  .ts-usdc-display {
    padding: 8px 12px; border-radius: 6px; font-family: var(--mono); font-size: 16px; font-weight: 700;
    background: var(--surface-2); color: var(--success);
  }
  .ts-alloc-preview { margin-top: 16px; }
  .ts-alloc-bar { display: flex; height: 10px; border-radius: 4px; overflow: hidden; background: var(--surface-2); margin-bottom: 6px; }
  .ts-alloc-bar-labels { display: flex; justify-content: space-between; font-family: var(--mono); font-size: 11px; }

  /* ── Footer ── */
  .ts-footer {
    display: flex; align-items: center; justify-content: center; gap: 12px;
    padding: 30px; margin-top: 20px;
    font-family: var(--mono); font-size: 11px; color: var(--text-3);
    border-top: 1px solid var(--border);
  }
  .ts-footer-dot { width: 3px; height: 3px; border-radius: 50%; background: var(--text-3); }

  @keyframes tsFadeIn { from { opacity: 0; } to { opacity: 1; } }
  @keyframes tsScaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }

  @media (max-width: 768px) {
    .ts-header { flex-wrap: wrap; height: auto; padding: 12px 16px; gap: 8px; }
    .ts-header-center { order: 3; width: 100%; justify-content: center; }
    .ts-cards-grid { grid-template-columns: 1fr; }
    .ts-main { padding: 16px; }
  }
`;

export default App;
