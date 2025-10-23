#!/bin/bash

# Performance Testing Script
# Tests various endpoints and measures response times

API_BASE="https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod"

echo "========================================="
echo "Performance Testing Suite"
echo "========================================="
echo ""
echo "Testing endpoints with timing..."
echo ""

# Function to test endpoint and extract metrics
test_endpoint() {
  local name=$1
  local url=$2

  echo "Testing: $name"
  echo "URL: $url"

  # Make request and capture timing
  local start=$(date +%s%N)
  local response=$(curl -s -w "\n%{time_total}" "$url")
  local end=$(date +%s%N)

  # Extract curl timing (in seconds)
  local curl_time=$(echo "$response" | tail -n1)

  # Extract responseTime from API response (if present)
  local api_time=$(echo "$response" | head -n-1 | grep -o '"responseTime":"[^"]*"' | cut -d'"' -f4)

  # Extract cacheHit status
  local cache_hit=$(echo "$response" | head -n-1 | grep -o '"cacheHit":[^,}]*' | cut -d':' -f2)

  # Calculate milliseconds
  local duration_ms=$(echo "scale=0; ($end - $start) / 1000000" | bc)

  echo "  Total Time: ${duration_ms}ms"
  echo "  Curl Time: ${curl_time}s"

  if [ ! -z "$api_time" ]; then
    echo "  API Response Time: $api_time"
  fi

  if [ ! -z "$cache_hit" ]; then
    echo "  Cache Hit: $cache_hit"
  fi

  # Check for slow queries
  if [ $duration_ms -gt 1000 ]; then
    echo "  WARNING: SLOW QUERY (>1000ms)"
  fi

  echo ""
}

# Test 1: List customers (should use cache)
test_endpoint "List Customers (limit=10)" \
  "$API_BASE/api/customers?limit=10"

# Test 2: List customers (limit=50)
test_endpoint "List Customers (limit=50)" \
  "$API_BASE/api/customers?limit=50"

# Test 3: Get single customer (should use cache)
test_endpoint "Get Single Customer" \
  "$API_BASE/api/customers/7b0d485f-8ef9-45b0-881a-9d8f4447ced2"

# Test 4: List orders
test_endpoint "List Orders (limit=10)" \
  "$API_BASE/api/orders?limit=10"

# Test 5: Overview report
test_endpoint "Overview Report" \
  "$API_BASE/api/reports/overview"

# Test 6: Product report
test_endpoint "Product Report" \
  "$API_BASE/api/reports/products"

# Test 7: Search customers (no cache)
test_endpoint "Search Customers (no cache)" \
  "$API_BASE/api/customers?search=test&limit=10"

echo "========================================="
echo "Performance Test Complete"
echo "========================================="
echo ""
echo "Expected results with cache enabled:"
echo "  - List Customers: <100ms with cacheHit: true"
echo "  - Get Customer: <50ms with cacheHit: true"
echo "  - Search: 500-1500ms (no cache)"
echo ""
echo "Check CloudWatch Logs for slow query warnings:"
echo "  aws logs tail /aws/lambda/queryPackagingProductsOrders --region ap-southeast-2"
echo ""
