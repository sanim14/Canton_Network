package com.digitalasset.quickstart.service;

import com.digitalasset.quickstart.ledger.LedgerApi;
import com.digitalasset.quickstart.pqs.Contract;
import com.digitalasset.quickstart.pqs.Pqs;
import com.digitalasset.quickstart.security.AuthenticatedPartyProvider;
import com.digitalasset.quickstart.utility.PerformanceCalculator;
import com.digitalasset.quickstart.utility.PerformanceCalculator.*;
import com.digitalasset.transcode.java.ContractId;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Service;

import treasury.strategy.ConfidentialStrategy;
import treasury.config.DAOConfig;
import treasury.epoch.EpochState;
import treasury.governance.EliminationVote;
import treasury.governance.EliminationResult;
import treasury.performance.PerformanceReport;
import treasury.types.Allocation;

import java.math.BigDecimal;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;

/**
 * Canton-backed implementation of TreasuryServiceInterface.
 * Delegates to the Daml ledger via LedgerApi (write) and PQS (read).
 *
 * Privacy enforcement: ConfidentialStrategy contracts have only creator + operator
 * as stakeholders. When listing strategies, PQS returns all contracts visible to the
 * scribe party. The service filters allocations based on who the requesting party is.
 */
@Service
@ConditionalOnProperty(name = "canton.enabled", havingValue = "true")
public class CantonTreasuryService implements TreasuryServiceInterface {

    private static final Logger logger = LoggerFactory.getLogger(CantonTreasuryService.class);

    private final LedgerApi ledgerApi;
    private final Pqs pqs;
    private final AuthenticatedPartyProvider partyProvider;
    private final CoinGeckoService coinGeckoService;

    // Cache of member party IDs (populated from DAOConfig)
    private volatile List<String> memberParties = List.of();
    private volatile String operatorParty;
    private volatile String publicObserverParty;

    // Static fallback price data for standalone operation
    private final List<EpochPrices> fallbackPriceData;

    @Value("${application.tenants.AppProvider.partyId}")
    private String appProviderPartyId;

    public CantonTreasuryService(
            LedgerApi ledgerApi,
            Pqs pqs,
            AuthenticatedPartyProvider partyProvider,
            CoinGeckoService coinGeckoService
    ) {
        this.ledgerApi = ledgerApi;
        this.pqs = pqs;
        this.partyProvider = partyProvider;
        this.coinGeckoService = coinGeckoService;
        this.fallbackPriceData = loadFallbackPrices();
        logger.info("CantonTreasuryService initialized - Canton ledger mode active");
    }

    private List<EpochPrices> loadFallbackPrices() {
        return List.of(
                new EpochPrices(Map.of("ethereum", new PriceData(3200, 3350), "bitcoin", new PriceData(95000, 97500), "usd-coin", new PriceData(1.0, 1.0))),
                new EpochPrices(Map.of("ethereum", new PriceData(3350, 3280), "bitcoin", new PriceData(97500, 96200), "usd-coin", new PriceData(1.0, 1.0))),
                new EpochPrices(Map.of("ethereum", new PriceData(3280, 3420), "bitcoin", new PriceData(96200, 99100), "usd-coin", new PriceData(1.0, 1.0))),
                new EpochPrices(Map.of("ethereum", new PriceData(3420, 3510), "bitcoin", new PriceData(99100, 101200), "usd-coin", new PriceData(1.0, 1.0))),
                new EpochPrices(Map.of("ethereum", new PriceData(3510, 3380), "bitcoin", new PriceData(101200, 98500), "usd-coin", new PriceData(1.0, 1.0))),
                new EpochPrices(Map.of("ethereum", new PriceData(3380, 3450), "bitcoin", new PriceData(98500, 100800), "usd-coin", new PriceData(1.0, 1.0))),
                new EpochPrices(Map.of("ethereum", new PriceData(3450, 3620), "bitcoin", new PriceData(100800, 103500), "usd-coin", new PriceData(1.0, 1.0))),
                new EpochPrices(Map.of("ethereum", new PriceData(3620, 3550), "bitcoin", new PriceData(103500, 102100), "usd-coin", new PriceData(1.0, 1.0))),
                new EpochPrices(Map.of("ethereum", new PriceData(3550, 3700), "bitcoin", new PriceData(102100, 105200), "usd-coin", new PriceData(1.0, 1.0))),
                new EpochPrices(Map.of("ethereum", new PriceData(3700, 3650), "bitcoin", new PriceData(105200, 104000), "usd-coin", new PriceData(1.0, 1.0))),
                new EpochPrices(Map.of("ethereum", new PriceData(3650, 3820), "bitcoin", new PriceData(104000, 107500), "usd-coin", new PriceData(1.0, 1.0))),
                new EpochPrices(Map.of("ethereum", new PriceData(3820, 3950), "bitcoin", new PriceData(107500, 110200), "usd-coin", new PriceData(1.0, 1.0)))
        );
    }

    // --- Party Context ---

    @Override
    public String getCurrentParty() {
        return partyProvider.getPartyOrFail();
    }

    @Override
    public boolean isMember() {
        String party = getCurrentParty();
        return memberParties.contains(party);
    }

    @Override
    public boolean isOperator() {
        return getCurrentParty().equals(operatorParty);
    }

    @Override
    public boolean hasActiveStrategy() {
        String party = getCurrentParty();
        try {
            List<Contract<ConfidentialStrategy>> strategies = pqs.active(ConfidentialStrategy.class).get();
            return strategies.stream()
                    .anyMatch(c -> c.payload.creator.equals(party) && c.payload.status.toString().equals("Active"));
        } catch (Exception e) {
            logger.error("Failed to check active strategy", e);
            return false;
        }
    }

    // --- DAO Config ---

    @Override
    public DAOConfigData getConfig() {
        try {
            List<Contract<DAOConfig>> configs = pqs.active(DAOConfig.class).get();
            if (configs.isEmpty()) return null;

            DAOConfig config = configs.get(0).payload;
            return new DAOConfigData(
                    config.operator,
                    config.members,
                    config.publicObserver
            );
        } catch (Exception e) {
            logger.error("Failed to get DAO config", e);
            return null;
        }
    }

    // --- Epoch ---

    @Override
    public EpochData getEpochState() {
        try {
            List<Contract<EpochState>> states = pqs.active(EpochState.class).get();
            if (states.isEmpty()) return null;

            Contract<EpochState> contract = states.get(0);
            EpochState state = contract.payload;
            return new EpochData(
                    state.currentEpoch.intValue(),
                    state.totalEpochs.intValue(),
                    state.phase.toString(),
                    contract.contractId.getContractId
            );
        } catch (Exception e) {
            logger.error("Failed to get epoch state", e);
            return null;
        }
    }

    @Override
    public EpochData advanceEpoch() {
        try {
            Contract<EpochState> current = getActiveEpochContract();
            String cmdId = UUID.randomUUID().toString();

            ContractId<EpochState> newCid = ledgerApi.exerciseAndGetResultAs(
                    current.contractId,
                    new EpochState.AdvanceEpoch(),
                    cmdId,
                    List.of(),
                    operatorParty
            ).get();

            // Publish performance for the new epoch
            int newEpoch = current.payload.currentEpoch.intValue() + 1;
            publishPerformanceForEpoch(newEpoch);

            return getEpochState();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to advance epoch: " + e.getMessage(), e);
        }
    }

    @Override
    public EpochData openVoting() {
        try {
            Contract<EpochState> current = getActiveEpochContract();
            String cmdId = UUID.randomUUID().toString();

            ledgerApi.exerciseAndGetResultAs(
                    current.contractId,
                    new EpochState.OpenVoting(),
                    cmdId,
                    List.of(),
                    operatorParty
            ).get();

            return getEpochState();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to open voting: " + e.getMessage(), e);
        }
    }

    @Override
    public EpochData closeVoting() {
        try {
            Contract<EpochState> current = getActiveEpochContract();
            String cmdId = UUID.randomUUID().toString();

            ledgerApi.exerciseAndGetResultAs(
                    current.contractId,
                    new EpochState.CloseVoting(),
                    cmdId,
                    List.of(),
                    operatorParty
            ).get();

            return getEpochState();
        } catch (Exception e) {
            throw new IllegalStateException("Failed to close voting: " + e.getMessage(), e);
        }
    }

    private Contract<EpochState> getActiveEpochContract() throws Exception {
        List<Contract<EpochState>> states = pqs.active(EpochState.class).get();
        if (states.isEmpty()) {
            throw new IllegalStateException("No epoch state found. Bootstrap DAO first.");
        }
        return states.get(0);
    }

    // --- Strategies ---

    @Override
    public List<StrategyData> listStrategies() {
        try {
            String currentParty = getCurrentParty();
            List<Contract<ConfidentialStrategy>> contracts = pqs.active(ConfidentialStrategy.class).get();

            return contracts.stream().map(c -> {
                ConfidentialStrategy s = c.payload;
                boolean canSee = currentParty.equals(s.creator) || currentParty.equals(s.operator);
                Map<String, Double> allocations = canSee ? damlAllocToMap(s.allocations) : null;

                return new StrategyData(
                        s.strategyId,
                        s.name,
                        allocations,
                        s.epoch.intValue(),
                        s.status.toString(),
                        s.creator,
                        canSee,
                        c.contractId.getContractId
                );
            }).collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Failed to list strategies", e);
            return List.of();
        }
    }

    @Override
    public StrategyData createStrategy(String name, Map<String, Double> allocations) {
        String party = getCurrentParty();
        if (!memberParties.contains(party)) {
            throw new IllegalStateException("Only members can create strategies");
        }

        // Check 1-strategy limit
        if (hasActiveStrategy()) {
            throw new IllegalStateException("You already have an active strategy.");
        }

        // Validate allocations sum to 1.0
        double total = allocations.values().stream().mapToDouble(Double::doubleValue).sum();
        if (Math.abs(total - 1.0) > 0.001) {
            throw new IllegalArgumentException("Allocation weights must sum to 1.0, got " + total);
        }

        try {
            String strategyId = "strat-" + UUID.randomUUID().toString().substring(0, 8);
            EpochData epoch = getEpochState();
            int currentEpoch = epoch != null ? epoch.currentEpoch() : 0;

            Allocation damlAlloc = mapToDamlAlloc(allocations);

            ConfidentialStrategy strategy = new ConfidentialStrategy(
                    strategyId,
                    name,
                    damlAlloc,
                    (long) currentEpoch,
                    treasury.types.StrategyStatus.Active.INSTANCE,
                    party,
                    operatorParty
            );

            String cmdId = UUID.randomUUID().toString();
            ledgerApi.createAs(strategy, cmdId, party).get();

            logger.info("Created strategy '{}' ({}) as party {}", name, strategyId, party);
            return new StrategyData(
                    strategyId, name, allocations, currentEpoch,
                    "Active", party, true, "pending"
            );
        } catch (Exception e) {
            throw new IllegalStateException("Failed to create strategy: " + e.getMessage(), e);
        }
    }

    @Override
    public StrategyData updateAllocations(String strategyId, Map<String, Double> allocations) {
        String party = getCurrentParty();

        double total = allocations.values().stream().mapToDouble(Double::doubleValue).sum();
        if (Math.abs(total - 1.0) > 0.001) {
            throw new IllegalArgumentException("Allocation weights must sum to 1.0, got " + total);
        }

        try {
            Contract<ConfidentialStrategy> contract = findStrategyContract(strategyId);
            if (!party.equals(contract.payload.creator)) {
                throw new IllegalStateException("Only the creator can update allocations");
            }

            EpochData epoch = getEpochState();
            int currentEpoch = epoch != null ? epoch.currentEpoch() : 0;

            Allocation damlAlloc = mapToDamlAlloc(allocations);
            ConfidentialStrategy.UpdateAllocations choice = new ConfidentialStrategy.UpdateAllocations(
                    damlAlloc, (long) currentEpoch
            );

            String cmdId = UUID.randomUUID().toString();
            ledgerApi.exerciseAndGetResultAs(
                    contract.contractId, choice, cmdId, List.of(), party
            ).get();

            return new StrategyData(
                    strategyId, contract.payload.name, allocations,
                    currentEpoch, "Active", party, true, "pending"
            );
        } catch (Exception e) {
            throw new IllegalStateException("Failed to update allocations: " + e.getMessage(), e);
        }
    }

    private Contract<ConfidentialStrategy> findStrategyContract(String strategyId) throws Exception {
        List<Contract<ConfidentialStrategy>> contracts = pqs.activeWhere(
                ConfidentialStrategy.class,
                "payload->>'strategyId' = ?", strategyId
        ).get();
        if (contracts.isEmpty()) {
            throw new NoSuchElementException("Strategy not found: " + strategyId);
        }
        return contracts.get(0);
    }

    // --- Performance ---

    @Override
    public List<PerformanceData> listPerformanceReports() {
        try {
            List<Contract<PerformanceReport>> contracts = pqs.active(PerformanceReport.class).get();
            return contracts.stream().map(c -> {
                PerformanceReport p = c.payload;
                return new PerformanceData(
                        p.strategyId,
                        p.strategyName,
                        p.epoch.intValue(),
                        p.epochReturn.doubleValue(),
                        p.cumulativeReturn.doubleValue(),
                        p.maxDrawdown.doubleValue()
                );
            }).collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Failed to list performance reports", e);
            return List.of();
        }
    }

    private void publishPerformanceForEpoch(int epoch) {
        try {
            List<Contract<ConfidentialStrategy>> strategies = pqs.active(ConfidentialStrategy.class).get();

            for (Contract<ConfidentialStrategy> contract : strategies) {
                ConfidentialStrategy s = contract.payload;
                if (!s.status.toString().equals("Active")) continue;

                Map<String, Double> allocations = damlAllocToMap(s.allocations);
                PerformanceResult result = PerformanceCalculator.calculatePerformance(
                        allocations, fallbackPriceData, epoch
                );

                PerformanceReport report = new PerformanceReport(
                        s.strategyId,
                        s.name,
                        (long) epoch,
                        BigDecimal.valueOf(result.epochReturn()),
                        BigDecimal.valueOf(result.cumulativeReturn()),
                        BigDecimal.valueOf(result.maxDrawdown()),
                        operatorParty,
                        memberParties,
                        publicObserverParty
                );

                String cmdId = UUID.randomUUID().toString();
                ledgerApi.createAs(report, cmdId, operatorParty).get();
            }
            logger.info("Published performance reports for epoch {}", epoch);
        } catch (Exception e) {
            logger.error("Failed to publish performance for epoch {}", epoch, e);
        }
    }

    // --- Governance ---

    @Override
    public List<VoteData> getVotesForEpoch(int epoch) {
        try {
            List<Contract<EliminationVote>> contracts = pqs.activeWhere(
                    EliminationVote.class,
                    "payload->>'epoch' = ?", String.valueOf(epoch)
            ).get();
            return contracts.stream().map(c -> {
                EliminationVote v = c.payload;
                return new VoteData(v.voter, v.epoch.intValue(), v.targetStrategyId, c.contractId.getContractId);
            }).collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Failed to get votes for epoch {}", epoch, e);
            return List.of();
        }
    }

    @Override
    public VoteData castVote(String targetStrategyId) {
        String party = getCurrentParty();
        if (!memberParties.contains(party)) {
            throw new IllegalStateException("Only members can cast votes");
        }

        EpochData epoch = getEpochState();
        if (epoch == null || !"Voting".equals(epoch.phase())) {
            throw new IllegalStateException("Voting is not open");
        }

        // Check if already voted this epoch
        List<VoteData> existingVotes = getVotesForEpoch(epoch.currentEpoch());
        boolean alreadyVoted = existingVotes.stream().anyMatch(v -> v.voter().equals(party));
        if (alreadyVoted) {
            throw new IllegalStateException("Already voted this epoch");
        }

        try {
            EliminationVote vote = new EliminationVote(
                    party,
                    (long) epoch.currentEpoch(),
                    targetStrategyId,
                    operatorParty,
                    memberParties,
                    publicObserverParty
            );

            String cmdId = UUID.randomUUID().toString();
            ledgerApi.createAs(vote, cmdId, party).get();

            logger.info("Vote cast by {} for elimination of {}", party, targetStrategyId);
            return new VoteData(party, epoch.currentEpoch(), targetStrategyId, "pending");
        } catch (Exception e) {
            throw new IllegalStateException("Failed to cast vote: " + e.getMessage(), e);
        }
    }

    @Override
    public EliminationData executeElimination() {
        EpochData epoch = getEpochState();
        if (epoch == null) {
            throw new IllegalStateException("DAO not bootstrapped");
        }

        int currentEpoch = epoch.currentEpoch();
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

        try {
            // Archive the strategy
            Contract<ConfidentialStrategy> strategyContract = findStrategyContract(eliminatedId);
            String eliminatedName = strategyContract.payload.name;

            ConfidentialStrategy.ArchiveStrategy archiveChoice = new ConfidentialStrategy.ArchiveStrategy(
                    (long) currentEpoch
            );
            String cmdId1 = UUID.randomUUID().toString();
            ledgerApi.exerciseAndGetResultAs(
                    strategyContract.contractId, archiveChoice, cmdId1, List.of(), operatorParty
            ).get();

            // Create elimination result
            List<com.daml.ledger.api.v2.ValueOuterClass.Value> tallyList = new ArrayList<>();
            EliminationResult result = new EliminationResult(
                    (long) currentEpoch,
                    eliminatedId,
                    eliminatedName,
                    tally.entrySet().stream()
                            .map(e -> new com.digitalasset.transcode.java.Tuple2<>(e.getKey(), (long) e.getValue().intValue()))
                            .collect(Collectors.toList()),
                    operatorParty,
                    memberParties,
                    publicObserverParty
            );

            String cmdId2 = UUID.randomUUID().toString();
            ledgerApi.createAs(result, cmdId2, operatorParty).get();

            // Close voting
            closeVoting();

            logger.info("Eliminated strategy: {} (epoch {})", eliminatedName, currentEpoch);
            return new EliminationData(
                    currentEpoch, eliminatedId, eliminatedName, tally, "pending"
            );
        } catch (Exception e) {
            throw new IllegalStateException("Failed to execute elimination: " + e.getMessage(), e);
        }
    }

    @Override
    public List<EliminationData> listEliminations() {
        try {
            List<Contract<EliminationResult>> contracts = pqs.active(EliminationResult.class).get();
            return contracts.stream().map(c -> {
                EliminationResult r = c.payload;
                Map<String, Integer> tally = r.voteTally.stream()
                        .collect(Collectors.toMap(
                                t -> (String) t._1,
                                t -> ((Number) t._2).intValue()
                        ));
                return new EliminationData(
                        r.epoch.intValue(),
                        r.eliminatedStrategyId,
                        r.eliminatedStrategyName,
                        tally,
                        c.contractId.getContractId
                );
            }).collect(Collectors.toList());
        } catch (Exception e) {
            logger.error("Failed to list eliminations", e);
            return List.of();
        }
    }

    // --- Bootstrap ---

    @Override
    public void bootstrapDAO() {
        try {
            // Check if already bootstrapped
            List<Contract<DAOConfig>> existingConfigs = pqs.active(DAOConfig.class).get();
            if (!existingConfigs.isEmpty()) {
                logger.info("DAO already bootstrapped");
                refreshCachedParties(existingConfigs.get(0).payload);
                return;
            }

            // Resolve party IDs from tenant config — operator is appProvider
            operatorParty = appProviderPartyId;

            // Create DAOConfig
            DAOConfig config = new DAOConfig(
                    operatorParty,
                    memberParties,
                    publicObserverParty
            );

            String cmdId1 = UUID.randomUUID().toString();
            ledgerApi.createAs(config, cmdId1, operatorParty).get();

            // Create initial EpochState
            EpochState epochState = new EpochState(
                    0L, 12L,
                    treasury.types.EpochPhase.Completed.INSTANCE,
                    operatorParty,
                    memberParties,
                    publicObserverParty
            );

            String cmdId2 = UUID.randomUUID().toString();
            ledgerApi.createAs(epochState, cmdId2, operatorParty).get();

            logger.info("DAO bootstrapped: operator={}, members={}, publicObserver={}",
                    operatorParty, memberParties, publicObserverParty);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to bootstrap DAO: " + e.getMessage(), e);
        }
    }

    /**
     * Called during bootstrapDAO and on config reads to cache party IDs.
     */
    private void refreshCachedParties(DAOConfig config) {
        this.operatorParty = config.operator;
        this.memberParties = config.members;
        this.publicObserverParty = config.publicObserver;
    }

    /**
     * Initialize party mappings from tenant configuration on startup.
     * Called from a @PostConstruct or event listener.
     */
    public void initializePartyMappings(String operator, List<String> members, String publicObserver) {
        this.operatorParty = operator;
        this.memberParties = members;
        this.publicObserverParty = publicObserver;
        logger.info("Party mappings initialized: operator={}, members={}, publicObserver={}",
                operator, members, publicObserver);
    }

    // --- Helpers ---

    private Map<String, Double> damlAllocToMap(Allocation alloc) {
        Map<String, Double> map = new LinkedHashMap<>();
        for (var entry : alloc.weights) {
            map.put((String) entry._1, ((BigDecimal) entry._2).doubleValue());
        }
        return map;
    }

    private Allocation mapToDamlAlloc(Map<String, Double> allocations) {
        List<com.digitalasset.transcode.java.Tuple2<String, BigDecimal>> weights = allocations.entrySet().stream()
                .map(e -> new com.digitalasset.transcode.java.Tuple2<>(e.getKey(), BigDecimal.valueOf(e.getValue())))
                .collect(Collectors.toList());
        return new Allocation(weights);
    }
}
