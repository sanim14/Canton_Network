# Treasury Sandbox — Demo Walkthrough (3-4 minutes)

## Setup (before demo)

Open two terminals from `cn-quickstart/quickstart/`:

```bash
# Terminal 1: Backend
SPRING_PROFILES_ACTIVE=standalone ./gradlew :backend:bootRun

# Terminal 2: Frontend
cd frontend && npm run dev
```

Open **http://localhost:5173** in your browser.

---

## Act 1: The Problem — Everything is Public (0:00 - 0:30)

> *"DAOs face a fundamental tension: they need transparency for governance, but revealing treasury allocations creates front-running risk."*

1. You land on the dashboard as **Public Observer** (default role, gray dot in header).
2. Point out the **3 strategy cards** on the leaderboard: Blue Chip Hold, Momentum Alpha, Degen Yield.
3. Notice the **"CLASSIFIED"** tags on each card's allocation section — the actual ETH/BTC/USDC weights are hidden behind redacted blocks.
4. Point out that **performance metrics, risk categories, and names are all visible** — only the sensitive allocation data is hidden.

> *"As a public observer, I can see how strategies are performing, but I have no idea what the actual allocations are. This prevents front-running."*

---

## Act 2: Privacy in Action — Switch Roles (0:30 - 1:15)

### Switch to Strategy Manager

5. Click the **party dropdown** (top right) and select **Strategy Manager** (indigo dot).
6. The allocation sections **instantly reveal** actual weights:
   - Blue Chip Hold: ETH 20% | BTC 20% | USDC 60%
   - Momentum Alpha: ETH 40% | BTC 40% | USDC 20%
   - Degen Yield: ETH 60% | BTC 30% | USDC 10%

> *"As the strategy manager, I can see everything. This is Canton's contract-level privacy — the same data, different visibility based on who you are."*

### Switch to a Voter

7. Switch to **DAO Voter 1** (green dot).
8. Allocations are **hidden again** — voters only see performance, not the underlying positions.

> *"Voters can evaluate strategies by their results, not by copying the allocations. This is the key insight."*

### Switch to Auditor

9. Switch to **Auditor** (yellow dot).
10. Allocations are **visible again** — auditors need full transparency for oversight.

> *"The auditor sees everything — accountability without public exposure."*

---

## Act 3: Live Strategy Creation (1:15 - 1:45)

11. Switch back to **Strategy Manager**.
12. Click the **"+ New Strategy"** floating button (bottom right).
13. Fill in the form:
    - Name: **"ETH Maximalist"**
    - Risk: **Aggressive**
    - Drag the sliders: ETH 80% | BTC 10% | USDC 10%
14. Click **Create**. The new strategy appears on the leaderboard.

> *"The manager just created a new strategy. It's immediately visible to everyone — but only the manager and auditor can see the 80/10/10 split."*

15. Switch to **Public Observer** to confirm the new strategy shows "CLASSIFIED" allocations.

---

## Act 4: Epoch Advancement + Performance (1:45 - 2:15)

16. Click **"Advance Epoch"** button in the header (works from any role).
17. Watch the epoch counter increment (Epoch 1 → 2 → 3).
18. Click it **2-3 more times** to build up performance data.
19. Scroll to the **Performance Chart** — multi-line SVG chart shows cumulative returns diverging over epochs.
20. Point out the **leaderboard reranking** — strategies reorder by cumulative return.

> *"Each epoch uses real historical price data. The aggressive strategy swings more, the conservative one is steady. All computed deterministically from the allocation weights."*

---

## Act 5: Governance — Voting + Elimination (2:15 - 3:15)

### Open Voting

21. Click **"Open Voting"** button in the header. The epoch phase changes to "Voting".

### Cast Votes

22. Switch to **DAO Voter 1**. In the Governance Panel:
    - Select the worst-performing strategy from the dropdown
    - Click **"Cast Vote"**
23. Switch to **DAO Voter 2**, cast a vote for the same strategy.
24. Switch to **DAO Voter 3**, cast a vote (same or different).
25. Watch the **vote tally bars** update in real-time.

> *"Each voter gets one vote per epoch. Votes are public — everyone can see who voted for what. But the allocation data that informed the strategy's performance? Still classified."*

### Execute Elimination

26. Click **"Execute Elimination"**. The losing strategy gets:
    - A **red strikethrough** on the leaderboard
    - An entry in the **Elimination History** table

> *"The worst performer is eliminated by democratic vote. The result is public, but the allocation strategy remains private — even after elimination."*

---

## Act 6: The Privacy Matrix (3:15 - 3:45)

27. Quickly cycle through all roles to drive the point home:

| Switch to... | Allocations | Performance | Votes | Eliminations |
|---|---|---|---|---|
| **Public Observer** | CLASSIFIED | Visible | Visible | Visible |
| **DAO Voter** | CLASSIFIED | Visible | Visible | Visible |
| **Auditor** | **Visible** | Visible | Visible | Visible |
| **Strategy Manager** | **Visible** | Visible | Visible | Visible |

> *"This is Canton's contract-level privacy. Each piece of data lives in a separate smart contract with different signatory and observer lists. No encryption, no ZK proofs — just native ledger privacy."*

---

## Closing (3:45 - 4:00)

> *"We split each strategy into multiple Daml contracts: a private ConfidentialStrategy contract visible only to the manager and auditor, and public PerformanceReport contracts visible to everyone. Canton enforces this at the ledger level — voters literally cannot query the private contract. It's not access control, it's structural privacy."*

---

## Key Talking Points for Judges

- **Contract splitting pattern**: Privacy is per-contract in Canton. Different visibility = different contracts.
- **No encryption needed**: Canton's sub-transaction privacy means nodes only see contracts they're party to.
- **6 distinct party roles**: operator, strategyManager, voter1-3, auditor, publicObserver.
- **Deterministic performance**: Real historical ETH/BTC/USDC price data, reproducible returns.
- **Full governance loop**: Create → Perform → Vote → Eliminate.
- **Built on cn-quickstart**: Daml SDK 3.4.10, Spring Boot 3.4, React 18 + TypeScript.

---

## If Something Breaks

- Backend not responding? Check Terminal 1 is still running.
- Frontend blank? Hard refresh (Cmd+Shift+R).
- Data looks stale? The app auto-seeds on load. Refresh the page to reset.
- Need a clean slate? Restart the backend (it's all in-memory).
