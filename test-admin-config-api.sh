#!/bin/bash

# Admin Configuration API Test Suite
# Project: Packaging Products WebOrders
# Tests all CRUD operations for admin config endpoints

API_BASE_URL="https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=================================================================="
echo "Admin Configuration API - CRUD Test Suite"
echo "=================================================================="
echo ""
echo "Base URL: $API_BASE_URL"
echo ""

# Function to print test header
print_test() {
  echo ""
  echo -e "${BLUE}=== $1 ===${NC}"
  echo ""
}

# Function to print success
print_success() {
  echo -e "${GREEN}✓ $1${NC}"
}

# Function to print error
print_error() {
  echo -e "${RED}✗ $1${NC}"
}

# Test 1: Get all configs
print_test "TEST 1: GET /api/admin/config - List All Configs"
echo "Command:"
echo "curl \"${API_BASE_URL}/api/admin/config\""
echo ""
echo "Response:"
curl -s "${API_BASE_URL}/api/admin/config" | jq '.'
echo ""
echo "-------------------------------------------------------------------"

# Test 2: Get config schemas
print_test "TEST 2: GET /api/admin/config/schemas - Get Documentation"
echo "Command:"
echo "curl \"${API_BASE_URL}/api/admin/config/schemas\""
echo ""
echo "Response:"
curl -s "${API_BASE_URL}/api/admin/config/schemas" | jq '.'
echo ""
echo "-------------------------------------------------------------------"

# Test 3: Get specific config
print_test "TEST 3: GET /api/admin/config/{key} - Get Specific Config"
echo "Command:"
echo "curl \"${API_BASE_URL}/api/admin/config/system_name\""
echo ""
echo "Response:"
curl -s "${API_BASE_URL}/api/admin/config/system_name" | jq '.'
echo ""
echo "-------------------------------------------------------------------"

# Test 4: Create/Update config (string)
print_test "TEST 4: PUT /api/admin/config/{key} - Update String Config"
echo "Command:"
cat << 'EOF'
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/system_name" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: test@packagingproducts.co.nz" \
  -d '{
    "configValue": "Packaging Products WebOrders System",
    "description": "Updated system name"
  }'
EOF
echo ""
echo "Response:"
curl -s -X PUT "${API_BASE_URL}/api/admin/config/system_name" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: test@packagingproducts.co.nz" \
  -d '{
    "configValue": "Packaging Products WebOrders System",
    "description": "Updated system name"
  }' | jq '.'
echo ""
echo "-------------------------------------------------------------------"

# Test 5: Update email config
print_test "TEST 5: PUT /api/admin/config/{key} - Update Email Config"
echo "Command:"
cat << 'EOF'
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/order_notification_email" \
  -H "Content-Type: application/json" \
  -d '{
    "configValue": "orders-updated@packagingproducts.co.nz"
  }'
EOF
echo ""
echo "Response:"
curl -s -X PUT "${API_BASE_URL}/api/admin/config/order_notification_email" \
  -H "Content-Type: application/json" \
  -d '{
    "configValue": "orders-updated@packagingproducts.co.nz"
  }' | jq '.'
echo ""
echo "-------------------------------------------------------------------"

# Test 6: Update number config
print_test "TEST 6: PUT /api/admin/config/{key} - Update Number Config"
echo "Command:"
cat << 'EOF'
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/max_items_per_order" \
  -H "Content-Type: application/json" \
  -d '{
    "configValue": 150
  }'
EOF
echo ""
echo "Response:"
curl -s -X PUT "${API_BASE_URL}/api/admin/config/max_items_per_order" \
  -H "Content-Type: application/json" \
  -d '{
    "configValue": 150
  }' | jq '.'
echo ""
echo "-------------------------------------------------------------------"

# Test 7: Update boolean config
print_test "TEST 7: PUT /api/admin/config/{key} - Update Boolean Config"
echo "Command:"
cat << 'EOF'
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/email_alerts_enabled" \
  -H "Content-Type: application/json" \
  -d '{
    "configValue": false
  }'
EOF
echo ""
echo "Response:"
curl -s -X PUT "${API_BASE_URL}/api/admin/config/email_alerts_enabled" \
  -H "Content-Type: application/json" \
  -d '{
    "configValue": false
  }' | jq '.'
echo ""
echo "-------------------------------------------------------------------"

# Test 8: Create new config
print_test "TEST 8: PUT /api/admin/config/{key} - Create New Config"
echo "Command:"
cat << 'EOF'
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/test_config" \
  -H "Content-Type: application/json" \
  -d '{
    "configValue": "test_value",
    "description": "Temporary test configuration"
  }'
EOF
echo ""
echo "Response:"
curl -s -X PUT "${API_BASE_URL}/api/admin/config/test_config" \
  -H "Content-Type: application/json" \
  -d '{
    "configValue": "test_value",
    "description": "Temporary test configuration"
  }' | jq '.'
echo ""
echo "-------------------------------------------------------------------"

# Test 9: Delete config
print_test "TEST 9: DELETE /api/admin/config/{key} - Delete Config"
echo "Command:"
echo "curl -X DELETE \"${API_BASE_URL}/api/admin/config/test_config\""
echo ""
echo "Response:"
curl -s -X DELETE "${API_BASE_URL}/api/admin/config/test_config" | jq '.'
echo ""
echo "-------------------------------------------------------------------"

# Test 10: Validation error - invalid email
print_test "TEST 10: Validation Error - Invalid Email Format"
echo "Command:"
cat << 'EOF'
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/order_notification_email" \
  -H "Content-Type: application/json" \
  -d '{
    "configValue": "invalid-email"
  }'
EOF
echo ""
echo "Response:"
curl -s -X PUT "${API_BASE_URL}/api/admin/config/order_notification_email" \
  -H "Content-Type: application/json" \
  -d '{
    "configValue": "invalid-email"
  }' | jq '.'
echo ""
echo "-------------------------------------------------------------------"

# Test 11: Validation error - number out of range
print_test "TEST 11: Validation Error - Number Out of Range"
echo "Command:"
cat << 'EOF'
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/max_items_per_order" \
  -H "Content-Type: application/json" \
  -d '{
    "configValue": 5000
  }'
EOF
echo ""
echo "Response:"
curl -s -X PUT "${API_BASE_URL}/api/admin/config/max_items_per_order" \
  -H "Content-Type: application/json" \
  -d '{
    "configValue": 5000
  }' | jq '.'
echo ""
echo "-------------------------------------------------------------------"

# Test 12: Get non-existent config
print_test "TEST 12: Error Handling - Get Non-Existent Config"
echo "Command:"
echo "curl \"${API_BASE_URL}/api/admin/config/nonexistent_key\""
echo ""
echo "Response:"
curl -s "${API_BASE_URL}/api/admin/config/nonexistent_key" | jq '.'
echo ""
echo "-------------------------------------------------------------------"

# Test 13: Delete non-existent config
print_test "TEST 13: Error Handling - Delete Non-Existent Config"
echo "Command:"
echo "curl -X DELETE \"${API_BASE_URL}/api/admin/config/nonexistent_key\""
echo ""
echo "Response:"
curl -s -X DELETE "${API_BASE_URL}/api/admin/config/nonexistent_key" | jq '.'
echo ""
echo "-------------------------------------------------------------------"

# Summary
echo ""
echo "=================================================================="
echo -e "${GREEN}Test Suite Complete${NC}"
echo "=================================================================="
echo ""
echo "Quick Test Commands:"
echo ""
echo "1. List all configs:"
echo "   curl \"${API_BASE_URL}/api/admin/config\""
echo ""
echo "2. Get config schemas:"
echo "   curl \"${API_BASE_URL}/api/admin/config/schemas\""
echo ""
echo "3. Get specific config:"
echo "   curl \"${API_BASE_URL}/api/admin/config/system_name\""
echo ""
echo "4. Update config:"
echo "   curl -X PUT \"${API_BASE_URL}/api/admin/config/system_name\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"configValue\": \"New System Name\"}'"
echo ""
echo "5. Delete config:"
echo "   curl -X DELETE \"${API_BASE_URL}/api/admin/config/test_config\""
echo ""
echo "=================================================================="
