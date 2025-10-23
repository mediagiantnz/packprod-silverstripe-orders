#!/bin/bash

# Setup API Gateway endpoint for product categories report
# Adds /api/reports/categories endpoint

API_ID="bw4agz6xn4"
REGION="ap-southeast-2"
LAMBDA_ARN="arn:aws:lambda:ap-southeast-2:235494808985:function:queryPackagingProductsOrders"

echo "=========================================="
echo "Setting up /api/reports/categories endpoint"
echo "=========================================="
echo ""

# Get the /api/reports resource ID
REPORTS_RESOURCE_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query "items[?path=='/api/reports'].id" \
  --output text)

echo "Found /api/reports resource ID: $REPORTS_RESOURCE_ID"
echo ""

# Create /categories resource under /api/reports
echo "Creating /api/reports/categories resource..."
CATEGORIES_RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $REPORTS_RESOURCE_ID \
  --path-part categories \
  --region $REGION \
  --query 'id' \
  --output text 2>/dev/null || aws apigateway get-resources \
    --rest-api-id $API_ID \
    --region $REGION \
    --query "items[?path=='/api/reports/categories'].id" \
    --output text)

echo "Categories resource ID: $CATEGORIES_RESOURCE_ID"
echo ""

# Create GET method
echo "Creating GET method..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $CATEGORIES_RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE \
  --region $REGION \
  --no-cli-pager 2>/dev/null || echo "  Method already exists"

# Create Lambda integration
echo "Setting up Lambda integration..."
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $CATEGORIES_RESOURCE_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
  --region $REGION \
  --no-cli-pager

# Add Lambda permission
echo "Adding Lambda permission..."
aws lambda add-permission \
  --function-name queryPackagingProductsOrders \
  --statement-id apigateway-categories-get \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:235494808985:$API_ID/*/GET/api/reports/categories" \
  --region $REGION 2>/dev/null || echo "  Permission already exists"

# Create OPTIONS method for CORS
echo "Creating OPTIONS method for CORS..."
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $CATEGORIES_RESOURCE_ID \
  --http-method OPTIONS \
  --authorization-type NONE \
  --region $REGION \
  --no-cli-pager 2>/dev/null || echo "  OPTIONS already exists"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $CATEGORIES_RESOURCE_ID \
  --http-method OPTIONS \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
  --region $REGION \
  --no-cli-pager 2>/dev/null

echo ""
echo "Deploying to prod stage..."
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --description "Add categories endpoint" \
  --region $REGION

echo ""
echo "✅ Setup complete!"
echo ""
echo "Test the endpoint:"
echo "curl \"https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/categories\""
echo ""
