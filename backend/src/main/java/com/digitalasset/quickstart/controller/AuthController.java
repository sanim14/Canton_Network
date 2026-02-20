package com.digitalasset.quickstart.controller;

import com.digitalasset.quickstart.service.TreasuryServiceInterface;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.*;

/**
 * Authentication controller for the Treasury Sandbox.
 * Maps usernames to parties based on DAO configuration.
 * In standalone mode: uses username->party mapping and calls switchParty().
 * In Canton mode: delegates to Spring Security auth.
 */
@RestController
@RequestMapping("/api/auth")
@CrossOrigin(origins = "*")
public class AuthController {

    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);
    private final TreasuryServiceInterface treasury;

    private static final Map<String, String> USERNAME_TO_PARTY = Map.of(
            "alice", "member1",
            "bob", "member2",
            "admin", "operator",
            "guest", "publicObserver"
    );

    private static final Map<String, String> PARTY_ROLES = Map.of(
            "operator", "operator",
            "member1", "member",
            "member2", "member",
            "publicObserver", "observer"
    );

    private static final Map<String, String> PARTY_LABELS = Map.of(
            "operator", "Operator",
            "member1", "Member 1",
            "member2", "Member 2",
            "publicObserver", "Public Observer"
    );

    public AuthController(TreasuryServiceInterface treasury) {
        this.treasury = treasury;
    }

    @PostMapping("/login")
    public ResponseEntity<Map<String, Object>> login(@RequestBody Map<String, String> body) {
        String username = body.get("username");
        if (username == null || username.isBlank()) {
            return ResponseEntity.badRequest().body(Map.of("message", "Username is required"));
        }

        username = username.toLowerCase().trim();
        String partyId = USERNAME_TO_PARTY.getOrDefault(username, "publicObserver");

        treasury.switchParty(partyId);

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("partyId", partyId);
        result.put("role", PARTY_ROLES.getOrDefault(partyId, "observer"));
        result.put("label", PARTY_LABELS.getOrDefault(partyId, partyId));
        result.put("isMember", treasury.isMember());
        result.put("isOperator", treasury.isOperator());
        result.put("hasActiveStrategy", treasury.hasActiveStrategy());

        logger.info("Login: username={} -> party={} role={}", username, partyId,
                PARTY_ROLES.getOrDefault(partyId, "observer"));
        return ResponseEntity.ok(result);
    }

    @GetMapping("/identify")
    public ResponseEntity<Map<String, Object>> identify() {
        try {
            String partyId = treasury.getCurrentParty();
            Map<String, Object> result = new LinkedHashMap<>();
            result.put("partyId", partyId);
            result.put("role", PARTY_ROLES.getOrDefault(partyId, "observer"));
            result.put("label", PARTY_LABELS.getOrDefault(partyId, partyId));
            result.put("isMember", treasury.isMember());
            result.put("isOperator", treasury.isOperator());
            result.put("hasActiveStrategy", treasury.hasActiveStrategy());
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            return ResponseEntity.status(401).body(Map.of("message", "Not authenticated"));
        }
    }

    @GetMapping("/registration-info")
    public ResponseEntity<Map<String, Object>> getRegistrationInfo() {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("sandboxAccounts", List.of(
                Map.of("username", "alice", "role", "Member 1", "description", "DAO strategist — creates and manages treasury strategies"),
                Map.of("username", "bob", "role", "Member 2", "description", "DAO strategist — creates and manages treasury strategies"),
                Map.of("username", "admin", "role", "Operator", "description", "System admin — manages epochs and DAO lifecycle"),
                Map.of("username", "guest", "role", "Public Observer", "description", "View-only — sees performance but not allocations")
        ));
        result.put("roles", List.of(
                Map.of("role", "operator", "capabilities", List.of("Advance epochs", "Open/close voting", "Execute eliminations", "Bootstrap DAO")),
                Map.of("role", "member", "capabilities", List.of("Create strategies (1 active max)", "Update allocations", "Cast elimination votes", "View own allocations")),
                Map.of("role", "observer", "capabilities", List.of("View public performance metrics", "View elimination history", "View vote tallies"))
        ));
        result.put("productionRequirements", List.of(
                "Party provisioned by Canton domain operator",
                "Identity verification through DAO governance",
                "Stake requirements as defined by DAO config",
                "Governance approval from existing members"
        ));
        result.put("cantonDocsUrl", "https://docs.digitalasset.com/build/3.3/quickstart/operate/explore-the-demo.html");
        return ResponseEntity.ok(result);
    }
}
