#!/bin/bash

# Deploy optimized query Lambda with customer metrics caching support

set -e

echo "========================================="
echo "Deploying Optimized Query Lambda"
echo "========================================="
echo ""

# Backup current version
echo "Step 1: Backing up current Lambda..."
cp query-orders-lambda.mjs query-orders-lambda-v2-backup.mjs

# Copy optimized version
echo "Step 2: Preparing optimized version..."
cp query-orders-lambda-v3-optimized.mjs query-orders-lambda.mjs

echo ""
echo "Step 3: Creating deployment package..."

# Create deployment package
powershell Compress-Archive -Path query-orders-lambda.mjs,node_modules,package.json,product-categories.json -DestinationPath lambda-query-deploy.zip -Force

echo ""
echo "Step 4: Deploying to AWS Lambda..."

aws lambda update-function-code \
  --function-name queryPackagingProductsOrders \
  --zip-file fileb://lambda-query-deploy.zip \
  --region ap-southeast-2

echo "Waiting for update to complete..."
aws lambda wait function-updated \
  --function-name queryPackagingProductsOrders \
  --region ap-southeast-2

echo ""
echo "Step 5: Updating environment variables to include cache table..."

aws lambda update-function-configuration \
  --function-name queryPackagingProductsOrders \
  --environment Variables="{CONTACTS_TABLE_NAME=RocketReview_Contacts,ORDERS_TABLE_NAME=packprod-weborders,CACHE_TABLE_NAME=packprod-customer-metrics-cache}" \
  --region ap-southeast-2

echo "Waiting for configuration update..."
sleep 5

echo ""
echo "========================================="
echo "Deployment Complete!"
echo "========================================="
echo ""
echo "The optimized Lambda includes:"
echo "- Customer metrics caching (cache-first strategy)"
echo "- Response time logging"
echo "- Slow query detection (>1s)"
echo "- Performance metadata in responses"
echo ""
echo "Testing endpoints:"
echo ""

# Test customers endpoint
echo "Testing /api/customers (should use cache)..."
START_TIME=$(date +%s%N)
RESPONSE=$(curl -s "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers?limit=5")
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))

echo "Response time: ${DURATION}ms"
echo "Response: $RESPONSE" | head -c 200
echo "..."
echo ""

# Test single customer endpoint
echo "Testing /api/customers/{id} (should use cache)..."
START_TIME=$(date +%s%N)
RESPONSE=$(curl -s "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers/7b0d485f-8ef9-45b0-881a-9d8f4447ced2")
END_TIME=$(date +%s%N)
DURATION=$(( (END_TIME - START_TIME) / 1000000 ))

echo "Response time: ${DURATION}ms"
echo ""

echo "Check CloudWatch Logs for detailed performance metrics:"
echo "aws logs tail /aws/lambda/queryPackagingProductsOrders --follow --region ap-southeast-2"
echo ""

echo "To rollback to previous version:"
echo "cp query-orders-lambda-v2-backup.mjs query-orders-lambda.mjs"
echo "bash deploy-optimized-query-lambda.sh"
echo ""
