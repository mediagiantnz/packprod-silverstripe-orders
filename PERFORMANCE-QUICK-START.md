# Performance Optimization - Quick Start Guide

## One-Command Deployment

```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"

# Complete setup (all steps)
bash enable-streams-and-deploy-cache.sh && \
bash populate-customer-cache.sh && \
bash deploy-optimized-query-lambda.sh
```

**Time:** 5-10 minutes
**What it does:**
1. Creates cache table
2. Enables DynamoDB Streams
3. Deploys cache update Lambda
4. Populates cache with existing data
5. Deploys optimized query Lambda

---

## Quick Test

```bash
# Test with timing
curl -w "\nTime: %{time_total}s\n" \
  "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers?limit=10"
```

**Expected result:**
- Response time: <100ms
- `"cacheHit": true` in meta

---

## Quick Rollback

```bash
# Restore previous version
cp query-orders-lambda-v2-backup.mjs query-orders-lambda.mjs

# Redeploy
powershell Compress-Archive -Path query-orders-lambda.mjs,node_modules,package.json,product-categories.json -DestinationPath lambda-query-deploy.zip -Force

aws lambda update-function-code \
  --function-name queryPackagingProductsOrders \
  --zip-file fileb://lambda-query-deploy.zip \
  --region ap-southeast-2
```

---

## Performance Metrics

### Before (listCustomers)
- Method: Full table scan
- Time: **1500-3000ms**

### After (listCustomers)
- Method: Cache scan
- Time: **50-100ms**
- **Improvement: 20-30x faster**

---

## Monitoring

```bash
# Watch logs
aws logs tail /aws/lambda/queryPackagingProductsOrders --follow --region ap-southeast-2

# Check cache size
aws dynamodb scan \
  --table-name packprod-customer-metrics-cache \
  --select COUNT \
  --region ap-southeast-2
```

---

## Troubleshooting

**Cache not working?**
```bash
# Repopulate cache
bash populate-customer-cache.sh
```

**Stream not triggering?**
```bash
# Check event source mapping
aws lambda list-event-source-mappings \
  --function-name updateCustomerMetricsCache \
  --region ap-southeast-2
```

---

For detailed information, see **PERFORMANCE-OPTIMIZATION-SUMMARY.md**
