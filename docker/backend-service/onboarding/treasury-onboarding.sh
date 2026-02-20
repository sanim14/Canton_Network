#!/bin/bash
# Treasury Sandbox - Demo Onboarding Script
# Creates all 6 parties and sets up the DAO configuration.
# This runs as part of Docker onboarding for the treasury demo.

set -eo pipefail

source /app/utils.sh

# Create all treasury parties on the participant
create_treasury_parties() {
  local token=$1
  local api_endpoint=$2

  echo "=== Treasury Sandbox: Creating parties ==="

  # Create operator party
  create_user "$token" "treasury-operator" "operator" "" "$api_endpoint"
  OPERATOR_PARTY=$(get_party "$token" "treasury-operator" "$api_endpoint")

  # Create strategy manager party
  create_user "$token" "treasury-manager" "strategyManager" "" "$api_endpoint"
  STRATEGY_MANAGER_PARTY=$(get_party "$token" "treasury-manager" "$api_endpoint")

  # Create voter parties
  create_user "$token" "treasury-voter1" "voter1" "" "$api_endpoint"
  VOTER1_PARTY=$(get_party "$token" "treasury-voter1" "$api_endpoint")

  create_user "$token" "treasury-voter2" "voter2" "" "$api_endpoint"
  VOTER2_PARTY=$(get_party "$token" "treasury-voter2" "$api_endpoint")

  create_user "$token" "treasury-voter3" "voter3" "" "$api_endpoint"
  VOTER3_PARTY=$(get_party "$token" "treasury-voter3" "$api_endpoint")

  # Create auditor party
  create_user "$token" "treasury-auditor" "auditor" "" "$api_endpoint"
  AUDITOR_PARTY=$(get_party "$token" "treasury-auditor" "$api_endpoint")

  # Create public observer party
  create_user "$token" "treasury-public" "publicObserver" "" "$api_endpoint"
  PUBLIC_OBSERVER_PARTY=$(get_party "$token" "treasury-public" "$api_endpoint")

  echo "=== Treasury parties created ==="
  echo "  Operator:         $OPERATOR_PARTY"
  echo "  Strategy Manager: $STRATEGY_MANAGER_PARTY"
  echo "  Voter 1:          $VOTER1_PARTY"
  echo "  Voter 2:          $VOTER2_PARTY"
  echo "  Voter 3:          $VOTER3_PARTY"
  echo "  Auditor:          $AUDITOR_PARTY"
  echo "  Public Observer:  $PUBLIC_OBSERVER_PARTY"

  # Grant rights - each party gets ActAs and ReadAs for their own identity
  for user_id in "treasury-operator" "treasury-manager" "treasury-voter1" "treasury-voter2" "treasury-voter3" "treasury-auditor" "treasury-public"; do
    local party=$(get_party "$token" "$user_id" "$api_endpoint")
    grant_rights "$token" "$user_id" "$party" "ReadAs ActAs" "$api_endpoint"
  done

  echo "=== All rights granted ==="
}

# Export party IDs for the backend service
export_treasury_config() {
  share_file "backend-service/on/backend-service.sh" <<EOF
  export TREASURY_OPERATOR_PARTY=${OPERATOR_PARTY}
  export TREASURY_STRATEGY_MANAGER_PARTY=${STRATEGY_MANAGER_PARTY}
  export TREASURY_VOTER1_PARTY=${VOTER1_PARTY}
  export TREASURY_VOTER2_PARTY=${VOTER2_PARTY}
  export TREASURY_VOTER3_PARTY=${VOTER3_PARTY}
  export TREASURY_AUDITOR_PARTY=${AUDITOR_PARTY}
  export TREASURY_PUBLIC_OBSERVER_PARTY=${PUBLIC_OBSERVER_PARTY}
EOF
}

# Main
create_treasury_parties "$APP_PROVIDER_PARTICIPANT_ADMIN_TOKEN" "canton:3${PARTICIPANT_JSON_API_PORT_SUFFIX}"
export_treasury_config

echo "=== Treasury Sandbox onboarding complete ==="
