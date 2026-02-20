package com.digitalasset.quickstart.controller;

import com.digitalasset.quickstart.service.CoinGeckoService;
import com.digitalasset.quickstart.service.CoinGeckoService.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PriceController {

    private static final Logger logger = LoggerFactory.getLogger(PriceController.class);
    private final CoinGeckoService coinGeckoService;

    public PriceController(CoinGeckoService coinGeckoService) {
        this.coinGeckoService = coinGeckoService;
    }

    @GetMapping("/prices/current")
    public ResponseEntity<List<Map<String, Object>>> getCurrentPrices(@RequestParam String coins) {
        long start = System.currentTimeMillis();
        List<String> coinIds = Arrays.asList(coins.split(","));
        List<PriceResult> prices = coinGeckoService.getCurrentPrices(coinIds);
        List<Map<String, Object>> result = prices.stream()
                .map(p -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("coinId", p.coinId());
                    m.put("usdPrice", p.usdPrice());
                    m.put("usd24hChange", p.usd24hChange());
                    return m;
                })
                .collect(Collectors.toList());
        int remaining = coinGeckoService.getAvailablePermits();
        logger.info("GET /api/prices/current -> {} coins, {}ms, rateLimit={}", coinIds.size(), System.currentTimeMillis() - start, remaining);
        return ResponseEntity.ok()
                .header("X-RateLimit-Remaining", String.valueOf(remaining))
                .body(result);
    }

    @GetMapping("/prices/historical")
    public ResponseEntity<Map<String, List<double[]>>> getHistoricalPrices(
            @RequestParam String coin,
            @RequestParam(defaultValue = "90") int days
    ) {
        long start = System.currentTimeMillis();
        Map<String, List<double[]>> prices = coinGeckoService.getHistoricalPrices(coin, days);
        logger.info("GET /api/prices/historical -> coin={} days={} ({}ms)", coin, days, System.currentTimeMillis() - start);
        return ResponseEntity.ok(prices);
    }

    @GetMapping("/tokens/search")
    public ResponseEntity<List<Map<String, Object>>> searchTokens(@RequestParam String q) {
        long start = System.currentTimeMillis();
        List<CoinInfo> coins = coinGeckoService.searchCoins(q);
        List<Map<String, Object>> result = coins.stream()
                .map(c -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", c.id());
                    m.put("symbol", c.symbol());
                    m.put("name", c.name());
                    m.put("thumb", c.thumb());
                    return m;
                })
                .collect(Collectors.toList());
        logger.info("GET /api/tokens/search -> q='{}' results={} ({}ms)", q, result.size(), System.currentTimeMillis() - start);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/tokens/popular")
    public ResponseEntity<List<Map<String, Object>>> getPopularTokens(
            @RequestParam(defaultValue = "20") int limit
    ) {
        long start = System.currentTimeMillis();
        List<CoinInfo> coins = coinGeckoService.getTopTokens(Math.min(limit, 50));
        List<Map<String, Object>> result = coins.stream()
                .map(c -> {
                    Map<String, Object> m = new LinkedHashMap<>();
                    m.put("id", c.id());
                    m.put("symbol", c.symbol());
                    m.put("name", c.name());
                    m.put("thumb", c.thumb());
                    return m;
                })
                .collect(Collectors.toList());
        logger.info("GET /api/tokens/popular -> limit={} results={} ({}ms)", limit, result.size(), System.currentTimeMillis() - start);
        return ResponseEntity.ok(result);
    }
}
