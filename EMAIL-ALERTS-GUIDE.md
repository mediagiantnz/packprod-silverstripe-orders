# Email Alerts System - Implementation Guide

## Overview

The Email Alerts System automatically sends email notifications when new orders are created in the Packaging Products WebOrders system. It uses AWS Lambda triggered by DynamoDB Streams to send two types of emails:

1. **Customer Confirmation Emails** - Sent to customers who place orders
2. **Admin Notification Emails** - Sent to admin (andy@automateai.co.nz) for all new orders

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     Order Import Flow                           │
└─────────────────────────────────────────────────────────────────┘

n8n Email Parser
      ↓
      ↓ POST /admin/contacts/import/packaging-products
      ↓
importPackagingProductsContacts Lambda
      ↓
      ↓ Writes new order
      ↓
packprod-weborders DynamoDB Table
      ↓
      ↓ DynamoDB Stream (INSERT event)
      ↓
emailAlertsPackagingProducts Lambda
      ↓
      ├─→ AWS SES → Customer Confirmation Email
      └─→ AWS SES → Admin Notification Email
```

## Components

### 1. Email Alerts Lambda Function

**File:** `email-alerts-lambda.mjs`
**Function Name:** `emailAlertsPackagingProducts`
**Runtime:** Node.js 20.x
**Memory:** 256 MB
**Timeout:** 60 seconds

**Key Features:**
- Processes DynamoDB Stream events (INSERT only)
- Unmarshals DynamoDB records to regular JSON
- Generates HTML and plain text email templates
- Sends emails via AWS SES
- Handles errors gracefully (logs but doesn't block order processing)
- Processes records in batches

**Environment Variables:**
- `AWS_REGION`: ap-southeast-2
- `ADMIN_EMAIL`: andy@automateai.co.nz
- `FROM_EMAIL`: noreply@automateai.co.nz

### 2. Email Templates

#### Customer Confirmation Email

**Template Features:**
- Professional HTML design with company branding
- Order summary with reference and date
- Detailed itemized order table with quantities and prices
- Order totals breakdown (subtotal, freight, GST, total)
- Delivery address information
- Payment information (if available)
- Plain text alternative for email clients that don't support HTML

**Subject:** `Order Confirmation - {order_reference}`

#### Admin Notification Email

**Template Features:**
- Alert-style design with orange header
- Complete order details including Order ID
- Full customer information (name, company, email, phone, account)
- Itemized order table
- Delivery address
- Payment details
- Greentree integration details (if available)
- Plain text alternative

**Subject:** `New Order Alert - {order_reference}`

### 3. IAM Role and Permissions

**Role Name:** `emailAlertsPackagingProductsRole`
**Policy Name:** `emailAlertsPackagingProductsPolicy`

**Permissions:**
- CloudWatch Logs (create log groups/streams, write logs)
- DynamoDB Streams (describe, get records, get shard iterator)
- SES (send email from verified addresses only)

**Security:**
- Restricted to specific sender addresses (noreply@automateai.co.nz, andy@automateai.co.nz)
- Restricted to specific DynamoDB Stream ARN
- Follows principle of least privilege

### 4. DynamoDB Stream

**Table:** `packprod-weborders`
**Stream View Type:** `NEW_IMAGE` (captures the new item after modification)
**Stream Enabled:** Yes

**Event Source Mapping:**
- Starting Position: LATEST (only process new records)
- Batch Size: 10 records
- Maximum Batching Window: 5 seconds
- Filters: None (processing done in Lambda)

## Setup Instructions

### Prerequisites

1. AWS CLI configured with credentials for account 235494808985
2. Node.js and npm installed
3. Access to SES in ap-southeast-2 region
4. Bash shell (Git Bash on Windows)

### Step 1: Verify SES Email Addresses

Before sending emails, you must verify the sender and recipient addresses in SES:

```bash
# Run verification script
bash verify-ses-emails.sh

# Or manually verify
aws ses verify-email-identity \
  --email-address noreply@automateai.co.nz \
  --region ap-southeast-2

aws ses verify-email-identity \
  --email-address andy@automateai.co.nz \
  --region ap-southeast-2
```

**Important:** Check your inbox and click the verification links in the emails from Amazon SES.

**SES Sandbox Mode:**
- By default, SES accounts are in "sandbox mode"
- In sandbox mode, you can only send emails to verified addresses
- To send to any customer email, request production access in SES console

### Step 2: Run Setup Script

The setup script automates the entire deployment:

```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"
bash setup-email-alerts.sh
```

**What the script does:**
1. Checks SES email verification status
2. Creates IAM role and attaches policies
3. Enables DynamoDB Stream on packprod-weborders table
4. Installs npm dependencies
5. Creates deployment package (ZIP)
6. Creates/updates Lambda function
7. Configures DynamoDB Stream trigger
8. Tags all resources with ClientName="Packaging Products", Project="WebOrders"

### Step 3: Test the System

Option A: Test with simulated DynamoDB Stream event:

```bash
bash test-email-alerts.sh
```

Option B: Test end-to-end by creating a real order:

```bash
curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
  -H "Content-Type: application/json" \
  -d @sample-complete-payload.json
```

## Monitoring and Troubleshooting

### View CloudWatch Logs

```bash
# Tail logs in real-time
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/emailAlertsPackagingProducts --follow --region ap-southeast-2

# Filter for errors
MSYS_NO_PATHCONV=1 aws logs filter-log-events \
  --log-group-name /aws/lambda/emailAlertsPackagingProducts \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region ap-southeast-2
```

### Common Issues

#### 1. Emails Not Sending

**Symptom:** Lambda runs successfully but no emails arrive

**Possible Causes:**
- Email addresses not verified in SES
- SES still in sandbox mode (can't send to unverified addresses)
- FROM_EMAIL not verified
- Incorrect email address in order data

**Solution:**
```bash
# Check verification status
aws ses list-verified-email-addresses --region ap-southeast-2

# Verify missing emails
bash verify-ses-emails.sh

# Check SES sending statistics
aws ses get-send-statistics --region ap-southeast-2
```

#### 2. Permission Denied Errors

**Symptom:** Lambda fails with AccessDeniedException

**Possible Causes:**
- IAM role missing permissions
- Role policy not attached
- SES condition not met (wrong FROM address)

**Solution:**
```bash
# Check role policies
aws iam list-attached-role-policies \
  --role-name emailAlertsPackagingProductsRole \
  --region ap-southeast-2

# Re-run setup to fix permissions
bash setup-email-alerts.sh
```

#### 3. DynamoDB Stream Not Triggering

**Symptom:** Orders created but Lambda never runs

**Possible Causes:**
- Stream not enabled on table
- Event source mapping not configured
- Event source mapping disabled

**Solution:**
```bash
# Check stream status
aws dynamodb describe-table \
  --table-name packprod-weborders \
  --region ap-southeast-2 \
  --query 'Table.{StreamArn:LatestStreamArn,StreamEnabled:StreamSpecification.StreamEnabled}'

# List event source mappings
aws lambda list-event-source-mappings \
  --function-name emailAlertsPackagingProducts \
  --region ap-southeast-2

# Re-run setup to fix
bash setup-email-alerts.sh
```

#### 4. Lambda Timeout

**Symptom:** Lambda times out before sending emails

**Possible Causes:**
- SES API slow or unavailable
- Lambda timeout too short
- Too many records in batch

**Solution:**
```bash
# Increase timeout to 90 seconds
aws lambda update-function-configuration \
  --function-name emailAlertsPackagingProducts \
  --timeout 90 \
  --region ap-southeast-2
```

## Email Content Customization

### Modify Customer Email Template

Edit the `generateCustomerEmailHtml()` function in `email-alerts-lambda.mjs`:

```javascript
// Example: Add company logo
function generateCustomerEmailHtml(order) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Order Confirmation</title>
</head>
<body>
  <div style="text-align: center;">
    <img src="https://yourcompany.com/logo.png" alt="Company Logo" style="max-width: 200px;">
  </div>
  <!-- Rest of template -->
</body>
</html>
  `;
}
```

### Modify Admin Email Template

Edit the `generateAdminEmailHtml()` function to add custom fields or styling.

### Redeploy After Changes

```bash
# Create new deployment package
powershell Compress-Archive -Path email-alerts-lambda.mjs,node_modules,package.json -DestinationPath lambda-email-alerts-deploy.zip -Force

# Deploy to Lambda
aws lambda update-function-code \
  --function-name emailAlertsPackagingProducts \
  --zip-file fileb://lambda-email-alerts-deploy.zip \
  --region ap-southeast-2

# Test changes
bash test-email-alerts.sh
```

## Email Delivery Best Practices

### 1. SES Production Access

To send emails to any customer (not just verified addresses):

1. Go to SES Console: https://console.aws.amazon.com/ses/home?region=ap-southeast-2
2. Click "Account dashboard" → "Request production access"
3. Fill out the form explaining your use case
4. Wait for approval (usually 24-48 hours)

### 2. Domain Verification (Recommended)

Verify your domain instead of individual emails:

```bash
# Verify domain
aws ses verify-domain-identity \
  --domain automateai.co.nz \
  --region ap-southeast-2

# Get DNS records to add
aws ses verify-domain-dkim \
  --domain automateai.co.nz \
  --region ap-southeast-2
```

Benefits:
- Send from any email address @automateai.co.nz
- Improved email deliverability
- DKIM signing for authentication

### 3. Bounce and Complaint Handling

Set up SNS notifications for bounces and complaints:

```bash
# Create SNS topic
aws sns create-topic \
  --name ses-bounces-packaging-products \
  --region ap-southeast-2

# Configure SES notifications
aws ses set-identity-notification-topic \
  --identity automateai.co.nz \
  --notification-type Bounce \
  --sns-topic arn:aws:sns:ap-southeast-2:235494808985:ses-bounces-packaging-products \
  --region ap-southeast-2
```

### 4. Email Sending Limits

Check your SES sending limits:

```bash
aws ses get-send-quota --region ap-southeast-2
```

Typical limits:
- Sandbox: 200 emails/day, 1 email/second
- Production: Starts at 50,000 emails/day, 14 emails/second (increases over time)

## Cost Estimates

### SES Pricing (as of 2024)

- First 62,000 emails/month: FREE (when sent from EC2 or Lambda)
- Additional emails: $0.10 per 1,000 emails

### Lambda Pricing

- First 1 million requests/month: FREE
- Additional requests: $0.20 per 1 million
- Duration: $0.0000166667 per GB-second

**Example Monthly Cost (1000 orders/month):**
- Lambda invocations: FREE (under free tier)
- Lambda duration: ~$0.01
- SES emails (2000 emails - customer + admin): FREE (under free tier)
- **Total: ~$0.01/month**

### DynamoDB Streams Pricing

- First 2.5 million read requests/month: FREE
- Additional: $0.02 per 100,000 read requests

**Estimated cost: FREE (well under free tier)**

## Maintenance

### Regular Tasks

1. **Monitor bounce rates** - Check SES dashboard weekly
2. **Review CloudWatch logs** - Check for errors monthly
3. **Update dependencies** - Update npm packages quarterly
4. **Test email delivery** - Send test order monthly
5. **Review SES sending statistics** - Check deliverability metrics

### Updating Lambda Function

```bash
# Pull latest code
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"
git pull

# Redeploy
bash setup-email-alerts.sh
```

### Disabling Email Alerts

If you need to temporarily disable email alerts:

```bash
# Disable event source mapping
MAPPING_UUID=$(aws lambda list-event-source-mappings \
  --function-name emailAlertsPackagingProducts \
  --region ap-southeast-2 \
  --query 'EventSourceMappings[0].UUID' \
  --output text)

aws lambda update-event-source-mapping \
  --uuid $MAPPING_UUID \
  --enabled false \
  --region ap-southeast-2
```

Re-enable:

```bash
aws lambda update-event-source-mapping \
  --uuid $MAPPING_UUID \
  --enabled true \
  --region ap-southeast-2
```

## Support and Resources

### AWS Documentation

- [SES Developer Guide](https://docs.aws.amazon.com/ses/latest/dg/)
- [Lambda Developer Guide](https://docs.aws.amazon.com/lambda/latest/dg/)
- [DynamoDB Streams](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.html)

### Project Files

- `email-alerts-lambda.mjs` - Main Lambda function
- `setup-email-alerts.sh` - Deployment script
- `test-email-alerts.sh` - Testing script
- `verify-ses-emails.sh` - Email verification helper
- `email-alerts-iam-policy.json` - IAM permissions
- `email-alerts-trust-policy.json` - IAM trust relationship

### Troubleshooting Checklist

- [ ] SES emails verified (noreply@automateai.co.nz, andy@automateai.co.nz)
- [ ] Lambda function deployed successfully
- [ ] IAM role has correct permissions
- [ ] DynamoDB Stream enabled on packprod-weborders table
- [ ] Event source mapping configured and enabled
- [ ] Test email sent successfully
- [ ] CloudWatch logs show successful execution
- [ ] No errors in Lambda execution

## Future Enhancements

### Potential Improvements

1. **Email Preferences** - Allow customers to opt-out of order confirmations
2. **Email Tracking** - Track email opens and clicks using SES with SNS
3. **Custom Templates** - Store email templates in S3 for easier editing
4. **Retry Logic** - Implement exponential backoff for failed emails
5. **Rich Content** - Add product images and tracking links to emails
6. **Multi-language Support** - Detect customer language and send localized emails
7. **SMS Notifications** - Add SMS alerts via SNS for high-value orders
8. **Webhook Integration** - Notify external systems of email delivery status

### Template Customization Ideas

1. Add company logo and branding
2. Include order tracking link
3. Add upsell/cross-sell product recommendations
4. Include customer support contact information
5. Add social media links
6. Include terms and conditions link
7. Add promotional banners for upcoming sales

---

**Document Version:** 1.0
**Last Updated:** October 23, 2025
**Maintained By:** Andy Pillow (andy@automateai.co.nz)
