# Backend Improvements Plan

## Overview

This document outlines necessary backend changes to improve frontend compatibility while maintaining all existing functionality. **No breaking changes to the import API.**

---

## Priority 1: Response Format Standardization

### Problem
Current query Lambda returns inconsistent response formats:
```json
{
  "success": true,
  "orders": [...],
  "count": 10
}
```

Frontend expects:
```json
{
  "success": true,
  "data": [...],
  "error": null,
  "meta": { "count": 10, "limit": 50 }
}
```

### Solution
Update `query-orders-lambda.mjs` with a standardized response wrapper.

**Impact:** ✅ No impact on import Lambda
**Effort:** 2-3 hours
**Risk:** Low (only affects query endpoints, not import)

---

## Priority 2: AWS Resource Tagging

### Current State
- ✅ `packprod-weborders` table: Tagged correctly
- ❌ `queryPackagingProductsOrders` Lambda: Not tagged
- ❌ `importPackagingProductsContacts` Lambda: Not tagged
- ❌ API Gateway: Not tagged

### Required Tags
All resources should have:
```
ClientName: Packaging Products
Project: WebOrders
```

**Impact:** ✅ No functional impact, organizational only
**Effort:** 1 hour
**Risk:** None

---

## Priority 3: Enhanced Filtering (Optional)

### Current State
- ✅ Date range filtering works
- ✅ Value range filtering works
- ❌ No text search (customer name, email, order ID)

### Proposed Enhancement
Add search parameters to existing endpoints:
- `/api/orders?search=ash` - Search order reference, customer name, email
- `/api/customers?search=mediterranean` - Search customer name, email, company

**Impact:** ✅ No breaking changes, additive only
**Effort:** 4-6 hours
**Risk:** Low

---

## Implementation Details

### 1. Response Format Standardization

#### File to Update
`query-orders-lambda.mjs`

#### Changes Required

**Add response wrapper function:**
```javascript
/**
 * Standardize all API responses
 */
function formatResponse(data, options = {}) {
  const {
    type = 'data',
    count = null,
    lastEvaluatedKey = null,
    total = null,
    error = null
  } = options;

  return {
    statusCode: error ? 500 : 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    },
    body: JSON.stringify({
      success: !error,
      data: data,
      error: error,
      meta: {
        count: count,
        limit: null,
        total: total,
        lastEvaluatedKey: lastEvaluatedKey
      }
    })
  };
}
```

**Update all return statements:**

Before:
```javascript
return {
  statusCode: 200,
  headers,
  body: JSON.stringify({
    success: true,
    orders: result.Items,
    count: result.Items.length,
    lastEvaluatedKey: result.LastEvaluatedKey
  })
};
```

After:
```javascript
return formatResponse(result.Items, {
  count: result.Items.length,
  lastEvaluatedKey: result.LastEvaluatedKey
});
```

**Complete list of functions to update:**
- `listOrders()` - return orders as data
- `getOrder()` - return single order as data
- `listCustomers()` - return customers as data
- `getCustomer()` - return customer as data
- `getCustomerOrders()` - return orders as data
- `getProductReport()` - return report object as data
- `getSalesReport()` - return report object as data
- `getOverviewReport()` - return overview object as data

**Error handling:**
```javascript
catch (error) {
  console.error("Error processing request: ", error);
  return formatResponse(null, {
    error: error.message
  });
}
```

#### Testing After Update

```bash
# Test each endpoint returns new format
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview" | jq '.data'
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders?limit=2" | jq '.data'
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers?limit=1" | jq '.data'
```

#### Deployment Steps

```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"

# Update Lambda code
aws lambda update-function-code \
  --function-name queryPackagingProductsOrders \
  --zip-file fileb://lambda-query-deploy.zip \
  --region ap-southeast-2

# Test immediately after deployment
sleep 3
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview"
```

---

### 2. AWS Resource Tagging

#### Lambda Functions

**Tag queryPackagingProductsOrders:**
```bash
aws lambda tag-resource \
  --resource arn:aws:lambda:ap-southeast-2:235494808985:function:queryPackagingProductsOrders \
  --tags "ClientName=Packaging Products,Project=WebOrders" \
  --region ap-southeast-2
```

**Tag importPackagingProductsContacts:**
```bash
aws lambda tag-resource \
  --resource arn:aws:lambda:ap-southeast-2:235494808985:function:importPackagingProductsContacts \
  --tags "ClientName=Packaging Products,Project=WebOrders" \
  --region ap-southeast-2
```

**Verify Lambda tags:**
```bash
aws lambda list-tags \
  --resource arn:aws:lambda:ap-southeast-2:235494808985:function:queryPackagingProductsOrders \
  --region ap-southeast-2

aws lambda list-tags \
  --resource arn:aws:lambda:ap-southeast-2:235494808985:function:importPackagingProductsContacts \
  --region ap-southeast-2
```

#### API Gateway

**Tag the API Gateway:**
```bash
aws apigateway tag-resource \
  --resource-arn arn:aws:apigateway:ap-southeast-2::/restapis/bw4agz6xn4 \
  --tags "ClientName=Packaging Products,Project=WebOrders" \
  --region ap-southeast-2
```

**Verify API Gateway tags:**
```bash
aws apigateway get-tags \
  --resource-arn arn:aws:apigateway:ap-southeast-2::/restapis/bw4agz6xn4 \
  --region ap-southeast-2
```

#### DynamoDB Tables

**Verify RocketReview_Contacts table:**
```bash
aws dynamodb list-tags-of-resource \
  --resource-arn arn:aws:dynamodb:ap-southeast-2:235494808985:table/RocketReview_Contacts \
  --region ap-southeast-2
```

**Tag RocketReview_Contacts if needed:**
```bash
aws dynamodb tag-resource \
  --resource-arn arn:aws:dynamodb:ap-southeast-2:235494808985:table/RocketReview_Contacts \
  --tags Key=ClientName,Value="Packaging Products" Key=Project,Value=WebOrders \
  --region ap-southeast-2
```

**Verify packprod-weborders table (should already be tagged):**
```bash
aws dynamodb list-tags-of-resource \
  --resource-arn arn:aws:dynamodb:ap-southeast-2:235494808985:table/packprod-weborders \
  --region ap-southeast-2
```

#### CloudWatch Log Groups

**Tag query Lambda logs:**
```bash
aws logs tag-log-group \
  --log-group-name /aws/lambda/queryPackagingProductsOrders \
  --tags "ClientName=Packaging Products,Project=WebOrders" \
  --region ap-southeast-2
```

**Tag import Lambda logs:**
```bash
aws logs tag-log-group \
  --log-group-name /aws/lambda/importPackagingProductsContacts \
  --tags "ClientName=Packaging Products,Project=WebOrders" \
  --region ap-southeast-2
```

---

### 3. Enhanced Search/Filtering (Optional)

#### Add to listOrders()

```javascript
async function listOrders(queryParams) {
  const {
    limit = 50,
    startDate,
    endDate,
    minTotal,
    maxTotal,
    search,  // NEW
    lastEvaluatedKey
  } = queryParams;

  let params = {
    TableName: ORDERS_TABLE_NAME,
    Limit: parseInt(limit)
  };

  // Existing date/value filtering...

  // NEW: Add text search
  if (search && !startDate && !endDate) {
    // Can only use FilterExpression with Scan
    params.FilterExpression = 'contains(#orderRef, :search) OR contains(customer.contact_name, :search) OR contains(customer.email, :search)';
    params.ExpressionAttributeNames = {
      '#orderRef': 'order_reference'
    };
    params.ExpressionAttributeValues = params.ExpressionAttributeValues || {};
    params.ExpressionAttributeValues[':search'] = search;
  }

  // Execute query or scan...
}
```

#### Add to listCustomers()

```javascript
async function listCustomers(queryParams) {
  const { limit = 50, search, lastEvaluatedKey } = queryParams;

  const params = {
    TableName: CONTACTS_TABLE_NAME,
    Limit: parseInt(limit)
  };

  // NEW: Add search filter
  if (search) {
    params.FilterExpression = 'contains(#name, :search) OR contains(email, :search) OR contains(company, :search)';
    params.ExpressionAttributeNames = {
      '#name': 'name'
    };
    params.ExpressionAttributeValues = {
      ':search': search.toLowerCase()
    };
  }

  // Execute scan...
}
```

**Note:** Search using `FilterExpression` is less efficient than using indexes, but works for MVP. Consider adding a search index in Phase 2 if performance becomes an issue.

---

## Migration Checklist

### Pre-Deployment Verification

- [ ] Current import API is working
  ```bash
  # Verify import endpoint still works
  curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
    -H "Content-Type: application/json" \
    -d @sample-complete-payload.json
  ```

- [ ] Current query API is working
  ```bash
  # Test all query endpoints
  curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview"
  ```

- [ ] Backup current Lambda code
  ```bash
  cp query-orders-lambda.mjs query-orders-lambda.mjs.backup
  ```

### Deployment Steps

**Step 1: Update Query Lambda Response Format**
- [ ] Update `query-orders-lambda.mjs` with `formatResponse()` function
- [ ] Update all return statements to use `formatResponse()`
- [ ] Test locally if possible
- [ ] Create new deployment package
  ```bash
  powershell Compress-Archive -Path query-orders-lambda.mjs,node_modules,package.json -DestinationPath lambda-query-deploy.zip -Force
  ```
- [ ] Deploy to Lambda
  ```bash
  aws lambda update-function-code \
    --function-name queryPackagingProductsOrders \
    --zip-file fileb://lambda-query-deploy.zip \
    --region ap-southeast-2
  ```
- [ ] Test all endpoints with new format
- [ ] Monitor CloudWatch logs for errors

**Step 2: Tag All Resources**
- [ ] Tag `queryPackagingProductsOrders` Lambda
- [ ] Tag `importPackagingProductsContacts` Lambda
- [ ] Tag API Gateway
- [ ] Tag `RocketReview_Contacts` table (if needed)
- [ ] Verify `packprod-weborders` table tags
- [ ] Tag CloudWatch log groups
- [ ] Verify all tags applied correctly

**Step 3: Optional - Add Search/Filter**
- [ ] Update `listOrders()` with search parameter
- [ ] Update `listCustomers()` with search parameter
- [ ] Test search functionality
- [ ] Update API documentation

### Post-Deployment Verification

- [ ] Test import API (ensure not broken)
  ```bash
  curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
    -H "Content-Type: application/json" \
    -d @sample-complete-payload.json
  ```

- [ ] Test all query endpoints return new format
  ```bash
  # Each should return { success, data, error, meta }
  curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview" | jq '.success, .data, .meta'
  curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders?limit=2" | jq '.data | length'
  curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers?limit=1" | jq '.data[0].contactID'
  ```

- [ ] Verify n8n workflow still works (check for new orders)

- [ ] Update frontend API adapter if needed

- [ ] Monitor CloudWatch logs for 24 hours

---

## Rollback Plan

If issues occur after deployment:

### Rollback Lambda Code
```bash
# Revert to previous version
aws lambda update-function-code \
  --function-name queryPackagingProductsOrders \
  --zip-file fileb://lambda-query-deploy.zip.backup \
  --region ap-southeast-2
```

### Check Lambda Versions
```bash
# List versions
aws lambda list-versions-by-function \
  --function-name queryPackagingProductsOrders \
  --region ap-southeast-2

# Rollback to specific version
aws lambda update-function-configuration \
  --function-name queryPackagingProductsOrders \
  --revision-id <previous-revision-id> \
  --region ap-southeast-2
```

---

## Testing Script

Create a comprehensive test script:

```bash
#!/bin/bash
# test-api-after-deployment.sh

API_BASE="https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod"

echo "Testing Query API Endpoints..."

echo "1. Testing /api/reports/overview"
OVERVIEW=$(curl -s "$API_BASE/api/reports/overview")
echo $OVERVIEW | jq '.success, .data.overview.today.order_count'

echo "2. Testing /api/orders"
ORDERS=$(curl -s "$API_BASE/api/orders?limit=2")
echo $ORDERS | jq '.success, .data | length'

echo "3. Testing /api/customers"
CUSTOMERS=$(curl -s "$API_BASE/api/customers?limit=1")
echo $CUSTOMERS | jq '.success, .data[0].contactID'

echo "4. Testing /api/reports/products"
PRODUCTS=$(curl -s "$API_BASE/api/reports/products")
echo $PRODUCTS | jq '.success, .data.summary.total_products'

echo "5. Testing /api/reports/sales"
SALES=$(curl -s "$API_BASE/api/reports/sales?groupBy=week")
echo $SALES | jq '.success, .data.summary.total_revenue'

echo ""
echo "Testing Import API (ensure not broken)..."
# Use sample payload
curl -s -X POST "$API_BASE/admin/contacts/import/packaging-products" \
  -H "Content-Type: application/json" \
  -d @sample-complete-payload.json | jq '.message, .result'

echo ""
echo "All tests complete!"
```

---

## AWS Cost Impact

### Tagging
- **Cost:** $0 (no cost for tags)
- **Benefit:** Better cost allocation reporting

### Response Format Changes
- **Cost:** $0 (same number of Lambda invocations)
- **Benefit:** Improved frontend compatibility

### Search/Filter Enhancement
- **Cost:** Minimal (~$0.01/month additional DynamoDB reads)
- **Benefit:** Better user experience

---

## Timeline Estimate

| Task | Effort | Dependencies |
|------|--------|--------------|
| Update response format | 2-3 hours | None |
| Tag all resources | 1 hour | None |
| Add search/filter | 4-6 hours | None |
| Testing | 2 hours | All above |
| **Total** | **9-12 hours** | |

Can be done over 1-2 days with testing.

---

## Breaking Changes Checklist

✅ **What WON'T Break:**
- Import API (`/admin/contacts/import/packaging-products`)
- n8n workflow (uses import API)
- Email extraction (uses import API)
- DynamoDB data structure
- Existing order/customer data

⚠️ **What WILL Change:**
- Query API response format (frontend must update adapter)
- API Gateway will have tags (no functional impact)
- Lambda functions will have tags (no functional impact)

❌ **What Could Break:**
- Frontend code using query API (needs adapter update)
  - **Solution:** Frontend already has adapter in place

---

## Recommendations

### Immediate (This Week)
1. ✅ **Tag all resources** - No risk, organizational benefit
2. ✅ **Update response format** - High value, low risk

### Next Sprint (Week 2-3)
3. ⏳ **Add search/filter** - Nice to have, not critical

### Future (Phase 2)
4. ⏳ **Add search indexes** - If performance becomes issue
5. ⏳ **Implement pagination counts** - Requires COUNT queries

---

## Documentation Updates Needed

After deployment:
- [ ] Update `REACT-INTEGRATION-GUIDE.md` with new response format
- [ ] Update `API-GATEWAY-SETUP.md` with search parameters
- [ ] Update `README.md` if needed
- [ ] Notify frontend team of changes

---

## Summary

### Safe Changes (Do Now)
- ✅ Tag all AWS resources
- ✅ Update query Lambda response format

### Risky Changes (Test Thoroughly)
- ⚠️ Adding search/filter (validate DynamoDB performance)

### Don't Touch
- ❌ Import Lambda (`importPackagingProductsContacts`)
- ❌ Import API endpoint
- ❌ n8n workflow
- ❌ DynamoDB table structure

The main change is standardizing the query API response format. This is a **breaking change for frontend** but necessary for consistency. The frontend team already has an adapter in place, so the impact is minimal.

All other changes (tagging, search) are additive and non-breaking.
