#!/bin/bash
# Treasury Sandbox — Integration Test Script
# Tests all API endpoints, privacy model, epoch advancement, voting, and elimination.
# Usage: Start backend first with SPRING_PROFILES_ACTIVE=standalone, then run this script.

BASE_URL="${BASE_URL:-http://localhost:8080}"
PASS=0
FAIL=0
TOTAL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[0;33m'
NC='\033[0m'

assert_contains() {
    local test_name="$1"
    local response="$2"
    local expected="$3"
    TOTAL=$((TOTAL + 1))
    if echo "$response" | grep -q "$expected"; then
        PASS=$((PASS + 1))
        echo -e "  ${GREEN}✓${NC} $test_name"
    else
        FAIL=$((FAIL + 1))
        echo -e "  ${RED}✗${NC} $test_name"
        echo -e "    Expected to contain: $expected"
        echo -e "    Got: $(echo "$response" | head -c 200)"
    fi
}

assert_not_contains() {
    local test_name="$1"
    local response="$2"
    local unexpected="$3"
    TOTAL=$((TOTAL + 1))
    if echo "$response" | grep -q "$unexpected"; then
        FAIL=$((FAIL + 1))
        echo -e "  ${RED}✗${NC} $test_name"
        echo -e "    Should NOT contain: $unexpected"
    else
        PASS=$((PASS + 1))
        echo -e "  ${GREEN}✓${NC} $test_name"
    fi
}

assert_equals() {
    local test_name="$1"
    local actual="$2"
    local expected="$3"
    TOTAL=$((TOTAL + 1))
    if [ "$actual" = "$expected" ]; then
        PASS=$((PASS + 1))
        echo -e "  ${GREEN}✓${NC} $test_name"
    else
        FAIL=$((FAIL + 1))
        echo -e "  ${RED}✗${NC} $test_name"
        echo -e "    Expected: $expected"
        echo -e "    Got: $actual"
    fi
}

assert_http_status() {
    local test_name="$1"
    local status="$2"
    local expected="$3"
    TOTAL=$((TOTAL + 1))
    if [ "$status" = "$expected" ]; then
        PASS=$((PASS + 1))
        echo -e "  ${GREEN}✓${NC} $test_name (HTTP $status)"
    else
        FAIL=$((FAIL + 1))
        echo -e "  ${RED}✗${NC} $test_name (Expected HTTP $expected, got $status)"
    fi
}

echo "=========================================="
echo " Treasury Sandbox Integration Tests"
echo "=========================================="
echo ""

# ==================================
# Test 1: Demo Seeding
# ==================================
echo -e "${YELLOW}[1] Demo Seeding${NC}"
RESP=$(curl -s -X POST "$BASE_URL/api/demo/seed" -H "Content-Type: application/json")
assert_contains "Seed returns success message" "$RESP" "Demo data seeded"
assert_contains "Seed creates 3 strategies" "$RESP" '"strategiesCreated":3'
assert_contains "Seed initializes epoch" "$RESP" '"epochInitialized":true'
echo ""

# ==================================
# Test 2: Default Party (Public Observer)
# ==================================
echo -e "${YELLOW}[2] Default Party Context${NC}"
RESP=$(curl -s "$BASE_URL/api/current-party")
assert_contains "Default party is publicObserver" "$RESP" '"role":"publicObserver"'
assert_contains "Display name is Public Observer" "$RESP" '"displayName":"Public Observer"'
echo ""

# ==================================
# Test 3: Epoch State
# ==================================
echo -e "${YELLOW}[3] Epoch State${NC}"
RESP=$(curl -s "$BASE_URL/api/epoch")
assert_contains "Epoch starts at 0" "$RESP" '"currentEpoch":0'
assert_contains "Total epochs is 12" "$RESP" '"totalEpochs":12'
echo ""

# ==================================
# Test 4: Privacy — Public Observer CANNOT see allocations
# ==================================
echo -e "${YELLOW}[4] Privacy — Public Observer View${NC}"
curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"role":"publicObserver"}' > /dev/null
RESP=$(curl -s "$BASE_URL/api/strategies")
assert_contains "Public sees strategies" "$RESP" "Blue Chip Hold"
assert_contains "Public sees Momentum Alpha" "$RESP" "Momentum Alpha"
assert_contains "Public sees Degen Yield" "$RESP" "Degen Yield"
assert_contains "Allocations are hidden (isAllocationsVisible:false)" "$RESP" '"isAllocationsVisible":false'
assert_not_contains "Allocations values not exposed" "$RESP" '"ethWeight"'
echo ""

# ==================================
# Test 5: Privacy — Strategy Manager CAN see allocations
# ==================================
echo -e "${YELLOW}[5] Privacy — Strategy Manager View${NC}"
curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"role":"strategyManager"}' > /dev/null
RESP=$(curl -s "$BASE_URL/api/strategies")
assert_contains "Manager sees allocations (isAllocationsVisible:true)" "$RESP" '"isAllocationsVisible":true'
assert_contains "Manager sees ethWeight" "$RESP" '"ethWeight"'
assert_contains "Manager sees btcWeight" "$RESP" '"btcWeight"'
assert_contains "Manager sees usdcWeight" "$RESP" '"usdcWeight"'
echo ""

# ==================================
# Test 6: Privacy — Auditor CAN see allocations
# ==================================
echo -e "${YELLOW}[6] Privacy — Auditor View${NC}"
curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"role":"auditor"}' > /dev/null
RESP=$(curl -s "$BASE_URL/api/strategies")
assert_contains "Auditor sees allocations" "$RESP" '"isAllocationsVisible":true'
assert_contains "Auditor sees actual weights" "$RESP" '"ethWeight"'
echo ""

# ==================================
# Test 7: Privacy — Voter CANNOT see allocations
# ==================================
echo -e "${YELLOW}[7] Privacy — Voter View${NC}"
curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"role":"voter1"}' > /dev/null
RESP=$(curl -s "$BASE_URL/api/strategies")
assert_contains "Voter sees strategies" "$RESP" "Momentum Alpha"
assert_contains "Voter cannot see allocations" "$RESP" '"isAllocationsVisible":false'
assert_not_contains "Voter does not get ethWeight" "$RESP" '"ethWeight"'
echo ""

# ==================================
# Test 8: Party Switching (all roles)
# ==================================
echo -e "${YELLOW}[8] Party Switching${NC}"
for role in operator strategyManager voter1 voter2 voter3 auditor publicObserver; do
    RESP=$(curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d "{\"role\":\"$role\"}")
    assert_contains "Switch to $role returns partyId" "$RESP" "\"partyId\":\"$role\""
done
echo ""

# ==================================
# Test 9: Epoch Advancement + Performance Calculation
# ==================================
echo -e "${YELLOW}[9] Epoch Advancement + Performance${NC}"
curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"role":"operator"}' > /dev/null

# Advance to epoch 1
RESP=$(curl -s -X POST "$BASE_URL/api/epoch/advance" -H "Content-Type: application/json")
assert_contains "Advance to epoch 1" "$RESP" '"currentEpoch":1'

# Check performance was calculated
RESP=$(curl -s "$BASE_URL/api/performance")
assert_contains "Performance reports exist" "$RESP" '"epoch":1'
assert_contains "Has epochReturn" "$RESP" '"epochReturn"'
assert_contains "Has cumulativeReturn" "$RESP" '"cumulativeReturn"'
assert_contains "Has maxDrawdown" "$RESP" '"maxDrawdown"'

# Advance to epoch 2
RESP=$(curl -s -X POST "$BASE_URL/api/epoch/advance" -H "Content-Type: application/json")
assert_contains "Advance to epoch 2" "$RESP" '"currentEpoch":2'

# Check multiple epoch performance
RESP=$(curl -s "$BASE_URL/api/performance")
assert_contains "Has epoch 2 performance" "$RESP" '"epoch":2'
echo ""

# ==================================
# Test 10: Strategy Creation (Manager only)
# ==================================
echo -e "${YELLOW}[10] Strategy Creation${NC}"
curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"role":"strategyManager"}' > /dev/null
RESP=$(curl -s -X POST "$BASE_URL/api/strategies" -H "Content-Type: application/json" \
    -d '{"name":"Test Strategy","riskCategory":"Moderate","allocations":{"ethWeight":0.33,"btcWeight":0.34,"usdcWeight":0.33}}')
assert_contains "Strategy created" "$RESP" '"name":"Test Strategy"'
assert_contains "Strategy has ID" "$RESP" '"strategyId"'

# Verify it appears in list
RESP=$(curl -s "$BASE_URL/api/strategies")
assert_contains "New strategy in list" "$RESP" "Test Strategy"
echo ""

# ==================================
# Test 11: Voting Flow
# ==================================
echo -e "${YELLOW}[11] Voting Flow${NC}"

# Open voting
curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"role":"operator"}' > /dev/null
RESP=$(curl -s -X POST "$BASE_URL/api/epoch/open-voting" -H "Content-Type: application/json")
assert_contains "Voting opened" "$RESP" '"phase":"Voting"'

# Voter 1 votes
curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"role":"voter1"}' > /dev/null
RESP=$(curl -s -X POST "$BASE_URL/api/votes" -H "Content-Type: application/json" \
    -d '{"targetStrategyId":"strat-conservative"}')
assert_contains "Voter1 cast vote" "$RESP" '"voter"'

# Voter 2 votes
curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"role":"voter2"}' > /dev/null
RESP=$(curl -s -X POST "$BASE_URL/api/votes" -H "Content-Type: application/json" \
    -d '{"targetStrategyId":"strat-conservative"}')
assert_contains "Voter2 cast vote" "$RESP" '"voter"'

# Voter 3 votes for different strategy
curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"role":"voter3"}' > /dev/null
RESP=$(curl -s -X POST "$BASE_URL/api/votes" -H "Content-Type: application/json" \
    -d '{"targetStrategyId":"strat-aggressive"}')
assert_contains "Voter3 cast vote" "$RESP" '"voter"'

# Check votes
RESP=$(curl -s "$BASE_URL/api/votes/2")
assert_contains "Votes recorded" "$RESP" '"targetStrategyId"'
echo ""

# ==================================
# Test 12: Elimination
# ==================================
echo -e "${YELLOW}[12] Elimination${NC}"
curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"role":"operator"}' > /dev/null
RESP=$(curl -s -X POST "$BASE_URL/api/elimination/execute" -H "Content-Type: application/json")
assert_contains "Elimination executed" "$RESP" '"eliminatedStrategyId"'
assert_contains "Conservative eliminated (2 votes)" "$RESP" "strat-conservative"

# Verify elimination in history
RESP=$(curl -s "$BASE_URL/api/eliminations")
assert_contains "Elimination in history" "$RESP" "strat-conservative"

# Verify strategy marked as eliminated
RESP=$(curl -s "$BASE_URL/api/strategies")
assert_contains "Strategy marked eliminated" "$RESP" '"status":"Eliminated"'
echo ""

# ==================================
# Test 13: Privacy Consistency After Elimination
# ==================================
echo -e "${YELLOW}[13] Privacy After Elimination${NC}"

# Public still can't see allocations
curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"role":"publicObserver"}' > /dev/null
RESP=$(curl -s "$BASE_URL/api/strategies")
assert_contains "Public still can't see allocations" "$RESP" '"isAllocationsVisible":false'
assert_not_contains "Public still doesn't get weights" "$RESP" '"ethWeight"'

# Public CAN see eliminations
RESP=$(curl -s "$BASE_URL/api/eliminations")
assert_contains "Public sees elimination results" "$RESP" "strat-conservative"

# Auditor still sees everything
curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"role":"auditor"}' > /dev/null
RESP=$(curl -s "$BASE_URL/api/strategies")
assert_contains "Auditor still sees allocations" "$RESP" '"isAllocationsVisible":true'
echo ""

# ==================================
# Test 14: DAO Config
# ==================================
echo -e "${YELLOW}[14] DAO Config${NC}"
RESP=$(curl -s "$BASE_URL/api/config")
assert_contains "Config has operator" "$RESP" '"operator"'
assert_contains "Config has strategyManager" "$RESP" '"strategyManager"'
assert_contains "Config has voters" "$RESP" '"voters"'
assert_contains "Config has auditor" "$RESP" '"auditor"'
assert_contains "Config has publicObserver" "$RESP" '"publicObserver"'
echo ""

# ==================================
# Summary
# ==================================
echo "=========================================="
echo -e " Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}, $TOTAL total"
echo "=========================================="

if [ $FAIL -gt 0 ]; then
    exit 1
fi
