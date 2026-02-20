package com.digitalasset.quickstart.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.Semaphore;
import java.util.concurrent.Executors;
import java.util.concurrent.ScheduledExecutorService;
import java.util.concurrent.TimeUnit;

@Service
public class CoinGeckoService {

    private static final Logger logger = LoggerFactory.getLogger(CoinGeckoService.class);
    private static final String BASE_URL = "https://api.coingecko.com/api/v3";

    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    // Cache: coinId -> {price, timestamp}
    private final Map<String, CachedPrice> priceCache = new ConcurrentHashMap<>();
    private static final long CACHE_TTL_MS = 120_000; // 2 minutes

    // Rate limiter: 25 calls/min for free tier
    private final Semaphore rateLimiter = new Semaphore(25);

    public record CoinInfo(String id, String symbol, String name, String thumb) {}
    public record PriceResult(String coinId, double usdPrice, double usd24hChange) {}

    private record CachedPrice(double price, double change24h, long timestamp) {}

    public CoinGeckoService() {
        this.httpClient = HttpClient.newBuilder()
                .connectTimeout(Duration.ofSeconds(10))
                .build();
        this.objectMapper = new ObjectMapper();

        // Replenish rate limiter every minute
        ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor(r -> {
            Thread t = new Thread(r, "coingecko-rate-limiter");
            t.setDaemon(true);
            return t;
        });
        scheduler.scheduleAtFixedRate(() -> {
            int available = rateLimiter.availablePermits();
            if (available < 25) {
                rateLimiter.release(25 - available);
            }
        }, 60, 60, TimeUnit.SECONDS);
    }

    public int getAvailablePermits() {
        return rateLimiter.availablePermits();
    }

    public List<PriceResult> getCurrentPrices(List<String> coinIds) {
        List<PriceResult> results = new ArrayList<>();
        List<String> uncached = new ArrayList<>();
        long now = System.currentTimeMillis();

        // Check cache first
        for (String id : coinIds) {
            CachedPrice cached = priceCache.get(id);
            if (cached != null && (now - cached.timestamp) < CACHE_TTL_MS) {
                results.add(new PriceResult(id, cached.price, cached.change24h));
            } else {
                uncached.add(id);
            }
        }

        if (!uncached.isEmpty()) {
            try {
                if (!rateLimiter.tryAcquire(5, TimeUnit.SECONDS)) {
                    logger.warn("Rate limit exceeded for CoinGecko API");
                    return results;
                }
                String ids = String.join(",", uncached);
                String url = BASE_URL + "/simple/price?ids=" + ids + "&vs_currencies=usd&include_24hr_change=true";
                String body = fetch(url);
                JsonNode root = objectMapper.readTree(body);

                for (String id : uncached) {
                    JsonNode coin = root.get(id);
                    if (coin != null) {
                        double price = coin.has("usd") ? coin.get("usd").asDouble() : 0;
                        double change = coin.has("usd_24h_change") ? coin.get("usd_24h_change").asDouble() : 0;
                        priceCache.put(id, new CachedPrice(price, change, now));
                        results.add(new PriceResult(id, price, change));
                    }
                }
            } catch (Exception e) {
                logger.error("Failed to fetch prices from CoinGecko", e);
            }
        }

        return results;
    }

    public List<CoinInfo> searchCoins(String query) {
        try {
            if (!rateLimiter.tryAcquire(5, TimeUnit.SECONDS)) {
                return List.of();
            }
            String url = BASE_URL + "/search?query=" + java.net.URLEncoder.encode(query, "UTF-8");
            String body = fetch(url);
            JsonNode root = objectMapper.readTree(body);
            JsonNode coins = root.get("coins");
            if (coins == null) return List.of();

            List<CoinInfo> results = new ArrayList<>();
            for (int i = 0; i < Math.min(coins.size(), 10); i++) {
                JsonNode c = coins.get(i);
                results.add(new CoinInfo(
                        c.get("id").asText(),
                        c.get("symbol").asText(),
                        c.get("name").asText(),
                        c.has("thumb") ? c.get("thumb").asText() : null
                ));
            }
            return results;
        } catch (Exception e) {
            logger.error("Failed to search coins", e);
            return List.of();
        }
    }

    public List<CoinInfo> getTopTokens(int limit) {
        try {
            if (!rateLimiter.tryAcquire(5, TimeUnit.SECONDS)) {
                return List.of();
            }
            String url = BASE_URL + "/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=" + limit + "&page=1";
            String body = fetch(url);
            JsonNode root = objectMapper.readTree(body);

            List<CoinInfo> results = new ArrayList<>();
            for (JsonNode c : root) {
                results.add(new CoinInfo(
                        c.get("id").asText(),
                        c.get("symbol").asText(),
                        c.get("name").asText(),
                        c.has("image") ? c.get("image").asText() : null
                ));
            }
            return results;
        } catch (Exception e) {
            logger.error("Failed to fetch top tokens", e);
            return List.of();
        }
    }

    public Map<String, List<double[]>> getHistoricalPrices(String coinId, int days) {
        try {
            if (!rateLimiter.tryAcquire(5, TimeUnit.SECONDS)) {
                return Map.of();
            }
            String url = BASE_URL + "/coins/" + coinId + "/ohlc?vs_currency=usd&days=" + days;
            String body = fetch(url);
            JsonNode root = objectMapper.readTree(body);

            List<double[]> ohlc = new ArrayList<>();
            for (JsonNode point : root) {
                // [timestamp, open, high, low, close]
                ohlc.add(new double[]{
                        point.get(0).asDouble(),
                        point.get(1).asDouble(),
                        point.get(2).asDouble(),
                        point.get(3).asDouble(),
                        point.get(4).asDouble()
                });
            }
            return Map.of(coinId, ohlc);
        } catch (Exception e) {
            logger.error("Failed to fetch historical prices for {}", coinId, e);
            return Map.of();
        }
    }

    private String fetch(String url) throws Exception {
        HttpRequest request = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .timeout(Duration.ofSeconds(10))
                .header("Accept", "application/json")
                .GET()
                .build();
        HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
        if (response.statusCode() != 200) {
            throw new RuntimeException("CoinGecko API returned " + response.statusCode());
        }
        return response.body();
    }
}
