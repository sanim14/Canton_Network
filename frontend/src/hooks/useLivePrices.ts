import { useState, useEffect, useRef, useCallback } from 'react';

interface PriceData {
  usdPrice: number;
  usd24hChange: number;
}

const POLL_INTERVAL = 120_000; // 2 minutes — matches backend cache TTL

export function useLivePrices(coinIds: string[]): Record<string, PriceData> {
  const [prices, setPrices] = useState<Record<string, PriceData>>({});
  const intervalRef = useRef<ReturnType<typeof setInterval>>();

  const fetchPrices = useCallback(async () => {
    if (coinIds.length === 0) return;
    try {
      const resp = await fetch(`/api/prices/current?coins=${coinIds.join(',')}`);
      if (!resp.ok) return;
      const data: Array<{ coinId: string; usdPrice: number; usd24hChange: number }> = await resp.json();
      const map: Record<string, PriceData> = {};
      for (const p of data) {
        map[p.coinId] = { usdPrice: p.usdPrice, usd24hChange: p.usd24hChange };
      }
      setPrices(map);
    } catch {
      // Silently fail — prices are a nice-to-have
    }
  }, [coinIds.join(',')]);

  useEffect(() => {
    fetchPrices();
    intervalRef.current = setInterval(fetchPrices, POLL_INTERVAL);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchPrices]);

  return prices;
}
