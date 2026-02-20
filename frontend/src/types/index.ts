// ─── Types ───────────────────────────────────────────────────────────
export interface PartyInfo {
  partyId: string;
  isMember: boolean;
  isOperator: boolean;
  hasActiveStrategy: boolean;
}

export interface EpochState {
  currentEpoch: number;
  totalEpochs: number;
  phase: string;
  contractId?: string;
}

export interface Strategy {
  strategyId: string;
  name: string;
  allocations: Record<string, number> | null; // {bitcoin: 0.4, ethereum: 0.3} or null if classified
  status: string;
  creatorParty?: string;
  isAllocationsVisible: boolean;
  contractId?: string;
}

export interface PerformanceReport {
  strategyId: string;
  strategyName: string;
  epoch: number;
  epochReturn: number;
  cumulativeReturn: number;
  maxDrawdown: number;
}

export interface Vote {
  voter: string;
  epoch: number;
  targetStrategyId: string;
  contractId?: string;
}

export interface EliminationResult {
  epoch: number;
  eliminatedStrategyId: string;
  eliminatedStrategyName: string;
  voteTally: Record<string, number>;
  contractId?: string;
}

export interface DAOConfig {
  operator: string;
  members: string[];
  publicObserver: string;
}

// ─── Party Definitions ──────────────────────────────────────────────
export const PARTIES = ['operator', 'member1', 'member2', 'publicObserver'] as const;
export type PartyId = typeof PARTIES[number];

export const PARTY_META: Record<string, { label: string; color: string; short: string; description: string }> = {
  operator:        { label: 'Operator',         color: '#a78bfa', short: 'OP', description: 'System admin. Advances epochs, manages DAO lifecycle.' },
  member1:         { label: 'Member 1',         color: '#818cf8', short: 'M1', description: 'DAO member. Creates strategies, votes on eliminations.' },
  member2:         { label: 'Member 2',         color: '#34d399', short: 'M2', description: 'DAO member. Creates strategies, votes on eliminations.' },
  publicObserver:  { label: 'Public Observer',  color: '#94a3b8', short: 'PB', description: 'View-only. Sees performance but not allocations.' },
};

export const STRAT_LINE_COLORS = ['#818cf8', '#34d399', '#f87171', '#fbbf24', '#a78bfa'];
