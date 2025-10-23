#!/bin/bash

# Deploy adminConfigHandler Lambda Function
# Project: Packaging Products WebOrders
# This script creates IAM role, packages, and deploys the Lambda function

set -e  # Exit on error

# Configuration
REGION="ap-southeast-2"
ACCOUNT_ID="235494808985"
LAMBDA_FUNCTION="adminConfigHandler"
IAM_ROLE_NAME="adminConfigHandlerRole"
TABLE_NAME="packprod-admin-config"

echo "=== Admin Config Lambda Deployment ==="
echo ""
echo "Region: $REGION"
echo "Lambda Function: $LAMBDA_FUNCTION"
echo "IAM Role: $IAM_ROLE_NAME"
echo "DynamoDB Table: $TABLE_NAME"
echo ""

# Step 1: Create IAM role for Lambda
echo "Step 1: Creating IAM role..."

# Trust policy for Lambda
cat > /tmp/lambda-trust-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
EOF

# Create role (or skip if exists)
aws iam create-role \
  --role-name $IAM_ROLE_NAME \
  --assume-role-policy-document file:///tmp/lambda-trust-policy.json \
  --description "IAM role for adminConfigHandler Lambda function" \
  --tags Key=ClientName,Value="Packaging Products" Key=Project,Value=WebOrders \
  --no-cli-pager \
  2>/dev/null || echo "  Role $IAM_ROLE_NAME already exists"

ROLE_ARN="arn:aws:iam::${ACCOUNT_ID}:role/${IAM_ROLE_NAME}"
echo "  Role ARN: $ROLE_ARN"
echo ""

# Step 2: Attach policies to IAM role
echo "Step 2: Attaching IAM policies..."

# Attach basic Lambda execution policy
aws iam attach-role-policy \
  --role-name $IAM_ROLE_NAME \
  --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole \
  --no-cli-pager \
  2>/dev/null || echo "  Basic execution policy already attached"

# Create custom DynamoDB policy
cat > /tmp/dynamodb-policy.json <<EOF
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:UpdateItem",
        "dynamodb:DeleteItem",
        "dynamodb:Scan",
        "dynamodb:Query"
      ],
      "Resource": [
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${TABLE_NAME}",
        "arn:aws:dynamodb:${REGION}:${ACCOUNT_ID}:table/${TABLE_NAME}/*"
      ]
    }
  ]
}
EOF

# Create inline policy for DynamoDB access
aws iam put-role-policy \
  --role-name $IAM_ROLE_NAME \
  --policy-name adminConfigDynamoDBAccess \
  --policy-document file:///tmp/dynamodb-policy.json \
  --no-cli-pager

echo "  Policies attached successfully"
echo ""

# Wait for IAM role to propagate
echo "Waiting for IAM role to propagate (10 seconds)..."
sleep 10
echo ""

# Step 3: Check if node_modules exists
echo "Step 3: Checking dependencies..."

if [ ! -d "node_modules" ]; then
  echo "  Installing npm dependencies..."
  npm install
else
  echo "  Dependencies already installed"
fi
echo ""

# Step 4: Create deployment package
echo "Step 4: Creating deployment package..."

# Clean up old package
rm -f lambda-admin-config-deploy.zip

# Create zip file
if command -v zip &> /dev/null; then
  zip -q -r lambda-admin-config-deploy.zip admin-config-lambda.mjs node_modules package.json
elif command -v powershell &> /dev/null; then
  powershell Compress-Archive -Path admin-config-lambda.mjs,node_modules,package.json -DestinationPath lambda-admin-config-deploy.zip -Force
else
  echo "Error: Neither zip nor powershell found. Cannot create deployment package."
  exit 1
fi

PACKAGE_SIZE=$(du -h lambda-admin-config-deploy.zip | cut -f1)
echo "  Package created: lambda-admin-config-deploy.zip ($PACKAGE_SIZE)"
echo ""

# Step 5: Create or update Lambda function
echo "Step 5: Deploying Lambda function..."

# Try to create function
aws lambda create-function \
  --function-name $LAMBDA_FUNCTION \
  --runtime nodejs20.x \
  --role $ROLE_ARN \
  --handler admin-config-lambda.handler \
  --zip-file fileb://lambda-admin-config-deploy.zip \
  --timeout 30 \
  --memory-size 256 \
  --environment "Variables={AWS_REGION=${REGION},ADMIN_CONFIG_TABLE_NAME=${TABLE_NAME}}" \
  --description "Admin configuration handler for Packaging Products WebOrders" \
  --tags ClientName="Packaging Products",Project=WebOrders \
  --region $REGION \
  --no-cli-pager \
  2>/dev/null && echo "  Lambda function created successfully" || {
    echo "  Lambda function already exists, updating code..."

    # Update function code
    aws lambda update-function-code \
      --function-name $LAMBDA_FUNCTION \
      --zip-file fileb://lambda-admin-config-deploy.zip \
      --region $REGION \
      --no-cli-pager

    # Update function configuration
    aws lambda update-function-configuration \
      --function-name $LAMBDA_FUNCTION \
      --runtime nodejs20.x \
      --role $ROLE_ARN \
      --handler admin-config-lambda.handler \
      --timeout 30 \
      --memory-size 256 \
      --environment "Variables={AWS_REGION=${REGION},ADMIN_CONFIG_TABLE_NAME=${TABLE_NAME}}" \
      --region $REGION \
      --no-cli-pager

    echo "  Lambda function updated successfully"
  }

echo ""

# Step 6: Wait for Lambda to be ready
echo "Step 6: Waiting for Lambda to be active..."
sleep 5

aws lambda wait function-active \
  --function-name $LAMBDA_FUNCTION \
  --region $REGION

echo "  Lambda is active and ready"
echo ""

# Step 7: Display Lambda details
echo "Step 7: Lambda function details:"
aws lambda get-function \
  --function-name $LAMBDA_FUNCTION \
  --region $REGION \
  --query 'Configuration.[FunctionName,Runtime,Handler,MemorySize,Timeout,LastModified]' \
  --output table

echo ""
echo "=== Deployment Complete ==="
echo ""
echo "Lambda Function ARN:"
echo "  arn:aws:lambda:${REGION}:${ACCOUNT_ID}:function:${LAMBDA_FUNCTION}"
echo ""
echo "Next steps:"
echo "  1. Run ./setup-admin-config-endpoints.sh to configure API Gateway"
echo "  2. Run ./create-admin-config-table.sh to create DynamoDB table and test data"
echo "  3. Test endpoints using curl or the test script"
echo ""
