package com.digitalasset.quickstart.service;

import com.digitalasset.quickstart.utility.PerformanceCalculator;
import com.digitalasset.quickstart.utility.PerformanceCalculator.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Core treasury service managing all state for the DAO treasury sandbox.
 * Uses in-memory state that mirrors Daml contract state.
 * When connected to Canton, this would delegate to the Daml ledger.
 */
@Service
public class TreasuryService {

    private static final Logger logger = LoggerFactory.getLogger(TreasuryService.class);

    // --- Data models ---

    public record DAOConfigData(
            String operator, String strategyManager,
            List<String> voters, String auditor, String publicObserver
    ) {}

    public record StrategyData(
            String strategyId, String name, String riskCategory,
            double ethWeight, double btcWeight, double usdcWeight,
            int epoch, String status, String contractId
    ) {}

    public record PerformanceData(
            String strategyId, String strategyName, String riskCategory,
            int epoch, double epochReturn, double cumulativeReturn, double maxDrawdown
    ) {}

    public record VoteData(String voter, int epoch, String targetStrategyId, String contractId) {}

    public record EliminationData(
            int epoch, String eliminatedStrategyId, String eliminatedStrategyName,
            Map<String, Integer> voteTally, String contractId
    ) {}

    public record EpochData(int currentEpoch, int totalEpochs, String phase, String contractId) {}

    // --- State ---
    private DAOConfigData config;
    private EpochData epochState;
    private final Map<String, StrategyData> strategies = new ConcurrentHashMap<>();
    private final List<PerformanceData> performanceReports = Collections.synchronizedList(new ArrayList<>());
    private final List<VoteData> votes = Collections.synchronizedList(new ArrayList<>());
    private final List<EliminationData> eliminations = Collections.synchronizedList(new ArrayList<>());
    private String currentPartyRole = "publicObserver";

    // Price data loaded from static JSON
    private List<EpochPrices> priceData;

    public TreasuryService() {
        loadPriceData();
    }

    private void loadPriceData() {
        // Hardcoded price data matching priceData.json
        priceData = List.of(
                epochPrices(3200, 3350, 95000, 97500),   // Week 1
                epochPrices(3350, 3280, 97500, 96200),    // Week 2
                epochPrices(3280, 3420, 96200, 99100),    // Week 3
                epochPrices(3420, 3510, 99100, 101200),   // Week 4
                epochPrices(3510, 3380, 101200, 98500),   // Week 5
                epochPrices(3380, 3450, 98500, 100800),   // Week 6
                epochPrices(3450, 3620, 100800, 103500),  // Week 7
                epochPrices(3620, 3550, 103500, 102100),  // Week 8
                epochPrices(3550, 3700, 102100, 105200),  // Week 9
                epochPrices(3700, 3650, 105200, 104000),  // Week 10
                epochPrices(3650, 3820, 104000, 107500),  // Week 11
                epochPrices(3820, 3950, 107500, 110200)   // Week 12
        );
    }

    private EpochPrices epochPrices(double ethOpen, double ethClose, double btcOpen, double btcClose) {
        return new EpochPrices(Map.of(
                "ETH", new PriceData(ethOpen, ethClose),
                "BTC", new PriceData(btcOpen, btcClose),
                "USDC", new PriceData(1.0, 1.0)
        ));
    }

    // --- DAO Config ---

    public DAOConfigData getConfig() {
        return config;
    }

    // --- Party Context ---

    public String getCurrentPartyRole() {
        return currentPartyRole;
    }

    public void switchParty(String role) {
        this.currentPartyRole = role;
        logger.info("Switched party to: {}", role);
    }

    public boolean isStrategyManager() {
        return "strategyManager".equals(currentPartyRole);
    }

    public boolean isVoter() {
        return currentPartyRole.startsWith("voter");
    }

    public boolean isAuditor() {
        return "auditor".equals(currentPartyRole);
    }

    public boolean isOperator() {
        return "operator".equals(currentPartyRole);
    }

    public boolean canSeeAllocations() {
        return isStrategyManager() || isAuditor();
    }

    // --- Epoch ---

    public EpochData getEpochState() {
        return epochState;
    }

    public EpochData advanceEpoch() {
        if (epochState == null) {
            throw new IllegalStateException("Epoch not initialized. Run seed first.");
        }
        if (epochState.currentEpoch >= epochState.totalEpochs) {
            throw new IllegalStateException("Cannot advance past total epochs");
        }

        // Auto-publish performance when advancing
        int newEpoch = epochState.currentEpoch + 1;
        epochState = new EpochData(newEpoch, epochState.totalEpochs, "Reporting", epochState.contractId);

        // Auto-compute and publish performance for all active strategies
        publishPerformanceForEpoch(newEpoch);

        logger.info("Advanced to epoch {}", newEpoch);
        return epochState;
    }

    public EpochData openVoting() {
        if (epochState == null || !"Reporting".equals(epochState.phase)) {
            throw new IllegalStateException("Must be in Reporting phase to open voting");
        }
        epochState = new EpochData(epochState.currentEpoch, epochState.totalEpochs, "Voting", epochState.contractId);
        return epochState;
    }

    public EpochData closeVoting() {
        if (epochState == null || !"Voting".equals(epochState.phase)) {
            throw new IllegalStateException("Must be in Voting phase to close voting");
        }
        epochState = new EpochData(epochState.currentEpoch, epochState.totalEpochs, "Completed", epochState.contractId);
        return epochState;
    }

    // --- Strategies ---

    public List<StrategyData> listStrategies() {
        return new ArrayList<>(strategies.values());
    }

    public StrategyData createStrategy(String name, String riskCategory, double ethWeight, double btcWeight, double usdcWeight) {
        String id = "strat-" + UUID.randomUUID().toString().substring(0, 8);
        int epoch = epochState != null ? epochState.currentEpoch : 0;
        StrategyData strategy = new StrategyData(
                id, name, riskCategory, ethWeight, btcWeight, usdcWeight,
                epoch, "Active", "contract-" + id
        );
        strategies.put(id, strategy);
        logger.info("Created strategy: {} ({})", name, id);
        return strategy;
    }

    public StrategyData updateAllocations(String strategyId, double ethWeight, double btcWeight, double usdcWeight) {
        StrategyData existing = strategies.get(strategyId);
        if (existing == null) {
            throw new NoSuchElementException("Strategy not found: " + strategyId);
        }
        if (!"Active".equals(existing.status)) {
            throw new IllegalStateException("Cannot update eliminated strategy");
        }
        int epoch = epochState != null ? epochState.currentEpoch : 0;
        StrategyData updated = new StrategyData(
                existing.strategyId, existing.name, existing.riskCategory,
                ethWeight, btcWeight, usdcWeight, epoch, existing.status, existing.contractId
        );
        strategies.put(strategyId, updated);
        return updated;
    }

    private void eliminateStrategy(String strategyId) {
        StrategyData existing = strategies.get(strategyId);
        if (existing != null) {
            int epoch = epochState != null ? epochState.currentEpoch : 0;
            strategies.put(strategyId, new StrategyData(
                    existing.strategyId, existing.name, existing.riskCategory,
                    existing.ethWeight, existing.btcWeight, existing.usdcWeight,
                    epoch, "Eliminated", existing.contractId
            ));
        }
    }

    // --- Performance ---

    public List<PerformanceData> listPerformanceReports() {
        return new ArrayList<>(performanceReports);
    }

    private void publishPerformanceForEpoch(int epoch) {
        for (StrategyData strategy : strategies.values()) {
            if (!"Active".equals(strategy.status)) continue;

            Allocation allocation = new Allocation(strategy.ethWeight, strategy.btcWeight, strategy.usdcWeight);
            PerformanceResult result = PerformanceCalculator.calculatePerformance(allocation, priceData, epoch);

            performanceReports.add(new PerformanceData(
                    strategy.strategyId, strategy.name, strategy.riskCategory,
                    epoch, result.epochReturn(), result.cumulativeReturn(), result.maxDrawdown()
            ));
        }
    }

    // --- Governance ---

    public List<VoteData> getVotesForEpoch(int epoch) {
        return votes.stream()
                .filter(v -> v.epoch == epoch)
                .collect(Collectors.toList());
    }

    public VoteData castVote(String targetStrategyId) {
        if (epochState == null || !"Voting".equals(epochState.phase)) {
            throw new IllegalStateException("Voting is not open");
        }
        if (!isVoter()) {
            throw new IllegalStateException("Only voters can cast votes");
        }

        // Check if this voter already voted this epoch
        boolean alreadyVoted = votes.stream()
                .anyMatch(v -> v.epoch == epochState.currentEpoch && v.voter.equals(currentPartyRole));
        if (alreadyVoted) {
            throw new IllegalStateException("Already voted this epoch");
        }

        VoteData vote = new VoteData(
                currentPartyRole, epochState.currentEpoch, targetStrategyId,
                "vote-" + UUID.randomUUID().toString().substring(0, 8)
        );
        votes.add(vote);
        logger.info("Vote cast by {} for elimination of {}", currentPartyRole, targetStrategyId);
        return vote;
    }

    public EliminationData executeElimination() {
        if (epochState == null) {
            throw new IllegalStateException("Epoch not initialized");
        }

        int currentEpoch = epochState.currentEpoch;
        List<VoteData> epochVotes = getVotesForEpoch(currentEpoch);
        if (epochVotes.isEmpty()) {
            throw new IllegalStateException("No votes cast for current epoch");
        }

        // Tally votes
        Map<String, Integer> tally = new HashMap<>();
        for (VoteData vote : epochVotes) {
            tally.merge(vote.targetStrategyId, 1, Integer::sum);
        }

        // Find strategy with most votes
        String eliminatedId = tally.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElseThrow();

        StrategyData eliminated = strategies.get(eliminatedId);
        String eliminatedName = eliminated != null ? eliminated.name : eliminatedId;

        // Execute elimination
        eliminateStrategy(eliminatedId);

        // Close voting
        closeVoting();

        EliminationData result = new EliminationData(
                currentEpoch, eliminatedId, eliminatedName, tally,
                "elim-" + UUID.randomUUID().toString().substring(0, 8)
        );
        eliminations.add(result);
        logger.info("Eliminated strategy: {} (epoch {})", eliminatedName, currentEpoch);
        return result;
    }

    public List<EliminationData> listEliminations() {
        return new ArrayList<>(eliminations);
    }

    // --- Demo Seed ---

    public void seedDemo() {
        // Clear existing state
        strategies.clear();
        performanceReports.clear();
        votes.clear();
        eliminations.clear();

        // Initialize config
        config = new DAOConfigData(
                "operator", "strategyManager",
                List.of("voter1", "voter2", "voter3"),
                "auditor", "publicObserver"
        );

        // Initialize epoch
        epochState = new EpochData(0, 12, "Completed", "epoch-contract-0");

        // Create 3 pre-seeded strategies
        String id1 = "strat-conservative";
        strategies.put(id1, new StrategyData(
                id1, "Blue Chip Hold", "Conservative",
                0.20, 0.20, 0.60, 0, "Active", "contract-" + id1
        ));

        String id2 = "strat-moderate";
        strategies.put(id2, new StrategyData(
                id2, "Momentum Alpha", "Moderate",
                0.40, 0.40, 0.20, 0, "Active", "contract-" + id2
        ));

        String id3 = "strat-aggressive";
        strategies.put(id3, new StrategyData(
                id3, "Degen Yield", "Aggressive",
                0.60, 0.30, 0.10, 0, "Active", "contract-" + id3
        ));

        // Set default party
        currentPartyRole = "publicObserver";

        logger.info("Demo data seeded: 3 strategies, epoch 0, 12 total epochs");
    }
}
