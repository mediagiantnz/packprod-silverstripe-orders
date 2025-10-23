# Email Alerts System - Deployment Instructions

## Quick Start Deployment

### Prerequisites

1. Fresh AWS credentials configured
2. Node.js and npm installed
3. Git Bash or similar shell
4. Access to SES in ap-southeast-2 region

### One-Command Deployment

```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"
bash setup-email-alerts.sh
```

This script will handle everything automatically.

## Step-by-Step Manual Deployment

If you prefer to deploy manually or need to troubleshoot, follow these steps:

### Step 1: Verify SES Email Addresses

```bash
# Check current verified emails
aws ses list-identities --region ap-southeast-2

# Verify sender email
aws ses verify-email-identity \
  --email-address noreply@automateai.co.nz \
  --region ap-southeast-2

# Verify admin email
aws ses verify-email-identity \
  --email-address andy@automateai.co.nz \
  --region ap-southeast-2
```

**Important:** Check your inbox for both emails and click the verification links!

Wait a few minutes, then verify they're confirmed:

```bash
aws ses get-identity-verification-attributes \
  --identities noreply@automateai.co.nz andy@automateai.co.nz \
  --region ap-southeast-2
```

### Step 2: Create IAM Role

```bash
# Create role
aws iam create-role \
  --role-name emailAlertsPackagingProductsRole \
  --assume-role-policy-document file://email-alerts-trust-policy.json \
  --tags Key=ClientName,Value="Packaging Products" Key=Project,Value=WebOrders \
  --region ap-southeast-2

# Create policy
aws iam create-policy \
  --policy-name emailAlertsPackagingProductsPolicy \
  --policy-document file://email-alerts-iam-policy.json \
  --tags Key=ClientName,Value="Packaging Products" Key=Project,Value=WebOrders

# Attach policy to role
aws iam attach-role-policy \
  --role-name emailAlertsPackagingProductsRole \
  --policy-arn arn:aws:iam::235494808985:policy/emailAlertsPackagingProductsPolicy \
  --region ap-southeast-2

# Wait for IAM to propagate
sleep 10
```

### Step 3: Enable DynamoDB Stream

```bash
# Check if stream is already enabled
aws dynamodb describe-table \
  --table-name packprod-weborders \
  --region ap-southeast-2 \
  --query 'Table.LatestStreamArn'

# If not enabled, enable it
aws dynamodb update-table \
  --table-name packprod-weborders \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE \
  --region ap-southeast-2

# Wait for stream to be created
sleep 15

# Get stream ARN (save this for later)
STREAM_ARN=$(aws dynamodb describe-table \
  --table-name packprod-weborders \
  --region ap-southeast-2 \
  --query 'Table.LatestStreamArn' \
  --output text)

echo "Stream ARN: $STREAM_ARN"
```

### Step 4: Install Dependencies and Package Lambda

```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"

# Install dependencies
npm install --production

# Create deployment package
powershell Compress-Archive -Path email-alerts-lambda.mjs,node_modules,package.json -DestinationPath lambda-email-alerts-deploy.zip -Force
```

### Step 5: Create Lambda Function

```bash
aws lambda create-function \
  --function-name emailAlertsPackagingProducts \
  --runtime nodejs20.x \
  --role arn:aws:iam::235494808985:role/emailAlertsPackagingProductsRole \
  --handler email-alerts-lambda.handler \
  --zip-file fileb://lambda-email-alerts-deploy.zip \
  --timeout 60 \
  --memory-size 256 \
  --environment "Variables={AWS_REGION=ap-southeast-2,ADMIN_EMAIL=andy@automateai.co.nz,FROM_EMAIL=noreply@automateai.co.nz}" \
  --tags ClientName="Packaging Products",Project=WebOrders \
  --region ap-southeast-2
```

### Step 6: Create DynamoDB Stream Trigger

```bash
# Use the STREAM_ARN from Step 3
aws lambda create-event-source-mapping \
  --function-name emailAlertsPackagingProducts \
  --event-source-arn $STREAM_ARN \
  --starting-position LATEST \
  --batch-size 10 \
  --maximum-batching-window-in-seconds 5 \
  --region ap-southeast-2
```

### Step 7: Test the Deployment

```bash
# Test with simulated event
bash test-email-alerts.sh

# OR test end-to-end with real order
curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
  -H "Content-Type: application/json" \
  -d @sample-complete-payload.json
```

### Step 8: Verify Emails Sent

1. Check admin email (andy@automateai.co.nz) for new order notification
2. Check customer email (from sample payload) for order confirmation
3. Check CloudWatch Logs for function execution:

```bash
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/emailAlertsPackagingProducts --follow --region ap-southeast-2
```

## Troubleshooting Deployment

### Issue: Email Not Verified

**Error:** `MessageRejected: Email address is not verified`

**Solution:**
```bash
# Check verification status
aws ses get-identity-verification-attributes \
  --identities noreply@automateai.co.nz andy@automateai.co.nz \
  --region ap-southeast-2

# If not verified, re-send verification email
aws ses verify-email-identity \
  --email-address noreply@automateai.co.nz \
  --region ap-southeast-2

# Check inbox and click verification link
```

### Issue: IAM Role Not Ready

**Error:** `InvalidParameterValueException: The role defined for the function cannot be assumed by Lambda`

**Solution:**
```bash
# Wait longer for IAM to propagate
sleep 30

# Then retry Lambda creation
```

### Issue: DynamoDB Stream Not Found

**Error:** `ResourceNotFoundException: Stream arn:aws:dynamodb... does not exist`

**Solution:**
```bash
# Verify stream is enabled
aws dynamodb describe-table \
  --table-name packprod-weborders \
  --region ap-southeast-2

# If stream is disabled, enable it
aws dynamodb update-table \
  --table-name packprod-weborders \
  --stream-specification StreamEnabled=true,StreamViewType=NEW_IMAGE \
  --region ap-southeast-2

# Wait and try again
sleep 20
```

### Issue: Lambda Deployment Package Too Large

**Error:** `RequestEntityTooLargeException: Uncompressed size must be smaller than...`

**Solution:**
```bash
# Install only production dependencies
npm install --production

# Remove any unnecessary files
rm -rf node_modules/.bin node_modules/.cache

# Recreate zip
powershell Compress-Archive -Path email-alerts-lambda.mjs,node_modules,package.json -DestinationPath lambda-email-alerts-deploy.zip -Force
```

### Issue: Permission Denied on SES

**Error:** `AccessDeniedException: User is not authorized to perform: ses:SendEmail`

**Solution:**
```bash
# Verify IAM policy is attached
aws iam list-attached-role-policies \
  --role-name emailAlertsPackagingProductsRole

# If not attached, attach it
aws iam attach-role-policy \
  --role-name emailAlertsPackagingProductsRole \
  --policy-arn arn:aws:iam::235494808985:policy/emailAlertsPackagingProductsPolicy
```

## Updating the Lambda Function

After making code changes:

```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"

# Recreate deployment package
powershell Compress-Archive -Path email-alerts-lambda.mjs,node_modules,package.json -DestinationPath lambda-email-alerts-deploy.zip -Force

# Update Lambda code
aws lambda update-function-code \
  --function-name emailAlertsPackagingProducts \
  --zip-file fileb://lambda-email-alerts-deploy.zip \
  --region ap-southeast-2

# Test the update
bash test-email-alerts.sh
```

## Monitoring Commands

```bash
# View recent logs
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/emailAlertsPackagingProducts --since 1h --region ap-southeast-2

# Filter for errors
MSYS_NO_PATHCONV=1 aws logs filter-log-events \
  --log-group-name /aws/lambda/emailAlertsPackagingProducts \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region ap-southeast-2

# Check Lambda metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=emailAlertsPackagingProducts \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --region ap-southeast-2

# Check SES sending statistics
aws ses get-send-statistics --region ap-southeast-2
```

## Rollback Procedure

If something goes wrong and you need to rollback:

```bash
# Disable the stream trigger
MAPPING_UUID=$(aws lambda list-event-source-mappings \
  --function-name emailAlertsPackagingProducts \
  --region ap-southeast-2 \
  --query 'EventSourceMappings[0].UUID' \
  --output text)

aws lambda update-event-source-mapping \
  --uuid $MAPPING_UUID \
  --enabled false \
  --region ap-southeast-2

# This will stop emails from being sent without deleting the function
```

To re-enable:

```bash
aws lambda update-event-source-mapping \
  --uuid $MAPPING_UUID \
  --enabled true \
  --region ap-southeast-2
```

## Complete Cleanup (Remove Everything)

If you need to completely remove the email alerts system:

```bash
# Delete event source mapping
MAPPING_UUID=$(aws lambda list-event-source-mappings \
  --function-name emailAlertsPackagingProducts \
  --region ap-southeast-2 \
  --query 'EventSourceMappings[0].UUID' \
  --output text)

aws lambda delete-event-source-mapping \
  --uuid $MAPPING_UUID \
  --region ap-southeast-2

# Delete Lambda function
aws lambda delete-function \
  --function-name emailAlertsPackagingProducts \
  --region ap-southeast-2

# Detach and delete IAM policy
aws iam detach-role-policy \
  --role-name emailAlertsPackagingProductsRole \
  --policy-arn arn:aws:iam::235494808985:policy/emailAlertsPackagingProductsPolicy

aws iam delete-policy \
  --policy-arn arn:aws:iam::235494808985:policy/emailAlertsPackagingProductsPolicy

# Delete IAM role
aws iam delete-role \
  --role-name emailAlertsPackagingProductsRole

# Optionally disable DynamoDB stream (only if not used by other functions)
# aws dynamodb update-table \
#   --table-name packprod-weborders \
#   --stream-specification StreamEnabled=false \
#   --region ap-southeast-2
```

## Post-Deployment Checklist

- [ ] SES sender email verified (noreply@automateai.co.nz)
- [ ] SES admin email verified (andy@automateai.co.nz)
- [ ] IAM role created with correct permissions
- [ ] IAM policy attached to role
- [ ] DynamoDB Stream enabled on packprod-weborders
- [ ] Lambda function deployed successfully
- [ ] Event source mapping created and enabled
- [ ] Test email sent and received (admin)
- [ ] Test email sent and received (customer)
- [ ] CloudWatch logs show successful execution
- [ ] No errors in recent Lambda invocations
- [ ] All resources tagged correctly

## Next Steps After Deployment

1. **Request SES Production Access** (if sending to real customers)
   - Go to SES Console → Account Dashboard → Request Production Access
   - Fill out use case form
   - Wait for approval (24-48 hours)

2. **Set Up Domain Verification** (recommended)
   - Verify automateai.co.nz domain
   - Configure DKIM for better deliverability
   - Add SPF and DMARC records

3. **Configure Bounce/Complaint Notifications**
   - Create SNS topics for bounces and complaints
   - Set up SES to publish to SNS
   - Monitor email reputation

4. **Set Up Monitoring Dashboard**
   - Create CloudWatch dashboard for email metrics
   - Set up alarms for high error rates
   - Monitor SES sending quotas

5. **Test Edge Cases**
   - Order with missing customer email
   - Order with invalid email format
   - Large orders (many line items)
   - Orders with special characters in customer names

---

**Questions or Issues?**

Contact: Andy Pillow (andy@automateai.co.nz)

**Documentation:**
- EMAIL-ALERTS-GUIDE.md - Complete usage guide
- email-alerts-lambda.mjs - Lambda function source code
- setup-email-alerts.sh - Automated deployment script
