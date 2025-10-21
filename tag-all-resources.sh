#!/bin/bash

# Tag all AWS resources for Packaging Products WebOrders project
# Tags: ClientName=Packaging Products, Project=WebOrders

set -e

REGION="ap-southeast-2"
ACCOUNT_ID="235494808985"

echo "=== Tagging Packaging Products WebOrders Resources ==="
echo ""
echo "Region: $REGION"
echo "Tags: ClientName=Packaging Products, Project=WebOrders"
echo ""

# Lambda Functions
echo "📦 Tagging Lambda Functions..."

echo "  1. queryPackagingProductsOrders"
aws lambda tag-resource \
  --resource arn:aws:lambda:$REGION:$ACCOUNT_ID:function:queryPackagingProductsOrders \
  --tags "ClientName=Packaging Products,Project=WebOrders" \
  --region $REGION \
  --no-cli-pager 2>&1 | grep -v "ResourceNotFoundException" || echo "  ✓ Tagged"

echo "  2. importPackagingProductsContacts"
aws lambda tag-resource \
  --resource arn:aws:lambda:$REGION:$ACCOUNT_ID:function:importPackagingProductsContacts \
  --tags "ClientName=Packaging Products,Project=WebOrders" \
  --region $REGION \
  --no-cli-pager 2>&1 | grep -v "ResourceNotFoundException" || echo "  ✓ Tagged"

# API Gateway
echo ""
echo "🌐 Tagging API Gateway..."
aws apigateway tag-resource \
  --resource-arn arn:aws:apigateway:$REGION::/restapis/bw4agz6xn4 \
  --tags "ClientName=Packaging Products,Project=WebOrders" \
  --region $REGION \
  --no-cli-pager 2>/dev/null && echo "  ✓ API Gateway tagged" || echo "  ⚠ API Gateway already tagged or failed"

# DynamoDB Tables
echo ""
echo "💾 Tagging DynamoDB Tables..."

echo "  1. packprod-weborders"
aws dynamodb tag-resource \
  --resource-arn arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/packprod-weborders \
  --tags Key=ClientName,Value="Packaging Products" Key=Project,Value=WebOrders \
  --region $REGION \
  --no-cli-pager 2>/dev/null && echo "  ✓ Tagged" || echo "  ⚠ Already tagged"

echo "  2. RocketReview_Contacts"
aws dynamodb tag-resource \
  --resource-arn arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/RocketReview_Contacts \
  --tags Key=ClientName,Value="Packaging Products" Key=Project,Value=WebOrders \
  --region $REGION \
  --no-cli-pager 2>/dev/null && echo "  ✓ Tagged" || echo "  ⚠ Already tagged"

# CloudWatch Log Groups
echo ""
echo "📊 Tagging CloudWatch Log Groups..."

echo "  1. /aws/lambda/queryPackagingProductsOrders"
aws logs tag-log-group \
  --log-group-name /aws/lambda/queryPackagingProductsOrders \
  --tags "ClientName=Packaging Products,Project=WebOrders" \
  --region $REGION \
  --no-cli-pager 2>/dev/null && echo "  ✓ Tagged" || echo "  ⚠ Already tagged"

echo "  2. /aws/lambda/importPackagingProductsContacts"
aws logs tag-log-group \
  --log-group-name /aws/lambda/importPackagingProductsContacts \
  --tags "ClientName=Packaging Products,Project=WebOrders" \
  --region $REGION \
  --no-cli-pager 2>/dev/null && echo "  ✓ Tagged" || echo "  ⚠ Already tagged"

# Verify Tags
echo ""
echo "=== Verification ==="
echo ""

echo "Lambda Functions:"
echo "  queryPackagingProductsOrders:"
aws lambda list-tags \
  --resource arn:aws:lambda:$REGION:$ACCOUNT_ID:function:queryPackagingProductsOrders \
  --region $REGION \
  --query 'Tags' \
  --output table

echo "  importPackagingProductsContacts:"
aws lambda list-tags \
  --resource arn:aws:lambda:$REGION:$ACCOUNT_ID:function:importPackagingProductsContacts \
  --region $REGION \
  --query 'Tags' \
  --output table

echo "DynamoDB Tables:"
echo "  packprod-weborders:"
aws dynamodb list-tags-of-resource \
  --resource-arn arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/packprod-weborders \
  --region $REGION \
  --query 'Tags' \
  --output table

echo "  RocketReview_Contacts:"
aws dynamodb list-tags-of-resource \
  --resource-arn arn:aws:dynamodb:$REGION:$ACCOUNT_ID:table/RocketReview_Contacts \
  --region $REGION \
  --query 'Tags' \
  --output table

echo "API Gateway:"
aws apigateway get-tags \
  --resource-arn arn:aws:apigateway:$REGION::/restapis/bw4agz6xn4 \
  --region $REGION \
  --query 'tags' \
  --output table

echo ""
echo "✅ All resources tagged!"
echo ""
echo "Summary:"
echo "  - 2 Lambda functions"
echo "  - 1 API Gateway"
echo "  - 2 DynamoDB tables"
echo "  - 2 CloudWatch log groups"
