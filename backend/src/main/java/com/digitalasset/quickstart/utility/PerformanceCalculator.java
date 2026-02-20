package com.digitalasset.quickstart.utility;

import java.util.*;

/**
 * Deterministic performance calculation from price data and allocation weights.
 */
public class PerformanceCalculator {

    public record PriceData(double open, double close) {}
    public record EpochPrices(Map<String, PriceData> prices) {}
    public record Allocation(double ethWeight, double btcWeight, double usdcWeight) {}

    public record PerformanceResult(
            double epochReturn,
            double cumulativeReturn,
            double maxDrawdown
    ) {}

    /**
     * Calculate epoch return: sum(allocation_weight_i * (close_i - open_i) / open_i)
     */
    public static double calculateEpochReturn(Allocation allocation, EpochPrices prices) {
        double ethReturn = prices.prices().containsKey("ETH")
                ? (prices.prices().get("ETH").close() - prices.prices().get("ETH").open()) / prices.prices().get("ETH").open()
                : 0.0;
        double btcReturn = prices.prices().containsKey("BTC")
                ? (prices.prices().get("BTC").close() - prices.prices().get("BTC").open()) / prices.prices().get("BTC").open()
                : 0.0;
        double usdcReturn = prices.prices().containsKey("USDC")
                ? (prices.prices().get("USDC").close() - prices.prices().get("USDC").open()) / prices.prices().get("USDC").open()
                : 0.0;

        return allocation.ethWeight() * ethReturn
                + allocation.btcWeight() * btcReturn
                + allocation.usdcWeight() * usdcReturn;
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
     */
    public static PerformanceResult calculatePerformance(
            Allocation allocation,
            List<EpochPrices> pricesPerEpoch,
            int upToEpoch
    ) {
        List<Double> epochReturns = new ArrayList<>();
        for (int i = 0; i < Math.min(upToEpoch, pricesPerEpoch.size()); i++) {
            epochReturns.add(calculateEpochReturn(allocation, pricesPerEpoch.get(i)));
        }

        double epochReturn = epochReturns.isEmpty() ? 0.0 : epochReturns.get(epochReturns.size() - 1);
        double cumulativeReturn = calculateCumulativeReturn(epochReturns);
        double maxDrawdown = calculateMaxDrawdown(epochReturns);

        return new PerformanceResult(epochReturn, cumulativeReturn, maxDrawdown);
    }
}
