#!/bin/bash

# Comprehensive Test Suite for Packaging Products WebOrders
# Tests all features across Phase 1-4

BASE_URL="https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod"
PASS_COUNT=0
FAIL_COUNT=0

echo "=========================================="
echo "Packaging Products WebOrders - Full Test Suite"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

test_endpoint() {
    local name=$1
    local url=$2
    local method=${3:-GET}
    local data=$4

    echo -n "Testing $name... "

    if [ "$method" = "GET" ]; then
        response=$(curl -s -w "\n%{http_code}" "$url")
    elif [ "$method" = "POST" ]; then
        response=$(curl -s -w "\n%{http_code}" -X POST "$url" -H "Content-Type: application/json" -d "$data")
    elif [ "$method" = "PUT" ]; then
        response=$(curl -s -w "\n%{http_code}" -X PUT "$url" -H "Content-Type: application/json" -d "$data")
    elif [ "$method" = "DELETE" ]; then
        response=$(curl -s -w "\n%{http_code}" -X DELETE "$url")
    fi

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    if [ "$http_code" -ge 200 ] && [ "$http_code" -lt 300 ]; then
        echo -e "${GREEN}✓ PASS${NC} ($http_code)"
        ((PASS_COUNT++))
        return 0
    else
        echo -e "${RED}✗ FAIL${NC} ($http_code)"
        echo "  Response: $body"
        ((FAIL_COUNT++))
        return 1
    fi
}

echo "=== Phase 1: Core Features ==="
echo ""

# Query Lambda - Orders
echo "Testing Orders API..."
test_endpoint "GET /api/orders" "${BASE_URL}/api/orders?limit=5"
test_endpoint "GET /api/reports/overview" "${BASE_URL}/api/reports/overview"

# Query Lambda - Customer Segmentation
echo ""
echo "Testing Customer Segmentation..."
test_endpoint "GET /api/customers (with segmentation)" "${BASE_URL}/api/customers?limit=3"

# Query Lambda - Product Categories
echo ""
echo "Testing Product Categories..."
test_endpoint "GET /api/products/categories" "${BASE_URL}/api/products/categories"
test_endpoint "GET /api/reports/products" "${BASE_URL}/api/reports/products?limit=5"

# Auth endpoints (Cognito) - Test with valid credentials
echo ""
echo "Testing Authentication..."
test_endpoint "POST /auth/login (admin user)" "${BASE_URL}/auth/login" POST '{"email":"andy@automateai.co.nz","password":"M0rning123!!!"}'

echo ""
echo "=== Phase 2: Admin Features ==="
echo ""

# Admin Config (using correct /settings path)
echo "Testing Admin Configuration..."
test_endpoint "GET /api/admin/settings" "${BASE_URL}/api/admin/settings"
test_endpoint "GET /api/admin/settings/schemas" "${BASE_URL}/api/admin/settings/schemas"

echo ""
echo "=== Phase 4: Campaigns (Placeholders) ==="
echo ""

# Campaigns
echo "Testing Campaigns..."
test_endpoint "GET /api/campaigns (placeholder)" "${BASE_URL}/api/campaigns"

echo ""
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo -e "Total Tests: $((PASS_COUNT + FAIL_COUNT))"
echo -e "${GREEN}Passed: $PASS_COUNT${NC}"
echo -e "${RED}Failed: $FAIL_COUNT${NC}"
echo ""

if [ $FAIL_COUNT -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some tests failed${NC}"
    exit 1
fi
