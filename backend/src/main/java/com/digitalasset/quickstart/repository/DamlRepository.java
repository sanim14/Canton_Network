// Copyright (c) 2026, Digital Asset (Switzerland) GmbH and/or its affiliates. All rights reserved.
// SPDX-License-Identifier: 0BSD

package com.digitalasset.quickstart.repository;

import com.digitalasset.quickstart.pqs.Pqs;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Repository;

/**
 * Repository for accessing active Daml contracts via PQS.
 * Treasury Sandbox uses in-memory state via TreasuryService for the demo.
 * This stub exists to satisfy framework dependencies.
 */
@Repository
@ConditionalOnProperty(name = "canton.enabled", havingValue = "true", matchIfMissing = false)
public class DamlRepository {

    private final Pqs pqs;

    @Autowired
    public DamlRepository(Pqs pqs) {
        this.pqs = pqs;
    }
}
