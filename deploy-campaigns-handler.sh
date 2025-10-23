#!/bin/bash

# Deploy Campaigns Handler Lambda
# Phase 4: Marketing Campaign Management (Full Implementation)
#
# Prerequisites:
# - AWS CLI configured with credentials for account 235494808985
# - Region: ap-southeast-2
# - npm dependencies installed (npm install)

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

# Install dependencies
echo ""
echo "Step 1: Installing dependencies..."
npm install --production
echo "✓ Dependencies installed"

# Create deployment package
echo ""
echo "Step 2: Creating deployment package..."
powershell Compress-Archive -Path campaigns-handler.mjs,node_modules,package.json -DestinationPath $ZIP_FILE -Force
echo "✓ Deployment package created: $ZIP_FILE"

# Check if function exists
echo ""
echo "Step 3: Checking if Lambda function exists..."
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
    --description "Marketing campaigns API with CRUD operations, SES email delivery, and customer segmentation" \
    --tags ClientName="Packaging Products",Project="WebOrders",Component="MarketingCampaigns"

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
    --tags ClientName="Packaging Products",Project="WebOrders",Component="MarketingCampaigns" \
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
