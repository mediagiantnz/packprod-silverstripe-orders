#!/bin/bash

# Quick deployment script for importPackagingProductsContacts Lambda

FUNCTION_NAME="importPackagingProductsContacts"
REGION="ap-southeast-2"
RUNTIME="nodejs20.x"
HANDLER="index.handler"
TIMEOUT=30
MEMORY_SIZE=256

echo "🚀 Quick Deploy: Packaging Products Import Lambda"

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Create deployment package
echo "📦 Creating deployment package..."
zip -r function.zip index.mjs node_modules package.json

# Check if function exists
aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null

if [ $? -eq 0 ]; then
    # Update existing function
    echo "🔄 Updating Lambda function code..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://function.zip \
        --region $REGION
else
    # Create new function
    echo "✨ Creating new Lambda function..."
    
    # Get or create IAM role
    ROLE_ARN=$(aws iam get-role --role-name lambda-execution-role --query 'Role.Arn' --output text 2>/dev/null)
    
    if [ -z "$ROLE_ARN" ]; then
        echo "Creating IAM role..."
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
        
        ROLE_ARN=$(aws iam create-role \
            --role-name lambda-execution-role \
            --assume-role-policy-document file://trust-policy.json \
            --query 'Role.Arn' \
            --output text)
        
        aws iam attach-role-policy \
            --role-name lambda-execution-role \
            --policy-arn arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole
        
        aws iam attach-role-policy \
            --role-name lambda-execution-role \
            --policy-arn arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess
        
        rm trust-policy.json
        sleep 10
    fi
    
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role $ROLE_ARN \
        --handler $HANDLER \
        --zip-file fileb://function.zip \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --environment "Variables={CONTACTS_TABLE_NAME=RocketReview_Contacts,AWS_REGION=$REGION}" \
        --region $REGION
    
    # Add API Gateway permission
    echo "🔐 Adding API Gateway permission..."
    aws lambda add-permission \
        --function-name $FUNCTION_NAME \
        --statement-id apigateway-invoke \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:$REGION:235494808985:bw4agz6xn4/*/*/admin/contacts/import/packaging-products" \
        --region $REGION
fi

# Clean up
rm -f function.zip

echo "✅ Lambda deployment complete!"
echo ""
echo "📌 Testing the endpoint:"
echo "curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d @test-import.json"