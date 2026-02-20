import { createContext, useContext } from 'react';
import type { useTreasury } from '../hooks/useTreasury';

export type TreasuryContextType = ReturnType<typeof useTreasury>;

export const TreasuryContext = createContext<TreasuryContextType | null>(null);

export function useTreasuryContext(): TreasuryContextType {
  const ctx = useContext(TreasuryContext);
  if (!ctx) throw new Error('useTreasuryContext must be used within TreasuryContext.Provider');
  return ctx;
}
