#!/bin/bash

# Setup script for Email Alerts Lambda function
# This script creates the Lambda function, IAM role, and DynamoDB Stream trigger

set -e  # Exit on any error

REGION="ap-southeast-2"
ACCOUNT_ID="235494808985"
FUNCTION_NAME="emailAlertsPackagingProducts"
ROLE_NAME="emailAlertsPackagingProductsRole"
TABLE_NAME="packprod-weborders"
ADMIN_EMAIL="andy@automateai.co.nz"
FROM_EMAIL="noreply@automateai.co.nz"

echo "=========================================="
echo "Email Alerts Lambda Setup"
echo "=========================================="
echo "Region: $REGION"
echo "Account: $ACCOUNT_ID"
echo "Function: $FUNCTION_NAME"
echo "Table: $TABLE_NAME"
echo "Admin Email: $ADMIN_EMAIL"
echo "From Email: $FROM_EMAIL"
echo ""

# Step 1: Check if SES email is verified
echo "Step 1: Checking SES email verification status..."
VERIFIED_EMAILS=$(aws ses list-verified-email-addresses --region $REGION --query 'VerifiedEmailAddresses' --output json)

if echo "$VERIFIED_EMAILS" | grep -q "$FROM_EMAIL"; then
  echo "✓ FROM_EMAIL ($FROM_EMAIL) is verified in SES"
else
  echo "⚠ WARNING: FROM_EMAIL ($FROM_EMAIL) is NOT verified in SES"
  echo "  You need to verify this email before sending emails."
  echo "  Run: aws ses verify-email-identity --email-address $FROM_EMAIL --region $REGION"
  echo "  Then check your inbox and click the verification link."
  echo ""
  read -p "Do you want to send verification email now? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    aws ses verify-email-identity --email-address $FROM_EMAIL --region $REGION
    echo "✓ Verification email sent to $FROM_EMAIL"
    echo "  Please check your inbox and click the verification link before continuing."
    echo ""
    read -p "Press Enter once you've verified the email..."
  fi
fi

if echo "$VERIFIED_EMAILS" | grep -q "$ADMIN_EMAIL"; then
  echo "✓ ADMIN_EMAIL ($ADMIN_EMAIL) is verified in SES"
else
  echo "⚠ WARNING: ADMIN_EMAIL ($ADMIN_EMAIL) is NOT verified in SES"
  echo "  You need to verify this email to receive admin notifications."
  echo ""
  read -p "Do you want to send verification email now? (y/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Yy]$ ]]; then
    aws ses verify-email-identity --email-address $ADMIN_EMAIL --region $REGION
    echo "✓ Verification email sent to $ADMIN_EMAIL"
    echo "  Please check your inbox and click the verification link."
    echo ""
  fi
fi

# Step 2: Create IAM Role if it doesn't exist
echo ""
echo "Step 2: Creating IAM Role..."
if aws iam get-role --role-name $ROLE_NAME --region $REGION 2>/dev/null; then
  echo "✓ IAM Role $ROLE_NAME already exists"
else
  ROLE_ARN=$(aws iam create-role \
    --role-name $ROLE_NAME \
    --assume-role-policy-document file://email-alerts-trust-policy.json \
    --tags Key=ClientName,Value="Packaging Products" Key=Project,Value=WebOrders \
    --region $REGION \
    --query 'Role.Arn' \
    --output text)
  echo "✓ Created IAM Role: $ROLE_ARN"

  # Wait for role to be available
  echo "  Waiting for role to propagate..."
  sleep 10
fi

# Step 3: Attach IAM Policy
echo ""
echo "Step 3: Attaching IAM Policy..."
POLICY_NAME="emailAlertsPackagingProductsPolicy"

# Check if policy exists
POLICY_ARN=$(aws iam list-policies --query "Policies[?PolicyName=='$POLICY_NAME'].Arn" --output text)

if [ -z "$POLICY_ARN" ]; then
  # Create new policy
  POLICY_ARN=$(aws iam create-policy \
    --policy-name $POLICY_NAME \
    --policy-document file://email-alerts-iam-policy.json \
    --tags Key=ClientName,Value="Packaging Products" Key=Project,Value=WebOrders \
    --query 'Policy.Arn' \
    --output text)
  echo "✓ Created IAM Policy: $POLICY_ARN"
else
  echo "✓ IAM Policy already exists: $POLICY_ARN"
fi

# Attach policy to role
aws iam attach-role-policy \
  --role-name $ROLE_NAME \
  --policy-arn $POLICY_ARN \
  --region $REGION
echo "✓ Attached policy to role"

# Step 4: Enable DynamoDB Stream on table (if not already enabled)
echo ""
echo "Step 4: Checking DynamoDB Stream status..."
STREAM_ARN=$(aws dynamodb describe-table \
  --table-name $TABLE_NAME \
  --region $REGION \
  --query 'Table.LatestStreamArn' \
  --output text)

if [ "$STREAM_ARN" == "None" ] || [ -z "$STREAM_ARN" ]; then
  echo "  Enabling DynamoDB Stream on $TABLE_NAME..."
  aws dynamodb update-table \
    --table-name $TABLE_NAME \
    --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE \
    --region $REGION

  # Wait for stream to be created
  echo "  Waiting for stream to be created..."
  sleep 15

  # Get the new stream ARN
  STREAM_ARN=$(aws dynamodb describe-table \
    --table-name $TABLE_NAME \
    --region $REGION \
    --query 'Table.LatestStreamArn' \
    --output text)
  echo "✓ DynamoDB Stream enabled: $STREAM_ARN"
else
  echo "✓ DynamoDB Stream already enabled: $STREAM_ARN"
fi

# Step 5: Install dependencies and create deployment package
echo ""
echo "Step 5: Creating deployment package..."
npm install --production

# Create zip file
powershell Compress-Archive -Path email-alerts-lambda.mjs,node_modules,package.json -DestinationPath lambda-email-alerts-deploy.zip -Force
echo "✓ Deployment package created: lambda-email-alerts-deploy.zip"

# Step 6: Create or update Lambda function
echo ""
echo "Step 6: Deploying Lambda function..."
ROLE_ARN="arn:aws:iam::$ACCOUNT_ID:role/$ROLE_NAME"

if aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null; then
  echo "  Updating existing Lambda function..."
  aws lambda update-function-code \
    --function-name $FUNCTION_NAME \
    --zip-file fileb://lambda-email-alerts-deploy.zip \
    --region $REGION

  aws lambda update-function-configuration \
    --function-name $FUNCTION_NAME \
    --runtime nodejs20.x \
    --handler email-alerts-lambda.handler \
    --timeout 60 \
    --memory-size 256 \
    --environment "Variables={AWS_REGION=$REGION,ADMIN_EMAIL=$ADMIN_EMAIL,FROM_EMAIL=$FROM_EMAIL}" \
    --region $REGION

  echo "✓ Lambda function updated"
else
  echo "  Creating new Lambda function..."

  # Wait a bit more for IAM role to be fully available
  echo "  Waiting for IAM role to be ready..."
  sleep 10

  aws lambda create-function \
    --function-name $FUNCTION_NAME \
    --runtime nodejs20.x \
    --role $ROLE_ARN \
    --handler email-alerts-lambda.handler \
    --zip-file fileb://lambda-email-alerts-deploy.zip \
    --timeout 60 \
    --memory-size 256 \
    --environment "Variables={AWS_REGION=$REGION,ADMIN_EMAIL=$ADMIN_EMAIL,FROM_EMAIL=$FROM_EMAIL}" \
    --tags ClientName="Packaging Products",Project=WebOrders \
    --region $REGION

  echo "✓ Lambda function created"
fi

# Step 7: Add DynamoDB Stream trigger
echo ""
echo "Step 7: Setting up DynamoDB Stream trigger..."

# Check if event source mapping already exists
EXISTING_MAPPING=$(aws lambda list-event-source-mappings \
  --function-name $FUNCTION_NAME \
  --region $REGION \
  --query "EventSourceMappings[?EventSourceArn=='$STREAM_ARN'].UUID" \
  --output text)

if [ -z "$EXISTING_MAPPING" ]; then
  # Create new event source mapping
  MAPPING_UUID=$(aws lambda create-event-source-mapping \
    --function-name $FUNCTION_NAME \
    --event-source-arn $STREAM_ARN \
    --starting-position LATEST \
    --batch-size 10 \
    --maximum-batching-window-in-seconds 5 \
    --region $REGION \
    --query 'UUID' \
    --output text)
  echo "✓ DynamoDB Stream trigger created: $MAPPING_UUID"
else
  echo "✓ DynamoDB Stream trigger already exists: $EXISTING_MAPPING"
fi

# Step 8: Summary
echo ""
echo "=========================================="
echo "Email Alerts Setup Complete!"
echo "=========================================="
echo ""
echo "Lambda Function: $FUNCTION_NAME"
echo "Lambda ARN: arn:aws:lambda:$REGION:$ACCOUNT_ID:function:$FUNCTION_NAME"
echo "IAM Role: $ROLE_NAME"
echo "DynamoDB Stream: $STREAM_ARN"
echo ""
echo "Environment Variables:"
echo "  AWS_REGION: $REGION"
echo "  ADMIN_EMAIL: $ADMIN_EMAIL"
echo "  FROM_EMAIL: $FROM_EMAIL"
echo ""
echo "Next Steps:"
echo "1. Verify that $FROM_EMAIL and $ADMIN_EMAIL are verified in SES"
echo "2. Test the system by creating a new order"
echo "3. Check CloudWatch logs: /aws/lambda/$FUNCTION_NAME"
echo ""
echo "To test with a sample order:"
echo "  curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \\"
echo "    -H \"Content-Type: application/json\" \\"
echo "    -d @sample-complete-payload.json"
echo ""
