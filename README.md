# Confidential Treasury Strategy Sandbox

A privacy-preserving DAO treasury experimentation dApp built on **Canton Network** for the **ETHDenver 2026 Canton L1 Privacy dApp Prize**.

DAOs can test treasury allocation strategies confidentially — allocations remain private while performance metrics and governance votes are selectively visible to different roles.

## The Problem

DAOs face a fundamental tension: they need transparency for governance, but revealing treasury allocation strategies creates front-running risk and competitive disadvantage. Current solutions force an all-or-nothing choice between privacy and accountability.

## Our Solution

Using Canton's **contract-level privacy**, we split each strategy into multiple contracts with different visibility:

| Data | Manager | Voter | Auditor | Public |
|------|---------|-------|---------|--------|
| Allocation weights (ETH/BTC/USDC %) | Visible | **CLASSIFIED** | Visible | **CLASSIFIED** |
| Performance metrics (returns, drawdown) | Visible | Visible | Visible | Visible |
| Votes | Visible | Visible | Visible | Visible |
| Elimination results | Visible | Visible | Visible | Visible |

**Key insight**: Canton privacy is at the CONTRACT level (all-or-nothing per contract). Different visibility requirements are modeled as **separate contracts** with different signatory/observer lists.

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        React Frontend                            │
│  Party Switcher → Strategy Cards → Performance Chart → Voting    │
└────────────────────────────┬────────────────────────────────────┘
                             │ REST API
┌────────────────────────────▼────────────────────────────────────┐
│                   Spring Boot Backend                            │
│  TreasuryController → TreasuryService → PerformanceCalculator    │
└────────────────────────────┬────────────────────────────────────┘
                             │ Ledger API (gRPC) + PQS
┌────────────────────────────▼────────────────────────────────────┐
│                    Canton Network (LocalNet)                      │
│  ConfidentialStrategy | PerformanceReport | EliminationVote      │
│  EpochState | EliminationResult | DAOConfig                      │
└─────────────────────────────────────────────────────────────────┘
```

## Privacy Model — Contract Splitting

```
ConfidentialStrategy          PerformanceReport
├─ signatory: manager         ├─ signatory: manager
├─ observer: auditor          ├─ observer: ALL parties
├─ PRIVATE allocations        └─ PUBLIC metrics only
└─ HIDDEN from voters/public

EliminationVote               EpochState
├─ signatory: voter           ├─ signatory: operator
├─ observer: ALL parties      ├─ observer: ALL parties
└─ PUBLIC votes               └─ PUBLIC epoch tracking
```

## Party Roles (6 total)

| Party | Role | What They See |
|-------|------|--------------|
| `operator` | System Admin | Everything (manages lifecycle) |
| `strategyManager` | Strategy Manager | All data + creates/modifies strategies |
| `voter1-3` | DAO Voters | Performance + votes, NOT allocations |
| `auditor` | Auditor | Everything including allocations |
| `publicObserver` | Public | Performance + votes + eliminations only |

## Quick Start

### Prerequisites
- Docker Desktop with 8GB+ RAM
- Node.js 18+
- Java 21 (for backend)

### Setup

```bash
# Clone and enter project
git clone <repo-url>
cd cn-quickstart/quickstart

# Install Daml SDK
make install-daml-sdk

# Setup (select shared-secret auth)
make setup

# Build everything
make build

# Start all services
make start
```

### Frontend Development (standalone)

The frontend works standalone with the in-memory backend:

```bash
cd frontend
npm install
npm run dev
# Visit http://localhost:5173
```

## Demo Walkthrough (3-4 minutes)

1. **[0:00]** Open dashboard as **Public Observer**. Note the "CLASSIFIED" tags on allocation data.
2. **[0:30]** Switch to **Strategy Manager**. Allocations are now visible! Create a new strategy live.
3. **[1:00]** Click **Advance Epoch** 2-3 times. Watch performance metrics appear on the leaderboard and chart.
4. **[1:30]** Click **Open Voting**. Switch to **DAO Voter 1**. Allocations are hidden again. Cast a vote.
5. **[2:00]** Switch to Voter 2 and 3, cast remaining votes.
6. **[2:30]** Click **Execute Elimination**. Watch the losing strategy get struck through.
7. **[3:00]** Switch to **Auditor**. Verify allocations ARE visible (unlike voter view).
8. **[3:30]** Switch to **Public Observer**. Elimination result visible, but allocations still classified.

## Tech Stack

- **Smart Contracts**: Daml (SDK 3.4.10)
- **Ledger**: Canton Network (LocalNet)
- **Backend**: Java 21 + Spring Boot 3.4
- **Frontend**: React 18 + TypeScript + Vite
- **Privacy**: Canton contract-level privacy with selective disclosure

## Project Structure

```
quickstart/
├── daml/treasury/           # Daml smart contracts
│   └── daml/
│       ├── Treasury/
│       │   ├── Types.daml       # Shared types
│       │   ├── Strategy.daml    # ConfidentialStrategy (private)
│       │   ├── Performance.daml # PerformanceReport (public)
│       │   ├── Governance.daml  # Votes + Eliminations (public)
│       │   ├── Epoch.daml       # Epoch state (public)
│       │   └── Config.daml      # DAO config (public)
│       └── Test/
│           ├── Privacy.daml     # Privacy verification tests
│           └── Workflow.daml    # Full demo workflow
├── backend/                 # Spring Boot API
│   └── src/main/java/.../
│       ├── controller/TreasuryController.java
│       ├── service/TreasuryService.java
│       └── utility/PerformanceCalculator.java
├── frontend/                # React dashboard
│   └── src/
│       ├── App.tsx          # Complete single-page dashboard
│       └── data/priceData.json
├── common/openapi.yaml      # API specification
└── docker/                  # Docker compose setup
```

## Performance Calculation

Returns are computed deterministically from bundled historical price data:

```
epochReturn = Σ(allocation_weight_i × (close_i - open_i) / open_i)
cumulativeReturn = Π(1 + epochReturn_j) - 1
maxDrawdown = max peak-to-trough decline
```

## Pre-seeded Strategies

| Name | Risk | ETH | BTC | USDC |
|------|------|-----|-----|------|
| Blue Chip Hold | Conservative | 20% | 20% | 60% |
| Momentum Alpha | Moderate | 40% | 40% | 20% |
| Degen Yield | Aggressive | 60% | 30% | 10% |

## Daml Privacy Tests

Run `make test` to verify:
- Voters CANNOT query ConfidentialStrategy contracts
- Public CANNOT query ConfidentialStrategy contracts
- Auditor CAN query ConfidentialStrategy contracts
- Manager CAN query ConfidentialStrategy contracts
- Voters CAN query PerformanceReport contracts
- Voters CANNOT exercise UpdateAllocations choice

## License

0BSD
