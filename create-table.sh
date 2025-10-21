#!/bin/bash

# Create packprod-weborders DynamoDB table
# Region: ap-southeast-2

echo "Creating packprod-weborders table..."

aws dynamodb create-table \
  --table-name packprod-weborders \
  --attribute-definitions \
    AttributeName=orderID,AttributeType=S \
    AttributeName=contactID,AttributeType=S \
    AttributeName=clientID,AttributeType=S \
    AttributeName=order_reference,AttributeType=S \
    AttributeName=createdAt,AttributeType=S \
  --key-schema \
    AttributeName=orderID,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --global-secondary-indexes \
    "[
      {
        \"IndexName\": \"contactID-index\",
        \"KeySchema\": [
          {\"AttributeName\":\"contactID\",\"KeyType\":\"HASH\"},
          {\"AttributeName\":\"createdAt\",\"KeyType\":\"RANGE\"}
        ],
        \"Projection\":{\"ProjectionType\":\"ALL\"}
      },
      {
        \"IndexName\": \"clientID-createdAt-index\",
        \"KeySchema\": [
          {\"AttributeName\":\"clientID\",\"KeyType\":\"HASH\"},
          {\"AttributeName\":\"createdAt\",\"KeyType\":\"RANGE\"}
        ],
        \"Projection\":{\"ProjectionType\":\"ALL\"}
      },
      {
        \"IndexName\": \"order_reference-index\",
        \"KeySchema\": [
          {\"AttributeName\":\"order_reference\",\"KeyType\":\"HASH\"}
        ],
        \"Projection\":{\"ProjectionType\":\"ALL\"}
      }
    ]" \
  --tags \
    Key=ClientName,Value="Packaging Products" \
    Key=Project,Value=WebOrders \
    Key=Environment,Value=Production \
  --region ap-southeast-2

echo "Waiting for table to become active..."
aws dynamodb wait table-exists --table-name packprod-weborders --region ap-southeast-2

echo "Table created successfully!"

# Display table details
aws dynamodb describe-table --table-name packprod-weborders --region ap-southeast-2 --query 'Table.[TableName,TableStatus,ItemCount,TableSizeBytes]'
