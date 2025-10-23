# API Testing Guide

This guide explains how to use the comprehensive API testing script for the Packaging Products WebOrders system.

## Overview

The `test-api-complete.sh` script provides automated testing for all API endpoints with:
- Color-coded output (green=pass, red=fail)
- Response structure validation
- Performance metrics
- Error condition testing
- Detailed logging

## Prerequisites

### Required Tools

**1. curl** - Already available on most systems
```bash
# Check if curl is installed
curl --version
```

**2. jq** - JSON processor (required for validation)
```bash
# Install jq
# Windows (Git Bash): Download from https://jqlang.github.io/jq/download/
# Mac:
brew install jq

# Linux:
sudo apt-get install jq

# Verify installation
jq --version
```

## Quick Start

### Run All Tests

```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"

# Make script executable (if needed)
chmod +x test-api-complete.sh

# Run all tests
bash test-api-complete.sh
```

### Expected Output

```
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║    Packaging Products WebOrders - API Testing Suite              ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

Base URL: https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod
Log File: test-results.log
Started:  2025-10-21 16:00:00

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  1. Dashboard & Overview
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[TEST] Dashboard Overview Report
  ℹ URL: https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview
  ℹ Response Time: 234ms
  ℹ HTTP Status: 200
✓ PASS Should return HTTP 200 (HTTP 200)
✓ PASS Response should have 'success' field
✓ PASS Response should have 'overview' field
...
```

## Test Coverage

The script tests **7 major categories** with **30+ individual tests**:

### 1. Dashboard & Overview (1 test)
- `GET /api/reports/overview`
  - Validates today/week/month metrics
  - Checks total customers count
  - Verifies recent orders list

### 2. Orders Endpoints (6 tests)
- `GET /api/orders` - Basic list
- `GET /api/orders?limit=5` - Pagination
- `GET /api/orders?startDate=X&endDate=Y` - Date filtering
- `GET /api/orders?search=ash` - Search functionality
- `GET /api/orders/{orderID}` - Valid ID
- `GET /api/orders/INVALID` - Error handling

### 3. Customers Endpoints (6 tests)
- `GET /api/customers` - Basic list
- `GET /api/customers?limit=3` - Pagination
- `GET /api/customers?search=ash` - Search
- `GET /api/customers/{contactID}` - Valid ID
- `GET /api/customers/INVALID` - Error handling
- `GET /api/customers/{contactID}/orders` - Order history

### 4. Product Reports (2 tests)
- `GET /api/reports/products` - Basic analytics
- `GET /api/reports/products?startDate=X&endDate=Y` - Date range

### 5. Sales Reports (4 tests)
- `GET /api/reports/sales?groupBy=day` - Daily grouping
- `GET /api/reports/sales?groupBy=week` - Weekly grouping
- `GET /api/reports/sales?groupBy=month` - Monthly grouping
- `GET /api/reports/sales?startDate=X&endDate=Y&groupBy=day` - Date range

### 6. Import Endpoint (1 test)
- `POST /admin/contacts/import/packaging-products`
  - Creates test order
  - Validates success response
  - Checks contact/order IDs

### 7. Error Handling (1 test)
- Tests invalid parameters
- Validates error responses

## What Gets Validated

For each test, the script checks:

### 1. HTTP Status Codes
```bash
✓ PASS Should return HTTP 200 (HTTP 200)
✗ FAIL Should return 404 for invalid ID
  └─ Expected HTTP 404, got HTTP 200
```

### 2. JSON Structure
```bash
✓ PASS Response should have 'success' field
✓ PASS Response should have 'orders' array
✓ PASS Response should have 'meta' field
```

### 3. Data Validation
```bash
✓ PASS Limit parameter respected (returned 5 orders)
✓ PASS GroupBy parameter correctly applied (day)
```

### 4. Response Times
```bash
  ℹ Response Time: 234ms
```

### 5. Sample Data
```bash
  ℹ Today's metrics: {"order_count":5,"revenue":"1234.56","avg_order_value":"246.91"}
  ℹ First order: {"orderID":"ORD-442894-1761011792356","order_reference":"442894","total":"78.84"}
```

## Output Files

### Console Output
- Color-coded results (green/red/yellow)
- Real-time test progress
- Performance metrics
- Final summary

### test-results.log
Detailed log file containing:
- All test results
- Full response bodies (truncated)
- Performance metrics
- Timestamps
- Error details

**Example log entry:**
```
=====================================================================
Dashboard Overview Report
=====================================================================
[TEST] Dashboard Overview Report
  Response Time: 234ms
  HTTP Status: 200
  Response Body (first 500 chars):
{"success":true,"overview":{"today":{"order_count":5,"revenue":"1234.56"}...
[PASS] Should return HTTP 200 (HTTP 200)
[PASS] Response should have 'success' field
```

## Performance Metrics

At the end of each test run, you'll see:

### Response Time Breakdown
```
Performance Metrics
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Response Times:

   187ms - Dashboard Overview Report
   234ms - List Orders - Basic
   456ms - Product Analytics - Basic
   892ms - Sales Report - Daily Grouping

Average Response Time: 442ms
```

Color coding:
- **Green** (<500ms) - Excellent
- **Yellow** (500-1000ms) - Acceptable
- **Red** (>1000ms) - Needs attention

### Final Summary
```
Test Summary
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Total Tests:   30
Passed:        28
Failed:        2
Pass Rate:     93%

🎉 All tests passed!

Detailed results saved to: test-results.log
```

## Customization

### Test Specific Endpoints

Edit `test-api-complete.sh` and comment out tests you don't need:

```bash
main() {
    # ... initialization ...

    # Uncomment only the tests you want
    # test_reports_overview
    test_orders_basic
    # test_customers_basic
    # ... etc
}
```

### Change Test Parameters

Modify date ranges, limits, or search terms:

```bash
# Change date range
test_orders_with_dates() {
    local start_date="2025-01-01"  # Change this
    local end_date="2025-12-31"    # Change this
    # ...
}

# Change limit
test_orders_with_limit() {
    api_request "GET" "/api/orders?limit=10" # Change from 5 to 10
    # ...
}
```

### Add Custom Tests

Use the provided helper functions:

```bash
test_my_custom_test() {
    # Make API request
    api_request "GET" "/api/orders?myParam=value" "My Custom Test"

    # Validate response
    validate_status "200" "Should return HTTP 200"
    validate_json ".myField" "Response should have my field"

    # Show sample data
    show_sample_data ".myField" "My custom field"
}
```

## Troubleshooting

### jq not found
```bash
# Error: jq is required but not installed

# Solution: Install jq
brew install jq              # Mac
sudo apt-get install jq      # Linux
# Windows: Download from https://jqlang.github.io/jq/download/
```

### curl not found
```bash
# Error: curl is required but not installed

# Solution: Install curl (usually pre-installed)
sudo apt-get install curl    # Linux
# Windows: Use Git Bash or WSL
```

### Permission denied
```bash
# Error: Permission denied

# Solution: Make script executable
chmod +x test-api-complete.sh
```

### All tests failing with connection errors
```bash
# Possible causes:
# 1. API Gateway is down
# 2. Network connectivity issues
# 3. Incorrect BASE_URL

# Solution: Test manually
curl https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview

# If manual curl works, check script configuration
```

### Tests passing but no data returned
```bash
# Possible causes:
# 1. Database is empty
# 2. Date filters exclude all data

# Solution: Check Lambda logs
aws logs tail /aws/lambda/queryPackagingProductsOrders --follow --region ap-southeast-2
```

## Integration with CI/CD

### GitHub Actions

```yaml
name: API Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Install jq
        run: sudo apt-get install -y jq
      - name: Run API tests
        run: bash test-api-complete.sh
      - name: Upload test results
        uses: actions/upload-artifact@v2
        with:
          name: test-results
          path: test-results.log
```

### Jenkins

```groovy
pipeline {
    agent any
    stages {
        stage('API Tests') {
            steps {
                sh 'bash test-api-complete.sh'
            }
        }
    }
    post {
        always {
            archiveArtifacts artifacts: 'test-results.log'
        }
    }
}
```

## Best Practices

### 1. Run Tests Regularly
```bash
# Daily smoke test
0 9 * * * cd /path/to/project && bash test-api-complete.sh
```

### 2. Review Performance Trends
- Track average response times
- Alert if response times exceed thresholds
- Identify slow endpoints

### 3. Test After Deployments
```bash
# After deploying Lambda updates
aws lambda update-function-code ...
sleep 10  # Wait for deployment
bash test-api-complete.sh
```

### 4. Monitor Failure Patterns
- Check `test-results.log` for patterns
- Identify flaky tests
- Fix underlying issues

### 5. Keep Test Data Current
- Update test payloads with realistic data
- Ensure date ranges cover recent data
- Adjust limits based on database size

## Advanced Usage

### Run Specific Test Categories

```bash
# Edit the main() function to run only specific categories

main() {
    initialize_log

    # Only test orders endpoints
    print_header "Orders Endpoints"
    test_orders_basic
    test_orders_with_limit
    test_orders_with_dates

    print_performance_summary
    print_summary
}
```

### Parallel Testing

For faster results, run categories in parallel:

```bash
# Run in separate terminals
bash test-api-complete.sh  # Terminal 1: Orders
bash test-api-complete.sh  # Terminal 2: Customers
bash test-api-complete.sh  # Terminal 3: Reports
```

### Custom Validation

Add custom validation functions:

```bash
# Validate specific business rules
validate_order_total() {
    local total=$(echo "$RESPONSE_BODY" | jq -r '.order.totals.total')
    if (( $(echo "$total > 0" | bc -l) )); then
        print_success "Order total is positive ($total)"
    else
        print_failure "Order total is invalid" "Total: $total"
    fi
}
```

## API Endpoint Reference

### Base URL
```
https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod
```

### Quick Test Commands

```bash
# Dashboard overview
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview"

# List orders
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders?limit=10"

# Get specific order
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders/ORD-442894-1761011792356"

# List customers
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers?limit=10"

# Product report
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products"

# Sales report
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/sales?groupBy=month"
```

## Support

For issues or questions:
- Check `test-results.log` for detailed error messages
- Verify API Gateway and Lambda are deployed
- Test individual endpoints with curl
- Review CloudWatch logs for Lambda errors

**Related Documentation:**
- [API-GATEWAY-SETUP.md](API-GATEWAY-SETUP.md) - API deployment
- [REACT-INTEGRATION-GUIDE.md](REACT-INTEGRATION-GUIDE.md) - React integration
- [README.md](README.md) - System overview

---

**Version:** 1.0
**Last Updated:** October 2025
**Maintainer:** Media Giant NZ
