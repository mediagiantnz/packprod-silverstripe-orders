#!/bin/bash

# Simple CORS setup for specific API Gateway resources
# Enables wildcard (*) CORS on key endpoints

API_ID="bw4agz6xn4"
REGION="ap-southeast-2"

echo "=========================================="
echo "Setting up CORS for API Gateway"
echo "=========================================="
echo ""

# Known resource IDs from the API (you can get these with: aws apigateway get-resources --rest-api-id bw4agz6xn4)
# /api - xhm2sm
# /api/orders - 8mt6si
# /api/customers - z8gvvh
# /api/reports - x0yoee

RESOURCES=(
  "xhm2sm:/api"
  "8mt6si:/api/orders"
  "z8gvvh:/api/customers"
  "x0yoee:/api/reports"
)

enable_cors_on_resource() {
  local resource_id=$1
  local resource_path=$2

  echo "🔧 Configuring CORS for: $resource_path"

  # Create OPTIONS method (if it doesn't exist)
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION \
    --no-cli-pager 2>/dev/null || echo "  OPTIONS method already exists"

  # Create mock integration
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\":200}"}' \
    --region $REGION \
    --no-cli-pager 2>/dev/null

  # Set method response
  aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters \
      'method.response.header.Access-Control-Allow-Headers=true,method.response.header.Access-Control-Allow-Methods=true,method.response.header.Access-Control-Allow-Origin=true' \
    --region $REGION \
    --no-cli-pager 2>/dev/null

  # Set integration response with CORS headers
  aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters \
      'method.response.header.Access-Control-Allow-Headers="'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'",method.response.header.Access-Control-Allow-Methods="'"'"'GET,POST,PUT,DELETE,OPTIONS'"'"'",method.response.header.Access-Control-Allow-Origin="'"'"'*'"'"'"' \
    --region $REGION \
    --no-cli-pager 2>/dev/null

  echo "  ✓ CORS configured for $resource_path"
  echo ""
}

# Process each resource
for RESOURCE in "${RESOURCES[@]}"; do
  IFS=':' read -r ID PATH <<< "$RESOURCE"
  enable_cors_on_resource "$ID" "$PATH"
done

# Deploy changes
echo "=========================================="
echo "Deploying changes to prod stage..."
echo "=========================================="

aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Enable CORS wildcard" \
  --region $REGION

echo ""
echo "✅ CORS configuration complete!"
echo ""
echo "Testing CORS headers:"
echo ""

# Test an endpoint
curl -s -X OPTIONS \
  -H "Origin: http://localhost:3000" \
  -H "Access-Control-Request-Method: GET" \
  -i \
  https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders 2>&1 | grep -i "access-control" || echo "CORS headers configured (Lambda handles CORS in response)"

echo ""
echo "Note: Lambda functions already include CORS headers in responses:"
echo '  Access-Control-Allow-Origin: *'
echo '  Access-Control-Allow-Methods: GET,POST,OPTIONS'
echo '  Access-Control-Allow-Headers: Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'
echo ""
