# Developer Guide — Confidential Treasury Strategy Sandbox

Everything you need to understand, run, modify, and extend this project.

---

## Table of Contents

1. [What Is This?](#what-is-this)
2. [Architecture Overview](#architecture-overview)
3. [The Privacy Model (Read This First)](#the-privacy-model)
4. [Prerequisites](#prerequisites)
5. [Setup & Running](#setup--running)
6. [Project Structure](#project-structure)
7. [Frontend (React)](#frontend-react)
8. [Backend (Spring Boot)](#backend-spring-boot)
9. [Daml Smart Contracts](#daml-smart-contracts)
10. [API Reference](#api-reference)
11. [Testing](#testing)
12. [What's Done vs What Needs Work](#whats-done-vs-what-needs-work)
13. [Common Tasks](#common-tasks)
14. [Troubleshooting](#troubleshooting)

---

## What Is This?

A privacy-preserving DAO treasury experimentation dApp for the **ETHDenver 2026 Canton L1 Privacy dApp Prize** ($8,000 pool).

**The pitch**: DAOs can test treasury allocation strategies (ETH/BTC/USDC splits) where the actual allocations stay private, but performance and governance remain public. Different roles see different data — enforced at the ledger level by Canton Network.

**The demo flow**:
1. 3 pre-seeded strategies compete across 12 epochs of real price data
2. Each epoch computes returns based on secret allocation weights
3. Voters eliminate the worst performer (without knowing the allocations)
4. Auditors can see everything; the public sees only results

---

## Architecture Overview

```
┌──────────────────────────────────────────────────────────────┐
│                    React Frontend (Vite)                       │
│  Party Switcher → Strategy Cards → Performance Chart → Voting │
│  Port 5173 (dev) — single App.tsx file                        │
└──────────────────────┬───────────────────────────────────────┘
                       │ /api/* (Vite proxy → port 8080)
┌──────────────────────▼───────────────────────────────────────┐
│                 Spring Boot Backend                            │
│  TreasuryController.java → TreasuryService.java (in-memory)  │
│  Port 8080                                                    │
└──────────────────────┬───────────────────────────────────────┘
                       │ (future: Ledger API gRPC + PQS)
┌──────────────────────▼───────────────────────────────────────┐
│              Canton Network (LocalNet via Docker)              │
│  Daml contracts: ConfidentialStrategy, PerformanceReport,     │
│  EliminationVote, EpochState, EliminationResult, DAOConfig    │
└──────────────────────────────────────────────────────────────┘
```

**Current state**: The backend runs fully **in-memory** (no Canton/Docker needed). The Daml contracts exist and are correct but aren't wired to the backend yet. The in-memory backend simulates the exact same privacy behavior that Canton would enforce.

---

## The Privacy Model

This is the core concept. Understand this and you understand the whole project.

### The Problem
Canton privacy is **per-contract** — either you can see an entire contract or you can't. There's no field-level privacy.

### The Solution: Contract Splitting
We split each strategy into **multiple contracts** with different observer lists:

```
ConfidentialStrategy (PRIVATE)          PerformanceReport (PUBLIC)
├─ signatory: strategyManager           ├─ signatory: strategyManager
├─ observer: auditor ONLY               ├─ observer: ALL parties
├─ Contains: allocation weights         └─ Contains: returns, drawdown
└─ HIDDEN from voters & public              (no allocation data)
```

### Who Sees What

| Data | Manager | Voter | Auditor | Public |
|------|---------|-------|---------|--------|
| Allocation weights (ETH/BTC/USDC %) | ✅ | ❌ CLASSIFIED | ✅ | ❌ CLASSIFIED |
| Performance metrics (returns, drawdown) | ✅ | ✅ | ✅ | ✅ |
| Votes | ✅ | ✅ | ✅ | ✅ |
| Elimination results | ✅ | ✅ | ✅ | ✅ |

### The 7 Party Roles

| Role | ID | Color | Can See Allocations | Can Create Strategies | Can Vote |
|------|-----|-------|--------------------|-----------------------|----------|
| Operator | `operator` | Purple | ✅ | ❌ | ❌ |
| Strategy Manager | `strategyManager` | Indigo | ✅ | ✅ | ❌ |
| DAO Voter 1 | `voter1` | Green | ❌ | ❌ | ✅ |
| DAO Voter 2 | `voter2` | Green | ❌ | ❌ | ✅ |
| DAO Voter 3 | `voter3` | Green | ❌ | ❌ | ✅ |
| Auditor | `auditor` | Yellow | ✅ | ❌ | ❌ |
| Public Observer | `publicObserver` | Gray | ❌ | ❌ | ❌ |

---

## Prerequisites

| Tool | Version | Check | Install |
|------|---------|-------|---------|
| **Java** | 21+ | `java -version` | `brew install --cask temurin@21` |
| **Node.js** | 18+ | `node -v` | `brew install node` |
| **Docker** | — | `docker --version` | Only needed for Canton/full stack |
| **Daml SDK** | 3.4.10 | `daml version` | Only needed for contract compilation |

**For standalone dev (recommended to start)**: You only need Java 21 and Node.js.

Make sure Java 21 is active:
```bash
export JAVA_HOME=$(/usr/libexec/java_home -v 21)
java -version  # should show 21.x
```

---

## Setup & Running

### Quick Start (Standalone — No Docker/Canton)

```bash
# Clone and enter project
git clone <repo-url>
cd cn-quickstart/quickstart

# Build frontend + backend
make build-frontend build-backend

# Terminal 1: Start backend
SPRING_PROFILES_ACTIVE=standalone ./gradlew :backend:bootRun

# Terminal 2: Start frontend
cd frontend && npm run dev

# Open http://localhost:5173
```

### Run Tests (with backend running)

```bash
# Terminal 3:
bash test-api.sh
# Should show: 56 passed, 0 failed
```

### Full Stack with Canton (advanced — needs Docker + Daml SDK)

```bash
make install-daml-sdk   # install Daml SDK 3.4.10
make setup              # configure auth (choose shared-secret)
make build              # build everything including Daml
make start              # start Docker compose (Canton + backend + frontend)
```

---

## Project Structure

```
quickstart/
├── DEMO.md                          # Demo walkthrough script
├── DEVELOPER.md                     # This file
├── README.md                        # Project overview
├── test-api.sh                      # Integration test script (56 tests)
├── Makefile                         # Build/run commands
│
├── frontend/                        # React 18 + TypeScript + Vite
│   ├── src/
│   │   ├── App.tsx                  # ★ ENTIRE UI — single file, ~2000 lines
│   │   ├── main.tsx                 # Entry point
│   │   ├── data/priceData.json      # 12 weeks ETH/BTC/USDC price data
│   │   ├── openapi.d.ts            # Auto-generated types (don't edit)
│   │   ├── api.ts                   # Empty (fetch used directly in App.tsx)
│   │   └── types.ts                 # Empty (types defined in App.tsx)
│   ├── index.html                   # Loads Google Fonts
│   ├── vite.config.ts               # Dev server + proxy config
│   └── package.json
│
├── backend/                         # Spring Boot 3.4 + Java 21
│   └── src/main/java/com/digitalasset/quickstart/
│       ├── App.java                 # Main entry
│       ├── controller/
│       │   └── TreasuryController.java  # ★ ALL API endpoints
│       ├── service/
│       │   └── TreasuryService.java     # ★ ALL business logic (in-memory)
│       ├── utility/
│       │   └── PerformanceCalculator.java  # Return/drawdown computation
│       ├── config/
│       │   └── StandaloneConfig.java    # Standalone mode (no Canton)
│       ├── ledger/                  # Canton integration (conditional)
│       ├── pqs/                     # PostgreSQL Query Store (conditional)
│       ├── security/                # Auth framework (shared-secret/oauth2)
│       └── repository/              # Daml contract repository (conditional)
│
├── daml/                            # Daml smart contracts
│   ├── treasury/
│   │   ├── daml.yaml                # Package config (SDK 3.4.10)
│   │   └── daml/
│   │       ├── Treasury/
│   │       │   ├── Types.daml       # RiskCategory, Allocation, etc.
│   │       │   ├── Strategy.daml    # ConfidentialStrategy (PRIVATE)
│   │       │   ├── Performance.daml # PerformanceReport (PUBLIC)
│   │       │   ├── Governance.daml  # EliminationVote + Result
│   │       │   ├── Epoch.daml       # EpochState
│   │       │   └── Config.daml      # DAOConfig
│   │       └── Test/
│   │           ├── Privacy.daml     # Privacy verification tests
│   │           └── Workflow.daml    # Full demo workflow test
│   ├── multi-package.yaml           # Daml packages to compile
│   └── build.gradle.kts            # Daml build + Java codegen
│
├── common/
│   └── openapi.yaml                 # API specification
│
└── docker/                          # Docker compose setup
    └── backend-service/
        └── onboarding/
            └── treasury-onboarding.sh  # Party creation script
```

### The 3 Files That Matter Most

1. **`frontend/src/App.tsx`** — The entire UI. All components, styles, state, API calls.
2. **`backend/.../controller/TreasuryController.java`** — All REST endpoints.
3. **`backend/.../service/TreasuryService.java`** — All business logic, in-memory state, privacy rules.

If you're making changes, you're almost certainly editing one of these three files.

---

## Frontend (React)

### Tech Stack
- React 18 + TypeScript
- Vite for dev server and bundling
- No external UI libraries — pure CSS embedded in App.tsx
- SVG charts (no chart libraries)
- `fetch()` for API calls (no axios/OpenAPI client)

### Key Concepts in App.tsx

**State management**: All `useState` hooks at the top of the `App` component. Key state:
- `currentParty` — which role is active
- `strategies` — list of strategies (allocations hidden/shown based on party)
- `epoch` — current epoch number and phase
- `performance` — array of performance reports
- `votes` — current epoch votes
- `eliminations` — elimination history

**Privacy visualization**: The `StrategyCard` component checks `strategy.isAllocationsVisible`:
- `true` → shows actual weights with green eye icon
- `false` → shows "CLASSIFIED" with blurred redacted blocks

**API calls**: All in `loadData()` and individual action handlers. Pattern:
```typescript
const resp = await fetch('/api/strategies');
const data = await resp.json();
setStrategies(data);
```

### Modifying the Frontend

```bash
cd frontend
npm run dev    # hot-reloads on save
```

The CSS is embedded as a `<style>` tag inside App.tsx. Search for `const styles =` to find it.

Color variables are defined at the top of the styles block:
```css
--bg-primary: #07070c;
--bg-card: #0f0f18;
--accent: #818cf8;
/* etc */
```

---

## Backend (Spring Boot)

### Key Files

**TreasuryController.java** — REST controller with `@RequestMapping("/api")`. Endpoints:
- Party management: `/current-party`, `/party/switch`
- Epoch: `/epoch`, `/epoch/advance`, `/epoch/open-voting`
- Strategies: `/strategies` (GET/POST), `/strategies/{id}/allocations` (PUT)
- Performance: `/performance`
- Governance: `/votes/{epoch}`, `/votes` (POST), `/elimination/execute`, `/eliminations`
- Demo: `/demo/seed`

**TreasuryService.java** — In-memory business logic. Contains:
- `currentRole` — tracks which party is active (drives privacy filtering)
- `strategies` — `Map<String, StrategyData>` of all strategies
- `performanceReports` — computed from price data on epoch advance
- `votes` — `Map<Integer, List<VoteData>>` per epoch
- `canSeeAllocations()` — returns `true` for `strategyManager`, `auditor`, `operator`
- `isVoter()` — returns `true` for `voter1`, `voter2`, `voter3`
- Price data is hardcoded in `PRICE_DATA` matching `frontend/src/data/priceData.json`

**PerformanceCalculator.java** — Pure math:
```
epochReturn = Σ(allocation_weight_i × (close_i - open_i) / open_i)
cumulativeReturn = Π(1 + epochReturn_j) - 1
maxDrawdown = max peak-to-trough decline
```

### Spring Profiles

| Profile | Usage | What it does |
|---------|-------|-------------|
| `standalone` | Local dev without Canton | Disables auth, DB, Canton beans |
| `shared-secret` | Docker with Canton | Username/password auth |
| `oauth2` | Production Canton | OAuth2 auth flow |

### Modifying the Backend

After changes, recompile:
```bash
./gradlew :backend:compileJava  # just compile
# or restart:
SPRING_PROFILES_ACTIVE=standalone ./gradlew :backend:bootRun
```

### Adding a New Endpoint

1. Add the handler method in `TreasuryController.java`
2. Add the business logic in `TreasuryService.java`
3. (Optional) Add the endpoint to `common/openapi.yaml`
4. Test with `curl`

---

## Daml Smart Contracts

### Overview

The Daml contracts define the **on-ledger** data model. Currently the backend uses in-memory state, but the contracts are the target for Canton integration.

| Contract | Privacy | Signatories | Observers | Purpose |
|----------|---------|-------------|-----------|---------|
| `ConfidentialStrategy` | PRIVATE | strategyManager | auditor | Allocation weights |
| `PerformanceReport` | PUBLIC | strategyManager | all parties | Epoch returns |
| `EliminationVote` | PUBLIC | voter | all parties | Vote ballot |
| `EpochState` | PUBLIC | operator | all parties | Epoch tracking |
| `EliminationResult` | PUBLIC | operator | all parties | Elimination record |
| `DAOConfig` | PUBLIC | operator | all parties | Party registry |

### Key Daml Files

- **`Treasury/Types.daml`** — Shared types: `RiskCategory`, `Allocation`, `EpochPhase`, `StrategyStatus`
- **`Treasury/Strategy.daml`** — `ConfidentialStrategy` template with `UpdateAllocations` and `ArchiveStrategy` choices
- **`Treasury/Performance.daml`** — `PerformanceReport` template (read-only)
- **`Treasury/Governance.daml`** — `EliminationVote` + `EliminationResult` templates
- **`Treasury/Epoch.daml`** — `EpochState` with `AdvanceEpoch`, `OpenVoting`, `CloseVoting` choices
- **`Test/Privacy.daml`** — Tests that voters/public CANNOT see private contracts

### Compiling Daml (requires Daml SDK)

```bash
make install-daml-sdk  # one-time
make build-daml        # compile + generate Java bindings
make test-daml         # run Daml tests
```

---

## API Reference

All endpoints prefixed with `/api`. Backend runs on port 8080.

### Party & Config

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| GET | `/api/config` | — | `DAOConfig` | All party IDs |
| GET | `/api/current-party` | — | `PartyInfo` | Current role + display name |
| POST | `/api/party/switch` | `{"role":"auditor"}` | `PartyInfo` | Switch acting party |

### Epoch

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| GET | `/api/epoch` | — | `EpochState` | Current epoch, phase |
| POST | `/api/epoch/advance` | — | `EpochState` | Increments epoch, computes performance |
| POST | `/api/epoch/open-voting` | — | `EpochState` | Sets phase to "Voting" |

### Strategies

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| GET | `/api/strategies` | — | `Strategy[]` | Allocations hidden based on current party |
| POST | `/api/strategies` | `{name, riskCategory, allocations}` | `Strategy` | Manager only |
| PUT | `/api/strategies/{id}/allocations` | `{allocations}` | `Strategy` | Manager only |

### Performance

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| GET | `/api/performance` | — | `PerformanceReport[]` | All epochs, all strategies |

### Governance

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| GET | `/api/votes/{epoch}` | — | `Vote[]` | Votes for specific epoch |
| POST | `/api/votes` | `{"targetStrategyId":"strat-conservative"}` | `Vote` | Voter roles only |
| POST | `/api/elimination/execute` | — | `EliminationResult` | Tallies votes, eliminates loser |
| GET | `/api/eliminations` | — | `EliminationResult[]` | All past eliminations |

### Demo

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| POST | `/api/demo/seed` | — | `SeedResult` | Creates 3 strategies + epoch. Safe to call multiple times. |

---

## Testing

### Integration Tests

```bash
# Start backend first, then:
bash test-api.sh
```

56 tests covering:
- Demo seeding (3 tests)
- Default party context (2)
- Epoch state (2)
- Privacy — public view (5)
- Privacy — manager view (4)
- Privacy — auditor view (2)
- Privacy — voter view (3)
- Party switching — all 7 roles (7)
- Epoch advancement + performance (7)
- Strategy creation (3)
- Voting flow (5)
- Elimination (4)
- Privacy after elimination (4)
- DAO config (5)

### Daml Tests (requires Daml SDK)

```bash
make test-daml
```

Tests:
- Voter cannot query ConfidentialStrategy
- Public cannot query ConfidentialStrategy
- Auditor CAN query ConfidentialStrategy
- Manager CAN query ConfidentialStrategy
- Voter CAN query PerformanceReport
- Voter cannot exercise UpdateAllocations

---

## What's Done vs What Needs Work

### Done ✅

- [x] Daml contracts (6 templates with correct privacy model)
- [x] Daml privacy tests
- [x] Backend API (all endpoints, in-memory state)
- [x] Performance calculator (epoch returns, cumulative, drawdown)
- [x] Frontend dashboard (dark theme, party switcher, strategy cards)
- [x] Privacy visualization (CLASSIFIED vs visible)
- [x] Performance chart (SVG multi-line)
- [x] Governance panel (voting + elimination)
- [x] Standalone dev mode (no Canton needed)
- [x] Integration test suite (56 tests)
- [x] Demo walkthrough script
- [x] Historical price data (12 epochs)
- [x] Docker onboarding script for parties

### Needs Work 🔧

- [ ] **Canton integration**: Wire TreasuryService to actual Daml ledger via LedgerApi + PQS
  - Replace in-memory maps with Daml contract creation/queries
  - Use party credentials for actual ledger-level privacy
- [ ] **Frontend polish**: Animations, transitions, responsive design
- [ ] **Error handling**: Frontend error toasts, backend validation
- [ ] **Deployment**: Deploy to a cloud VM or devnet
  - Need Docker Compose running Canton LocalNet
  - Frontend can deploy to Vercel with API proxy
- [ ] **OSS contributions** (stretch goal):
  - Extract contract-splitting pattern as reusable Daml library
  - Extract party-switcher as npm component
- [ ] **Demo video**: Record the 4-minute walkthrough for judging

### Priority Order (if time-limited)

1. **Frontend polish** — biggest visual impact for judges
2. **Demo video** — required for submission
3. **Canton integration** — proves it's real, not just mocked
4. **Deployment** — nice-to-have for live demo

---

## Common Tasks

### "I want to change the UI"

Edit `frontend/src/App.tsx`. All styles, components, and logic are in this single file. Run `cd frontend && npm run dev` for hot reload.

### "I want to add a new API endpoint"

1. Add a method to `TreasuryController.java` with `@GetMapping`/`@PostMapping`
2. Add the logic to `TreasuryService.java`
3. Restart backend: `SPRING_PROFILES_ACTIVE=standalone ./gradlew :backend:bootRun`

### "I want to change the pre-seeded strategies"

Edit `TreasuryService.java`, find the `seedDemo()` method. Modify the strategy names, risk categories, and allocation weights.

### "I want to add more epochs of price data"

Edit both:
- `frontend/src/data/priceData.json` — add more epoch objects
- `TreasuryService.java` — update the `PRICE_DATA` array to match

### "I want to wire up Canton for real"

Big task. High-level steps:
1. Install Daml SDK: `make install-daml-sdk`
2. Build Daml: `make build-daml`
3. Start Canton: `make start`
4. In `TreasuryService.java`, replace in-memory operations with `LedgerApi.create()` and `DamlRepository` queries
5. Remove `@ConditionalOnProperty` from `Pqs`, `LedgerApi`, `DamlRepository`
6. Use the `shared-secret` Spring profile instead of `standalone`

### "I want to rebuild everything from scratch"

```bash
cd cn-quickstart/quickstart
rm -rf frontend/node_modules frontend/dist backend/build .gradle
make build-frontend build-backend
```

---

## Troubleshooting

### Backend won't start
- **"Address already in use"**: `lsof -ti:8080 | xargs kill -9`
- **Wrong Java version**: `java -version` should show 21. Fix: `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`
- **Missing env vars**: Make sure you're using `SPRING_PROFILES_ACTIVE=standalone`

### Frontend shows blank page
- Check browser console for errors
- Make sure backend is running on port 8080
- Hard refresh: Cmd+Shift+R

### Build fails
- **TypeScript errors**: `cd frontend && npm run build` — if it fails, the error will point to the exact file/line
- **Java errors**: `./gradlew :backend:compileJava` — look for the `error:` lines in output
- **Gradle cache issues**: `rm -rf .gradle buildSrc/build && ./gradlew :backend:compileJava`

### API returns empty data
- Call `POST /api/demo/seed` first (the frontend does this on load)
- Or restart the backend (resets all in-memory state)

### Vite proxy not working
- Frontend at `:5173` proxies `/api/*` to `:8080`
- If you see CORS errors, the backend might not be running
- Check `frontend/vite.config.ts` for proxy config
