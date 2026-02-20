package com.digitalasset.quickstart.controller;

import com.digitalasset.quickstart.service.CoinGeckoService;
import com.digitalasset.quickstart.service.CoinGeckoService.*;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@CrossOrigin(origins = "*")
public class PriceController {

    private final CoinGeckoService coinGeckoService;

    public PriceController(CoinGeckoService coinGeckoService) {
        this.coinGeckoService = coinGeckoService;
    }

    @GetMapping("/prices/current")
    public ResponseEntity<List<Map<String, Object>>> getCurrentPrices(@RequestParam String coins) {
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
        return ResponseEntity.ok(result);
    }

    @GetMapping("/prices/historical")
    public ResponseEntity<Map<String, List<double[]>>> getHistoricalPrices(
            @RequestParam String coin,
            @RequestParam(defaultValue = "90") int days
    ) {
        Map<String, List<double[]>> prices = coinGeckoService.getHistoricalPrices(coin, days);
        return ResponseEntity.ok(prices);
    }

    @GetMapping("/tokens/search")
    public ResponseEntity<List<Map<String, Object>>> searchTokens(@RequestParam String q) {
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
        return ResponseEntity.ok(result);
    }

    @GetMapping("/tokens/popular")
    public ResponseEntity<List<Map<String, Object>>> getPopularTokens(
            @RequestParam(defaultValue = "20") int limit
    ) {
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
        return ResponseEntity.ok(result);
    }
}
