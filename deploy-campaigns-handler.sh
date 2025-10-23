#!/bin/bash

# Deploy Campaigns Handler Lambda
# Phase 4: Marketing Campaign Management (Placeholder Endpoints)
#
# Prerequisites:
# - AWS CLI configured with credentials for account 235494808985
# - Region: ap-southeast-2

set -e

echo "=========================================="
echo "Deploying Campaigns Handler Lambda"
echo "Phase 4: Marketing Campaign Management"
echo "=========================================="

# Variables
FUNCTION_NAME="campaignsHandler"
HANDLER="campaigns-handler.handler"
RUNTIME="nodejs20.x"
ROLE_ARN="arn:aws:iam::235494808985:role/lambda-dynamodb-role"
REGION="ap-southeast-2"
ZIP_FILE="lambda-campaigns-deploy.zip"

# Create deployment package
echo ""
echo "Step 1: Creating deployment package..."
powershell Compress-Archive -Path campaigns-handler.mjs,package.json -DestinationPath $ZIP_FILE -Force
echo "✓ Deployment package created: $ZIP_FILE"

# Check if function exists
echo ""
echo "Step 2: Checking if Lambda function exists..."
FUNCTION_EXISTS=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>&1 || echo "NotFound")

if echo "$FUNCTION_EXISTS" | grep -q "NotFound"; then
  echo "Function does not exist. Creating new Lambda function..."

  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime $RUNTIME \
    --role $ROLE_ARN \
    --handler $HANDLER \
    --zip-file fileb://$ZIP_FILE \
    --region $REGION \
    --timeout 30 \
    --memory-size 256 \
    --description "Campaigns API placeholder endpoints - Phase 4 feature (Coming Soon)" \
    --tags ClientName="Packaging Products",Project="WebOrders"

  echo "✓ Lambda function created: $FUNCTION_NAME"
else
  echo "Function exists. Updating function code..."

  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://$ZIP_FILE \
    --region $REGION

  echo "✓ Lambda function updated: $FUNCTION_NAME"

  # Update tags
  echo ""
  echo "Updating tags..."
  FUNCTION_ARN=$(aws lambda get-function --function-name $FUNCTION_NAME --region $REGION --query 'Configuration.FunctionArn' --output text)

  aws lambda tag-resource \
    --resource $FUNCTION_ARN \
    --tags ClientName="Packaging Products",Project="WebOrders" \
    --region $REGION

  echo "✓ Tags updated"
fi

echo ""
echo "=========================================="
echo "Lambda deployment complete!"
echo "=========================================="
echo ""
echo "Function Name: $FUNCTION_NAME"
echo "Region: $REGION"
echo "Handler: $HANDLER"
echo "Runtime: $RUNTIME"
echo ""
echo "Next steps:"
echo "1. Run setup-campaigns-endpoints.sh to configure API Gateway"
echo "2. Test endpoints with test-campaigns-endpoints.sh"
echo ""
