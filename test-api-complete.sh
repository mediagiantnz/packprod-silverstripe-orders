#!/bin/bash

################################################################################
# Packaging Products WebOrders - Comprehensive API Testing Script
#
# This script tests all API endpoints with various parameters, validates
# response structures, measures performance, and generates detailed reports.
#
# Usage:
#   bash test-api-complete.sh
#
# Output:
#   - Colored console output (green=pass, red=fail)
#   - Detailed test results saved to test-results.log
#   - Performance metrics for each endpoint
#   - Pass/fail summary at the end
#
# Author: Media Giant NZ
# Date: October 2025
################################################################################

# Configuration
BASE_URL="https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod"
LOG_FILE="test-results.log"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Color codes for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color
BOLD='\033[1m'

# Test counters
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

# Performance tracking
declare -A RESPONSE_TIMES

################################################################################
# Helper Functions
################################################################################

# Initialize log file
initialize_log() {
    echo "=====================================================================" > "$LOG_FILE"
    echo "API Testing Report - $TIMESTAMP" >> "$LOG_FILE"
    echo "Base URL: $BASE_URL" >> "$LOG_FILE"
    echo "=====================================================================" >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

# Print section header
print_header() {
    local title="$1"
    echo ""
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BOLD}${CYAN}  $title${NC}"
    echo -e "${BOLD}${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""

    echo "=====================================================================" >> "$LOG_FILE"
    echo "$title" >> "$LOG_FILE"
    echo "=====================================================================" >> "$LOG_FILE"
}

# Print test name
print_test() {
    local test_name="$1"
    echo -e "${YELLOW}[TEST]${NC} $test_name"
    echo "[TEST] $test_name" >> "$LOG_FILE"
}

# Print success message
print_success() {
    local message="$1"
    echo -e "${GREEN}✓ PASS${NC} $message"
    echo "[PASS] $message" >> "$LOG_FILE"
    ((PASSED_TESTS++))
}

# Print failure message
print_failure() {
    local message="$1"
    local details="$2"
    echo -e "${RED}✗ FAIL${NC} $message"
    echo "[FAIL] $message" >> "$LOG_FILE"
    if [ -n "$details" ]; then
        echo -e "${RED}  └─ $details${NC}"
        echo "  Details: $details" >> "$LOG_FILE"
    fi
    ((FAILED_TESTS++))
}

# Print info message
print_info() {
    local message="$1"
    echo -e "${CYAN}  ℹ${NC} $message"
    echo "  INFO: $message" >> "$LOG_FILE"
}

# Make API request and measure response time
api_request() {
    local method="$1"
    local endpoint="$2"
    local test_name="$3"

    ((TOTAL_TESTS++))
    print_test "$test_name"

    local url="${BASE_URL}${endpoint}"
    print_info "URL: $url"

    # Measure response time
    local start_time=$(date +%s%N)

    if [ "$method" = "GET" ]; then
        RESPONSE=$(curl -s -w "\n%{http_code}" "$url")
    elif [ "$method" = "POST" ]; then
        local data="$4"
        RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$url" \
            -H "Content-Type: application/json" \
            -d "$data")
    fi

    local end_time=$(date +%s%N)
    local duration=$(( (end_time - start_time) / 1000000 )) # Convert to milliseconds

    # Extract HTTP status code (last line)
    HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
    # Extract response body (all lines except last)
    RESPONSE_BODY=$(echo "$RESPONSE" | sed '$d')

    # Store response time
    RESPONSE_TIMES["$test_name"]=$duration

    print_info "Response Time: ${duration}ms"
    print_info "HTTP Status: $HTTP_CODE"

    echo "  Response Time: ${duration}ms" >> "$LOG_FILE"
    echo "  HTTP Status: $HTTP_CODE" >> "$LOG_FILE"
    echo "  Response Body (first 500 chars):" >> "$LOG_FILE"
    echo "$RESPONSE_BODY" | head -c 500 >> "$LOG_FILE"
    echo "" >> "$LOG_FILE"
}

# Validate JSON response structure
validate_json() {
    local expected_field="$1"
    local description="$2"

    if echo "$RESPONSE_BODY" | jq -e "$expected_field" > /dev/null 2>&1; then
        print_success "$description"
        return 0
    else
        print_failure "$description" "Field '$expected_field' not found or invalid"
        return 1
    fi
}

# Validate HTTP status code
validate_status() {
    local expected="$1"
    local description="$2"

    if [ "$HTTP_CODE" = "$expected" ]; then
        print_success "$description (HTTP $HTTP_CODE)"
        return 0
    else
        print_failure "$description" "Expected HTTP $expected, got HTTP $HTTP_CODE"
        return 1
    fi
}

# Display sample data from response
show_sample_data() {
    local field="$1"
    local description="$2"

    if echo "$RESPONSE_BODY" | jq -e "$field" > /dev/null 2>&1; then
        local sample=$(echo "$RESPONSE_BODY" | jq -c "$field")
        print_info "$description: $sample"
        echo "  $description: $sample" >> "$LOG_FILE"
    fi
}

################################################################################
# Test Suites
################################################################################

# Test: GET /api/reports/overview
test_reports_overview() {
    api_request "GET" "/api/reports/overview" "Dashboard Overview Report"

    validate_status "200" "Should return HTTP 200"
    validate_json ".success" "Response should have 'success' field"
    validate_json ".overview" "Response should have 'overview' field"
    validate_json ".overview.today" "Overview should include 'today' metrics"
    validate_json ".overview.this_week" "Overview should include 'this_week' metrics"
    validate_json ".overview.this_month" "Overview should include 'this_month' metrics"
    validate_json ".overview.total_customers" "Overview should include 'total_customers'"

    # Show sample data
    show_sample_data ".overview.today" "Today's metrics"
    show_sample_data ".overview.this_week" "This week's metrics"

    if echo "$RESPONSE_BODY" | jq -e ".recent_orders" > /dev/null 2>&1; then
        local count=$(echo "$RESPONSE_BODY" | jq '.recent_orders | length')
        print_info "Recent orders count: $count"
    fi
}

# Test: GET /api/orders (basic)
test_orders_basic() {
    api_request "GET" "/api/orders" "List Orders - Basic"

    validate_status "200" "Should return HTTP 200"
    validate_json ".success" "Response should have 'success' field"
    validate_json ".orders" "Response should have 'orders' array"
    validate_json ".meta" "Response should have 'meta' field"

    # Check orders count
    if echo "$RESPONSE_BODY" | jq -e ".orders" > /dev/null 2>&1; then
        local count=$(echo "$RESPONSE_BODY" | jq '.orders | length')
        print_info "Orders returned: $count"

        # Show first order sample
        if [ "$count" -gt 0 ]; then
            show_sample_data ".orders[0] | {orderID, order_reference, total: .totals.total}" "First order"
        fi
    fi
}

# Test: GET /api/orders with limit
test_orders_with_limit() {
    api_request "GET" "/api/orders?limit=5" "List Orders - With Limit (5)"

    validate_status "200" "Should return HTTP 200"
    validate_json ".orders" "Response should have 'orders' array"

    # Verify limit is respected
    if echo "$RESPONSE_BODY" | jq -e ".orders" > /dev/null 2>&1; then
        local count=$(echo "$RESPONSE_BODY" | jq '.orders | length')
        if [ "$count" -le 5 ]; then
            print_success "Limit parameter respected (returned $count orders)"
        else
            print_failure "Limit parameter not respected" "Expected ≤5 orders, got $count"
        fi
    fi
}

# Test: GET /api/orders with date filters
test_orders_with_dates() {
    local start_date="2025-10-01"
    local end_date="2025-10-31"

    api_request "GET" "/api/orders?startDate=${start_date}&endDate=${end_date}" \
        "List Orders - Date Range (Oct 2025)"

    validate_status "200" "Should return HTTP 200"
    validate_json ".orders" "Response should have 'orders' array"

    # Check meta information
    show_sample_data ".meta" "Metadata"

    if echo "$RESPONSE_BODY" | jq -e ".orders" > /dev/null 2>&1; then
        local count=$(echo "$RESPONSE_BODY" | jq '.orders | length')
        print_info "Orders in date range: $count"
    fi
}

# Test: GET /api/orders with search
test_orders_with_search() {
    api_request "GET" "/api/orders?search=ash" "List Orders - Search (customer 'ash')"

    validate_status "200" "Should return HTTP 200"
    validate_json ".orders" "Response should have 'orders' array"

    if echo "$RESPONSE_BODY" | jq -e ".orders" > /dev/null 2>&1; then
        local count=$(echo "$RESPONSE_BODY" | jq '.orders | length')
        print_info "Matching orders: $count"
    fi
}

# Test: GET /api/orders/{orderID} - Valid
test_orders_by_id_valid() {
    # First, get a valid order ID from the orders list
    api_request "GET" "/api/orders?limit=1" "Get Order ID for testing"

    local order_id=$(echo "$RESPONSE_BODY" | jq -r '.orders[0].orderID // empty')

    if [ -n "$order_id" ] && [ "$order_id" != "null" ]; then
        print_info "Using orderID: $order_id"

        api_request "GET" "/api/orders/${order_id}" "Get Single Order - Valid ID"

        validate_status "200" "Should return HTTP 200"
        validate_json ".success" "Response should have 'success' field"
        validate_json ".order" "Response should have 'order' object"
        validate_json ".order.orderID" "Order should have orderID"
        validate_json ".order.customer" "Order should have customer details"
        validate_json ".order.items" "Order should have items array"
        validate_json ".order.totals" "Order should have totals"

        show_sample_data ".order.customer" "Customer details"
        show_sample_data ".order.totals" "Order totals"
    else
        print_info "No orders available - skipping single order test"
    fi
}

# Test: GET /api/orders/{orderID} - Invalid
test_orders_by_id_invalid() {
    api_request "GET" "/api/orders/INVALID-ORDER-ID" "Get Single Order - Invalid ID"

    # Should return 404 or error response
    if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "400" ]; then
        print_success "Correctly handles invalid order ID (HTTP $HTTP_CODE)"
    else
        print_failure "Should return 404/400 for invalid order ID" "Got HTTP $HTTP_CODE"
    fi

    validate_json ".error" "Error response should have 'error' field"
}

# Test: GET /api/customers (basic)
test_customers_basic() {
    api_request "GET" "/api/customers" "List Customers - Basic"

    validate_status "200" "Should return HTTP 200"
    validate_json ".success" "Response should have 'success' field"
    validate_json ".customers" "Response should have 'customers' array"
    validate_json ".meta" "Response should have 'meta' field"

    if echo "$RESPONSE_BODY" | jq -e ".customers" > /dev/null 2>&1; then
        local count=$(echo "$RESPONSE_BODY" | jq '.customers | length')
        print_info "Customers returned: $count"

        # Show first customer sample
        if [ "$count" -gt 0 ]; then
            show_sample_data ".customers[0] | {contactID, contact_name, email}" "First customer"
        fi
    fi
}

# Test: GET /api/customers with limit
test_customers_with_limit() {
    api_request "GET" "/api/customers?limit=3" "List Customers - With Limit (3)"

    validate_status "200" "Should return HTTP 200"

    if echo "$RESPONSE_BODY" | jq -e ".customers" > /dev/null 2>&1; then
        local count=$(echo "$RESPONSE_BODY" | jq '.customers | length')
        if [ "$count" -le 3 ]; then
            print_success "Limit parameter respected (returned $count customers)"
        else
            print_failure "Limit parameter not respected" "Expected ≤3 customers, got $count"
        fi
    fi
}

# Test: GET /api/customers with search
test_customers_with_search() {
    api_request "GET" "/api/customers?search=ash" "List Customers - Search ('ash')"

    validate_status "200" "Should return HTTP 200"
    validate_json ".customers" "Response should have 'customers' array"

    if echo "$RESPONSE_BODY" | jq -e ".customers" > /dev/null 2>&1; then
        local count=$(echo "$RESPONSE_BODY" | jq '.customers | length')
        print_info "Matching customers: $count"
    fi
}

# Test: GET /api/customers/{contactID} - Valid
test_customers_by_id_valid() {
    # First, get a valid contact ID
    api_request "GET" "/api/customers?limit=1" "Get Contact ID for testing"

    local contact_id=$(echo "$RESPONSE_BODY" | jq -r '.customers[0].contactID // empty')

    if [ -n "$contact_id" ] && [ "$contact_id" != "null" ]; then
        print_info "Using contactID: $contact_id"

        api_request "GET" "/api/customers/${contact_id}" "Get Single Customer - Valid ID"

        validate_status "200" "Should return HTTP 200"
        validate_json ".success" "Response should have 'success' field"
        validate_json ".customer" "Response should have 'customer' object"
        validate_json ".customer.contactID" "Customer should have contactID"

        show_sample_data ".customer | {contact_name, email, company}" "Customer details"
    else
        print_info "No customers available - skipping single customer test"
    fi
}

# Test: GET /api/customers/{contactID} - Invalid
test_customers_by_id_invalid() {
    api_request "GET" "/api/customers/INVALID-CONTACT-ID" "Get Single Customer - Invalid ID"

    if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "400" ]; then
        print_success "Correctly handles invalid contact ID (HTTP $HTTP_CODE)"
    else
        print_failure "Should return 404/400 for invalid contact ID" "Got HTTP $HTTP_CODE"
    fi

    validate_json ".error" "Error response should have 'error' field"
}

# Test: GET /api/customers/{contactID}/orders
test_customer_orders() {
    # Get a valid contact ID
    api_request "GET" "/api/customers?limit=1" "Get Contact ID for order history test"

    local contact_id=$(echo "$RESPONSE_BODY" | jq -r '.customers[0].contactID // empty')

    if [ -n "$contact_id" ] && [ "$contact_id" != "null" ]; then
        print_info "Using contactID: $contact_id"

        api_request "GET" "/api/customers/${contact_id}/orders" "Get Customer Order History"

        validate_status "200" "Should return HTTP 200"
        validate_json ".success" "Response should have 'success' field"
        validate_json ".orders" "Response should have 'orders' array"

        if echo "$RESPONSE_BODY" | jq -e ".orders" > /dev/null 2>&1; then
            local count=$(echo "$RESPONSE_BODY" | jq '.orders | length')
            print_info "Customer has $count orders"
        fi
    else
        print_info "No customers available - skipping customer orders test"
    fi
}

# Test: GET /api/reports/products (basic)
test_reports_products_basic() {
    api_request "GET" "/api/reports/products" "Product Analytics - Basic"

    validate_status "200" "Should return HTTP 200"
    validate_json ".success" "Response should have 'success' field"
    validate_json ".summary" "Response should have 'summary' field"
    validate_json ".topByRevenue" "Response should have 'topByRevenue' array"
    validate_json ".topByQuantity" "Response should have 'topByQuantity' array"

    # Show summary
    show_sample_data ".summary" "Product summary"

    # Show top product by revenue
    if echo "$RESPONSE_BODY" | jq -e ".topByRevenue[0]" > /dev/null 2>&1; then
        show_sample_data ".topByRevenue[0]" "Top product by revenue"
    fi
}

# Test: GET /api/reports/products with date range
test_reports_products_with_dates() {
    local start_date="2025-10-01"
    local end_date="2025-10-31"

    api_request "GET" "/api/reports/products?startDate=${start_date}&endDate=${end_date}" \
        "Product Analytics - Date Range (Oct 2025)"

    validate_status "200" "Should return HTTP 200"
    validate_json ".topByRevenue" "Response should have 'topByRevenue' array"

    show_sample_data ".summary" "Summary for date range"
}

# Test: GET /api/reports/sales - Daily grouping
test_reports_sales_daily() {
    api_request "GET" "/api/reports/sales?groupBy=day" "Sales Report - Daily Grouping"

    validate_status "200" "Should return HTTP 200"
    validate_json ".success" "Response should have 'success' field"
    validate_json ".summary" "Response should have 'summary' field"
    validate_json ".timeline" "Response should have 'timeline' array"
    validate_json ".summary.group_by" "Summary should have 'group_by' field"

    # Verify groupBy parameter
    local group_by=$(echo "$RESPONSE_BODY" | jq -r '.summary.group_by // empty')
    if [ "$group_by" = "day" ]; then
        print_success "GroupBy parameter correctly applied (day)"
    else
        print_failure "GroupBy parameter not correctly applied" "Expected 'day', got '$group_by'"
    fi

    show_sample_data ".summary" "Sales summary (daily)"

    # Show first timeline entry
    if echo "$RESPONSE_BODY" | jq -e ".timeline[0]" > /dev/null 2>&1; then
        show_sample_data ".timeline[0]" "First timeline entry"
    fi
}

# Test: GET /api/reports/sales - Weekly grouping
test_reports_sales_weekly() {
    api_request "GET" "/api/reports/sales?groupBy=week" "Sales Report - Weekly Grouping"

    validate_status "200" "Should return HTTP 200"

    local group_by=$(echo "$RESPONSE_BODY" | jq -r '.summary.group_by // empty')
    if [ "$group_by" = "week" ]; then
        print_success "GroupBy parameter correctly applied (week)"
    else
        print_failure "GroupBy parameter not correctly applied" "Expected 'week', got '$group_by'"
    fi

    show_sample_data ".summary" "Sales summary (weekly)"
}

# Test: GET /api/reports/sales - Monthly grouping
test_reports_sales_monthly() {
    api_request "GET" "/api/reports/sales?groupBy=month" "Sales Report - Monthly Grouping"

    validate_status "200" "Should return HTTP 200"

    local group_by=$(echo "$RESPONSE_BODY" | jq -r '.summary.group_by // empty')
    if [ "$group_by" = "month" ]; then
        print_success "GroupBy parameter correctly applied (month)"
    else
        print_failure "GroupBy parameter not correctly applied" "Expected 'month', got '$group_by'"
    fi

    show_sample_data ".summary" "Sales summary (monthly)"
}

# Test: GET /api/reports/sales with date range
test_reports_sales_with_dates() {
    local start_date="2025-10-01"
    local end_date="2025-10-31"

    api_request "GET" "/api/reports/sales?startDate=${start_date}&endDate=${end_date}&groupBy=day" \
        "Sales Report - Date Range + Daily (Oct 2025)"

    validate_status "200" "Should return HTTP 200"
    validate_json ".timeline" "Response should have 'timeline' array"

    show_sample_data ".summary" "Sales summary for date range"
}

# Test: POST /admin/contacts/import/packaging-products
test_import_endpoint() {
    local test_payload='{
      "clientID": "7b0d485f-8ef9-45b0-881a-9d8f4447ced2",
      "order": {
        "order_reference": "TEST-999999",
        "order_date": "21/10/2025 11:49 am",
        "greentree_id": "9999.999999"
      },
      "customer": {
        "contact_name": "Test Customer",
        "email": "test-'$(date +%s)'@example.com",
        "phone": "0210000000",
        "company": "Test Company",
        "account_name": "PPL Web Sales",
        "account_code": "100014"
      },
      "items": [
        {
          "product_code": "TEST1",
          "description": "Test Product",
          "quantity": 1,
          "unit_price": 10.00,
          "total_price": 10.00
        }
      ],
      "totals": {
        "total": "11.50"
      },
      "payment": {
        "payment_type": "Test",
        "transaction_id": "TEST-'$(date +%s)'"
      }
    }'

    api_request "POST" "/admin/contacts/import/packaging-products" \
        "Import Order - POST Endpoint" "$test_payload"

    validate_status "200" "Should return HTTP 200"
    validate_json ".message" "Response should have 'message' field"
    validate_json ".result" "Response should have 'result' field"

    # Check if import was successful
    local result=$(echo "$RESPONSE_BODY" | jq -r '.result // empty')
    if [ "$result" = "SUCCESS" ]; then
        print_success "Import completed successfully"
        show_sample_data ".contactID" "Contact ID"
        show_sample_data ".orderID" "Order ID"
    else
        print_info "Import result: $result"
    fi
}

# Test: Error handling - Missing required parameters
test_error_missing_params() {
    api_request "GET" "/api/orders/   " "Error Handling - Invalid orderID (whitespace)"

    # Should return error response
    if [ "$HTTP_CODE" = "400" ] || [ "$HTTP_CODE" = "404" ]; then
        print_success "Correctly handles missing/invalid parameters"
    else
        print_info "Response status: HTTP $HTTP_CODE"
    fi
}

################################################################################
# Performance Summary
################################################################################

print_performance_summary() {
    print_header "Performance Metrics"

    echo -e "${BOLD}Response Times:${NC}"
    echo ""

    # Sort by response time
    for test_name in "${!RESPONSE_TIMES[@]}"; do
        echo "${RESPONSE_TIMES[$test_name]} $test_name"
    done | sort -n | while read duration test_name; do
        # Color code based on performance
        if [ "$duration" -lt 500 ]; then
            color=$GREEN
        elif [ "$duration" -lt 1000 ]; then
            color=$YELLOW
        else
            color=$RED
        fi

        printf "${color}%6dms${NC} - %s\n" "$duration" "$test_name"
        printf "%6dms - %s\n" "$duration" "$test_name" >> "$LOG_FILE"
    done

    echo ""

    # Calculate average response time
    local total_time=0
    local count=0
    for duration in "${RESPONSE_TIMES[@]}"; do
        total_time=$((total_time + duration))
        ((count++))
    done

    if [ "$count" -gt 0 ]; then
        local avg=$((total_time / count))
        echo -e "${BOLD}Average Response Time:${NC} ${avg}ms"
        echo "Average Response Time: ${avg}ms" >> "$LOG_FILE"
    fi

    echo ""
}

################################################################################
# Final Summary
################################################################################

print_summary() {
    print_header "Test Summary"

    local pass_rate=0
    if [ "$TOTAL_TESTS" -gt 0 ]; then
        pass_rate=$(( (PASSED_TESTS * 100) / TOTAL_TESTS ))
    fi

    echo -e "${BOLD}Total Tests:${NC}   $TOTAL_TESTS"
    echo -e "${GREEN}${BOLD}Passed:${NC}        $PASSED_TESTS"
    echo -e "${RED}${BOLD}Failed:${NC}        $FAILED_TESTS"
    echo -e "${BOLD}Pass Rate:${NC}     ${pass_rate}%"
    echo ""

    echo "=====================================================================" >> "$LOG_FILE"
    echo "Test Summary" >> "$LOG_FILE"
    echo "=====================================================================" >> "$LOG_FILE"
    echo "Total Tests:   $TOTAL_TESTS" >> "$LOG_FILE"
    echo "Passed:        $PASSED_TESTS" >> "$LOG_FILE"
    echo "Failed:        $FAILED_TESTS" >> "$LOG_FILE"
    echo "Pass Rate:     ${pass_rate}%" >> "$LOG_FILE"

    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo -e "${GREEN}${BOLD}🎉 All tests passed!${NC}"
        echo "All tests passed!" >> "$LOG_FILE"
    else
        echo -e "${RED}${BOLD}⚠️  Some tests failed. Check the log for details.${NC}"
        echo "Some tests failed." >> "$LOG_FILE"
    fi

    echo ""
    echo -e "Detailed results saved to: ${CYAN}${LOG_FILE}${NC}"
    echo ""
}

################################################################################
# Main Execution
################################################################################

main() {
    # Check for required tools
    if ! command -v curl &> /dev/null; then
        echo "Error: curl is required but not installed."
        exit 1
    fi

    if ! command -v jq &> /dev/null; then
        echo "Error: jq is required but not installed."
        echo "Install with: apt-get install jq (Linux) or brew install jq (Mac)"
        exit 1
    fi

    # Initialize
    initialize_log

    echo ""
    echo -e "${BOLD}${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
    echo -e "${BOLD}${CYAN}║                                                                   ║${NC}"
    echo -e "${BOLD}${CYAN}║    Packaging Products WebOrders - API Testing Suite              ║${NC}"
    echo -e "${BOLD}${CYAN}║                                                                   ║${NC}"
    echo -e "${BOLD}${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo -e "${BOLD}Base URL:${NC} $BASE_URL"
    echo -e "${BOLD}Log File:${NC} $LOG_FILE"
    echo -e "${BOLD}Started:${NC}  $TIMESTAMP"
    echo ""

    # Run all test suites
    print_header "1. Dashboard & Overview"
    test_reports_overview

    print_header "2. Orders Endpoints"
    test_orders_basic
    test_orders_with_limit
    test_orders_with_dates
    test_orders_with_search
    test_orders_by_id_valid
    test_orders_by_id_invalid

    print_header "3. Customers Endpoints"
    test_customers_basic
    test_customers_with_limit
    test_customers_with_search
    test_customers_by_id_valid
    test_customers_by_id_invalid
    test_customer_orders

    print_header "4. Product Reports"
    test_reports_products_basic
    test_reports_products_with_dates

    print_header "5. Sales Reports"
    test_reports_sales_daily
    test_reports_sales_weekly
    test_reports_sales_monthly
    test_reports_sales_with_dates

    print_header "6. Import Endpoint"
    test_import_endpoint

    print_header "7. Error Handling"
    test_error_missing_params

    # Print results
    print_performance_summary
    print_summary
}

# Run main function
main
