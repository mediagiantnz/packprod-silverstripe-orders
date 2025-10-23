#!/bin/bash

# Create packprod-admin-config DynamoDB table
# Region: ap-southeast-2
# Account: 235494808985

echo "Creating packprod-admin-config table..."

aws dynamodb create-table \
  --table-name packprod-admin-config \
  --attribute-definitions \
    AttributeName=configKey,AttributeType=S \
  --key-schema \
    AttributeName=configKey,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST \
  --tags \
    Key=ClientName,Value="Packaging Products" \
    Key=Project,Value=WebOrders \
    Key=Environment,Value=Production \
  --sse-specification Enabled=true,SSEType=KMS \
  --region ap-southeast-2

echo "Waiting for table to become active..."
aws dynamodb wait table-exists --table-name packprod-admin-config --region ap-southeast-2

echo "Table created successfully!"

# Display table details
echo ""
echo "Table details:"
aws dynamodb describe-table --table-name packprod-admin-config --region ap-southeast-2 --query 'Table.[TableName,TableStatus,ItemCount,TableSizeBytes]'

echo ""
echo "Inserting initial test configurations..."

# Required test configs
aws dynamodb put-item \
  --table-name packprod-admin-config \
  --item '{
    "configKey": {"S": "system_name"},
    "configValue": {"S": "Packaging Products WebOrders"},
    "description": {"S": "System name displayed in the dashboard"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"},
    "updatedBy": {"S": "system"}
  }' \
  --region ap-southeast-2

aws dynamodb put-item \
  --table-name packprod-admin-config \
  --item '{
    "configKey": {"S": "order_notification_email"},
    "configValue": {"S": "orders@packagingproducts.co.nz"},
    "description": {"S": "Email address for order notifications"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"},
    "updatedBy": {"S": "system"}
  }' \
  --region ap-southeast-2

aws dynamodb put-item \
  --table-name packprod-admin-config \
  --item '{
    "configKey": {"S": "max_items_per_order"},
    "configValue": {"N": "100"},
    "description": {"S": "Maximum number of items allowed per order"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"},
    "updatedBy": {"S": "system"}
  }' \
  --region ap-southeast-2

# Additional useful configs
aws dynamodb put-item \
  --table-name packprod-admin-config \
  --item '{
    "configKey": {"S": "email_alerts_enabled"},
    "configValue": {"BOOL": true},
    "description": {"S": "Enable/disable email alert notifications"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"},
    "updatedBy": {"S": "system"}
  }' \
  --region ap-southeast-2

aws dynamodb put-item \
  --table-name packprod-admin-config \
  --item '{
    "configKey": {"S": "default_currency"},
    "configValue": {"S": "NZD"},
    "description": {"S": "ISO 4217 currency code (e.g., USD, EUR, AUD, NZD)"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"},
    "updatedBy": {"S": "system"}
  }' \
  --region ap-southeast-2

aws dynamodb put-item \
  --table-name packprod-admin-config \
  --item '{
    "configKey": {"S": "tax_rate"},
    "configValue": {"N": "0.15"},
    "description": {"S": "Tax rate as decimal (e.g., 0.15 for 15% GST in NZ)"},
    "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"},
    "updatedBy": {"S": "system"}
  }' \
  --region ap-southeast-2

echo ""
echo "Test configurations inserted successfully!"

# Display all configs
echo ""
echo "Current configurations:"
aws dynamodb scan \
  --table-name packprod-admin-config \
  --region ap-southeast-2 \
  --query 'Items[*].[configKey.S, configValue, description.S]' \
  --output table
