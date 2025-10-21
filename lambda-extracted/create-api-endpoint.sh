#!/bin/bash

# Script to create API Gateway endpoint for Packaging Products import

API_ID="bw4agz6xn4"
REGION="ap-southeast-2"
FUNCTION_NAME="importPackagingProductsContacts"

echo "🔌 Creating API Gateway endpoint for Packaging Products import..."

# Get the parent resource ID for /admin/contacts/import
PARENT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query "items[?path=='/admin/contacts/import'].id" --output text)

if [ -z "$PARENT_ID" ]; then
    echo "❌ Error: Could not find /admin/contacts/import resource"
    exit 1
fi

echo "Found parent resource: $PARENT_ID"

# Check if packaging-products resource already exists
RESOURCE_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query "items[?path=='/admin/contacts/import/packaging-products'].id" --output text)

if [ -z "$RESOURCE_ID" ]; then
    # Create the resource
    echo "Creating /packaging-products resource..."
    RESOURCE_ID=$(aws apigateway create-resource \
        --rest-api-id $API_ID \
        --parent-id $PARENT_ID \
        --path-part "packaging-products" \
        --region $REGION \
        --query 'id' \
        --output text)
    echo "Created resource: $RESOURCE_ID"
else
    echo "Resource already exists: $RESOURCE_ID"
fi

# Create OPTIONS method for CORS
echo "Creating OPTIONS method..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --authorization-type NONE \
    --region $REGION 2>/dev/null

# Create OPTIONS integration
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --type MOCK \
    --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
    --region $REGION 2>/dev/null

# Create OPTIONS method response
aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
    --region $REGION 2>/dev/null

# Create OPTIONS integration response
aws apigateway put-integration-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method OPTIONS \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'POST,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
    --region $REGION 2>/dev/null

# Create POST method
echo "Creating POST method..."
aws apigateway put-method \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --authorization-type NONE \
    --region $REGION 2>/dev/null

# Get Lambda function ARN
FUNCTION_ARN="arn:aws:lambda:$REGION:235494808985:function:$FUNCTION_NAME"

# Create POST integration
echo "Creating POST integration..."
aws apigateway put-integration \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --type AWS_PROXY \
    --integration-http-method POST \
    --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$FUNCTION_ARN/invocations" \
    --region $REGION 2>/dev/null

# Create POST method response
aws apigateway put-method-response \
    --rest-api-id $API_ID \
    --resource-id $RESOURCE_ID \
    --http-method POST \
    --status-code 200 \
    --response-parameters '{"method.response.header.Access-Control-Allow-Origin":false}' \
    --region $REGION 2>/dev/null

# Deploy to prod stage
echo "Deploying to prod stage..."
aws apigateway create-deployment \
    --rest-api-id $API_ID \
    --stage-name prod \
    --description "Deploy Packaging Products import endpoint" \
    --region $REGION

echo "✅ API Gateway endpoint created and deployed!"
echo ""
echo "📌 Endpoint URL:"
echo "https://$API_ID.execute-api.$REGION.amazonaws.com/prod/admin/contacts/import/packaging-products"
echo ""
echo "Test with:"
echo "curl -X POST https://$API_ID.execute-api.$REGION.amazonaws.com/prod/admin/contacts/import/packaging-products \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{\"clientID\":\"7b0d485f-8ef9-45b0-881a-9d8f4447ced2\",\"contact\":{\"email\":\"test@example.com\",\"contact_name\":\"Test User\",\"company\":\"Test Co\"}}'"