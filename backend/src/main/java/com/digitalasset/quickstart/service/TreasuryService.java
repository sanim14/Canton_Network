package com.digitalasset.quickstart.service;

import com.digitalasset.quickstart.utility.PerformanceCalculator;
import com.digitalasset.quickstart.utility.PerformanceCalculator.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Service;

import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Standalone treasury service using in-memory state.
 * Mirrors the Daml contract model with the 4-party model:
 * operator, member1, member2, publicObserver.
 */
@Service
@Profile("standalone")
public class TreasuryService implements TreasuryServiceInterface {

    private static final Logger logger = LoggerFactory.getLogger(TreasuryService.class);

    // --- State ---
    private DAOConfigData config;
    private EpochData epochState;
    private final Map<String, StrategyData> strategies = new ConcurrentHashMap<>();
    private final List<PerformanceData> performanceReports = Collections.synchronizedList(new ArrayList<>());
    private final List<VoteData> votes = Collections.synchronizedList(new ArrayList<>());
    private final List<EliminationData> eliminations = Collections.synchronizedList(new ArrayList<>());
    private String currentParty = "publicObserver";

    // Price data loaded from static data
    private List<EpochPrices> priceData;

    public TreasuryService() {
        loadPriceData();
    }

    private void loadPriceData() {
        // Hardcoded price data for standalone mode (ETH, BTC prices by epoch)
        priceData = List.of(
                epochPrices(3200, 3350, 95000, 97500),   // Week 1
                epochPrices(3350, 3280, 97500, 96200),   // Week 2
                epochPrices(3280, 3420, 96200, 99100),   // Week 3
                epochPrices(3420, 3510, 99100, 101200),  // Week 4
                epochPrices(3510, 3380, 101200, 98500),  // Week 5
                epochPrices(3380, 3450, 98500, 100800),  // Week 6
                epochPrices(3450, 3620, 100800, 103500), // Week 7
                epochPrices(3620, 3550, 103500, 102100), // Week 8
                epochPrices(3550, 3700, 102100, 105200), // Week 9
                epochPrices(3700, 3650, 105200, 104000), // Week 10
                epochPrices(3650, 3820, 104000, 107500), // Week 11
                epochPrices(3820, 3950, 107500, 110200)  // Week 12
        );
    }

    private EpochPrices epochPrices(double ethOpen, double ethClose, double btcOpen, double btcClose) {
        return new EpochPrices(Map.of(
                "ethereum", new PriceData(ethOpen, ethClose),
                "bitcoin", new PriceData(btcOpen, btcClose),
                "usd-coin", new PriceData(1.0, 1.0)
        ));
    }

    // --- DAO Config ---

    @Override
    public DAOConfigData getConfig() {
        return config;
    }

    // --- Party Context ---

    @Override
    public String getCurrentParty() {
        return currentParty;
    }

    /**
     * Switch party for standalone mode (simulates multi-tab login).
     */
    @Override
    public void switchParty(String party) {
        this.currentParty = party;
        logger.info("Switched party to: {}", party);
    }

    @Override
    public boolean isMember() {
        return "member1".equals(currentParty) || "member2".equals(currentParty);
    }

    @Override
    public boolean isOperator() {
        return "operator".equals(currentParty);
    }

    @Override
    public boolean hasActiveStrategy() {
        return strategies.values().stream()
                .anyMatch(s -> "Active".equals(s.status()) && currentParty.equals(s.creatorParty()));
    }

    /**
     * Check if the current party can see the allocations of a specific strategy.
     * Only the creator can see their own allocations.
     */
    private boolean canSeeAllocations(String creatorParty) {
        return currentParty.equals(creatorParty);
    }

    // --- Epoch ---

    @Override
    public EpochData getEpochState() {
        return epochState;
    }

    @Override
    public EpochData advanceEpoch() {
        if (epochState == null) {
            throw new IllegalStateException("DAO not bootstrapped. Call bootstrapDAO first.");
        }
        if (epochState.currentEpoch() >= epochState.totalEpochs()) {
            throw new IllegalStateException("Cannot advance past total epochs");
        }

        int newEpoch = epochState.currentEpoch() + 1;
        epochState = new EpochData(newEpoch, epochState.totalEpochs(), "Reporting", epochState.contractId());

        // Auto-compute performance for all active strategies
        publishPerformanceForEpoch(newEpoch);

        logger.info("Advanced to epoch {}", newEpoch);
        return epochState;
    }

    @Override
    public EpochData openVoting() {
        if (epochState == null || !"Reporting".equals(epochState.phase())) {
            throw new IllegalStateException("Must be in Reporting phase to open voting");
        }
        epochState = new EpochData(epochState.currentEpoch(), epochState.totalEpochs(), "Voting", epochState.contractId());
        return epochState;
    }

    @Override
    public EpochData closeVoting() {
        if (epochState == null || !"Voting".equals(epochState.phase())) {
            throw new IllegalStateException("Must be in Voting phase to close voting");
        }
        epochState = new EpochData(epochState.currentEpoch(), epochState.totalEpochs(), "Completed", epochState.contractId());
        return epochState;
    }

    // --- Strategies ---

    @Override
    public List<StrategyData> listStrategies() {
        return strategies.values().stream()
                .map(s -> {
                    boolean canSee = canSeeAllocations(s.creatorParty());
                    if (canSee) {
                        return s;
                    } else {
                        // Hide allocations for strategies not owned by current party
                        return new StrategyData(
                                s.strategyId(), s.name(), null,
                                s.epoch(), s.status(), s.creatorParty(),
                                false, s.contractId()
                        );
                    }
                })
                .collect(Collectors.toList());
    }

    @Override
    public StrategyData createStrategy(String name, Map<String, Double> allocations) {
        if (!isMember()) {
            throw new IllegalStateException("Only members can create strategies");
        }
        if (hasActiveStrategy()) {
            throw new IllegalStateException("You already have an active strategy. Each member can have at most 1 active strategy.");
        }

        // Validate allocations sum to 1.0
        double total = allocations.values().stream().mapToDouble(Double::doubleValue).sum();
        if (Math.abs(total - 1.0) > 0.001) {
            throw new IllegalArgumentException("Allocation weights must sum to 1.0, got " + total);
        }

        String id = "strat-" + UUID.randomUUID().toString().substring(0, 8);
        int epoch = epochState != null ? epochState.currentEpoch() : 0;
        StrategyData strategy = new StrategyData(
                id, name, allocations,
                epoch, "Active", currentParty,
                true, "contract-" + id
        );
        strategies.put(id, strategy);
        logger.info("Created strategy: {} ({}) by {}", name, id, currentParty);
        return strategy;
    }

    @Override
    public StrategyData updateAllocations(String strategyId, Map<String, Double> allocations) {
        StrategyData existing = strategies.get(strategyId);
        if (existing == null) {
            throw new NoSuchElementException("Strategy not found: " + strategyId);
        }
        if (!"Active".equals(existing.status())) {
            throw new IllegalStateException("Cannot update eliminated strategy");
        }
        if (!currentParty.equals(existing.creatorParty())) {
            throw new IllegalStateException("Only the creator can update allocations");
        }

        double total = allocations.values().stream().mapToDouble(Double::doubleValue).sum();
        if (Math.abs(total - 1.0) > 0.001) {
            throw new IllegalArgumentException("Allocation weights must sum to 1.0, got " + total);
        }

        int epoch = epochState != null ? epochState.currentEpoch() : 0;
        StrategyData updated = new StrategyData(
                existing.strategyId(), existing.name(), allocations,
                epoch, existing.status(), existing.creatorParty(),
                true, existing.contractId()
        );
        strategies.put(strategyId, updated);
        return updated;
    }

    private void eliminateStrategy(String strategyId) {
        StrategyData existing = strategies.get(strategyId);
        if (existing != null) {
            int epoch = epochState != null ? epochState.currentEpoch() : 0;
            strategies.put(strategyId, new StrategyData(
                    existing.strategyId(), existing.name(), existing.allocations(),
                    epoch, "Eliminated", existing.creatorParty(),
                    existing.isAllocationsVisible(), existing.contractId()
            ));
        }
    }

    // --- Performance ---

    @Override
    public List<PerformanceData> listPerformanceReports() {
        return new ArrayList<>(performanceReports);
    }

    private void publishPerformanceForEpoch(int epoch) {
        for (StrategyData strategy : strategies.values()) {
            if (!"Active".equals(strategy.status())) continue;
            if (strategy.allocations() == null) continue;

            Map<String, Double> alloc = strategy.allocations();
            PerformanceResult result = PerformanceCalculator.calculatePerformance(alloc, priceData, epoch);

            performanceReports.add(new PerformanceData(
                    strategy.strategyId(), strategy.name(),
                    epoch, result.epochReturn(), result.cumulativeReturn(), result.maxDrawdown()
            ));
        }
    }

    // --- Governance ---

    @Override
    public List<VoteData> getVotesForEpoch(int epoch) {
        return votes.stream()
                .filter(v -> v.epoch() == epoch)
                .collect(Collectors.toList());
    }

    @Override
    public VoteData castVote(String targetStrategyId) {
        if (epochState == null || !"Voting".equals(epochState.phase())) {
            throw new IllegalStateException("Voting is not open");
        }
        if (!isMember()) {
            throw new IllegalStateException("Only members can cast votes");
        }

        // Check if this member already voted this epoch
        boolean alreadyVoted = votes.stream()
                .anyMatch(v -> v.epoch() == epochState.currentEpoch() && v.voter().equals(currentParty));
        if (alreadyVoted) {
            throw new IllegalStateException("Already voted this epoch");
        }

        VoteData vote = new VoteData(
                currentParty, epochState.currentEpoch(), targetStrategyId,
                "vote-" + UUID.randomUUID().toString().substring(0, 8)
        );
        votes.add(vote);
        logger.info("Vote cast by {} for elimination of {}", currentParty, targetStrategyId);
        return vote;
    }

    @Override
    public EliminationData executeElimination() {
        if (epochState == null) {
            throw new IllegalStateException("DAO not bootstrapped");
        }

        int currentEpoch = epochState.currentEpoch();
        List<VoteData> epochVotes = getVotesForEpoch(currentEpoch);
        if (epochVotes.isEmpty()) {
            throw new IllegalStateException("No votes cast for current epoch");
        }

        // Tally votes
        Map<String, Integer> tally = new HashMap<>();
        for (VoteData vote : epochVotes) {
            tally.merge(vote.targetStrategyId(), 1, Integer::sum);
        }

        // Find strategy with most votes
        String eliminatedId = tally.entrySet().stream()
                .max(Map.Entry.comparingByValue())
                .map(Map.Entry::getKey)
                .orElseThrow();

        StrategyData eliminated = strategies.get(eliminatedId);
        String eliminatedName = eliminated != null ? eliminated.name() : eliminatedId;

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

    @Override
    public List<EliminationData> listEliminations() {
        return new ArrayList<>(eliminations);
    }

    // --- Bootstrap ---

    @Override
    public void bootstrapDAO() {
        // Initialize config with 4-party model
        config = new DAOConfigData(
                "operator",
                List.of("member1", "member2"),
                "publicObserver"
        );

        // Initialize epoch
        epochState = new EpochData(0, 12, "Completed", "epoch-contract-0");

        // Clear any existing state
        strategies.clear();
        performanceReports.clear();
        votes.clear();
        eliminations.clear();

        currentParty = "publicObserver";

        logger.info("DAO bootstrapped: 4-party model, epoch 0, 12 total epochs");
    }
}
