#!/bin/bash

# Deployment script for importPackagingProductsContacts Lambda function

FUNCTION_NAME="importPackagingProductsContacts"
REGION="ap-southeast-2"
RUNTIME="nodejs20.x"
HANDLER="index.handler"
TIMEOUT=30
MEMORY_SIZE=256
ZIP_FILE="function.zip"

echo "🚀 Deploying Packaging Products Import Lambda Function..."

# Step 1: Install dependencies
echo "📦 Installing dependencies..."
npm install

# Step 2: Create deployment package
echo "📦 Creating deployment package..."
zip -r $ZIP_FILE index.mjs node_modules package.json

# Step 3: Check if function exists
echo "🔍 Checking if Lambda function exists..."
aws lambda get-function --function-name $FUNCTION_NAME --region $REGION 2>/dev/null

if [ $? -eq 0 ]; then
    # Function exists, update it
    echo "🔄 Updating existing Lambda function..."
    aws lambda update-function-code \
        --function-name $FUNCTION_NAME \
        --zip-file fileb://$ZIP_FILE \
        --region $REGION
        
    # Update function configuration
    aws lambda update-function-configuration \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --environment "Variables={CONTACTS_TABLE_NAME=RocketReview_Contacts,AWS_REGION=$REGION}" \
        --region $REGION
else
    # Function doesn't exist, create it
    echo "✨ Creating new Lambda function..."
    
    # Get the Lambda execution role ARN
    ROLE_ARN="arn:aws:iam::235494808985:role/lambda-execution-role"
    
    aws lambda create-function \
        --function-name $FUNCTION_NAME \
        --runtime $RUNTIME \
        --role $ROLE_ARN \
        --handler $HANDLER \
        --zip-file fileb://$ZIP_FILE \
        --timeout $TIMEOUT \
        --memory-size $MEMORY_SIZE \
        --environment "Variables={CONTACTS_TABLE_NAME=RocketReview_Contacts,AWS_REGION=$REGION}" \
        --region $REGION
        
    # Wait for function to be active
    echo "⏳ Waiting for function to be active..."
    aws lambda wait function-active --function-name $FUNCTION_NAME --region $REGION
    
    # Add API Gateway permission
    echo "🔐 Adding API Gateway permission..."
    aws lambda add-permission \
        --function-name $FUNCTION_NAME \
        --statement-id apigateway-invoke \
        --action lambda:InvokeFunction \
        --principal apigateway.amazonaws.com \
        --source-arn "arn:aws:execute-api:$REGION:235494808985:bw4agz6xn4/*/POST/admin/contacts/import/packaging-products" \
        --region $REGION
fi

# Step 4: Clean up
echo "🧹 Cleaning up..."
rm $ZIP_FILE

# Step 5: Update API Gateway (manual step required)
echo ""
echo "⚠️  IMPORTANT: Manual steps required:"
echo "1. Go to API Gateway console: https://console.aws.amazon.com/apigateway"
echo "2. Select the 'RocketReview' API (ID: bw4agz6xn4)"
echo "3. Import the endpoint configuration from: backend/api_gateway/packaging_products_import_endpoint.json"
echo "4. Deploy to 'prod' stage"
echo ""
echo "📌 The endpoint will be available at:"
echo "   https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products"
echo ""
echo "✅ Lambda function deployment complete!"