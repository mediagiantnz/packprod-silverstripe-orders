#!/bin/bash

# Create customer metrics cache table for performance optimization
# This table stores pre-calculated customer metrics to avoid expensive scans

echo "Creating customer metrics cache table..."

aws dynamodb create-table \
  --cli-input-json file://customer-metrics-cache-schema.json \
  --region ap-southeast-2

if [ $? -eq 0 ]; then
  echo "Table created successfully!"
  echo ""
  echo "Waiting for table to become ACTIVE..."
  aws dynamodb wait table-exists \
    --table-name packprod-customer-metrics-cache \
    --region ap-southeast-2

  echo ""
  echo "Table is now ACTIVE!"
  echo ""
  echo "Next steps:"
  echo "1. Enable DynamoDB Streams on packprod-weborders table"
  echo "2. Deploy update-customer-metrics-lambda"
  echo "3. Configure Lambda trigger from packprod-weborders Stream"
  echo "4. Run initial population script to fill cache"
else
  echo "Error creating table. It may already exist."
  echo "Check table status:"
  echo "aws dynamodb describe-table --table-name packprod-customer-metrics-cache --region ap-southeast-2"
fi
