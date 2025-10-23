#!/bin/bash

# API Gateway Endpoint Setup Script for Admin Configuration
# This script creates all required endpoints for admin config management
# Project: Packaging Products WebOrders

set -e  # Exit on error

# Configuration
API_ID="bw4agz6xn4"
REGION="ap-southeast-2"
ACCOUNT_ID="235494808985"
LAMBDA_FUNCTION="adminConfigHandler"
LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_FUNCTION}"
STAGE="prod"

echo "=== API Gateway Setup for Admin Configuration ==="
echo ""
echo "API Gateway ID: $API_ID"
echo "Lambda Function: $LAMBDA_FUNCTION"
echo "Region: $REGION"
echo "Stage: $STAGE"
echo ""

# Get root resource ID
echo "Getting root resource ID..."
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/`].id' \
  --output text)

echo "Root ID: $ROOT_ID"
echo ""

# Get or create /api resource
echo "Getting /api resource..."
API_RESOURCE=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?pathPart==`api`].id' \
  --output text)

if [ -z "$API_RESOURCE" ]; then
  echo "Creating /api resource..."
  API_RESOURCE=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $ROOT_ID \
    --path-part api \
    --region $REGION \
    --query 'id' \
    --output text)
fi

echo "API Resource ID: $API_RESOURCE"
echo ""

# Function to create resource
create_resource() {
  local parent_id=$1
  local path_part=$2
  local description=$3

  echo "Creating /$description resource..."

  # Try to create, if exists get ID
  resource_id=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $parent_id \
    --path-part $path_part \
    --region $REGION \
    --query 'id' \
    --output text 2>/dev/null || \
    aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?pathPart==\`$path_part\` && parentId==\`$parent_id\`].id" \
    --output text)

  echo "  Resource ID: $resource_id"
  echo "$resource_id"
}

# Function to create methods with Lambda integration
create_methods() {
  local resource_id=$1
  local resource_path=$2
  local methods=$3

  for method in $methods; do
    echo "  Creating $method method on $resource_path..."

    # Create method
    aws apigateway put-method \
      --rest-api-id $API_ID \
      --resource-id $resource_id \
      --http-method $method \
      --authorization-type NONE \
      --region $REGION \
      --no-cli-pager \
      2>/dev/null || echo "  Method $method already exists"

    # Create Lambda integration
    aws apigateway put-integration \
      --rest-api-id $API_ID \
      --resource-id $resource_id \
      --http-method $method \
      --type AWS_PROXY \
      --integration-http-method POST \
      --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
      --region $REGION \
      --no-cli-pager \
      2>/dev/null || echo "  Integration for $method already exists"
  done

  # Enable CORS - create OPTIONS method
  echo "  Enabling CORS on $resource_path..."

  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION \
    --no-cli-pager \
    2>/dev/null || echo "  OPTIONS already exists"

  # Mock integration for OPTIONS
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    --region $REGION \
    --no-cli-pager \
    2>/dev/null || echo "  OPTIONS integration already exists"

  # Method response for OPTIONS
  aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
      "method.response.header.Access-Control-Allow-Headers": false,
      "method.response.header.Access-Control-Allow-Methods": false,
      "method.response.header.Access-Control-Allow-Origin": false
    }' \
    --region $REGION \
    --no-cli-pager \
    2>/dev/null || true

  # Integration response for OPTIONS
  aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
      "method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-User-Email'"'"'",
      "method.response.header.Access-Control-Allow-Methods": "'"'"'GET,PUT,DELETE,OPTIONS'"'"'",
      "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"
    }' \
    --region $REGION \
    --no-cli-pager \
    2>/dev/null || true

  echo "  Methods created on $resource_path"
  echo ""
}

# Create /api/admin
ADMIN_RESOURCE=$(create_resource $API_RESOURCE "admin" "api/admin")

# Create /api/admin/config
CONFIG_RESOURCE=$(create_resource $ADMIN_RESOURCE "config" "api/admin/config")
create_methods $CONFIG_RESOURCE "/api/admin/config" "GET"

# Create /api/admin/config/schemas
SCHEMAS_RESOURCE=$(create_resource $CONFIG_RESOURCE "schemas" "api/admin/config/schemas")
create_methods $SCHEMAS_RESOURCE "/api/admin/config/schemas" "GET"

# Create /api/admin/config/{key}
KEY_RESOURCE=$(create_resource $CONFIG_RESOURCE "{key}" "api/admin/config/{key}")
create_methods $KEY_RESOURCE "/api/admin/config/{key}" "GET PUT DELETE"

# Grant Lambda permissions for API Gateway invocation
echo "Granting API Gateway permissions to invoke Lambda..."

aws lambda add-permission \
  --function-name $LAMBDA_FUNCTION \
  --statement-id apigateway-admin-config \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*/admin/*" \
  --region $REGION \
  --no-cli-pager \
  2>/dev/null || echo "  Permission already exists"

echo "Lambda permissions configured"
echo ""

# Deploy API
echo "Deploying API to $STAGE stage..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name $STAGE \
  --description "Added admin configuration endpoints" \
  --region $REGION \
  --no-cli-pager

echo ""
echo "API Gateway setup complete!"
echo ""
echo "=== Available Admin Config Endpoints ==="
echo ""
echo "Base URL: https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}"
echo ""
echo "Admin Configuration:"
echo "  GET    /api/admin/config              - List all configs"
echo "  GET    /api/admin/config/schemas      - Get config schemas/documentation"
echo "  GET    /api/admin/config/{key}        - Get specific config"
echo "  PUT    /api/admin/config/{key}        - Update/create config"
echo "  DELETE /api/admin/config/{key}        - Delete config"
echo ""
echo "=== Required Test Configurations ==="
echo "  - system_name (string)"
echo "  - order_notification_email (string: email)"
echo "  - max_items_per_order (number: 1-1000)"
echo ""
echo "=== Additional Supported Configs ==="
echo "  - email_alerts_enabled (boolean)"
echo "  - daily_report_time (string: HH:MM)"
echo "  - low_stock_threshold (number)"
echo "  - default_currency (string: ISO 4217 code)"
echo "  - tax_rate (number: 0-1)"
echo "  - business_hours (object: {start, end})"
echo "  - api_rate_limit (number)"
echo ""
