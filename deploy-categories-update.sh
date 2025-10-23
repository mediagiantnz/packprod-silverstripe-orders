#!/bin/bash

# Deploy Product Categories Update to AWS Lambda
# This script deploys the updated query-orders-lambda.mjs with product category support

set -e

echo "=========================================="
echo "Product Categories Lambda Deployment"
echo "=========================================="
echo ""

# Configuration
FUNCTION_NAME="queryPackagingProductsOrders"
REGION="ap-southeast-2"
BASE_DIR="C:/Users/Andy/source/Packaging Products/packprod-silverstripe-orders"
DEPLOY_ZIP="lambda-query-deploy.zip"

cd "$BASE_DIR"

# Step 1: Clean old deployment package
echo "[1/5] Cleaning old deployment package..."
if [ -f "$DEPLOY_ZIP" ]; then
  rm -f "$DEPLOY_ZIP"
  echo "✓ Removed old deployment package"
else
  echo "✓ No old deployment package found"
fi

# Step 2: Create deployment package
echo ""
echo "[2/5] Creating deployment package..."
echo "Including files:"
echo "  - query-orders-lambda.mjs (updated with category support)"
echo "  - product-categories.json (95 product mappings)"
echo "  - node_modules/"
echo "  - package.json"

powershell -Command "Compress-Archive -Path query-orders-lambda.mjs,product-categories.json,node_modules,package.json -DestinationPath $DEPLOY_ZIP -Force"

if [ -f "$DEPLOY_ZIP" ]; then
  SIZE=$(ls -lh "$DEPLOY_ZIP" | awk '{print $5}')
  echo "✓ Deployment package created: $SIZE"
else
  echo "✗ Failed to create deployment package"
  exit 1
fi

# Step 3: Backup current Lambda version
echo ""
echo "[3/5] Creating backup of current Lambda..."
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="query-orders-lambda.mjs.backup_${TIMESTAMP}"

cp query-orders-lambda.mjs "$BACKUP_FILE"
echo "✓ Backup saved: $BACKUP_FILE"

# Step 4: Deploy to AWS Lambda
echo ""
echo "[4/5] Deploying to AWS Lambda: $FUNCTION_NAME..."
echo "Region: $REGION"

aws lambda update-function-code \
  --function-name "$FUNCTION_NAME" \
  --zip-file "fileb://$DEPLOY_ZIP" \
  --region "$REGION" \
  --output json > deploy-result.json

if [ $? -eq 0 ]; then
  echo "✓ Lambda function updated successfully"
  LAST_MODIFIED=$(cat deploy-result.json | grep -o '"LastModified": "[^"]*"' | cut -d'"' -f4)
  CODE_SIZE=$(cat deploy-result.json | grep -o '"CodeSize": [0-9]*' | cut -d' ' -f2)
  echo "  Last Modified: $LAST_MODIFIED"
  echo "  Code Size: $CODE_SIZE bytes"
else
  echo "✗ Failed to update Lambda function"
  exit 1
fi

# Step 5: Test deployment
echo ""
echo "[5/5] Testing deployed Lambda..."
echo ""
echo "Test 1: Get all categories"
curl -s "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/products/categories" | head -n 20
echo ""

echo ""
echo "Test 2: Get products (with categories)"
curl -s "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products?limit=3" | head -n 30
echo ""

echo ""
echo "=========================================="
echo "Deployment Complete!"
echo "=========================================="
echo ""
echo "New endpoints available:"
echo "  1. GET /api/products/categories - List all product categories"
echo "  2. GET /api/reports/products?category=<name> - Filter products by category"
echo ""
echo "Examples:"
echo '  curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/products/categories"'
echo '  curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products?category=Cardboard%20Boxes"'
echo '  curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products?category=Tape%20%26%20Adhesives"'
echo ""
echo "To rollback, run:"
echo "  cp $BACKUP_FILE query-orders-lambda.mjs"
echo "  bash deploy-categories-update.sh"
echo ""
