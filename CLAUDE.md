# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Confidential Treasury Strategy Sandbox** — a privacy-preserving DAO treasury experimentation dApp built for the ETHDenver 2026 Canton L1 Privacy dApp Prize. DAOs test treasury allocation strategies confidentially: allocations remain private while performance metrics and governance votes are selectively visible to different parties.

Built on top of Digital Asset's `cn-quickstart` scaffold, replacing the licensing example with treasury domain logic.

## Build & Run Commands

### Standalone Mode (no Docker/Canton/Daml SDK required)
```bash
# Start backend (from project root)
SPRING_PROFILES_ACTIVE=standalone ./gradlew :backend:bootRun

# Start frontend dev server (separate terminal)
cd frontend && npm install && npm run dev

# Access at http://localhost:5173
# Backend runs on port 8080, Vite proxies /api/* to it
```

### Integration Tests
```bash
# Backend must be running first (standalone mode)
bash test-api.sh    # 55 tests covering all endpoints, privacy, voting, elimination
```

### Full Docker Mode (requires Docker, Daml SDK)
```bash
make install-daml-sdk   # install Daml SDK 3.4.10
make setup              # configure LocalNet (shared-secret auth)
make build && make start
```

### Other Commands
```bash
make build-backend      # compile backend only
make build-frontend     # build frontend only
make build-daml         # compile Daml contracts
make test-daml          # run Daml script tests
./gradlew clean         # clean build artifacts
```

## Architecture

### Privacy Model (Critical Concept)

Canton privacy is **per-contract** (all-or-nothing). Different visibility requirements use **separate contracts** with different signatory/observer lists:

| Contract | Private Data | Visible To |
|----------|-------------|------------|
| `ConfidentialStrategy` | Allocation weights (dynamic token %) | creator + operator ONLY |
| `PerformanceReport` | Epoch returns, drawdown | Everyone (operator, members, publicObserver) |
| `EliminationVote` | Voter's target choice | Everyone |
| `EpochState` | Current epoch, phase | Everyone |
| `EliminationResult` | Tally, eliminated strategy | Everyone |
| `DAOConfig` | Member registry | Everyone |

### 4-Party Model
| Party | Role | Creates Strategies | Votes | Sees Own Allocations | Sees Others' Allocations |
|-------|------|--------------------|-------|---------------------|-------------------------|
| `operator` | System admin | No | No | N/A | No |
| `member1` | DAO Member | Yes (max 1 active) | Yes | Yes | No |
| `member2` | DAO Member | Yes (max 1 active) | Yes | Yes | No |
| `publicObserver` | Viewer | No | No | N/A | No |

Key rules:
- Each member can have exactly 1 active strategy at a time
- If eliminated, they can immediately create a new one
- Everyone sees all performance metrics (public)
- Members can vote on any strategy (including their own)
- Only operator can advance epochs, open/close voting, execute eliminations

### Backend Modes

The backend has two modes controlled by Spring profiles:

- **Standalone** (`SPRING_PROFILES_ACTIVE=standalone`): In-memory treasury state via `TreasuryService`. No auth required — party switching via `/api/party/switch`. Canton-dependent beans disabled via `@ConditionalOnProperty(name="canton.enabled")`.

- **Full Canton** (`shared-secret` or `oauth2` profile): Connects to Canton LocalNet via gRPC Ledger API and PQS (PostgreSQL Query Store). Privacy enforced by Canton itself. Party identity from Spring Security authentication.

### Frontend Architecture

Multi-page React app with `react-router-dom`:

```
frontend/src/
  types/index.ts                    — Shared interfaces (Strategy, PerformanceReport, etc.) + PARTY_META
  services/api.ts                   — Typed API client (cookie-based auth for Canton, no auth for standalone)
  hooks/useTreasury.ts              — All treasury state + actions (bootstrap, advanceEpoch, createStrategy, etc.)
  contexts/TreasuryContext.ts       — React context wrapping useTreasury
  contexts/AuthContext.tsx           — Party selection auth (loginAsParty, logout)
  styles/global.css                 — All CSS
  components/
    layout/AppShell.tsx             — Sidebar + Header + <Outlet/>
    layout/Sidebar.tsx              — 5-item nav with mobile bottom bar
    layout/Header.tsx               — Epoch badge, party identity, operator controls
    strategy/StrategyCard.tsx       — Single strategy card (dynamic token allocations or CLASSIFIED)
    strategy/StrategyGrid.tsx       — Grid of cards (leaderboard)
    strategy/CreateStrategyModal.tsx — Strategy creation with TokenSelector + AllocationEditor
    strategy/TokenSelector.tsx      — CoinGecko token search autocomplete
    strategy/AllocationEditor.tsx   — Multi-token % slider editor
    strategy/TemplateSelector.tsx   — Portfolio template presets
    performance/PerformanceChart.tsx — SVG multi-line chart
    governance/VotePanel.tsx        — Vote casting form
    governance/VoteTally.tsx        — Horizontal bar chart
    governance/EliminationHistory.tsx — Elimination table
    common/Toast.tsx                — Toast notifications
    common/LoadingSkeleton.tsx      — Pulsing placeholder cards
    common/ErrorBoundary.tsx        — React error boundary
    common/EmptyState.tsx           — Friendly empty states
  pages/
    LandingPage.tsx                 — Hero + features + animated walkthrough
    LoginPage.tsx                   — Party selection (4 cards: Operator, Member 1, Member 2, Public Observer)
    DashboardPage.tsx               — Overview: leaderboard + chart
    StrategiesPage.tsx              — Strategy management with filters
    GovernancePage.tsx              — Voting + tally + elimination history
    AnalyticsPage.tsx               — Full chart + metrics + table
    SettingsPage.tsx                — Profile, DAO info, party registry
  App.tsx                           — React Router routes
  main.tsx                          — BrowserRouter + CSS import
```

### Routes
- `/` — Landing page (public)
- `/login` — Party selection
- `/dashboard` — Main dashboard (AppShell layout)
- `/strategies` — Strategy management
- `/governance` — Voting & eliminations
- `/analytics` — Performance data
- `/settings` — Profile & DAO config

### Key Custom Files (treasury-specific code)

**Backend (Java/Spring Boot):**
- `controller/TreasuryController.java` — Treasury REST endpoints under `/api/*`
- `controller/PriceController.java` — CoinGecko price endpoints under `/api/prices/*`
- `service/TreasuryServiceInterface.java` — Interface + shared data records (StrategyData, EpochData, etc.)
- `service/TreasuryService.java` — Standalone (in-memory) implementation, `@Profile("standalone")`
- `service/CantonTreasuryService.java` — Canton ledger implementation, `@ConditionalOnProperty(canton.enabled=true)` (requires Daml codegen to compile)
- `service/CoinGeckoService.java` — CoinGecko API integration with cache + rate limiting
- `utility/PerformanceCalculator.java` — Deterministic return computation with dynamic token allocations
- `config/StandaloneConfig.java` — Spring Security config (all endpoints public, standalone party provider)
- `ledger/LedgerApi.java` — Extended with multi-party `createAs()`/`exerciseAndGetResultAs()` methods

**Daml Contracts:**
- `daml/treasury/daml/Treasury/Types.daml` — Allocation (dynamic weights list), EpochPhase, StrategyStatus
- `daml/treasury/daml/Treasury/Strategy.daml` — ConfidentialStrategy (creator=signatory, operator=observer)
- `daml/treasury/daml/Treasury/Performance.daml` — PerformanceReport (public to all)
- `daml/treasury/daml/Treasury/Governance.daml` — EliminationVote + EliminationResult
- `daml/treasury/daml/Treasury/Epoch.daml` — EpochState with phase transitions
- `daml/treasury/daml/Treasury/Config.daml` — DAOConfig (operator, members, publicObserver)

### Inherited cn-quickstart Files (do not modify unless necessary)
- 24+ security/auth Java classes under `security/`
- Build infrastructure: `buildSrc/`, root `build.gradle.kts`, `settings.gradle.kts`
- Docker compose modules: `docker/modules/` (localnet, pqs, keycloak, observability)
- PQS/repository classes under `pqs/`, `repository/`

## API Endpoints

### Treasury API (`/api/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/mode` | Returns `{"mode":"standalone"}` or `{"mode":"canton"}` |
| POST | `/api/bootstrap` | Initialize DAO (creates config + epoch state) |
| GET | `/api/config` | DAO configuration (operator, members, publicObserver) |
| GET | `/api/current-party` | Current party context (partyId, isMember, isOperator, hasActiveStrategy) |
| POST | `/api/party/switch` | Switch party (standalone mode only). Body: `{"party":"member1"}` |
| GET | `/api/epoch` | Current epoch state |
| POST | `/api/epoch/advance` | Advance to next epoch (auto-computes performance) |
| POST | `/api/epoch/open-voting` | Open voting phase |
| POST | `/api/epoch/close-voting` | Close voting phase |
| GET | `/api/strategies` | List strategies (allocations filtered by party visibility) |
| POST | `/api/strategies` | Create strategy. Body: `{"name":"...", "allocations":{"bitcoin":0.5,"ethereum":0.5}}` |
| PUT | `/api/strategies/{id}/allocations` | Update allocations (creator only) |
| GET | `/api/performance` | All performance reports |
| GET | `/api/votes/{epoch}` | Votes for a specific epoch |
| POST | `/api/votes` | Cast elimination vote (members only). Body: `{"targetStrategyId":"..."}` |
| POST | `/api/elimination/execute` | Execute elimination based on vote tally |
| GET | `/api/eliminations` | Elimination history |

### Price API (`/api/prices/*`, `/api/tokens/*`)
| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/prices/current?coins=...` | Current USD prices (2-min cache) |
| GET | `/api/prices/historical?coin=...&days=...` | OHLC data |
| GET | `/api/tokens/search?q=...` | Token search autocomplete |
| GET | `/api/tokens/popular` | Top tokens by market cap |

## Performance Calculation

```
epochReturn = Σ(allocation_weight_i × (close_i - open_i) / open_i)
cumulativeReturn = Π(1 + epochReturn_j) - 1
maxDrawdown = max peak-to-trough decline in cumulative series
```

Allocations use CoinGecko IDs as keys (e.g., `"bitcoin"`, `"ethereum"`, `"solana"`).

## Important Notes

- **CantonTreasuryService** requires Daml codegen to compile. The `build.gradle.kts` excludes it when `build/generated-daml` doesn't exist. Run `make build-daml` first for Canton mode.
- The `Daml.java` stub file (`backend/src/main/java/daml/Daml.java`) exists so the backend compiles without Daml SDK codegen. It sets `ENTITIES = null`.
- `pqs/JdbcDataSource.java` has `@ConditionalOnProperty(canton.enabled=true)` to prevent PostgreSQL DataSource from loading in standalone mode.
- `buildSrc/src/main/kotlin/VersionFiles.kt` reads SDK version from `daml/treasury/daml.yaml`.
- Frontend Vite proxy does NOT strip `/api` prefix — the TreasuryController uses `@RequestMapping("/api")`.
- Price data in standalone mode covers 12 weekly epochs with hardcoded ETH/BTC prices.
- CoinGecko free tier: 25 calls/min. Service includes rate limiter + 2-min price cache.
- The `treasury_party` localStorage key stores the selected party on the frontend.
- In Canton shared-secret mode, 4 tenants are configured: AppProvider (operator), Member1, Member2, PublicObserver.
