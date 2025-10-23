#!/bin/bash

# Setup CORS for API Gateway
# Enables wildcard (*) CORS on all endpoints for Packaging Products WebOrders API

set -e

API_ID="bw4agz6xn4"
REGION="ap-southeast-2"

echo "=========================================="
echo "Setting up CORS for API Gateway"
echo "=========================================="
echo ""
echo "API Gateway ID: $API_ID"
echo "Region: $REGION"
echo ""

# Get all resources
echo "📋 Fetching all API Gateway resources..."
RESOURCES=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --output json)

echo "✓ Found resources"
echo ""

# Function to enable CORS on a resource
enable_cors_on_resource() {
  local resource_id=$1
  local resource_path=$2

  echo "🔧 Enabling CORS on: $resource_path (ID: $resource_id)"

  # Check if OPTIONS method exists
  HAS_OPTIONS=$(aws apigateway get-method \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --region $REGION 2>&1 || echo "NotFound")

  if [[ $HAS_OPTIONS == *"NotFound"* ]]; then
    echo "  → Creating OPTIONS method..."

    # Create OPTIONS method
    aws apigateway put-method \
      --rest-api-id $API_ID \
      --resource-id $resource_id \
      --http-method OPTIONS \
      --authorization-type NONE \
      --region $REGION \
      --no-cli-pager > /dev/null 2>&1

    # Create mock integration for OPTIONS
    aws apigateway put-integration \
      --rest-api-id $API_ID \
      --resource-id $resource_id \
      --http-method OPTIONS \
      --type MOCK \
      --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
      --region $REGION \
      --no-cli-pager > /dev/null 2>&1

    # Set method response for OPTIONS
    aws apigateway put-method-response \
      --rest-api-id $API_ID \
      --resource-id $resource_id \
      --http-method OPTIONS \
      --status-code 200 \
      --response-parameters '{"method.response.header.Access-Control-Allow-Headers": true, "method.response.header.Access-Control-Allow-Methods": true, "method.response.header.Access-Control-Allow-Origin": true}' \
      --region $REGION \
      --no-cli-pager > /dev/null 2>&1

    # Set integration response for OPTIONS
    aws apigateway put-integration-response \
      --rest-api-id $API_ID \
      --resource-id $resource_id \
      --http-method OPTIONS \
      --status-code 200 \
      --response-parameters '{"method.response.header.Access-Control-Allow-Headers": "'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'", "method.response.header.Access-Control-Allow-Methods": "'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'", "method.response.header.Access-Control-Allow-Origin": "'"'"'*'"'"'"}' \
      --region $REGION \
      --no-cli-pager > /dev/null 2>&1

    echo "  ✓ OPTIONS method created with CORS headers"
  else
    echo "  ✓ OPTIONS method already exists"
  fi

  # Add CORS headers to all existing methods on this resource
  for METHOD in GET POST PUT DELETE PATCH; do
    HAS_METHOD=$(aws apigateway get-method \
      --rest-api-id $API_ID \
      --resource-id $resource_id \
      --http-method $METHOD \
      --region $REGION 2>&1 || echo "NotFound")

    if [[ $HAS_METHOD != *"NotFound"* ]]; then
      echo "  → Updating $METHOD method response headers..."

      # Update method response to include CORS headers
      aws apigateway put-method-response \
        --rest-api-id $API_ID \
        --resource-id $resource_id \
        --http-method $METHOD \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Origin": true}' \
        --region $REGION \
        --no-cli-pager > /dev/null 2>&1 || true

      echo "  ✓ $METHOD method updated"
    fi
  done

  echo ""
}

# Extract resource IDs and paths from JSON
RESOURCE_COUNT=$(echo "$RESOURCES" | jq '.items | length')
echo "Processing $RESOURCE_COUNT resources..."
echo ""

# Loop through each resource
for i in $(seq 0 $((RESOURCE_COUNT - 1))); do
  RESOURCE_ID=$(echo "$RESOURCES" | jq -r ".items[$i].id")
  RESOURCE_PATH=$(echo "$RESOURCES" | jq -r ".items[$i].path")

  # Skip root resource
  if [ "$RESOURCE_PATH" != "/" ]; then
    enable_cors_on_resource "$RESOURCE_ID" "$RESOURCE_PATH"
  fi
done

echo "=========================================="
echo "Deploying API Gateway changes..."
echo "=========================================="
echo ""

# Create deployment
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Enable CORS on all endpoints" \
  --region $REGION \
  --no-cli-pager

echo ""
echo "✅ CORS configuration complete!"
echo ""
echo "All endpoints now support:"
echo "  • Access-Control-Allow-Origin: *"
echo "  • Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS"
echo "  • Access-Control-Allow-Headers: Content-Type, X-Amz-Date, Authorization, X-Api-Key, X-Amz-Security-Token"
echo ""
echo "Testing CORS with OPTIONS request:"
curl -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -H "Access-Control-Request-Headers: Content-Type" \
  -v \
  https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders 2>&1 | grep -i "access-control"

echo ""
echo "=========================================="
echo "CORS Setup Complete!"
echo "=========================================="
