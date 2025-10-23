#!/bin/bash

# Setup API Gateway endpoints for admin configuration
# Creates /api/admin/settings endpoints

API_ID="bw4agz6xn4"
REGION="ap-southeast-2"
LAMBDA_ARN="arn:aws:lambda:ap-southeast-2:235494808985:function:packprodAdminConfig"

echo "=========================================="
echo "Setting up admin configuration endpoints"
echo "=========================================="
echo ""

# Get the /api resource ID
API_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query "items[?path=='/api'].id" \
  --output text)

echo "Found /api resource ID: $API_RESOURCE_ID"
echo ""

# Create /admin resource under /api
echo "Creating /api/admin resource..."
ADMIN_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $API_RESOURCE_ID \
  --path-part admin \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?path=='/api/admin'].id" \
    --output text)

echo "Admin resource ID: $ADMIN_RESOURCE_ID"
echo ""

# Create /settings resource under /api/admin
echo "Creating /api/admin/settings resource..."
SETTINGS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ADMIN_RESOURCE_ID \
  --path-part settings \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?path=='/api/admin/settings'].id" \
    --output text)

echo "Settings resource ID: $SETTINGS_RESOURCE_ID"
echo ""

# Create /schemas resource under /api/admin/settings
echo "Creating /api/admin/settings/schemas resource..."
SCHEMAS_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $SETTINGS_RESOURCE_ID \
  --path-part schemas \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?path=='/api/admin/settings/schemas'].id" \
    --output text)

echo "Schemas resource ID: $SCHEMAS_RESOURCE_ID"
echo ""

# Create /{key} resource under /api/admin/settings
echo "Creating /api/admin/settings/{key} resource..."
KEY_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $SETTINGS_RESOURCE_ID \
  --path-part '{key}' \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?path=='/api/admin/settings/{key}'].id" \
    --output text)

echo "Key resource ID: $KEY_RESOURCE_ID"
echo ""

# Setup methods for each resource
echo "Setting up GET method for /api/admin/settings..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $SETTINGS_RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE \
  --region $REGION \
  --no-cli-pager 2>/dev/null || echo "  Method already exists"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $SETTINGS_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
  --region $REGION \
  --no-cli-pager

echo "Setting up PUT method for /api/admin/settings..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $SETTINGS_RESOURCE_ID \
  --http-method PUT \
  --authorization-type NONE \
  --region $REGION \
  --no-cli-pager 2>/dev/null || echo "  Method already exists"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $SETTINGS_RESOURCE_ID \
  --http-method PUT \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
  --region $REGION \
  --no-cli-pager

echo "Setting up GET method for /api/admin/settings/schemas..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $SCHEMAS_RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE \
  --region $REGION \
  --no-cli-pager 2>/dev/null || echo "  Method already exists"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $SCHEMAS_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
  --region $REGION \
  --no-cli-pager

echo "Setting up GET method for /api/admin/settings/{key}..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $KEY_RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE \
  --region $REGION \
  --request-parameters 'method.request.path.key=true' \
  --no-cli-pager 2>/dev/null || echo "  Method already exists"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $KEY_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
  --region $REGION \
  --no-cli-pager

echo "Setting up PUT method for /api/admin/settings/{key}..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $KEY_RESOURCE_ID \
  --http-method PUT \
  --authorization-type NONE \
  --region $REGION \
  --request-parameters 'method.request.path.key=true' \
  --no-cli-pager 2>/dev/null || echo "  Method already exists"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $KEY_RESOURCE_ID \
  --http-method PUT \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
  --region $REGION \
  --no-cli-pager

# Setup OPTIONS for CORS
echo "Setting up OPTIONS methods for CORS..."
for RESOURCE_ID in $SETTINGS_RESOURCE_ID $SCHEMAS_RESOURCE_ID $KEY_RESOURCE_ID; do
  aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION \
    --no-cli-pager 2>/dev/null || true

  aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
    --region $REGION \
    --no-cli-pager 2>/dev/null || true
done

# Add Lambda permissions
echo "Adding Lambda permissions..."
aws lambda add-permission \
  --function-name packprodAdminConfig \
  --statement-id apigateway-admin-all \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:235494808985:$API_ID/*/*/admin/*" \
  --region $REGION 2>/dev/null || echo "  Permission already exists"

echo ""
echo "Deploying to prod stage..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Add admin config endpoints" \
  --region $REGION

echo ""
echo "✅ Admin configuration endpoints setup complete!"
echo ""
echo "Test endpoints:"
echo "curl \"https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings\""
echo "curl \"https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings/schemas\""
echo ""
