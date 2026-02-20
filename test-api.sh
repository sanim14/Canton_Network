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

switch_party() {
    curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d "{\"party\":\"$1\"}" > /dev/null
}

echo "=========================================="
echo " Treasury Sandbox Integration Tests"
echo " (4-party model: operator, member1,"
echo "  member2, publicObserver)"
echo "=========================================="
echo ""

# ==================================
# Test 1: Mode endpoint
# ==================================
echo -e "${YELLOW}[1] Mode Endpoint${NC}"
RESP=$(curl -s "$BASE_URL/api/mode")
assert_contains "Mode returns standalone" "$RESP" '"mode":"standalone"'
echo ""

# ==================================
# Test 2: Bootstrap DAO
# ==================================
echo -e "${YELLOW}[2] Bootstrap DAO${NC}"
switch_party "operator"
RESP=$(curl -s -X POST "$BASE_URL/api/bootstrap" -H "Content-Type: application/json")
assert_contains "Bootstrap returns success" "$RESP" "DAO bootstrapped"
echo ""

# ==================================
# Test 3: DAO Config
# ==================================
echo -e "${YELLOW}[3] DAO Config${NC}"
RESP=$(curl -s "$BASE_URL/api/config")
assert_contains "Config has operator" "$RESP" '"operator"'
assert_contains "Config has members" "$RESP" '"members"'
assert_contains "Config has member1" "$RESP" 'member1'
assert_contains "Config has member2" "$RESP" 'member2'
assert_contains "Config has publicObserver" "$RESP" '"publicObserver"'
echo ""

# ==================================
# Test 4: Epoch State
# ==================================
echo -e "${YELLOW}[4] Epoch State${NC}"
RESP=$(curl -s "$BASE_URL/api/epoch")
assert_contains "Epoch starts at 0" "$RESP" '"currentEpoch":0'
assert_contains "Total epochs is 12" "$RESP" '"totalEpochs":12'
echo ""

# ==================================
# Test 5: Party Switching
# ==================================
echo -e "${YELLOW}[5] Party Switching${NC}"
for party in operator member1 member2 publicObserver; do
    RESP=$(curl -s -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d "{\"party\":\"$party\"}")
    assert_contains "Switch to $party returns partyId" "$RESP" "\"partyId\":\"$party\""
done
# Test invalid party
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/party/switch" -H "Content-Type: application/json" -d '{"party":"hacker"}')
assert_http_status "Invalid party returns 400" "$STATUS" "400"
echo ""

# ==================================
# Test 6: Strategy Creation — Member1
# ==================================
echo -e "${YELLOW}[6] Strategy Creation — Member1${NC}"
switch_party "member1"
RESP=$(curl -s -X POST "$BASE_URL/api/strategies" -H "Content-Type: application/json" \
    -d '{"name":"Blue Chip Hold","allocations":{"bitcoin":0.5,"ethereum":0.3,"usd-coin":0.2}}')
assert_contains "Strategy created" "$RESP" '"name":"Blue Chip Hold"'
assert_contains "Strategy has ID" "$RESP" '"strategyId"'
assert_contains "Creator is member1" "$RESP" '"creatorParty":"member1"'
M1_STRAT_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['strategyId'])" 2>/dev/null || echo "strat-unknown")

# Try creating a second strategy (should fail — 1 active max)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/strategies" -H "Content-Type: application/json" \
    -d '{"name":"Duplicate","allocations":{"bitcoin":1.0}}')
assert_http_status "Second strategy rejected (1 max)" "$STATUS" "403"
echo ""

# ==================================
# Test 7: Strategy Creation — Member2
# ==================================
echo -e "${YELLOW}[7] Strategy Creation — Member2${NC}"
switch_party "member2"
RESP=$(curl -s -X POST "$BASE_URL/api/strategies" -H "Content-Type: application/json" \
    -d '{"name":"Degen Yield","allocations":{"bitcoin":0.2,"ethereum":0.8}}')
assert_contains "Member2 strategy created" "$RESP" '"name":"Degen Yield"'
assert_contains "Creator is member2" "$RESP" '"creatorParty":"member2"'
M2_STRAT_ID=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin)['strategyId'])" 2>/dev/null || echo "strat-unknown")
echo ""

# ==================================
# Test 8: Privacy — Member1 sees own allocations
# ==================================
echo -e "${YELLOW}[8] Privacy — Member1 View${NC}"
switch_party "member1"
RESP=$(curl -s "$BASE_URL/api/strategies")
# Member1 should see their own allocations
assert_contains "Member1 sees own allocations visible" "$RESP" '"isAllocationsVisible":true'
# Member1 should NOT see member2's allocations
assert_contains "Member1 sees some hidden allocations" "$RESP" '"isAllocationsVisible":false'
echo ""

# ==================================
# Test 9: Privacy — Member2 sees own, not Member1's
# ==================================
echo -e "${YELLOW}[9] Privacy — Member2 View${NC}"
switch_party "member2"
RESP=$(curl -s "$BASE_URL/api/strategies")
assert_contains "Member2 sees own allocations" "$RESP" '"isAllocationsVisible":true'
assert_contains "Member2 sees some hidden" "$RESP" '"isAllocationsVisible":false'
echo ""

# ==================================
# Test 10: Privacy — Public Observer sees NO allocations
# ==================================
echo -e "${YELLOW}[10] Privacy — Public Observer View${NC}"
switch_party "publicObserver"
RESP=$(curl -s "$BASE_URL/api/strategies")
assert_contains "Public sees strategies" "$RESP" "Blue Chip Hold"
assert_contains "Public sees Degen Yield" "$RESP" "Degen Yield"
assert_not_contains "Public cannot see any allocations" "$RESP" '"isAllocationsVisible":true'
echo ""

# ==================================
# Test 11: Privacy — Operator sees NO allocations
# ==================================
echo -e "${YELLOW}[11] Privacy — Operator View${NC}"
switch_party "operator"
RESP=$(curl -s "$BASE_URL/api/strategies")
assert_not_contains "Operator cannot see allocations" "$RESP" '"isAllocationsVisible":true'
echo ""

# ==================================
# Test 12: Epoch Advancement + Performance
# ==================================
echo -e "${YELLOW}[12] Epoch Advancement + Performance${NC}"
switch_party "operator"

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
# Test 13: Voting Flow
# ==================================
echo -e "${YELLOW}[13] Voting Flow${NC}"

# Open voting (operator)
switch_party "operator"
RESP=$(curl -s -X POST "$BASE_URL/api/epoch/open-voting" -H "Content-Type: application/json")
assert_contains "Voting opened" "$RESP" '"phase":"Voting"'

# Member1 votes to eliminate member2's strategy
switch_party "member1"
RESP=$(curl -s -X POST "$BASE_URL/api/votes" -H "Content-Type: application/json" \
    -d "{\"targetStrategyId\":\"$M2_STRAT_ID\"}")
assert_contains "Member1 cast vote" "$RESP" '"voter"'

# Member2 votes to eliminate member1's strategy
switch_party "member2"
RESP=$(curl -s -X POST "$BASE_URL/api/votes" -H "Content-Type: application/json" \
    -d "{\"targetStrategyId\":\"$M1_STRAT_ID\"}")
assert_contains "Member2 cast vote" "$RESP" '"voter"'

# Check votes
RESP=$(curl -s "$BASE_URL/api/votes/2")
assert_contains "Votes recorded" "$RESP" '"targetStrategyId"'

# Member2 tries to vote again (should fail)
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/votes" -H "Content-Type: application/json" \
    -d "{\"targetStrategyId\":\"$M1_STRAT_ID\"}")
assert_http_status "Double vote rejected" "$STATUS" "400"
echo ""

# ==================================
# Test 14: Non-member cannot vote
# ==================================
echo -e "${YELLOW}[14] Non-member Cannot Vote${NC}"
switch_party "publicObserver"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/votes" -H "Content-Type: application/json" \
    -d "{\"targetStrategyId\":\"$M1_STRAT_ID\"}")
assert_http_status "Public observer cannot vote" "$STATUS" "400"

switch_party "operator"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/votes" -H "Content-Type: application/json" \
    -d "{\"targetStrategyId\":\"$M1_STRAT_ID\"}")
assert_http_status "Operator cannot vote" "$STATUS" "400"
echo ""

# ==================================
# Test 15: Elimination
# ==================================
echo -e "${YELLOW}[15] Elimination${NC}"
switch_party "operator"
RESP=$(curl -s -X POST "$BASE_URL/api/elimination/execute" -H "Content-Type: application/json")
assert_contains "Elimination executed" "$RESP" '"eliminatedStrategyId"'

# Verify elimination in history
RESP=$(curl -s "$BASE_URL/api/eliminations")
assert_contains "Elimination in history" "$RESP" '"eliminatedStrategyId"'

# Verify a strategy is marked as eliminated
RESP=$(curl -s "$BASE_URL/api/strategies")
assert_contains "Strategy marked eliminated" "$RESP" '"status":"Eliminated"'
echo ""

# ==================================
# Test 16: Eliminated member can create new strategy
# ==================================
echo -e "${YELLOW}[16] Eliminated Member Creates New Strategy${NC}"
# Figure out which member was eliminated
switch_party "member1"
RESP=$(curl -s "$BASE_URL/api/current-party")
HAS_ACTIVE=$(echo "$RESP" | python3 -c "import sys,json; print(json.load(sys.stdin).get('hasActiveStrategy','true'))" 2>/dev/null || echo "true")
if [ "$HAS_ACTIVE" = "False" ] || [ "$HAS_ACTIVE" = "false" ]; then
    RESP=$(curl -s -X POST "$BASE_URL/api/strategies" -H "Content-Type: application/json" \
        -d '{"name":"Recovery Play","allocations":{"bitcoin":0.6,"ethereum":0.4}}')
    assert_contains "Eliminated member1 creates new strategy" "$RESP" '"name":"Recovery Play"'
else
    switch_party "member2"
    RESP=$(curl -s -X POST "$BASE_URL/api/strategies" -H "Content-Type: application/json" \
        -d '{"name":"Recovery Play","allocations":{"bitcoin":0.6,"ethereum":0.4}}')
    assert_contains "Eliminated member2 creates new strategy" "$RESP" '"name":"Recovery Play"'
fi
echo ""

# ==================================
# Test 17: Privacy After Elimination
# ==================================
echo -e "${YELLOW}[17] Privacy Consistency After Elimination${NC}"
switch_party "publicObserver"
RESP=$(curl -s "$BASE_URL/api/strategies")
assert_not_contains "Public still can't see allocations" "$RESP" '"isAllocationsVisible":true'

# Public CAN see eliminations
RESP=$(curl -s "$BASE_URL/api/eliminations")
assert_contains "Public sees elimination results" "$RESP" '"eliminatedStrategyId"'
echo ""

# ==================================
# Test 18: Non-member cannot create strategy
# ==================================
echo -e "${YELLOW}[18] Non-member Cannot Create Strategy${NC}"
switch_party "publicObserver"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/strategies" -H "Content-Type: application/json" \
    -d '{"name":"Hacker","allocations":{"bitcoin":1.0}}')
assert_http_status "Public observer cannot create strategy" "$STATUS" "403"

switch_party "operator"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE_URL/api/strategies" -H "Content-Type: application/json" \
    -d '{"name":"Hacker","allocations":{"bitcoin":1.0}}')
assert_http_status "Operator cannot create strategy" "$STATUS" "403"
echo ""

# ==================================
# Test 19: Current Party Endpoint
# ==================================
echo -e "${YELLOW}[19] Current Party Endpoint${NC}"
switch_party "member1"
RESP=$(curl -s "$BASE_URL/api/current-party")
assert_contains "Current party is member1" "$RESP" '"partyId":"member1"'
assert_contains "isMember is true" "$RESP" '"isMember":"true"'
assert_contains "isOperator is false" "$RESP" '"isOperator":"false"'

switch_party "operator"
RESP=$(curl -s "$BASE_URL/api/current-party")
assert_contains "Current party is operator" "$RESP" '"partyId":"operator"'
assert_contains "isOperator is true" "$RESP" '"isOperator":"true"'
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
