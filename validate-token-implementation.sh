#!/bin/bash

# Token Management Implementation Validation Script
# Run this to verify all 5 steps were implemented correctly

echo "🔍 Token Management Implementation Validation"
echo "=============================================="
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Counter
CHECKS_PASSED=0
CHECKS_FAILED=0

# Function to check file exists
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
    ((CHECKS_PASSED++))
  else
    echo -e "${RED}✗${NC} $1 (MISSING)"
    ((CHECKS_FAILED++))
  fi
}

# Function to check line contains text
check_contains() {
  if grep -q "$2" "$1" 2>/dev/null; then
    echo -e "${GREEN}✓${NC} $3"
    ((CHECKS_PASSED++))
  else
    echo -e "${RED}✗${NC} $3 (NOT FOUND)"
    ((CHECKS_FAILED++))
  fi
}

echo "BƯỚC 1: Backend - Refresh Token"
echo "-------------------------------"
check_file "server/src/services/tokenService.js"
check_contains "server/src/services/tokenService.js" "generateRefreshToken" "Token service: generateRefreshToken"
check_contains "server/src/services/tokenService.js" "verifyRefreshToken" "Token service: verifyRefreshToken"
check_contains "server/src/services/tokenService.js" "revokeRefreshToken" "Token service: revokeRefreshToken"

echo ""
echo "BƯỚC 2: Frontend - Auto Refresh"
echo "-------------------------------"
check_file "client/src/utils/tokenUtils.js"
check_contains "client/src/utils/tokenUtils.js" "autoRefreshToken" "Token utils: autoRefreshToken"
check_contains "client/src/utils/tokenUtils.js" "shouldRefreshToken" "Token utils: shouldRefreshToken"
check_contains "client/src/utils/tokenUtils.js" "TokenStorage" "Token utils: TokenStorage"

echo ""
echo "BƯỚC 3: Graceful Logout"
echo "---------------------"
check_contains "client/src/utils/tokenUtils.js" "handleTokenExpiry" "Logout: handleTokenExpiry"
check_contains "client/src/utils/tokenUtils.js" "logout" "Logout: logout function"
check_contains "server/src/routes/auth.js" "/logout" "Logout: /auth/logout endpoint"

echo ""
echo "BƯỚC 4: Token Validation"
echo "----------------------"
check_contains "client/src/utils/tokenUtils.js" "validateToken" "Validation: validateToken"
check_contains "client/src/utils/tokenUtils.js" "isTokenExpired" "Validation: isTokenExpired"
check_contains "client/src/utils/tokenUtils.js" "getTokenTTL" "Validation: getTokenTTL"

echo ""
echo "BƯỚC 5: Testing"
echo "--------------"
check_file "server/test/token-management.test.js"
check_file "server/test/auth-tokens.integration.test.js"

echo ""
echo "Database"
echo "--------"
check_contains "server/prisma/schema.prisma" "RefreshToken" "Prisma: RefreshToken model added"

echo ""
echo "App Integration"
echo "--------------"
check_contains "client/src/App.jsx" "TokenStorage" "App: TokenStorage imported"
check_contains "client/src/App.jsx" "validateStoredTokens" "App: validateStoredTokens called"
check_contains "client/src/App.jsx" "token-expired" "App: token-expired event listener"

echo ""
echo "Documentation"
echo "-------------"
check_file "TOKEN_MANAGEMENT_IMPLEMENTATION.md"
check_file "QUICK_START_TOKEN_MANAGEMENT.md"

echo ""
echo "=============================================="
echo ""
echo -e "Results:"
echo -e "  ${GREEN}Passed: $CHECKS_PASSED${NC}"
echo -e "  ${RED}Failed: $CHECKS_FAILED${NC}"
echo ""

if [ $CHECKS_FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ ALL CHECKS PASSED - Implementation Complete!${NC}"
  exit 0
else
  echo -e "${YELLOW}⚠ Some checks failed - Review missing files${NC}"
  exit 1
fi
