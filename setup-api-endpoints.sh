#!/bin/bash

# API Gateway Endpoint Setup Script
# This script creates all required endpoints for the React dashboard

set -e  # Exit on error

# Configuration
API_ID="bw4agz6xn4"
REGION="ap-southeast-2"
ACCOUNT_ID="235494808985"
LAMBDA_FUNCTION="queryPackagingProductsOrders"
LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_FUNCTION}"
STAGE="prod"

echo "=== API Gateway Setup for Packaging Products Dashboard ==="
echo ""
echo "API Gateway ID: $API_ID"
echo "Lambda Function: $LAMBDA_FUNCTION"
echo "Region: $REGION"
echo "Stage: $STAGE"
echo ""

# Get root resource ID
echo "📍 Getting root resource ID..."
ROOT_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/`].id' \
  --output text)

echo "Root ID: $ROOT_ID"
echo ""

# Create /api resource
echo "📁 Creating /api resource..."
API_RESOURCE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part api \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || \
  aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?pathPart==`api`].id' \
  --output text)

echo "API Resource ID: $API_RESOURCE"
echo ""

# Function to create resource
create_resource() {
  local parent_id=$1
  local path_part=$2
  local description=$3

  echo "📁 Creating /$description resource..."

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

# Function to create GET method with Lambda integration
create_get_method() {
  local resource_id=$1
  local resource_path=$2

  echo "  🔗 Creating GET method on $resource_path..."

  # Create GET method
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method GET \
    --authorization-type NONE \
    --region $REGION \
    --no-cli-pager \
    2>/dev/null || echo "  Method already exists"

  # Create Lambda integration
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method GET \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
    --region $REGION \
    --no-cli-pager \
    2>/dev/null || echo "  Integration already exists"

  # Enable CORS - create OPTIONS method
  echo "  🌐 Enabling CORS on $resource_path..."

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
      "method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'",
      "method.response.header.Access-Control-Allow-Methods": "'"'"'GET,POST,OPTIONS'"'"'",
      "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"
    }' \
    --region $REGION \
    --no-cli-pager \
    2>/dev/null || true

  echo "  ✓ GET method created on $resource_path"
  echo ""
}

# Create /api/orders
ORDERS_RESOURCE=$(create_resource $API_RESOURCE "orders" "api/orders")
create_get_method $ORDERS_RESOURCE "/api/orders"

# Create /api/orders/{orderID}
ORDER_ID_RESOURCE=$(create_resource $ORDERS_RESOURCE "{orderID}" "api/orders/{orderID}")
create_get_method $ORDER_ID_RESOURCE "/api/orders/{orderID}"

# Create /api/customers
CUSTOMERS_RESOURCE=$(create_resource $API_RESOURCE "customers" "api/customers")
create_get_method $CUSTOMERS_RESOURCE "/api/customers"

# Create /api/customers/{contactID}
CONTACT_ID_RESOURCE=$(create_resource $CUSTOMERS_RESOURCE "{contactID}" "api/customers/{contactID}")
create_get_method $CONTACT_ID_RESOURCE "/api/customers/{contactID}"

# Create /api/customers/{contactID}/orders
CUSTOMER_ORDERS_RESOURCE=$(create_resource $CONTACT_ID_RESOURCE "orders" "api/customers/{contactID}/orders")
create_get_method $CUSTOMER_ORDERS_RESOURCE "/api/customers/{contactID}/orders"

# Create /api/reports
REPORTS_RESOURCE=$(create_resource $API_RESOURCE "reports" "api/reports")

# Create /api/reports/overview
OVERVIEW_RESOURCE=$(create_resource $REPORTS_RESOURCE "overview" "api/reports/overview")
create_get_method $OVERVIEW_RESOURCE "/api/reports/overview"

# Create /api/reports/products
PRODUCTS_RESOURCE=$(create_resource $REPORTS_RESOURCE "products" "api/reports/products")
create_get_method $PRODUCTS_RESOURCE "/api/reports/products"

# Create /api/reports/sales
SALES_RESOURCE=$(create_resource $REPORTS_RESOURCE "sales" "api/reports/sales")
create_get_method $SALES_RESOURCE "/api/reports/sales"

# Grant Lambda permissions for API Gateway invocation
echo "🔐 Granting API Gateway permissions to invoke Lambda..."

# General permission for all API endpoints
aws lambda add-permission \
  --function-name $LAMBDA_FUNCTION \
  --statement-id apigateway-query-all \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/*" \
  --region $REGION \
  --no-cli-pager \
  2>/dev/null || echo "  Permission already exists"

echo "✓ Lambda permissions configured"
echo ""

# Deploy API
echo "🚀 Deploying API to $STAGE stage..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name $STAGE \
  --description "Added React dashboard query endpoints" \
  --region $REGION \
  --no-cli-pager

echo ""
echo "✅ API Gateway setup complete!"
echo ""
echo "=== Available Endpoints ==="
echo ""
echo "Base URL: https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}"
echo ""
echo "Orders:"
echo "  GET /api/orders"
echo "  GET /api/orders/{orderID}"
echo ""
echo "Customers:"
echo "  GET /api/customers"
echo "  GET /api/customers/{contactID}"
echo "  GET /api/customers/{contactID}/orders"
echo ""
echo "Reports:"
echo "  GET /api/reports/overview"
echo "  GET /api/reports/products"
echo "  GET /api/reports/sales"
echo ""
echo "=== Testing ==="
echo ""
echo "Test overview endpoint:"
echo "curl https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}/api/reports/overview"
echo ""
echo "Test orders endpoint:"
echo "curl https://${API_ID}.execute-api.${REGION}.amazonaws.com/${STAGE}/api/orders?limit=5"
echo ""
