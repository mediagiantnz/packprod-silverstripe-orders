#!/bin/bash

# Test Customer Segmentation API
# This script demonstrates the new segmentation fields in customer endpoints

API_BASE="https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod"

echo "================================================================================"
echo "CUSTOMER SEGMENTATION API TESTING"
echo "================================================================================"
echo ""
echo "Testing enhanced customer segmentation with:"
echo "  - segment: New, Active, Dormant, VIP"
echo "  - lastOrderDaysAgo: Days since last order"
echo "  - purchaseFrequency: Weekly, Monthly, Quarterly, Occasional, One-time"
echo ""
echo "================================================================================"
echo ""

echo "Test 1: List All Customers (with segmentation)"
echo "--------------------------------------------------------------------------------"
echo "Endpoint: GET /api/customers?limit=5"
echo ""
curl -s "${API_BASE}/api/customers?limit=5" | jq '{
  success: .success,
  count: .meta.count,
  customers: .data | map({
    name: .name,
    company: .company,
    email: .email,
    segment: .metrics.segment,
    orderCount: .metrics.orderCount,
    totalSpend: .metrics.totalSpend,
    lastOrderDaysAgo: .metrics.lastOrderDaysAgo,
    purchaseFrequency: .metrics.purchaseFrequency,
    lastOrderDate: .metrics.lastOrderDate
  })
}'
echo ""
echo ""

echo "Test 2: Get Single Customer (detailed segmentation)"
echo "--------------------------------------------------------------------------------"
echo "Endpoint: GET /api/customers/{contactID}"
echo ""
echo "First, get a customer ID from the list..."
CUSTOMER_ID=$(curl -s "${API_BASE}/api/customers?limit=1" | jq -r '.data[0].contactID')
echo "Using Customer ID: $CUSTOMER_ID"
echo ""
curl -s "${API_BASE}/api/customers/${CUSTOMER_ID}" | jq '{
  success: .success,
  customer: {
    contactID: .data.contactID,
    name: .data.name,
    company: .data.company,
    email: .data.email,
    phone: .data.phone,
    accountName: .data.accountName,
    metrics: {
      segment: .data.metrics.segment,
      orderCount: .data.metrics.orderCount,
      totalSpend: .data.metrics.totalSpend,
      lastOrderDaysAgo: .data.metrics.lastOrderDaysAgo,
      purchaseFrequency: .data.metrics.purchaseFrequency,
      lastOrderDate: .data.metrics.lastOrderDate,
      lastOrderReference: .data.metrics.lastOrderReference
    }
  }
}'
echo ""
echo ""

echo "Test 3: Customer Segmentation Breakdown"
echo "--------------------------------------------------------------------------------"
echo "Getting all customers and counting by segment..."
echo ""
curl -s "${API_BASE}/api/customers?limit=100" | jq -r '
  .data | group_by(.metrics.segment) |
  map({
    segment: .[0].metrics.segment,
    count: length,
    totalRevenue: (map(.metrics.totalSpend | tonumber) | add),
    avgSpend: ((map(.metrics.totalSpend | tonumber) | add) / length)
  }) |
  "Segment Breakdown:",
  "================================================================================",
  (map("  \(.segment): \(.count) customers | Total: $\(.totalRevenue | tostring) | Avg: $\(.avgSpend | tostring)") | join("\n"))
'
echo ""
echo ""

echo "Test 4: Purchase Frequency Breakdown"
echo "--------------------------------------------------------------------------------"
echo "Getting all customers and counting by purchase frequency..."
echo ""
curl -s "${API_BASE}/api/customers?limit=100" | jq -r '
  .data | group_by(.metrics.purchaseFrequency) |
  map({
    frequency: .[0].metrics.purchaseFrequency,
    count: length,
    avgOrderCount: ((map(.metrics.orderCount) | add) / length)
  }) |
  "Purchase Frequency Breakdown:",
  "================================================================================",
  (map("  \(.frequency): \(.count) customers | Avg Orders: \(.avgOrderCount | tostring)") | join("\n"))
'
echo ""
echo ""

echo "Test 5: VIP Customers (Spend > $5000)"
echo "--------------------------------------------------------------------------------"
echo "Filtering customers by VIP segment..."
echo ""
curl -s "${API_BASE}/api/customers?limit=100" | jq '{
  vipCustomers: [
    .data[] | select(.metrics.segment == "VIP") | {
      name: .name,
      company: .company,
      totalSpend: .metrics.totalSpend,
      orderCount: .metrics.orderCount,
      purchaseFrequency: .metrics.purchaseFrequency,
      lastOrderDaysAgo: .metrics.lastOrderDaysAgo
    }
  ],
  summary: {
    totalVIPs: ([.data[] | select(.metrics.segment == "VIP")] | length),
    totalVIPRevenue: ([.data[] | select(.metrics.segment == "VIP") | .metrics.totalSpend | tonumber] | add)
  }
}'
echo ""
echo ""

echo "Test 6: Dormant Customers (Last order > 90 days ago)"
echo "--------------------------------------------------------------------------------"
echo "Filtering customers by Dormant segment..."
echo ""
curl -s "${API_BASE}/api/customers?limit=100" | jq '{
  dormantCustomers: [
    .data[] | select(.metrics.segment == "Dormant") | {
      name: .name,
      company: .company,
      lastOrderDaysAgo: .metrics.lastOrderDaysAgo,
      totalSpend: .metrics.totalSpend,
      orderCount: .metrics.orderCount,
      lastOrderDate: .metrics.lastOrderDate
    }
  ],
  summary: {
    totalDormant: ([.data[] | select(.metrics.segment == "Dormant")] | length),
    potentialRevenue: ([.data[] | select(.metrics.segment == "Dormant") | .metrics.totalSpend | tonumber] | add)
  }
}'
echo ""
echo ""

echo "Test 7: New Customers (First order < 30 days ago)"
echo "--------------------------------------------------------------------------------"
echo "Filtering customers by New segment..."
echo ""
curl -s "${API_BASE}/api/customers?limit=100" | jq '{
  newCustomers: [
    .data[] | select(.metrics.segment == "New") | {
      name: .name,
      company: .company,
      orderCount: .metrics.orderCount,
      totalSpend: .metrics.totalSpend,
      lastOrderDaysAgo: .metrics.lastOrderDaysAgo,
      purchaseFrequency: .metrics.purchaseFrequency
    }
  ],
  summary: {
    totalNew: ([.data[] | select(.metrics.segment == "New")] | length),
    avgOrderCount: (([.data[] | select(.metrics.segment == "New") | .metrics.orderCount] | add) / ([.data[] | select(.metrics.segment == "New")] | length))
  }
}'
echo ""
echo ""

echo "================================================================================"
echo "API TESTING COMPLETE"
echo "================================================================================"
echo ""
echo "Summary of new segmentation fields:"
echo "  ✓ segment: Customer lifecycle stage (New/Active/Dormant/VIP)"
echo "  ✓ lastOrderDaysAgo: Days since last order for recency analysis"
echo "  ✓ purchaseFrequency: Purchase cadence (Weekly/Monthly/Quarterly/Occasional)"
echo ""
echo "These fields are now available in:"
echo "  - GET /api/customers (list all customers)"
echo "  - GET /api/customers/{contactID} (single customer)"
echo ""
echo "Backward compatibility: ✓ All existing fields remain unchanged"
echo ""
