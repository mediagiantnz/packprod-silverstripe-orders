# Email Alerts - Quick Reference Card

## Deployment

### Initial Setup (One Time)
```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"
bash setup-email-alerts.sh
```

### Verify SES Emails
```bash
bash verify-ses-emails.sh
```

### Test the System
```bash
bash test-email-alerts.sh
```

---

## Common Commands

### Deploy/Update Lambda
```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"
npm install --production
powershell Compress-Archive -Path email-alerts-lambda.mjs,node_modules,package.json -DestinationPath lambda-email-alerts-deploy.zip -Force
aws lambda update-function-code --function-name emailAlertsPackagingProducts --zip-file fileb://lambda-email-alerts-deploy.zip --region ap-southeast-2
```

### View Logs (Live)
```bash
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/emailAlertsPackagingProducts --follow --region ap-southeast-2
```

### View Recent Logs
```bash
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/emailAlertsPackagingProducts --since 1h --region ap-southeast-2
```

### Filter for Errors
```bash
MSYS_NO_PATHCONV=1 aws logs filter-log-events \
  --log-group-name /aws/lambda/emailAlertsPackagingProducts \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region ap-southeast-2
```

---

## SES Commands

### Check Verified Emails
```bash
aws ses list-identities --region ap-southeast-2
```

### Verify New Email
```bash
aws ses verify-email-identity --email-address EMAIL@DOMAIN.COM --region ap-southeast-2
```

### Check Sending Statistics
```bash
aws ses get-send-statistics --region ap-southeast-2
```

### Check Send Quota
```bash
aws ses get-send-quota --region ap-southeast-2
```

---

## Lambda Commands

### Get Function Info
```bash
aws lambda get-function --function-name emailAlertsPackagingProducts --region ap-southeast-2
```

### Update Environment Variables
```bash
aws lambda update-function-configuration \
  --function-name emailAlertsPackagingProducts \
  --environment "Variables={AWS_REGION=ap-southeast-2,ADMIN_EMAIL=andy@automateai.co.nz,FROM_EMAIL=noreply@automateai.co.nz}" \
  --region ap-southeast-2
```

### Check Lambda Metrics
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=emailAlertsPackagingProducts \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Sum \
  --region ap-southeast-2
```

---

## DynamoDB Stream Commands

### Check Stream Status
```bash
aws dynamodb describe-table \
  --table-name packprod-weborders \
  --region ap-southeast-2 \
  --query 'Table.{StreamArn:LatestStreamArn,StreamEnabled:StreamSpecification.StreamEnabled}'
```

### List Event Source Mappings
```bash
aws lambda list-event-source-mappings \
  --function-name emailAlertsPackagingProducts \
  --region ap-southeast-2
```

### Disable Stream Trigger
```bash
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

### Enable Stream Trigger
```bash
aws lambda update-event-source-mapping \
  --uuid $MAPPING_UUID \
  --enabled true \
  --region ap-southeast-2
```

---

## Testing Commands

### Test with Sample Order (End-to-End)
```bash
curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
  -H "Content-Type: application/json" \
  -d @sample-complete-payload.json
```

### Test Lambda Directly
```bash
bash test-email-alerts.sh
```

---

## Troubleshooting

### Email Not Sending
```bash
# Check verification status
aws ses get-identity-verification-attributes \
  --identities noreply@automateai.co.nz andy@automateai.co.nz \
  --region ap-southeast-2

# Re-verify if needed
bash verify-ses-emails.sh
```

### Lambda Not Triggering
```bash
# Check stream is enabled
aws dynamodb describe-table --table-name packprod-weborders --region ap-southeast-2

# Check event source mapping
aws lambda list-event-source-mappings --function-name emailAlertsPackagingProducts --region ap-southeast-2
```

### Permission Errors
```bash
# Check IAM role policies
aws iam list-attached-role-policies --role-name emailAlertsPackagingProductsRole --region ap-southeast-2

# Check policy details
aws iam get-policy-version \
  --policy-arn arn:aws:iam::235494808985:policy/emailAlertsPackagingProductsPolicy \
  --version-id v1
```

---

## Quick Diagnostics

### Health Check Sequence
```bash
# 1. Check Lambda exists
aws lambda get-function --function-name emailAlertsPackagingProducts --region ap-southeast-2

# 2. Check SES verified
aws ses list-identities --region ap-southeast-2

# 3. Check stream enabled
aws dynamodb describe-table --table-name packprod-weborders --region ap-southeast-2 --query 'Table.LatestStreamArn'

# 4. Check event mapping
aws lambda list-event-source-mappings --function-name emailAlertsPackagingProducts --region ap-southeast-2

# 5. Check recent logs
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/emailAlertsPackagingProducts --since 5m --region ap-southeast-2
```

---

## Resource ARNs

```
Lambda Function:
arn:aws:lambda:ap-southeast-2:235494808985:function:emailAlertsPackagingProducts

IAM Role:
arn:aws:iam::235494808985:role/emailAlertsPackagingProductsRole

IAM Policy:
arn:aws:iam::235494808985:policy/emailAlertsPackagingProductsPolicy

DynamoDB Table:
arn:aws:dynamodb:ap-southeast-2:235494808985:table/packprod-weborders

CloudWatch Log Group:
/aws/lambda/emailAlertsPackagingProducts
```

---

## Environment Variables

```bash
AWS_REGION=ap-southeast-2
ADMIN_EMAIL=andy@automateai.co.nz
FROM_EMAIL=noreply@automateai.co.nz
```

---

## Key Files

```
email-alerts-lambda.mjs              # Lambda function source
setup-email-alerts.sh                # Deployment script
test-email-alerts.sh                 # Test script
verify-ses-emails.sh                 # SES verification helper
email-alerts-iam-policy.json         # IAM permissions
email-alerts-trust-policy.json       # IAM trust policy
EMAIL-ALERTS-GUIDE.md                # Complete documentation
EMAIL-ALERTS-DEPLOYMENT.md           # Deployment guide
PHASE-3-EMAIL-ALERTS-SUMMARY.md      # Implementation summary
```

---

## Cost Monitoring

```bash
# Check SES costs (via CloudWatch)
aws ce get-cost-and-usage \
  --time-period Start=2025-10-01,End=2025-10-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://ses-cost-filter.json

# Check Lambda costs
aws ce get-cost-and-usage \
  --time-period Start=2025-10-01,End=2025-10-31 \
  --granularity MONTHLY \
  --metrics BlendedCost \
  --filter file://lambda-cost-filter.json
```

**Expected Monthly Cost:** $0.00 - $0.01 (within free tier)

---

## Support Contacts

- **Documentation:** EMAIL-ALERTS-GUIDE.md
- **Deployment Help:** EMAIL-ALERTS-DEPLOYMENT.md
- **Technical Issues:** andy@automateai.co.nz
- **AWS Support:** https://console.aws.amazon.com/support

---

## Emergency Procedures

### Disable Email Alerts (Emergency)
```bash
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

### Re-enable Email Alerts
```bash
aws lambda update-event-source-mapping \
  --uuid $MAPPING_UUID \
  --enabled true \
  --region ap-southeast-2
```

---

**Last Updated:** October 23, 2025
**Version:** 1.0
