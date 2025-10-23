# Backend Improvements - Deployment Guide

## Quick Summary

Three safe improvements to make the backend frontend-friendly while keeping all existing functionality working.

---

## ✅ What's Safe to Deploy Now

### 1. Tag All Resources (5 minutes - Zero Risk)

**What it does:** Adds `ClientName: Packaging Products` and `Project: WebOrders` tags to all AWS resources.

**Impact:** None functional, helps with cost tracking and organization.

**How to deploy:**
```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"
bash tag-all-resources.sh
```

**Verification:**
Script shows tags on all resources after completion.

---

### 2. Update Query Lambda Response Format (15 minutes - Low Risk)

**What it does:** Changes query API responses from:
```json
{ "success": true, "orders": [...], "count": 10 }
```

To:
```json
{ "success": true, "data": [...], "error": null, "meta": { "count": 10 } }
```

**Impact:**
- ✅ Import API unaffected (uses different Lambda)
- ✅ n8n workflow unaffected (uses import API)
- ⚠️ Frontend needs to update adapter (already has one in place)

**How to deploy:**
```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"

# Backup current version
cp query-orders-lambda.mjs query-orders-lambda.mjs.backup

# Use new version
cp query-orders-lambda-v2.mjs query-orders-lambda.mjs

# Create deployment package
powershell Compress-Archive -Path query-orders-lambda.mjs,node_modules,package.json -DestinationPath lambda-query-deploy.zip -Force

# Deploy
aws lambda update-function-code \
  --function-name queryPackagingProductsOrders \
  --zip-file fileb://lambda-query-deploy.zip \
  --region ap-southeast-2

# Wait for deployment
sleep 5

# Test
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview" | jq '.success, .data, .meta'
```

**Verification:**
```bash
# Should see: success: true, data: {...}, meta: {...}
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview"
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders?limit=2"
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers?limit=1"
```

**Rollback if needed:**
```bash
cp query-orders-lambda.mjs.backup query-orders-lambda.mjs
powershell Compress-Archive -Path query-orders-lambda.mjs,node_modules,package.json -DestinationPath lambda-query-deploy.zip -Force
aws lambda update-function-code \
  --function-name queryPackagingProductsOrders \
  --zip-file fileb://lambda-query-deploy.zip \
  --region ap-southeast-2
```

---

### 3. Bonus: Search Functionality (Already Included)

The v2 Lambda also adds search capabilities:

**Orders search:**
```bash
# Search by order reference, customer name, or email
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders?search=ash"
```

**Customers search:**
```bash
# Search by name, email, or company
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers?search=mediterranean"
```

---

## ❌ What NOT to Touch

- `importPackagingProductsContacts` Lambda - Leave it alone
- Import API endpoint - Leave it alone
- n8n workflow - Leave it alone
- DynamoDB table structures - Leave them alone
- Existing order data - Leave it alone

---

## Complete Deployment Steps (Recommended Order)

### Step 1: Tag Resources (5 min)
```bash
bash tag-all-resources.sh
```
✅ Zero risk, just organizational

### Step 2: Verify Import Still Works (2 min)
```bash
# Test import endpoint before making any changes
curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
  -H "Content-Type: application/json" \
  -d @sample-complete-payload.json
```
Should return: `{ "message": "Packaging Products import completed", "result": "SUCCESS" }`

### Step 3: Update Query Lambda (15 min)
```bash
# Backup
cp query-orders-lambda.mjs query-orders-lambda.mjs.backup

# Deploy new version
cp query-orders-lambda-v2.mjs query-orders-lambda.mjs

# Package
powershell Compress-Archive -Path query-orders-lambda.mjs,node_modules,package.json -DestinationPath lambda-query-deploy.zip -Force

# Deploy
aws lambda update-function-code \
  --function-name queryPackagingProductsOrders \
  --zip-file fileb://lambda-query-deploy.zip \
  --region ap-southeast-2

# Wait
sleep 5
```

### Step 4: Test Everything (5 min)
```bash
# Test query API with new format
echo "Testing overview..."
curl -s "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview" | jq '.success, .data.overview.today.order_count'

echo "Testing orders..."
curl -s "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders?limit=2" | jq '.success, .data | length'

echo "Testing customers..."
curl -s "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers?limit=1" | jq '.success, .data[0].contactID'

echo "Testing search..."
curl -s "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders?search=ash&limit=5" | jq '.success, .data | length'

# Verify import STILL works
echo "Testing import API..."
curl -s -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
  -H "Content-Type: application/json" \
  -d @sample-complete-payload.json | jq '.result'
```

All should return success!

### Step 5: Monitor (24 hours)
```bash
# Watch CloudWatch logs
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/queryPackagingProductsOrders --follow --region ap-southeast-2

# Check for errors
MSYS_NO_PATHCONV=1 aws logs filter-log-events \
  --log-group-name /aws/lambda/queryPackagingProductsOrders \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region ap-southeast-2
```

---

## Frontend Team Action Required

After deploying the new Lambda:

**Update API adapter in React app:**

```typescript
// src/services/api-adapter.ts
export function adaptResponse<T>(backendResponse: any) {
  // NEW: Backend now returns { success, data, error, meta }
  // No transformation needed anymore!
  return backendResponse;

  // OLD (can be removed):
  // return {
  //   success: backendResponse.success,
  //   data: backendResponse.orders || backendResponse.customers || ...,
  //   error: null,
  //   meta: { count: backendResponse.count }
  // };
}
```

The adapter becomes a simple passthrough!

---

## Troubleshooting

### Query API returns old format
**Solution:** Lambda deployment didn't complete. Re-run update-function-code.

### Import API not working
**Solution:** Rollback query Lambda immediately. Import Lambda was accidentally changed.

### Frontend getting errors
**Solution:** Update frontend adapter to handle new format.

### Search not working
**Solution:** Check query parameters are being passed correctly. Search is case-sensitive for now.

---

## Detailed Documentation

For full details, see:
- **[BACKEND-IMPROVEMENTS-PLAN.md](BACKEND-IMPROVEMENTS-PLAN.md)** - Complete plan with all details
- **[LOVABLE-API-COMPATIBILITY.md](LOVABLE-API-COMPATIBILITY.md)** - Frontend compatibility analysis
- **[LOVABLE-PROMPT-UPDATED.md](LOVABLE-PROMPT-UPDATED.md)** - Updated frontend prompt

---

## Summary

**Total Time:** ~30 minutes
**Risk Level:** Low
**Rollback Time:** 2 minutes
**Breaking Changes:** Frontend adapter update only

All changes are **safe** and **reversible**. The import API and n8n workflow are completely unaffected.

---

**Ready to deploy?**

1. Run `bash tag-all-resources.sh` (safe, instant)
2. Test import API works
3. Deploy query Lambda v2
4. Test everything
5. Notify frontend team
6. Monitor for 24 hours

That's it!
