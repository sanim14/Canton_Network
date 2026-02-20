package com.digitalasset.quickstart.config;

import com.digitalasset.quickstart.security.Auth;
import com.digitalasset.quickstart.security.AuthenticatedPartyProvider;
import com.digitalasset.quickstart.security.AuthenticatedUserProvider;
import com.digitalasset.quickstart.security.TokenProvider;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.web.SecurityFilterChain;

import java.util.Optional;

/**
 * Standalone configuration for running without Canton/PostgreSQL.
 * All treasury logic runs in-memory via TreasuryService.
 * No auth required — all endpoints are public.
 */
@Configuration
@EnableWebSecurity
@Profile("standalone")
public class StandaloneConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http.csrf(csrf -> csrf.disable())
            .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
            .authorizeHttpRequests(authorize -> authorize.anyRequest().permitAll());
        return http.build();
    }

    @Bean
    public Auth auth() {
        return Auth.SHARED_SECRET;
    }

    @Bean
    public TokenProvider tokenProvider() {
        return () -> "standalone-token";
    }

    @Bean
    public AuthenticatedPartyProvider authenticatedPartyProvider() {
        return new AuthenticatedPartyProvider() {
            @Override
            public Optional<String> getParty() {
                return Optional.of("standalone-party");
            }
            @Override
            public String getPartyOrFail() {
                return "standalone-party";
            }
        };
    }

    @Bean
    public AuthenticatedUserProvider authenticatedUserProvider() {
        return () -> Optional.empty();
    }
}
