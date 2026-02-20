package com.digitalasset.quickstart.controller;

import com.digitalasset.quickstart.service.TreasuryService;
import com.digitalasset.quickstart.service.TreasuryService.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

/**
 * REST controller for the Treasury Sandbox API.
 * Implements all endpoints for strategies, performance, governance, and epoch management.
 */
@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class TreasuryController {

    private static final Logger logger = LoggerFactory.getLogger(TreasuryController.class);
    private final TreasuryService treasury;

    public TreasuryController(TreasuryService treasury) {
        this.treasury = treasury;
    }

    // --- DAO Config ---

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getDAOConfig() {
        DAOConfigData config = treasury.getConfig();
        if (config == null) {
            return ResponseEntity.ok(Map.of("message", "Not initialized. POST /api/demo/seed first."));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("operator", config.operator());
        result.put("strategyManager", config.strategyManager());
        result.put("voters", config.voters());
        result.put("auditor", config.auditor());
        result.put("publicObserver", config.publicObserver());
        return ResponseEntity.ok(result);
    }

    // --- Party Context ---

    @GetMapping("/current-party")
    public ResponseEntity<Map<String, String>> getCurrentParty() {
        String role = treasury.getCurrentPartyRole();
        Map<String, String> result = new LinkedHashMap<>();
        result.put("partyId", role);
        result.put("role", mapRoleToCategory(role));
        result.put("displayName", mapRoleToDisplayName(role));
        return ResponseEntity.ok(result);
    }

    @PostMapping("/party/switch")
    public ResponseEntity<Map<String, String>> switchParty(@RequestBody Map<String, String> body) {
        String role = body.get("role");
        if (role == null || role.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "role is required"));
        }
        Set<String> validRoles = Set.of("operator", "strategyManager", "voter1", "voter2", "voter3", "auditor", "publicObserver");
        if (!validRoles.contains(role)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid role: " + role));
        }
        treasury.switchParty(role);
        return getCurrentParty();
    }

    // --- Epoch ---

    @GetMapping("/epoch")
    public ResponseEntity<Map<String, Object>> getEpochState() {
        EpochData epoch = treasury.getEpochState();
        if (epoch == null) {
            return ResponseEntity.ok(Map.of("message", "Not initialized"));
        }
        return ResponseEntity.ok(epochToMap(epoch));
    }

    @PostMapping("/epoch/advance")
    public ResponseEntity<Map<String, Object>> advanceEpoch() {
        try {
            EpochData epoch = treasury.advanceEpoch();
            return ResponseEntity.ok(epochToMap(epoch));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/epoch/open-voting")
    public ResponseEntity<Map<String, Object>> openVoting() {
        try {
            EpochData epoch = treasury.openVoting();
            return ResponseEntity.ok(epochToMap(epoch));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/epoch/close-voting")
    public ResponseEntity<Map<String, Object>> closeVoting() {
        try {
            EpochData epoch = treasury.closeVoting();
            return ResponseEntity.ok(epochToMap(epoch));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // --- Strategies ---

    @GetMapping("/strategies")
    public ResponseEntity<List<Map<String, Object>>> listStrategies() {
        boolean canSee = treasury.canSeeAllocations();
        List<Map<String, Object>> result = treasury.listStrategies().stream()
                .map(s -> strategyToMap(s, canSee))
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/strategies")
    public ResponseEntity<?> createStrategy(@RequestBody Map<String, Object> body) {
        if (!treasury.isStrategyManager()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only Strategy Manager can create strategies"));
        }
        try {
            String name = (String) body.get("name");
            String riskCategory = (String) body.get("riskCategory");
            @SuppressWarnings("unchecked")
            Map<String, Object> alloc = (Map<String, Object>) body.get("allocations");
            double ethWeight = ((Number) alloc.get("ethWeight")).doubleValue();
            double btcWeight = ((Number) alloc.get("btcWeight")).doubleValue();
            double usdcWeight = ((Number) alloc.get("usdcWeight")).doubleValue();

            StrategyData strategy = treasury.createStrategy(name, riskCategory, ethWeight, btcWeight, usdcWeight);
            return ResponseEntity.status(HttpStatus.CREATED).body(strategyToMap(strategy, true));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/strategies/{strategyId}/allocations")
    public ResponseEntity<?> updateAllocations(
            @PathVariable String strategyId,
            @RequestBody Map<String, Object> body
    ) {
        if (!treasury.isStrategyManager()) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("message", "Only Strategy Manager can update allocations"));
        }
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> alloc = (Map<String, Object>) body.get("allocations");
            double ethWeight = ((Number) alloc.get("ethWeight")).doubleValue();
            double btcWeight = ((Number) alloc.get("btcWeight")).doubleValue();
            double usdcWeight = ((Number) alloc.get("usdcWeight")).doubleValue();

            StrategyData strategy = treasury.updateAllocations(strategyId, ethWeight, btcWeight, usdcWeight);
            return ResponseEntity.ok(strategyToMap(strategy, true));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    // --- Performance ---

    @GetMapping("/performance")
    public ResponseEntity<List<Map<String, Object>>> listPerformanceReports() {
        List<Map<String, Object>> result = treasury.listPerformanceReports().stream()
                .map(this::performanceToMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/performance/publish")
    public ResponseEntity<?> publishPerformance() {
        // Performance is auto-published on epoch advance
        return ResponseEntity.ok(Map.of("message", "Performance is auto-published on epoch advance"));
    }

    // --- Governance ---

    @GetMapping("/votes/{epoch}")
    public ResponseEntity<List<Map<String, Object>>> getVotes(@PathVariable int epoch) {
        List<Map<String, Object>> result = treasury.getVotesForEpoch(epoch).stream()
                .map(this::voteToMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/votes")
    public ResponseEntity<?> castVote(@RequestBody Map<String, String> body) {
        try {
            String targetStrategyId = body.get("targetStrategyId");
            VoteData vote = treasury.castVote(targetStrategyId);
            return ResponseEntity.status(HttpStatus.CREATED).body(voteToMap(vote));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PostMapping("/elimination/execute")
    public ResponseEntity<?> executeElimination() {
        try {
            EliminationData result = treasury.executeElimination();
            return ResponseEntity.ok(eliminationToMap(result));
        } catch (IllegalStateException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @GetMapping("/eliminations")
    public ResponseEntity<List<Map<String, Object>>> listEliminations() {
        List<Map<String, Object>> result = treasury.listEliminations().stream()
                .map(this::eliminationToMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    // --- Demo ---

    @PostMapping("/demo/seed")
    public ResponseEntity<Map<String, Object>> seedDemo() {
        treasury.seedDemo();
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("message", "Demo data seeded successfully");
        result.put("strategiesCreated", 3);
        result.put("epochInitialized", true);
        return ResponseEntity.status(HttpStatus.CREATED).body(result);
    }

    // --- Feature Flags (kept for compatibility) ---

    @GetMapping("/feature-flags")
    public ResponseEntity<Map<String, String>> getFeatureFlags() {
        return ResponseEntity.ok(Map.of("authMode", "shared-secret"));
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

    private Map<String, Object> strategyToMap(StrategyData s, boolean showAllocations) {
        Map<String, Object> map = new LinkedHashMap<>();
        map.put("strategyId", s.strategyId());
        map.put("name", s.name());
        map.put("riskCategory", s.riskCategory());
        map.put("status", s.status());
        map.put("isAllocationsVisible", showAllocations);
        if (showAllocations) {
            Map<String, Object> alloc = new LinkedHashMap<>();
            alloc.put("ethWeight", Math.round(s.ethWeight() * 10000.0) / 10000.0);
            alloc.put("btcWeight", Math.round(s.btcWeight() * 10000.0) / 10000.0);
            alloc.put("usdcWeight", Math.round(s.usdcWeight() * 10000.0) / 10000.0);
            map.put("allocations", alloc);
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
        map.put("riskCategory", p.riskCategory());
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

    private String mapRoleToCategory(String role) {
        if (role.startsWith("voter")) return "voter";
        return role;
    }

    private String mapRoleToDisplayName(String role) {
        return switch (role) {
            case "operator" -> "System Operator";
            case "strategyManager" -> "Strategy Manager";
            case "voter1" -> "DAO Voter 1";
            case "voter2" -> "DAO Voter 2";
            case "voter3" -> "DAO Voter 3";
            case "auditor" -> "Auditor";
            case "publicObserver" -> "Public Observer";
            default -> role;
        };
    }
}
