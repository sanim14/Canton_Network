package com.digitalasset.quickstart.service;

import java.util.List;
import java.util.Map;

/**
 * Interface for treasury operations. Allows swapping between
 * standalone (in-memory) and Canton (ledger-backed) implementations.
 */
public interface TreasuryServiceInterface {

    // --- Data models (shared across implementations) ---

    record DAOConfigData(
            String operator, List<String> members, String publicObserver
    ) {}

    record StrategyData(
            String strategyId, String name,
            Map<String, Double> allocations,  // {coinGeckoId: weight} or null if classified
            int epoch, String status, String creatorParty,
            boolean isAllocationsVisible, String contractId
    ) {}

    record PerformanceData(
            String strategyId, String strategyName,
            int epoch, double epochReturn, double cumulativeReturn, double maxDrawdown
    ) {}

    record VoteData(String voter, int epoch, String targetStrategyId, String contractId) {}

    record EliminationData(
            int epoch, String eliminatedStrategyId, String eliminatedStrategyName,
            Map<String, Integer> voteTally, String contractId
    ) {}

    record EpochData(int currentEpoch, int totalEpochs, String phase, String contractId) {}

    // --- DAO Config ---
    DAOConfigData getConfig();

    // --- Party Context ---
    String getCurrentParty();
    boolean isMember();
    boolean isOperator();
    boolean hasActiveStrategy();

    /**
     * Switch the active party context.
     * In standalone mode, this changes the in-memory party.
     * In Canton mode, this is a no-op (party is determined by authentication).
     */
    default void switchParty(String party) {
        // No-op for Canton mode
    }

    // --- Epoch ---
    EpochData getEpochState();
    EpochData advanceEpoch();
    EpochData openVoting();
    EpochData closeVoting();

    // --- Strategies ---
    List<StrategyData> listStrategies();
    StrategyData createStrategy(String name, Map<String, Double> allocations);
    StrategyData updateAllocations(String strategyId, Map<String, Double> allocations);

    // --- Performance ---
    List<PerformanceData> listPerformanceReports();

    // --- Governance ---
    List<VoteData> getVotesForEpoch(int epoch);
    VoteData castVote(String targetStrategyId);
    EliminationData executeElimination();
    List<EliminationData> listEliminations();

    // --- Bootstrap ---
    void bootstrapDAO();
}
