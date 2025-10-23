#!/bin/bash

# Fix CORS OPTIONS methods on all API Gateway resources
# This fixes the 403 Forbidden error on preflight requests

API_ID="bw4agz6xn4"
REGION="ap-southeast-2"

echo "=========================================="
echo "Fixing CORS OPTIONS Methods"
echo "=========================================="
echo ""

# Function to configure OPTIONS method properly
configure_options_method() {
  local resource_id=$1
  local resource_path=$2

  echo "Configuring OPTIONS for: $resource_path (ID: $resource_id)"

  # Delete existing OPTIONS method if it exists (to start fresh)
  aws apigateway delete-method \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --region $REGION 2>/dev/null || true

  # Create OPTIONS method (no authorization)
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION \
    --no-cli-pager

  # Create MOCK integration
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\":200}"}' \
    --region $REGION \
    --no-cli-pager

  # Create method response (200)
  aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
    --region $REGION \
    --no-cli-pager

  # Create integration response (200) with CORS headers
  aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-User-Email'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,PUT,DELETE,PATCH,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
    --region $REGION \
    --no-cli-pager

  echo "  ✓ OPTIONS configured for $resource_path"
  echo ""
}

# Configure OPTIONS on all key resources
echo "Configuring OPTIONS methods on all endpoints..."
echo ""

# /api
configure_options_method "xhm2sm" "/api"

# /api/orders
configure_options_method "8mt6si" "/api/orders"

# /api/customers
configure_options_method "z8gvvh" "/api/customers"

# /api/reports
configure_options_method "x0yoee" "/api/reports"

# /api/reports/overview
OVERVIEW_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query "items[?path=='/api/reports/overview'].id" --output text)
if [ ! -z "$OVERVIEW_ID" ]; then
  configure_options_method "$OVERVIEW_ID" "/api/reports/overview"
fi

# /api/reports/products
PRODUCTS_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query "items[?path=='/api/reports/products'].id" --output text)
if [ ! -z "$PRODUCTS_ID" ]; then
  configure_options_method "$PRODUCTS_ID" "/api/reports/products"
fi

# /api/reports/sales
SALES_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query "items[?path=='/api/reports/sales'].id" --output text)
if [ ! -z "$SALES_ID" ]; then
  configure_options_method "$SALES_ID" "/api/reports/sales"
fi

# /api/reports/statistics
STATISTICS_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query "items[?path=='/api/reports/statistics'].id" --output text)
if [ ! -z "$STATISTICS_ID" ]; then
  configure_options_method "$STATISTICS_ID" "/api/reports/statistics"
fi

echo "=========================================="
echo "Deploying to prod stage..."
echo "=========================================="

aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Fix CORS OPTIONS methods" \
  --region $REGION

echo ""
echo "✅ CORS OPTIONS methods fixed!"
echo ""
echo "Testing OPTIONS request:"
curl -X OPTIONS -i "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview" \
  -H "Origin: https://preview--packa-metrics.lovable.app" \
  -H "Access-Control-Request-Method: GET" \
  2>&1 | head -20

echo ""
echo "Should see HTTP 200 OK with CORS headers"
echo ""
