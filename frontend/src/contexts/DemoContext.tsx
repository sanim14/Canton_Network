import React, { createContext, useContext, useState, useCallback } from 'react';
import type { Strategy, PerformanceReport, EpochState, EliminationResult, Vote } from '../types';

interface DemoState {
  epoch: EpochState;
  strategies: Strategy[];
  performance: PerformanceReport[];
  votes: Vote[];
  eliminations: EliminationResult[];
}

interface DemoContextType {
  isDemoMode: boolean;
  enterDemo: () => Promise<void>;
  exitDemo: () => void;
  demoData: DemoState | null;
}

const DemoContext = createContext<DemoContextType | null>(null);

export function useDemo(): DemoContextType {
  const ctx = useContext(DemoContext);
  if (!ctx) throw new Error('useDemo must be used within DemoProvider');
  return ctx;
}

export const DemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDemoMode, setIsDemoMode] = useState(() => localStorage.getItem('treasury_demo') === 'true');
  const [demoData, setDemoData] = useState<DemoState | null>(null);

  const enterDemo = useCallback(async () => {
    try {
      const resp = await fetch('/api/demo/state');
      if (resp.ok) {
        const data = await resp.json();
        setDemoData({
          epoch: data.epoch,
          strategies: data.strategies,
          performance: data.performance,
          votes: data.votes ?? [],
          eliminations: data.eliminations ?? [],
        });
      } else {
        // Fallback: use hardcoded demo data if backend is unreachable
        setDemoData(fallbackDemoData());
      }
    } catch {
      setDemoData(fallbackDemoData());
    }
    setIsDemoMode(true);
    localStorage.setItem('treasury_demo', 'true');
  }, []);

  const exitDemo = useCallback(() => {
    setIsDemoMode(false);
    setDemoData(null);
    localStorage.removeItem('treasury_demo');
  }, []);

  return (
    <DemoContext.Provider value={{ isDemoMode, enterDemo, exitDemo, demoData }}>
      {children}
    </DemoContext.Provider>
  );
};

function fallbackDemoData(): DemoState {
  return {
    epoch: { currentEpoch: 3, totalEpochs: 12, phase: 'Reporting' },
    strategies: [
      { strategyId: 'demo-strat-1', name: 'Balanced Growth', allocations: null, status: 'Active', creatorParty: 'member1', isAllocationsVisible: false },
      { strategyId: 'demo-strat-2', name: 'ETH Maximalist', allocations: null, status: 'Active', creatorParty: 'member2', isAllocationsVisible: false },
      { strategyId: 'demo-strat-3', name: 'Degen Yield', allocations: null, status: 'Eliminated', creatorParty: 'member1', isAllocationsVisible: false },
    ],
    performance: [
      { strategyId: 'demo-strat-1', strategyName: 'Balanced Growth', epoch: 1, epochReturn: 0.0312, cumulativeReturn: 0.0312, maxDrawdown: 0 },
      { strategyId: 'demo-strat-1', strategyName: 'Balanced Growth', epoch: 2, epochReturn: -0.0189, cumulativeReturn: 0.0117, maxDrawdown: 0.0189 },
      { strategyId: 'demo-strat-1', strategyName: 'Balanced Growth', epoch: 3, epochReturn: 0.0425, cumulativeReturn: 0.0547, maxDrawdown: 0.0189 },
      { strategyId: 'demo-strat-2', strategyName: 'ETH Maximalist', epoch: 1, epochReturn: 0.0469, cumulativeReturn: 0.0469, maxDrawdown: 0 },
      { strategyId: 'demo-strat-2', strategyName: 'ETH Maximalist', epoch: 2, epochReturn: -0.0213, cumulativeReturn: 0.0246, maxDrawdown: 0.0213 },
      { strategyId: 'demo-strat-2', strategyName: 'ETH Maximalist', epoch: 3, epochReturn: 0.0538, cumulativeReturn: 0.0797, maxDrawdown: 0.0213 },
      { strategyId: 'demo-strat-3', strategyName: 'Degen Yield', epoch: 1, epochReturn: 0.0156, cumulativeReturn: 0.0156, maxDrawdown: 0 },
      { strategyId: 'demo-strat-3', strategyName: 'Degen Yield', epoch: 2, epochReturn: -0.0342, cumulativeReturn: -0.0191, maxDrawdown: 0.0342 },
    ],
    votes: [
      { voter: 'member1', epoch: 2, targetStrategyId: 'demo-strat-3' },
      { voter: 'member2', epoch: 2, targetStrategyId: 'demo-strat-3' },
    ],
    eliminations: [
      { epoch: 2, eliminatedStrategyId: 'demo-strat-3', eliminatedStrategyName: 'Degen Yield', voteTally: { 'demo-strat-3': 2 } },
    ],
  };
}
