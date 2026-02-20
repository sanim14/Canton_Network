package com.digitalasset.quickstart.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Demo mode controller for the Treasury Sandbox.
 * Returns pre-built mock data for demonstration purposes.
 *
 * Security notes:
 * - Demo data uses placeholder allocations (never real weights)
 * - Demo mode runs on static data (no Canton ledger interaction)
 * - No sensitive information exposed in demo responses
 */
@RestController
@RequestMapping("/api/demo")
@CrossOrigin(origins = "*")
public class DemoController {

    @GetMapping("/status")
    public ResponseEntity<Map<String, Object>> getDemoStatus() {
        return ResponseEntity.ok(Map.of(
                "available", true,
                "description", "Pre-built demo with 3 epochs, 2 strategies, 1 elimination, and performance reports"
        ));
    }

    @GetMapping("/state")
    public ResponseEntity<Map<String, Object>> getDemoState() {
        Map<String, Object> state = new LinkedHashMap<>();

        // Epoch
        state.put("epoch", Map.of(
                "currentEpoch", 3,
                "totalEpochs", 12,
                "phase", "Reporting"
        ));

        // Strategies (placeholder allocations — not real weights)
        List<Map<String, Object>> strategies = new ArrayList<>();
        strategies.add(buildStrategy("demo-strat-1", "Balanced Growth", "Active", "member1",
                Map.of("bitcoin", 0.40, "ethereum", 0.35, "usd-coin", 0.25)));
        strategies.add(buildStrategy("demo-strat-2", "ETH Maximalist", "Active", "member2",
                Map.of("ethereum", 0.70, "bitcoin", 0.20, "usd-coin", 0.10)));
        strategies.add(buildStrategy("demo-strat-3", "Degen Yield", "Eliminated", "member1",
                Map.of("bitcoin", 0.50, "ethereum", 0.50)));
        state.put("strategies", strategies);

        // Performance reports
        List<Map<String, Object>> performance = new ArrayList<>();
        performance.add(buildPerf("demo-strat-1", "Balanced Growth", 1, 0.0312, 0.0312, 0.0));
        performance.add(buildPerf("demo-strat-1", "Balanced Growth", 2, -0.0189, 0.0117, 0.0189));
        performance.add(buildPerf("demo-strat-1", "Balanced Growth", 3, 0.0425, 0.0547, 0.0189));
        performance.add(buildPerf("demo-strat-2", "ETH Maximalist", 1, 0.0469, 0.0469, 0.0));
        performance.add(buildPerf("demo-strat-2", "ETH Maximalist", 2, -0.0213, 0.0246, 0.0213));
        performance.add(buildPerf("demo-strat-2", "ETH Maximalist", 3, 0.0538, 0.0797, 0.0213));
        performance.add(buildPerf("demo-strat-3", "Degen Yield", 1, 0.0156, 0.0156, 0.0));
        performance.add(buildPerf("demo-strat-3", "Degen Yield", 2, -0.0342, -0.0191, 0.0342));
        state.put("performance", performance);

        // Votes
        state.put("votes", List.of(
                Map.of("voter", "member1", "epoch", 2, "targetStrategyId", "demo-strat-3"),
                Map.of("voter", "member2", "epoch", 2, "targetStrategyId", "demo-strat-3")
        ));

        // Eliminations
        state.put("eliminations", List.of(Map.of(
                "epoch", 2,
                "eliminatedStrategyId", "demo-strat-3",
                "eliminatedStrategyName", "Degen Yield",
                "voteTally", Map.of("demo-strat-3", 2)
        )));

        // Config
        state.put("config", Map.of(
                "operator", "operator",
                "members", List.of("member1", "member2"),
                "publicObserver", "publicObserver"
        ));

        return ResponseEntity.ok(state);
    }

    private Map<String, Object> buildStrategy(String id, String name, String status, String creator,
                                               Map<String, Double> allocations) {
        Map<String, Object> s = new LinkedHashMap<>();
        s.put("strategyId", id);
        s.put("name", name);
        s.put("status", status);
        s.put("creatorParty", creator);
        // Demo mode: allocations shown as classified to emphasize privacy
        s.put("isAllocationsVisible", false);
        s.put("allocations", null);
        return s;
    }

    private Map<String, Object> buildPerf(String stratId, String name, int epoch,
                                           double epochReturn, double cumReturn, double maxDrawdown) {
        Map<String, Object> p = new LinkedHashMap<>();
        p.put("strategyId", stratId);
        p.put("strategyName", name);
        p.put("epoch", epoch);
        p.put("epochReturn", epochReturn);
        p.put("cumulativeReturn", cumReturn);
        p.put("maxDrawdown", maxDrawdown);
        return p;
    }
}
