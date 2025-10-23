#!/bin/bash

API_ID="bw4agz6xn4"
REGION="ap-southeast-2"

# Resources that need OPTIONS method
declare -A RESOURCES=(
    ["bgq45h"]="/api/orders/{orderID}"
    ["ilwdjl"]="/api/customers/{contactID}"
    ["alnqj5"]="/api/customers/{contactID}/orders"
)

for RESOURCE_ID in "${!RESOURCES[@]}"; do
    PATH="${RESOURCES[$RESOURCE_ID]}"
    echo "Adding OPTIONS method to $PATH (Resource ID: $RESOURCE_ID)"
    
    # Create OPTIONS method
    aws apigateway put-method \
        --rest-api-id "$API_ID" \
        --resource-id "$RESOURCE_ID" \
        --http-method OPTIONS \
        --authorization-type NONE \
        --region "$REGION" \
        --no-api-key-required
    
    # Create MOCK integration for OPTIONS
    aws apigateway put-integration \
        --rest-api-id "$API_ID" \
        --resource-id "$RESOURCE_ID" \
        --http-method OPTIONS \
        --type MOCK \
        --request-templates '{"application/json": "{\"statusCode\": 200}"}' \
        --region "$REGION"
    
    # Set OPTIONS method response
    aws apigateway put-method-response \
        --rest-api-id "$API_ID" \
        --resource-id "$RESOURCE_ID" \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers":false,"method.response.header.Access-Control-Allow-Methods":false,"method.response.header.Access-Control-Allow-Origin":false}' \
        --response-models '{"application/json":"Empty"}' \
        --region "$REGION"
    
    # Set OPTIONS integration response with CORS headers
    aws apigateway put-integration-response \
        --rest-api-id "$API_ID" \
        --resource-id "$RESOURCE_ID" \
        --http-method OPTIONS \
        --status-code 200 \
        --response-parameters '{"method.response.header.Access-Control-Allow-Headers":"'"'"'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token'"'"'","method.response.header.Access-Control-Allow-Methods":"'"'"'GET,OPTIONS'"'"'","method.response.header.Access-Control-Allow-Origin":"'"'"'*'"'"'"}' \
        --region "$REGION"
    
    echo "✓ Added OPTIONS method to $PATH"
    echo ""
done

echo "Deploying API to prod stage..."
aws apigateway create-deployment \
    --rest-api-id "$API_ID" \
    --stage-name prod \
    --description "Add OPTIONS methods for CORS on customer and order detail routes" \
    --region "$REGION"

echo "✓ API deployed successfully!"
