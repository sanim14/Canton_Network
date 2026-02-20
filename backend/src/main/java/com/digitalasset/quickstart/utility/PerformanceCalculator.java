package com.digitalasset.quickstart.utility;

import java.util.*;

/**
 * Deterministic performance calculation from price data and allocation weights.
 * Supports arbitrary token allocations (not just ETH/BTC/USDC).
 */
public class PerformanceCalculator {

    public record PriceData(double open, double close) {}
    public record EpochPrices(Map<String, PriceData> prices) {}

    public record PerformanceResult(
            double epochReturn,
            double cumulativeReturn,
            double maxDrawdown
    ) {}

    /**
     * Calculate epoch return for dynamic allocations:
     * sum(allocation_weight_i * (close_i - open_i) / open_i)
     */
    public static double calculateEpochReturn(Map<String, Double> allocations, EpochPrices prices) {
        double totalReturn = 0.0;
        for (Map.Entry<String, Double> entry : allocations.entrySet()) {
            String coinId = entry.getKey();
            double weight = entry.getValue();
            PriceData priceData = prices.prices().get(coinId);
            if (priceData != null && priceData.open() != 0) {
                totalReturn += weight * (priceData.close() - priceData.open()) / priceData.open();
            }
            // If no price data for a token, treat as 0% return (stablecoin-like)
        }
        return totalReturn;
    }

    /**
     * Calculate cumulative return: product(1 + epochReturn_j) - 1 for all epochs j
     */
    public static double calculateCumulativeReturn(List<Double> epochReturns) {
        double product = 1.0;
        for (double r : epochReturns) {
            product *= (1.0 + r);
        }
        return product - 1.0;
    }

    /**
     * Calculate max drawdown: maximum peak-to-trough decline in cumulative return series
     */
    public static double calculateMaxDrawdown(List<Double> epochReturns) {
        if (epochReturns.isEmpty()) return 0.0;

        double maxDrawdown = 0.0;
        double peak = 1.0;
        double cumulative = 1.0;

        for (double r : epochReturns) {
            cumulative *= (1.0 + r);
            if (cumulative > peak) {
                peak = cumulative;
            }
            double drawdown = (peak - cumulative) / peak;
            if (drawdown > maxDrawdown) {
                maxDrawdown = drawdown;
            }
        }
        return -maxDrawdown; // Return as negative value
    }

    /**
     * Calculate full performance for a strategy up to a given epoch.
     * Uses dynamic allocations (Map of coinGeckoId -> weight).
     */
    public static PerformanceResult calculatePerformance(
            Map<String, Double> allocations,
            List<EpochPrices> pricesPerEpoch,
            int upToEpoch
    ) {
        List<Double> epochReturns = new ArrayList<>();
        for (int i = 0; i < Math.min(upToEpoch, pricesPerEpoch.size()); i++) {
            epochReturns.add(calculateEpochReturn(allocations, pricesPerEpoch.get(i)));
        }

        double epochReturn = epochReturns.isEmpty() ? 0.0 : epochReturns.get(epochReturns.size() - 1);
        double cumulativeReturn = calculateCumulativeReturn(epochReturns);
        double maxDrawdown = calculateMaxDrawdown(epochReturns);

        return new PerformanceResult(epochReturn, cumulativeReturn, maxDrawdown);
    }
}
