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
        String[] profiles = env.getActiveProfiles();
        boolean isCanton = false;
        for (String p : profiles) {
            if ("shared-secret".equals(p) || "oauth2".equals(p) || "canton".equals(p)) {
                isCanton = true;
                break;
            }
        }
        return ResponseEntity.ok(Map.of("mode", isCanton ? "canton" : "standalone"));
    }

    // --- DAO Config ---

    @GetMapping("/config")
    public ResponseEntity<Map<String, Object>> getDAOConfig() {
        DAOConfigData config = treasury.getConfig();
        if (config == null) {
            return ResponseEntity.ok(Map.of("message", "Not initialized. POST /api/bootstrap first."));
        }
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("operator", config.operator());
        result.put("members", config.members());
        result.put("publicObserver", config.publicObserver());
        return ResponseEntity.ok(result);
    }

    // --- Party Context ---

    @GetMapping("/current-party")
    public ResponseEntity<Map<String, String>> getCurrentParty() {
        try {
            String party = treasury.getCurrentParty();
            Map<String, String> result = new LinkedHashMap<>();
            result.put("partyId", party);
            result.put("isMember", String.valueOf(treasury.isMember()));
            result.put("isOperator", String.valueOf(treasury.isOperator()));
            result.put("hasActiveStrategy", String.valueOf(treasury.hasActiveStrategy()));
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(Map.of("message", "Not authenticated"));
        }
    }

    // --- Party Switch (standalone mode) ---

    @PostMapping("/party/switch")
    public ResponseEntity<Map<String, Object>> switchParty(@RequestBody Map<String, String> body) {
        String party = body.get("party");
        if (party == null || party.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Missing 'party' field"));
        }
        Set<String> validParties = Set.of("operator", "member1", "member2", "publicObserver");
        if (!validParties.contains(party)) {
            return ResponseEntity.badRequest().body(Map.of("message", "Invalid party: " + party));
        }
        treasury.switchParty(party);
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("partyId", party);
        result.put("isMember", treasury.isMember());
        result.put("isOperator", treasury.isOperator());
        result.put("hasActiveStrategy", treasury.hasActiveStrategy());
        return ResponseEntity.ok(result);
    }

    // --- Bootstrap ---

    @PostMapping("/bootstrap")
    public ResponseEntity<Map<String, Object>> bootstrapDAO() {
        try {
            treasury.bootstrapDAO();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("message", "DAO bootstrapped successfully");
            result.put("config", treasury.getConfig());
            result.put("epoch", treasury.getEpochState());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
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
        List<Map<String, Object>> result = treasury.listStrategies().stream()
                .map(this::strategyToMap)
                .collect(Collectors.toList());
        return ResponseEntity.ok(result);
    }

    @PostMapping("/strategies")
    public ResponseEntity<?> createStrategy(@RequestBody Map<String, Object> body) {
        try {
            String name = (String) body.get("name");
            @SuppressWarnings("unchecked")
            Map<String, Object> rawAlloc = (Map<String, Object>) body.get("allocations");
            Map<String, Double> allocations = new LinkedHashMap<>();
            for (Map.Entry<String, Object> entry : rawAlloc.entrySet()) {
                allocations.put(entry.getKey(), ((Number) entry.getValue()).doubleValue());
            }

            StrategyData strategy = treasury.createStrategy(name, allocations);
            return ResponseEntity.status(HttpStatus.CREATED).body(strategyToMap(strategy));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of("message", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage()));
        }
    }

    @PutMapping("/strategies/{strategyId}/allocations")
    public ResponseEntity<?> updateAllocations(
            @PathVariable String strategyId,
            @RequestBody Map<String, Object> body
    ) {
        try {
            @SuppressWarnings("unchecked")
            Map<String, Object> rawAlloc = (Map<String, Object>) body.get("allocations");
            Map<String, Double> allocations = new LinkedHashMap<>();
            for (Map.Entry<String, Object> entry : rawAlloc.entrySet()) {
                allocations.put(entry.getKey(), ((Number) entry.getValue()).doubleValue());
            }

            StrategyData strategy = treasury.updateAllocations(strategyId, allocations);
            return ResponseEntity.ok(strategyToMap(strategy));
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
