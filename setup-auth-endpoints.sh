#!/bin/bash

# Setup script for Cognito Auth API Gateway endpoints
# This script creates methods, integrations, and CORS configuration for auth endpoints

set -e

API_ID="bw4agz6xn4"
REGION="ap-southeast-2"
LAMBDA_ARN="arn:aws:lambda:ap-southeast-2:235494808985:function:packprodAuthHandler"
ACCOUNT_ID="235494808985"

# Resource IDs (from creation)
AUTH_LOGIN_ID="c84r2t"
AUTH_LOGOUT_ID="ethiqq"
AUTH_ME_ID="5pn70s"

echo "Setting up auth endpoints for API Gateway..."

# Function to create POST method with Lambda integration
create_post_method() {
  local RESOURCE_ID=$1
  local PATH=$2

  echo "Creating POST method for $PATH..."

  # Create POST method
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE \
    --region $REGION

  # Create Lambda integration
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
    --region $REGION

  # Create OPTIONS method for CORS
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION

  # Create mock integration for OPTIONS
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\":200}"}' \
    --region $REGION

  # Create method response for OPTIONS
  aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Origin":true,"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true}' \
    --region $REGION

  # Create integration response for OPTIONS
  aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'","method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,Authorization'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,OPTIONS'"'"'"}' \
    --region $REGION
}

# Function to create GET method with Lambda integration
create_get_method() {
  local RESOURCE_ID=$1
  local PATH=$2

  echo "Creating GET method for $PATH..."

  # Create GET method
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method GET \
    --authorization-type NONE \
    --region $REGION

  # Create Lambda integration
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method GET \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
    --region $REGION

  # Create OPTIONS method for CORS
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION

  # Create mock integration for OPTIONS
  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json":"{\"statusCode\":200}"}' \
    --region $REGION

  # Create method response for OPTIONS
  aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Origin":true,"method.response.header.Access-Control-Allow-Headers":true,"method.response.header.Access-Control-Allow-Methods":true}' \
    --region $REGION

  # Create integration response for OPTIONS
  aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'","method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,Authorization'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,POST,OPTIONS'"'"'"}' \
    --region $REGION
}

# Create methods for each endpoint
create_post_method $AUTH_LOGIN_ID "/auth/login"
create_post_method $AUTH_LOGOUT_ID "/auth/logout"
create_get_method $AUTH_ME_ID "/auth/me"

echo "Granting Lambda invoke permission to API Gateway..."

# Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
  --function-name packprodAuthHandler \
  --statement-id apigateway-auth-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:$ACCOUNT_ID:$API_ID/*/*/auth/*" \
  --region $REGION

echo "Deploying API to prod stage..."

# Deploy the API
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Deploy auth endpoints" \
  --region $REGION

echo "Auth endpoints setup complete!"
echo ""
echo "Endpoints available at:"
echo "  POST https://$API_ID.execute-api.$REGION.amazonaws.com/prod/auth/login"
echo "  POST https://$API_ID.execute-api.$REGION.amazonaws.com/prod/auth/logout"
echo "  GET  https://$API_ID.execute-api.$REGION.amazonaws.com/prod/auth/me"
