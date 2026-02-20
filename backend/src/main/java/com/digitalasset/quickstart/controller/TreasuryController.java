package com.digitalasset.quickstart.controller;

import com.digitalasset.quickstart.service.TreasuryServiceInterface;
import com.digitalasset.quickstart.service.TreasuryServiceInterface.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * REST controller for the Treasury Sandbox API.
 * Supports both standalone and Canton modes via TreasuryServiceInterface.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class TreasuryController {

    private static final Logger logger = LoggerFactory.getLogger(TreasuryController.class);
    private final TreasuryServiceInterface treasury;
    private final org.springframework.core.env.Environment env;

    public TreasuryController(TreasuryServiceInterface treasury, org.springframework.core.env.Environment env) {
        this.treasury = treasury;
        this.env = env;
    }

    // --- Mode ---

    @GetMapping("/mode")
    public ResponseEntity<Map<String, String>> getMode() {
        long start = System.currentTimeMillis();
        String[] profiles = env.getActiveProfiles();
        boolean isCanton = false;
        for (String p : profiles) {
            if ("shared-secret".equals(p) || "oauth2".equals(p) || "canton".equals(p)) {
                isCanton = true;
                break;
            }
        }
        String mode = isCanton ? "canton" : "standalone";
        logger.info("GET /api/mode -> {} ({}ms)", mode, System.currentTimeMillis() - start);
        return ResponseEntity.ok(Map.of("mode", mode));
    }

    // --- DAO Config ---

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getDAOConfig() {
        long start = System.currentTimeMillis();
        DAOConfigData config = treasury.getConfig();
        if (config == null) {
            logger.info("GET /api/config -> not initialized ({}ms)", System.currentTimeMillis() - start);
            return ResponseEntity.ok(Map.of("message", "Not initialized. POST /api/bootstrap first."));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("operator", config.operator());
        result.put("members", config.members());
        result.put("publicObserver", config.publicObserver());
        logger.info("GET /api/config -> ok ({}ms)", System.currentTimeMillis() - start);
        return ResponseEntity.ok(result);
    }

    // --- Party Context ---

    @GetMapping("/current-party")
    public ResponseEntity<Map<String, String>> getCurrentParty() {
        long start = System.currentTimeMillis();
        try {
            String party = treasury.getCurrentParty();
            Map<String, String> result = new LinkedHashMap<>();
            result.put("partyId", party);
            result.put("isMember", String.valueOf(treasury.isMember()));
            result.put("isOperator", String.valueOf(treasury.isOperator()));
            result.put("hasActiveStrategy", String.valueOf(treasury.hasActiveStrategy()));
            logger.info("GET /api/current-party -> party={} ({}ms)", party, System.currentTimeMillis() - start);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.warn("GET /api/current-party -> unauthorized ({}ms)", System.currentTimeMillis() - start);
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }
    }

    // --- Party Switch (standalone mode) ---

    @PostMapping("/party/switch")
    public ResponseEntity<Map<String, Object>> switchParty(@RequestBody Map<String, String> body) {
        long start = System.currentTimeMillis();
        String party = body.get("party");
        if (party == null || party.isBlank()) {
            logger.warn("POST /api/party/switch -> missing party ({}ms)", System.currentTimeMillis() - start);
            return ResponseEntity.badRequest().body(Map.of("message", "Missing 'party' field"));
        }
        Set<String> validParties = Set.of("operator", "member1", "member2", "publicObserver");
        if (!validParties.contains(party)) {
            logger.warn("POST /api/party/switch -> invalid party={} ({}ms)", party, System.currentTimeMillis() - start);
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid party: " + party));
        }
        treasury.switchParty(party);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("partyId", party);
        result.put("isMember", treasury.isMember());
        result.put("isOperator", treasury.isOperator());
        result.put("hasActiveStrategy", treasury.hasActiveStrategy());
        logger.info("POST /api/party/switch -> party={} ({}ms)", party, System.currentTimeMillis() - start);
        return ResponseEntity.ok(result);
    }

    // --- Bootstrap ---

    @PostMapping("/bootstrap")
    public ResponseEntity<Map<String, Object>> bootstrapDAO() {
        long start = System.currentTimeMillis();
        try {
            treasury.bootstrapDAO();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("message", "DAO bootstrapped successfully");
            result.put("config", treasury.getConfig());
            result.put("epoch", treasury.getEpochState());
            logger.info("POST /api/bootstrap -> success ({}ms)", System.currentTimeMillis() - start);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.warn("POST /api/bootstrap -> failed: {} ({}ms)", e.getMessage(), System.currentTimeMillis() - start);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // --- Epoch ---

    @GetMapping("/epoch")
    public ResponseEntity<Map<String, Object>> getEpochState() {
        long start = System.currentTimeMillis();
        EpochData epoch = treasury.getEpochState();
        if (epoch == null) {
            logger.info("GET /api/epoch -> not initialized ({}ms)", System.currentTimeMillis() - start);
            return ResponseEntity.ok(Map.of("message", "Not initialized"));
        }
        logger.info("GET /api/epoch -> epoch={} phase={} ({}ms)", epoch.currentEpoch(), epoch.phase(), System.currentTimeMillis() - start);
        return ResponseEntity.ok(epochToMap(epoch));
    }

    @PostMapping("/epoch/advance")
    public ResponseEntity<Map<String, Object>> advanceEpoch() {
        long start = System.currentTimeMillis();
        try {
            EpochData epoch = treasury.advanceEpoch();
            logger.info("POST /api/epoch/advance -> epoch={} ({}ms)", epoch.currentEpoch(), System.currentTimeMillis() - start);
            return ResponseEntity.ok(epochToMap(epoch));
        } catch (IllegalStateException e) {
            logger.warn("POST /api/epoch/advance -> failed: {} ({}ms)", e.getMessage(), System.currentTimeMillis() - start);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/epoch/open-voting")
    public ResponseEntity<Map<String, Object>> openVoting() {
        long start = System.currentTimeMillis();
        try {
            EpochData epoch = treasury.openVoting();
            logger.info("POST /api/epoch/open-voting -> epoch={} ({}ms)", epoch.currentEpoch(), System.currentTimeMillis() - start);
            return ResponseEntity.ok(epochToMap(epoch));
        } catch (IllegalStateException e) {
            logger.warn("POST /api/epoch/open-voting -> failed: {} ({}ms)", e.getMessage(), System.currentTimeMillis() - start);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/epoch/close-voting")
    public ResponseEntity<Map<String, Object>> closeVoting() {
        long start = System.currentTimeMillis();
        try {
            EpochData epoch = treasury.closeVoting();
            logger.info("POST /api/epoch/close-voting -> epoch={} ({}ms)", epoch.currentEpoch(), System.currentTimeMillis() - start);
            return ResponseEntity.ok(epochToMap(epoch));
        } catch (IllegalStateException e) {
            logger.warn("POST /api/epoch/close-voting -> failed: {} ({}ms)", e.getMessage(), System.currentTimeMillis() - start);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // --- Strategies ---

    @GetMapping("/strategies")
    public ResponseEntity<List<Map<String, Object>>> listStrategies() {
        long start = System.currentTimeMillis();
        List<Map<String, Object>> result = treasury.listStrategies().stream()
                .map(this::strategyToMap)
                .collect(Collectors.toList());
        logger.info("GET /api/strategies -> {} strategies, party={} ({}ms)", result.size(), treasury.getCurrentParty(), System.currentTimeMillis() - start);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/strategies")
    public ResponseEntity<?> createStrategy(@RequestBody Map<String, Object> body) {
        long start = System.currentTimeMillis();
        try {
            String name = (String) body.get("name");
            @SuppressWarnings("unchecked")
            Map<String, Object> rawAlloc = (Map<String, Object>) body.get("allocations");
            Map<String, Double> allocations = new LinkedHashMap<>();
            for (Map.Entry<String, Object> entry : rawAlloc.entrySet()) {
                allocations.put(entry.getKey(), ((Number) entry.getValue()).doubleValue());
            }

            StrategyData strategy = treasury.createStrategy(name, allocations);
            logger.info("POST /api/strategies -> created '{}' by {} ({}ms)", name, treasury.getCurrentParty(), System.currentTimeMillis() - start);
            return ResponseEntity.status(HttpStatus.CREATED).body(strategyToMap(strategy));
        } catch (IllegalStateException e) {
            logger.warn("POST /api/strategies -> forbidden: {} ({}ms)", e.getMessage(), System.currentTimeMillis() - start);
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            logger.warn("POST /api/strategies -> error: {} ({}ms)", e.getMessage(), System.currentTimeMillis() - start);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/strategies/{strategyId}/allocations")
    public ResponseEntity<?> updateAllocations(
            @PathVariable String strategyId,
            @RequestBody Map<String, Object> body
    ) {
        long start = System.currentTimeMillis();
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> rawAlloc = (Map<String, Object>) body.get("allocations");
            Map<String, Double> allocations = new LinkedHashMap<>();
            for (Map.Entry<String, Object> entry : rawAlloc.entrySet()) {
                allocations.put(entry.getKey(), ((Number) entry.getValue()).doubleValue());
            }

            StrategyData strategy = treasury.updateAllocations(strategyId, allocations);
            logger.info("PUT /api/strategies/{}/allocations -> updated by {} ({}ms)", strategyId, treasury.getCurrentParty(), System.currentTimeMillis() - start);
            return ResponseEntity.ok(strategyToMap(strategy));
        } catch (NoSuchElementException e) {
            logger.warn("PUT /api/strategies/{}/allocations -> not found ({}ms)", strategyId, System.currentTimeMillis() - start);
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            logger.warn("PUT /api/strategies/{}/allocations -> error: {} ({}ms)", strategyId, e.getMessage(), System.currentTimeMillis() - start);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // --- Performance ---

    @GetMapping("/performance")
    public ResponseEntity<List<Map<String, Object>>> listPerformanceReports() {
        long start = System.currentTimeMillis();
        List<Map<String, Object>> result = treasury.listPerformanceReports().stream()
                .map(this::performanceToMap)
                .collect(Collectors.toList());
        logger.info("GET /api/performance -> {} reports ({}ms)", result.size(), System.currentTimeMillis() - start);
        return ResponseEntity.ok(result);
    }

    // --- Governance ---

    @GetMapping("/votes/{epoch}")
    public ResponseEntity<List<Map<String, Object>>> getVotes(@PathVariable int epoch) {
        long start = System.currentTimeMillis();
        List<Map<String, Object>> result = treasury.getVotesForEpoch(epoch).stream()
                .map(this::voteToMap)
                .collect(Collectors.toList());
        logger.info("GET /api/votes/{} -> {} votes ({}ms)", epoch, result.size(), System.currentTimeMillis() - start);
        return ResponseEntity.ok(result);
    }

    @PostMapping("/votes")
    public ResponseEntity<?> castVote(@RequestBody Map<String, String> body) {
        long start = System.currentTimeMillis();
        try {
            String targetStrategyId = body.get("targetStrategyId");
            VoteData vote = treasury.castVote(targetStrategyId);
            logger.info("POST /api/votes -> voter={} target={} ({}ms)", vote.voter(), targetStrategyId, System.currentTimeMillis() - start);
            return ResponseEntity.status(HttpStatus.CREATED).body(voteToMap(vote));
        } catch (IllegalStateException e) {
            logger.warn("POST /api/votes -> failed: {} ({}ms)", e.getMessage(), System.currentTimeMillis() - start);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/elimination/execute")
    public ResponseEntity<?> executeElimination() {
        long start = System.currentTimeMillis();
        try {
            EliminationData result = treasury.executeElimination();
            logger.info("POST /api/elimination/execute -> eliminated '{}' epoch={} ({}ms)", result.eliminatedStrategyName(), result.epoch(), System.currentTimeMillis() - start);
            return ResponseEntity.ok(eliminationToMap(result));
        } catch (IllegalStateException e) {
            logger.warn("POST /api/elimination/execute -> failed: {} ({}ms)", e.getMessage(), System.currentTimeMillis() - start);
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/eliminations")
    public ResponseEntity<List<Map<String, Object>>> listEliminations() {
        long start = System.currentTimeMillis();
        List<Map<String, Object>> result = treasury.listEliminations().stream()
                .map(this::eliminationToMap)
                .collect(Collectors.toList());
        logger.info("GET /api/eliminations -> {} results ({}ms)", result.size(), System.currentTimeMillis() - start);
        return ResponseEntity.ok(result);
    }

    // --- Risk Philosophy ---

    @GetMapping("/risk-philosophy")
    public ResponseEntity<Map<String, Object>> getRiskPhilosophy() {
        long start = System.currentTimeMillis();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("measured", List.of(
                Map.of("metric", "Epoch Return", "definition", "Weighted sum of token price changes within a single epoch"),
                Map.of("metric", "Cumulative Return", "definition", "Compounded product of all epoch returns since strategy creation"),
                Map.of("metric", "Max Drawdown", "definition", "Largest peak-to-trough decline in cumulative return series")
        ));
        result.put("philosophy", List.of(
                Map.of("principle", "Allocations are Private", "rationale", "Prevents front-running and copycat strategies"),
                Map.of("principle", "Performance is Public", "rationale", "Ensures accountability for governance decisions"),
                Map.of("principle", "Democratic Elimination", "rationale", "Prevents capital concentration risk"),
                Map.of("principle", "Strategy Renewal", "rationale", "Encourages adaptation and continuous improvement")
        ));
        logger.info("GET /api/risk-philosophy -> ok ({}ms)", System.currentTimeMillis() - start);
        return ResponseEntity.ok(result);
    }

    // --- Helpers ---

    private Map<String, Object> epochToMap(EpochData epoch) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("currentEpoch", epoch.currentEpoch());
        map.put("totalEpochs", epoch.totalEpochs());
        map.put("phase", epoch.phase());
        map.put("contractId", epoch.contractId());
        return map;
    }

    private Map<String, Object> strategyToMap(StrategyData s) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("strategyId", s.strategyId());
        map.put("name", s.name());
        map.put("status", s.status());
        map.put("creatorParty", s.creatorParty());
        map.put("isAllocationsVisible", s.isAllocationsVisible());
        if (s.isAllocationsVisible() && s.allocations() != null) {
            map.put("allocations", s.allocations());
        } else {
            map.put("allocations", null);
        }
        map.put("contractId", s.contractId());
        return map;
    }

    private Map<String, Object> performanceToMap(PerformanceData p) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("strategyId", p.strategyId());
        map.put("strategyName", p.strategyName());
        map.put("epoch", p.epoch());
        map.put("epochReturn", Math.round(p.epochReturn() * 10000.0) / 10000.0);
        map.put("cumulativeReturn", Math.round(p.cumulativeReturn() * 10000.0) / 10000.0);
        map.put("maxDrawdown", Math.round(p.maxDrawdown() * 10000.0) / 10000.0);
        return map;
    }

    private Map<String, Object> voteToMap(VoteData v) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("voter", v.voter());
        map.put("epoch", v.epoch());
        map.put("targetStrategyId", v.targetStrategyId());
        map.put("contractId", v.contractId());
        return map;
    }

    private Map<String, Object> eliminationToMap(EliminationData e) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("epoch", e.epoch());
        map.put("eliminatedStrategyId", e.eliminatedStrategyId());
        map.put("eliminatedStrategyName", e.eliminatedStrategyName());
        map.put("voteTally", e.voteTally());
        map.put("contractId", e.contractId());
        return map;
    }
}
