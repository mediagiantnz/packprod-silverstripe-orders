#!/bin/bash

# Setup API Gateway endpoints for Campaigns Handler Lambda
# Phase 4: Marketing Campaign Management (Placeholder Endpoints)
#
# Prerequisites:
# - AWS CLI configured with credentials for account 235494808985
# - Lambda function "campaignsHandler" must exist
# - Region: ap-southeast-2

set -e

echo "=========================================="
echo "Setting up API Gateway Campaigns Endpoints"
echo "Phase 4: Marketing Campaign Management"
echo "=========================================="

# Variables
API_ID="bw4agz6xn4"
REGION="ap-southeast-2"
FUNCTION_NAME="campaignsHandler"
ACCOUNT_ID="235494808985"
LAMBDA_ARN="arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${FUNCTION_NAME}"

# Get /api resource ID
echo ""
echo "Step 1: Finding /api resource..."
API_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/api`].id' \
  --output text)

if [ -z "$API_RESOURCE_ID" ]; then
  echo "Error: /api resource not found"
  exit 1
fi

echo "✓ Found /api resource: $API_RESOURCE_ID"

# Create /api/campaigns resource
echo ""
echo "Step 2: Creating /api/campaigns resource..."
CAMPAIGNS_RESOURCE_EXISTS=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/api/campaigns`].id' \
  --output text)

if [ -z "$CAMPAIGNS_RESOURCE_EXISTS" ]; then
  CAMPAIGNS_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $API_RESOURCE_ID \
    --path-part campaigns \
    --region $REGION \
    --query 'id' \
    --output text)
  echo "✓ Created /api/campaigns resource: $CAMPAIGNS_RESOURCE_ID"
else
  CAMPAIGNS_RESOURCE_ID=$CAMPAIGNS_RESOURCE_EXISTS
  echo "✓ /api/campaigns resource already exists: $CAMPAIGNS_RESOURCE_ID"
fi

# Create /api/campaigns/{id} resource
echo ""
echo "Step 3: Creating /api/campaigns/{id} resource..."
CAMPAIGN_ID_RESOURCE_EXISTS=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/api/campaigns/{id}`].id' \
  --output text)

if [ -z "$CAMPAIGN_ID_RESOURCE_EXISTS" ]; then
  CAMPAIGN_ID_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $CAMPAIGNS_RESOURCE_ID \
    --path-part "{id}" \
    --region $REGION \
    --query 'id' \
    --output text)
  echo "✓ Created /api/campaigns/{id} resource: $CAMPAIGN_ID_RESOURCE_ID"
else
  CAMPAIGN_ID_RESOURCE_ID=$CAMPAIGN_ID_RESOURCE_EXISTS
  echo "✓ /api/campaigns/{id} resource already exists: $CAMPAIGN_ID_RESOURCE_ID"
fi

# Create /api/campaigns/{id}/send resource
echo ""
echo "Step 4: Creating /api/campaigns/{id}/send resource..."
SEND_RESOURCE_EXISTS=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/api/campaigns/{id}/send`].id' \
  --output text)

if [ -z "$SEND_RESOURCE_EXISTS" ]; then
  SEND_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $CAMPAIGN_ID_RESOURCE_ID \
    --path-part send \
    --region $REGION \
    --query 'id' \
    --output text)
  echo "✓ Created /api/campaigns/{id}/send resource: $SEND_RESOURCE_ID"
else
  SEND_RESOURCE_ID=$SEND_RESOURCE_EXISTS
  echo "✓ /api/campaigns/{id}/send resource already exists: $SEND_RESOURCE_ID"
fi

# Create /api/campaigns/{id}/analytics resource
echo ""
echo "Step 5: Creating /api/campaigns/{id}/analytics resource..."
ANALYTICS_RESOURCE_EXISTS=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/api/campaigns/{id}/analytics`].id' \
  --output text)

if [ -z "$ANALYTICS_RESOURCE_EXISTS" ]; then
  ANALYTICS_RESOURCE_ID=$(aws apigateway create-resource \
    --rest-api-id $API_ID \
    --parent-id $CAMPAIGN_ID_RESOURCE_ID \
    --path-part analytics \
    --region $REGION \
    --query 'id' \
    --output text)
  echo "✓ Created /api/campaigns/{id}/analytics resource: $ANALYTICS_RESOURCE_ID"
else
  ANALYTICS_RESOURCE_ID=$ANALYTICS_RESOURCE_EXISTS
  echo "✓ /api/campaigns/{id}/analytics resource already exists: $ANALYTICS_RESOURCE_ID"
fi

# Helper function to setup method
setup_method() {
  local RESOURCE_ID=$1
  local HTTP_METHOD=$2
  local RESOURCE_PATH=$3

  echo ""
  echo "Setting up $HTTP_METHOD $RESOURCE_PATH..."

  # Check if method exists
  METHOD_EXISTS=$(aws apigateway get-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --region $REGION 2>&1 || echo "NotFound")

  if echo "$METHOD_EXISTS" | grep -q "NotFound"; then
    # Create method
    aws apigateway put-method \
      --rest-api-id $API_ID \
      --resource-id $RESOURCE_ID \
      --http-method $HTTP_METHOD \
      --authorization-type NONE \
      --region $REGION \
      --no-api-key-required > /dev/null

    echo "  ✓ Created method"
  else
    echo "  ✓ Method already exists"
  fi

  # Setup integration
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method $HTTP_METHOD \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:${REGION}:lambda:path/2015-03-31/functions/${LAMBDA_ARN}/invocations" \
    --region $REGION > /dev/null

  echo "  ✓ Configured integration"

  # Add Lambda permission
  STATEMENT_ID="${FUNCTION_NAME}-${HTTP_METHOD}-${RESOURCE_ID}"
  aws lambda add-permission \
    --function-name $FUNCTION_NAME \
    --statement-id "$STATEMENT_ID" \
    --action lambda:InvokeFunction \
    --principal apigateway.amazonaws.com \
    --source-arn "arn:aws:execute-api:${REGION}:${ACCOUNT_ID}:${API_ID}/*/${HTTP_METHOD}${RESOURCE_PATH}" \
    --region $REGION 2>/dev/null || echo "  ✓ Permission already exists"

  echo "  ✓ Lambda permission configured"
}

# Setup OPTIONS method for CORS
setup_cors() {
  local RESOURCE_ID=$1
  local RESOURCE_PATH=$2

  echo ""
  echo "Setting up CORS for $RESOURCE_PATH..."

  # Check if OPTIONS method exists
  OPTIONS_EXISTS=$(aws apigateway get-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --region $REGION 2>&1 || echo "NotFound")

  if echo "$OPTIONS_EXISTS" | grep -q "NotFound"; then
    # Create OPTIONS method
    aws apigateway put-method \
      --rest-api-id $API_ID \
      --resource-id $RESOURCE_ID \
      --http-method OPTIONS \
      --authorization-type NONE \
      --region $REGION \
      --no-api-key-required > /dev/null

    echo "  ✓ Created OPTIONS method"
  else
    echo "  ✓ OPTIONS method already exists"
  fi

  # Setup MOCK integration
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\":200}"}' \
    --region $REGION > /dev/null

  # Setup integration response
  aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
      "method.response.header.Access-Control-Allow-Headers": "'\''Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'\''",
      "method.response.header.Access-Control-Allow-Methods": "'\''GET,POST,PUT,DELETE,OPTIONS'\''",
      "method.response.header.Access-Control-Allow-Origin": "'\''*'\''"
    }' \
    --region $REGION > /dev/null 2>&1 || echo "  ✓ Integration response already configured"

  # Setup method response
  aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{
      "method.response.header.Access-Control-Allow-Headers": true,
      "method.response.header.Access-Control-Allow-Methods": true,
      "method.response.header.Access-Control-Allow-Origin": true
    }' \
    --region $REGION > /dev/null 2>&1 || echo "  ✓ Method response already configured"

  echo "  ✓ CORS configured"
}

# Setup endpoints

# /api/campaigns - GET, POST
echo ""
echo "Step 6: Configuring /api/campaigns endpoints..."
setup_method "$CAMPAIGNS_RESOURCE_ID" "GET" "/api/campaigns"
setup_method "$CAMPAIGNS_RESOURCE_ID" "POST" "/api/campaigns"
setup_cors "$CAMPAIGNS_RESOURCE_ID" "/api/campaigns"

# /api/campaigns/{id} - GET, PUT, DELETE
echo ""
echo "Step 7: Configuring /api/campaigns/{id} endpoints..."
setup_method "$CAMPAIGN_ID_RESOURCE_ID" "GET" "/api/campaigns/{id}"
setup_method "$CAMPAIGN_ID_RESOURCE_ID" "PUT" "/api/campaigns/{id}"
setup_method "$CAMPAIGN_ID_RESOURCE_ID" "DELETE" "/api/campaigns/{id}"
setup_cors "$CAMPAIGN_ID_RESOURCE_ID" "/api/campaigns/{id}"

# /api/campaigns/{id}/send - POST
echo ""
echo "Step 8: Configuring /api/campaigns/{id}/send endpoint..."
setup_method "$SEND_RESOURCE_ID" "POST" "/api/campaigns/{id}/send"
setup_cors "$SEND_RESOURCE_ID" "/api/campaigns/{id}/send"

# /api/campaigns/{id}/analytics - GET
echo ""
echo "Step 9: Configuring /api/campaigns/{id}/analytics endpoint..."
setup_method "$ANALYTICS_RESOURCE_ID" "GET" "/api/campaigns/{id}/analytics"
setup_cors "$ANALYTICS_RESOURCE_ID" "/api/campaigns/{id}/analytics"

# Deploy API
echo ""
echo "Step 10: Deploying API to production..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Added campaigns endpoints - Full implementation with CRUD, email sending, and analytics" \
  --region $REGION > /dev/null

echo "✓ API deployed to production"

echo ""
echo "=========================================="
echo "API Gateway setup complete!"
echo "=========================================="
echo ""
echo "Endpoints configured:"
echo "  GET    /api/campaigns"
echo "  POST   /api/campaigns"
echo "  GET    /api/campaigns/{id}"
echo "  PUT    /api/campaigns/{id}"
echo "  DELETE /api/campaigns/{id}"
echo "  POST   /api/campaigns/{id}/send"
echo "  GET    /api/campaigns/{id}/analytics"
echo ""
echo "Base URL: https://${API_ID}.execute-api.${REGION}.amazonaws.com/prod"
echo ""
echo "Test endpoints with:"
echo "  bash test-campaigns-endpoints.sh"
echo ""
