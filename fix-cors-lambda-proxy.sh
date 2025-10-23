#!/bin/bash

# Fix CORS OPTIONS by using Lambda AWS_PROXY integration
# This lets the Lambda handle OPTIONS requests directly

API_ID="bw4agz6xn4"
REGION="ap-southeast-2"
LAMBDA_ARN="arn:aws:lambda:ap-southeast-2:235494808985:function:queryPackagingProductsOrders"

echo "=========================================="
echo "Configuring OPTIONS to use Lambda"
echo "=========================================="
echo ""

configure_options_lambda() {
  local resource_id=$1
  local resource_path=$2

  echo "Configuring OPTIONS for: $resource_path (ID: $resource_id)"

  # Delete existing OPTIONS method
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

  # Create Lambda integration (AWS_PROXY)
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $resource_id \
    --http-method OPTIONS \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
    --region $REGION \
    --no-cli-pager

  echo "  ✓ OPTIONS configured for $resource_path"
  echo ""
}

# Configure all endpoints
configure_options_lambda "xhm2sm" "/api"
configure_options_lambda "8mt6si" "/api/orders"
configure_options_lambda "z8gvvh" "/api/customers"
configure_options_lambda "x0yoee" "/api/reports"
configure_options_lambda "pp92k7" "/api/reports/overview"
configure_options_lambda "hpf2s7" "/api/reports/products"
configure_options_lambda "1xibo9" "/api/reports/sales"
configure_options_lambda "tc10i4" "/api/reports/statistics"

# Add Lambda permission for OPTIONS
echo "Adding Lambda permission for OPTIONS..."
aws lambda add-permission \
  --function-name queryPackagingProductsOrders \
  --statement-id apigateway-options-all \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:235494808985:$API_ID/*/OPTIONS/*" \
  --region $REGION 2>/dev/null || echo "  Permission already exists"

echo ""
echo "=========================================="
echo "Deploying to prod stage..."
echo "=========================================="

aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Fix OPTIONS using Lambda" \
  --region $REGION

echo ""
echo "✅ OPTIONS configured to use Lambda!"
echo ""
echo "Testing OPTIONS request:"
curl -X OPTIONS -i "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview" \
  -H "Origin: https://preview--packa-metrics.lovable.app" \
  -H "Access-Control-Request-Method: GET" \
  2>&1 | head -20

echo ""
