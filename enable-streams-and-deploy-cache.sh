#!/bin/bash

# Enable DynamoDB Streams and deploy customer metrics caching system
# This script sets up the complete performance optimization infrastructure

set -e

echo "========================================="
echo "Performance Optimization Setup"
echo "========================================="
echo ""

# Step 1: Create cache table
echo "Step 1: Creating customer metrics cache table..."
bash create-customer-metrics-cache-table.sh

echo ""
echo "Step 2: Enabling DynamoDB Streams on packprod-weborders..."

# Check if stream is already enabled
STREAM_ARN=$(aws dynamodb describe-table \
  --table-name packprod-weborders \
  --region ap-southeast-2 \
  --query 'Table.LatestStreamArn' \
  --output text 2>/dev/null || echo "None")

if [ "$STREAM_ARN" == "None" ] || [ -z "$STREAM_ARN" ]; then
  echo "Enabling stream..."
  aws dynamodb update-table \
    --table-name packprod-weborders \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_AND_OLD_IMAGES \
    --region ap-southeast-2

  echo "Waiting for stream to be enabled..."
  sleep 10

  STREAM_ARN=$(aws dynamodb describe-table \
    --table-name packprod-weborders \
    --region ap-southeast-2 \
    --query 'Table.LatestStreamArn' \
    --output text)
fi

echo "Stream ARN: $STREAM_ARN"

echo ""
echo "Step 3: Creating Lambda execution role..."

# Create IAM role for Lambda (if it doesn't exist)
ROLE_NAME="updateCustomerMetricsLambdaRole"
ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text 2>/dev/null || echo "")

if [ -z "$ROLE_ARN" ]; then
  echo "Creating new IAM role..."

  cat > trust-policy.json <<EOF
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

  aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file://trust-policy.json \
    --tags Key=ClientName,Value="Packaging Products" Key=Project,Value=WebOrders \
    --region ap-southeast-2

  # Attach policies
  aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole

  aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess

  aws iam attach-role-policy \
    --role-name $ROLE_NAME \
    --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaDynamoDBExecutionRole

  echo "Waiting for role to propagate..."
  sleep 10

  ROLE_ARN=$(aws iam get-role --role-name $ROLE_NAME --query 'Role.Arn' --output text)
fi

echo "Role ARN: $ROLE_ARN"

echo ""
echo "Step 4: Creating Lambda deployment package..."

# Create deployment package
powershell Compress-Archive -Path update-customer-metrics-lambda.mjs,node_modules,package.json -DestinationPath lambda-cache-update-deploy.zip -Force

echo ""
echo "Step 5: Creating/Updating Lambda function..."

# Check if Lambda exists
LAMBDA_EXISTS=$(aws lambda get-function \
  --function-name updateCustomerMetricsCache \
  --region ap-southeast-2 2>/dev/null || echo "")

if [ -z "$LAMBDA_EXISTS" ]; then
  echo "Creating new Lambda function..."
  aws lambda create-function \
    --function-name updateCustomerMetricsCache \
    --runtime nodejs20.x \
    --role $ROLE_ARN \
    --handler update-customer-metrics-lambda.handler \
    --zip-file fileb://lambda-cache-update-deploy.zip \
    --timeout 60 \
    --memory-size 512 \
    --environment Variables="{AWS_REGION=ap-southeast-2,ORDERS_TABLE_NAME=packprod-weborders,CACHE_TABLE_NAME=packprod-customer-metrics-cache}" \
    --tags ClientName="Packaging Products",Project=WebOrders,Component=CacheUpdater \
    --region ap-southeast-2
else
  echo "Updating existing Lambda function..."
  aws lambda update-function-code \
    --function-name updateCustomerMetricsCache \
    --zip-file fileb://lambda-cache-update-deploy.zip \
    --region ap-southeast-2

  # Update environment variables
  aws lambda update-function-configuration \
    --function-name updateCustomerMetricsCache \
    --environment Variables="{AWS_REGION=ap-southeast-2,ORDERS_TABLE_NAME=packprod-weborders,CACHE_TABLE_NAME=packprod-customer-metrics-cache}" \
    --region ap-southeast-2
fi

echo ""
echo "Step 6: Creating DynamoDB Stream trigger..."

# Remove existing trigger if any
EXISTING_UUID=$(aws lambda list-event-source-mappings \
  --function-name updateCustomerMetricsCache \
  --region ap-southeast-2 \
  --query 'EventSourceMappings[0].UUID' \
  --output text 2>/dev/null || echo "")

if [ ! -z "$EXISTING_UUID" ] && [ "$EXISTING_UUID" != "None" ]; then
  echo "Removing existing trigger..."
  aws lambda delete-event-source-mapping \
    --uuid $EXISTING_UUID \
    --region ap-southeast-2
  sleep 5
fi

echo "Creating new trigger..."
aws lambda create-event-source-mapping \
  --function-name updateCustomerMetricsCache \
  --event-source-arn $STREAM_ARN \
  --batch-size 10 \
  --maximum-batching-window-in-seconds 5 \
  --starting-position LATEST \
  --region ap-southeast-2

# Clean up
rm -f trust-policy.json

echo ""
echo "========================================="
echo "Setup Complete!"
echo "========================================="
echo ""
echo "Components deployed:"
echo "- Customer metrics cache table: packprod-customer-metrics-cache"
echo "- Lambda function: updateCustomerMetricsCache"
echo "- DynamoDB Stream enabled on: packprod-weborders"
echo "- Stream trigger configured"
echo ""
echo "Next steps:"
echo "1. Run populate-customer-cache.sh to initially populate the cache"
echo "2. Deploy optimized query Lambda with: bash deploy-optimized-query-lambda.sh"
echo "3. Test performance improvements"
echo ""
