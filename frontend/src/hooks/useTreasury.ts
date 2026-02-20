import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { api } from '../services/api';
import type {
  PartyInfo, EpochState, Strategy, PerformanceReport,
  Vote, EliminationResult,
} from '../types';
import { PARTY_META } from '../types';

export function useTreasury() {
  const [party, setParty] = useState<PartyInfo | null>(null);
  const [epoch, setEpoch] = useState<EpochState | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [performance, setPerformance] = useState<PerformanceReport[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [eliminations, setEliminations] = useState<EliminationResult[]>([]);
  const [mode, setMode] = useState<'standalone' | 'canton'>('standalone');
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ msg: string; type: 'ok' | 'err' } | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();

  const flash = useCallback((msg: string, type: 'ok' | 'err' = 'ok') => {
    setToast({ msg, type });
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 3000);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const [p, e, s, perf, elim] = await Promise.all([
        api.get('/current-party'),
        api.get('/epoch'),
        api.get('/strategies'),
        api.get('/performance'),
        api.get('/eliminations'),
      ]);
      setParty(p);
      if (!e.message) setEpoch(e); // Skip if "Not initialized"
      setStrategies(s);
      setPerformance(perf);
      setEliminations(elim);
      if (e?.currentEpoch) {
        const v = await api.get(`/votes/${e.currentEpoch}`);
        setVotes(v);
      }
    } catch (err) {
      console.error('Refresh failed:', err);
    }
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const m = await api.get('/mode');
        setMode(m.mode === 'canton' ? 'canton' : 'standalone');
      } catch { /* default standalone */ }
      await refresh();
      setLoading(false);
    })();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const bootstrap = useCallback(async () => {
    try {
      await api.post('/bootstrap');
      await refresh();
      flash('DAO bootstrapped');
    } catch {
      flash('Failed to bootstrap DAO', 'err');
    }
  }, [refresh, flash]);

  const advanceEpoch = useCallback(async () => {
    try {
      await api.post('/epoch/advance');
      await refresh();
      flash('Epoch advanced');
    } catch {
      flash('Cannot advance epoch', 'err');
    }
  }, [refresh, flash]);

  const openVoting = useCallback(async () => {
    try {
      await api.post('/epoch/open-voting');
      await refresh();
      flash('Voting opened');
    } catch {
      flash('Cannot open voting', 'err');
    }
  }, [refresh, flash]);

  const executeElim = useCallback(async () => {
    try {
      await api.post('/elimination/execute');
      await refresh();
      flash('Elimination executed');
    } catch {
      flash('Cannot execute elimination', 'err');
    }
  }, [refresh, flash]);

  const castVote = useCallback(async (targetId: string) => {
    try {
      await api.post('/votes', { targetStrategyId: targetId });
      await refresh();
      flash('Vote cast');
    } catch {
      flash('Cannot cast vote', 'err');
    }
  }, [refresh, flash]);

  const createStrategy = useCallback(async (name: string, alloc: Record<string, number>) => {
    try {
      await api.post('/strategies', { name, allocations: alloc });
      await refresh();
      flash('Strategy created');
      return true;
    } catch {
      flash('Failed to create strategy', 'err');
      return false;
    }
  }, [refresh, flash]);

  const partyId = party?.partyId ?? 'publicObserver';
  const isMember = party?.isMember === true || partyId === 'member1' || partyId === 'member2';
  const isOperator = party?.isOperator === true || partyId === 'operator';
  const hasActiveStrategy = party?.hasActiveStrategy === true;
  const partyLabel = PARTY_META[partyId]?.label ?? partyId;
  const partyColor = PARTY_META[partyId]?.color ?? '#94a3b8';

  const latestPerf = useMemo(() => {
    const map: Record<string, PerformanceReport> = {};
    for (const p of performance) {
      if (!map[p.strategyId] || p.epoch > map[p.strategyId].epoch) map[p.strategyId] = p;
    }
    return map;
  }, [performance]);

  const rankedStrategies = useMemo(() =>
    [...strategies].sort((a, b) => {
      const pa = latestPerf[a.strategyId]?.cumulativeReturn ?? -Infinity;
      const pb = latestPerf[b.strategyId]?.cumulativeReturn ?? -Infinity;
      return pb - pa;
    }),
  [strategies, latestPerf]);

  const voteTally = useMemo(() => {
    const t: Record<string, number> = {};
    for (const v of votes) t[v.targetStrategyId] = (t[v.targetStrategyId] ?? 0) + 1;
    return t;
  }, [votes]);

  return {
    party, epoch, strategies, performance, votes, eliminations,
    loading, toast, partyId, partyLabel, partyColor,
    isMember, isOperator, hasActiveStrategy,
    latestPerf, rankedStrategies, voteTally, mode,
    bootstrap, advanceEpoch, openVoting, executeElim, castVote, createStrategy,
    flash, refresh,
  };
}
