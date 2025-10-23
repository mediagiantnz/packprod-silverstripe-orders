#!/bin/bash

# API Testing Examples for Admin Configuration Endpoints
# Project: Packaging Products WebOrders
# Region: ap-southeast-2

API_BASE_URL="https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod"

echo "==================================================================="
echo "Packaging Products WebOrders - Admin Configuration API Test Suite"
echo "==================================================================="
echo ""
echo "Base URL: $API_BASE_URL"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== 1. Get Config Schemas (Documentation) ===${NC}"
echo "This endpoint shows all available configs and their validation rules"
echo ""
echo -e "${YELLOW}Command:${NC}"
echo "curl -X GET \"${API_BASE_URL}/api/admin/settings/schemas\""
echo ""
echo -e "${YELLOW}Example Response:${NC}"
cat << 'EOF'
{
  "success": true,
  "data": {
    "email_alerts_enabled": {
      "type": "boolean",
      "description": "Enable/disable email alert notifications",
      "constraints": {}
    },
    "daily_report_time": {
      "type": "string",
      "description": "Daily report time in HH:MM format (24-hour)",
      "constraints": {
        "pattern": "/^([0-1][0-9]|2[0-3]):[0-5][0-9]$/"
      }
    }
    ...
  },
  "meta": {
    "count": 8,
    "timestamp": "2025-10-21T10:30:00.000Z"
  }
}
EOF
echo ""
echo "-------------------------------------------------------------------"
echo ""

echo -e "${BLUE}=== 2. Get All Settings ===${NC}"
echo "Retrieve all current system settings"
echo ""
echo -e "${YELLOW}Command:${NC}"
echo "curl -X GET \"${API_BASE_URL}/api/admin/settings\""
echo ""
echo -e "${YELLOW}Example Response:${NC}"
cat << 'EOF'
{
  "success": true,
  "data": {
    "email_alerts_enabled": {
      "value": true,
      "updatedAt": "2025-10-21T09:00:00.000Z",
      "updatedBy": "system"
    },
    "daily_report_time": {
      "value": "09:00",
      "updatedAt": "2025-10-21T09:00:00.000Z",
      "updatedBy": "system"
    },
    "tax_rate": {
      "value": 0.10,
      "updatedAt": "2025-10-21T09:00:00.000Z",
      "updatedBy": "admin@example.com"
    }
  },
  "meta": {
    "count": 8,
    "total": 8,
    "timestamp": "2025-10-21T10:30:00.000Z"
  }
}
EOF
echo ""
echo "-------------------------------------------------------------------"
echo ""

echo -e "${BLUE}=== 3. Get Specific Setting ===${NC}"
echo "Retrieve a single setting by key"
echo ""
echo -e "${YELLOW}Command:${NC}"
echo "curl -X GET \"${API_BASE_URL}/api/admin/settings/tax_rate\""
echo ""
echo -e "${YELLOW}Example Response:${NC}"
cat << 'EOF'
{
  "success": true,
  "data": {
    "key": "tax_rate",
    "value": 0.10,
    "updatedAt": "2025-10-21T09:00:00.000Z",
    "updatedBy": "admin@example.com"
  },
  "meta": {
    "timestamp": "2025-10-21T10:30:00.000Z"
  }
}
EOF
echo ""
echo "-------------------------------------------------------------------"
echo ""

echo -e "${BLUE}=== 4. Update Specific Setting ===${NC}"
echo "Update a single setting"
echo ""
echo -e "${YELLOW}Command:${NC}"
cat << 'EOF'
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings/tax_rate" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: admin@packagingproducts.com" \
  -d '{
    "value": 0.15
  }'
EOF
echo ""
echo -e "${YELLOW}Example Response:${NC}"
cat << 'EOF'
{
  "success": true,
  "data": {
    "key": "tax_rate",
    "value": 0.15,
    "updatedAt": "2025-10-21T10:35:00.000Z",
    "updatedBy": "admin@packagingproducts.com"
  },
  "meta": {
    "timestamp": "2025-10-21T10:35:00.000Z"
  }
}
EOF
echo ""
echo "-------------------------------------------------------------------"
echo ""

echo -e "${BLUE}=== 5. Update Boolean Setting ===${NC}"
echo "Enable or disable email alerts"
echo ""
echo -e "${YELLOW}Command:${NC}"
cat << 'EOF'
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings/email_alerts_enabled" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: admin@packagingproducts.com" \
  -d '{
    "value": false
  }'
EOF
echo ""
echo "-------------------------------------------------------------------"
echo ""

echo -e "${BLUE}=== 6. Update Object Setting ===${NC}"
echo "Update business hours"
echo ""
echo -e "${YELLOW}Command:${NC}"
cat << 'EOF'
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings/business_hours" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: admin@packagingproducts.com" \
  -d '{
    "value": {
      "start": "08:00",
      "end": "18:00"
    }
  }'
EOF
echo ""
echo "-------------------------------------------------------------------"
echo ""

echo -e "${BLUE}=== 7. Bulk Update Settings ===${NC}"
echo "Update multiple settings at once"
echo ""
echo -e "${YELLOW}Command:${NC}"
cat << 'EOF'
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: admin@packagingproducts.com" \
  -d '{
    "settings": {
      "tax_rate": 0.15,
      "low_stock_threshold": 5,
      "daily_report_time": "10:00",
      "default_currency": "USD",
      "api_rate_limit": 2000
    }
  }'
EOF
echo ""
echo -e "${YELLOW}Example Response:${NC}"
cat << 'EOF'
{
  "success": true,
  "data": [
    {
      "key": "tax_rate",
      "value": 0.15,
      "updatedAt": "2025-10-21T10:40:00.000Z",
      "updatedBy": "admin@packagingproducts.com"
    },
    {
      "key": "low_stock_threshold",
      "value": 5,
      "updatedAt": "2025-10-21T10:40:00.000Z",
      "updatedBy": "admin@packagingproducts.com"
    }
    ...
  ],
  "meta": {
    "count": 5,
    "total": 5,
    "timestamp": "2025-10-21T10:40:00.000Z"
  }
}
EOF
echo ""
echo "-------------------------------------------------------------------"
echo ""

echo -e "${BLUE}=== 8. Validation Error Example ===${NC}"
echo "Attempting to set an invalid value"
echo ""
echo -e "${YELLOW}Command:${NC}"
cat << 'EOF'
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings/tax_rate" \
  -H "Content-Type: application/json" \
  -d '{
    "value": 1.5
  }'
EOF
echo ""
echo -e "${YELLOW}Example Response:${NC}"
cat << 'EOF'
{
  "success": false,
  "data": null,
  "error": "Value for tax_rate must be at most 1",
  "meta": {
    "timestamp": "2025-10-21T10:45:00.000Z"
  }
}
EOF
echo ""
echo "-------------------------------------------------------------------"
echo ""

echo -e "${BLUE}=== 9. Invalid Format Example ===${NC}"
echo "Attempting to set invalid time format"
echo ""
echo -e "${YELLOW}Command:${NC}"
cat << 'EOF'
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings/daily_report_time" \
  -H "Content-Type: application/json" \
  -d '{
    "value": "25:00"
  }'
EOF
echo ""
echo -e "${YELLOW}Example Response:${NC}"
cat << 'EOF'
{
  "success": false,
  "data": null,
  "error": "Invalid format for daily_report_time. Daily report time in HH:MM format (24-hour)",
  "meta": {
    "timestamp": "2025-10-21T10:50:00.000Z"
  }
}
EOF
echo ""
echo "-------------------------------------------------------------------"
echo ""

echo -e "${GREEN}=== Testing Commands ===${NC}"
echo ""
echo "Run these commands to test the API:"
echo ""
echo "1. Get all settings:"
echo "   curl \"${API_BASE_URL}/api/admin/settings\""
echo ""
echo "2. Get setting schemas:"
echo "   curl \"${API_BASE_URL}/api/admin/settings/schemas\""
echo ""
echo "3. Get specific setting:"
echo "   curl \"${API_BASE_URL}/api/admin/settings/tax_rate\""
echo ""
echo "4. Update setting:"
echo "   curl -X PUT \"${API_BASE_URL}/api/admin/settings/tax_rate\" \\"
echo "     -H \"Content-Type: application/json\" \\"
echo "     -d '{\"value\": 0.15}'"
echo ""
echo "==================================================================="
