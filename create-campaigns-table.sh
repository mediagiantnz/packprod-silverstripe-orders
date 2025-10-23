#!/bin/bash

# Create packprod-campaigns DynamoDB table
# This table stores marketing campaign data

set -e

REGION="ap-southeast-2"
TABLE_NAME="packprod-campaigns"

echo "========================================="
echo "Creating DynamoDB Campaigns Table"
echo "========================================="
echo "Region: $REGION"
echo "Table: $TABLE_NAME"
echo ""

# Check if table already exists
echo "Checking if table exists..."
if aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION 2>/dev/null; then
  echo "✓ Table $TABLE_NAME already exists"
  echo ""
  echo "Table details:"
  aws dynamodb describe-table --table-name $TABLE_NAME --region $REGION --query 'Table.{Name:TableName,Status:TableStatus,ItemCount:ItemCount,CreatedAt:CreationDateTime}' --output table
  exit 0
fi

# Create the table
echo "Creating table $TABLE_NAME..."
aws dynamodb create-table \
  --cli-input-json file://campaigns-table-schema.json \
  --region $REGION

echo ""
echo "Waiting for table to become active..."
aws dynamodb wait table-exists \
  --table-name $TABLE_NAME \
  --region $REGION

echo ""
echo "========================================="
echo "Table Created Successfully!"
echo "========================================="
echo ""

# Display table details
aws dynamodb describe-table \
  --table-name $TABLE_NAME \
  --region $REGION \
  --query 'Table.{Name:TableName,Status:TableStatus,ItemCount:ItemCount,BillingMode:BillingModeSummary.BillingMode,GSIs:GlobalSecondaryIndexes[*].IndexName}' \
  --output table

echo ""
echo "Table ARN:"
aws dynamodb describe-table \
  --table-name $TABLE_NAME \
  --region $REGION \
  --query 'Table.TableArn' \
  --output text

echo ""
echo "Indexes:"
aws dynamodb describe-table \
  --table-name $TABLE_NAME \
  --region $REGION \
  --query 'Table.GlobalSecondaryIndexes[*].{IndexName:IndexName,Keys:KeySchema[*].AttributeName}' \
  --output table

echo ""
echo "✓ Table is ready for use!"
