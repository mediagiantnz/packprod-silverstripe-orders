# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Packaging Products WebOrders System** - Email-based order import pipeline with React dashboard

This is an AWS serverless application that processes Packaging Products order emails via n8n, stores them in DynamoDB, and provides a REST API for a React analytics dashboard. The system uses a **dual Lambda architecture** to separate write operations (imports) from read operations (queries).

**AWS Region:** ap-southeast-2
**AWS Account:** 235494808985
**Client:** Packaging Products
**Project Tags:** `ClientName: Packaging Products`, `Project: WebOrders`

## Architecture

### Dual Lambda Pattern (Critical)

The system uses **two separate Lambda functions** for different responsibilities:

1. **`importPackagingProductsContacts`** (Write Operations)
   - **Purpose:** Import orders/contacts from n8n email parsing workflow
   - **Trigger:** API Gateway POST endpoint
   - **Endpoint:** `/admin/contacts/import/packaging-products`
   - **Tables:** Writes to BOTH `RocketReview_Contacts` AND `packprod-weborders`
   - **Source:** `index-dual-table.mjs`
   - **⚠️ NEVER MODIFY:** This Lambda is in active use by n8n workflow. Breaking changes will stop order imports.

2. **`queryPackagingProductsOrders`** (Read Operations)
   - **Purpose:** Query API for React dashboard
   - **Trigger:** API Gateway GET endpoints
   - **Endpoints:** `/api/orders`, `/api/customers`, `/api/reports/*`
   - **Tables:** Reads from `packprod-weborders` and `RocketReview_Contacts`
   - **Source:** `query-orders-lambda.mjs`
   - **Safe to modify:** Changes here don't affect import pipeline

### DynamoDB Tables

**`packprod-weborders`** (Primary Orders Table)
- Partition Key: `orderID` (format: `ORD-{reference}-{timestamp}`)
- GSI: `clientID-createdAt-index` - Used for date-range queries
- GSI: `contactID-index` - Used for customer order history
- Contains: Complete order data (items, totals, delivery, payment)

**`RocketReview_Contacts`** (Contacts/Customers)
- Partition Key: `contactID` (UUID)
- GSI: `clientID-status-index` - Used for duplicate detection and customer queries
- Contains: Customer contact info, metadata, linked to orders via `contactID`

### API Gateway

**REST API ID:** `bw4agz6xn4`
**Base URL:** `https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod`

**Import Endpoint (POST):**
- `/admin/contacts/import/packaging-products` → `importPackagingProductsContacts` Lambda

**Query Endpoints (GET):**
- `/api/orders` → List orders with filtering
- `/api/orders/{orderID}` → Single order details
- `/api/customers` → List customers with metrics
- `/api/customers/{contactID}` → Customer details
- `/api/customers/{contactID}/orders` → Customer order history
- `/api/reports/overview` → Dashboard metrics (today/week/month)
- `/api/reports/products` → Product analytics (top by revenue/quantity)
- `/api/reports/sales` → Sales timeline (grouped by day/week/month)

### n8n Workflow Integration

The import Lambda receives data from an n8n workflow that:
1. Monitors email inbox: `packprod@sms.automateai.co.nz`
2. Parses order email HTML
3. Extracts order data (customer, items, delivery, payment, totals)
4. POSTs to import endpoint

**⚠️ Critical:** Any changes to the import Lambda's request/response format will break the n8n workflow.

## Development Commands

### Deploying Lambda Functions

**Query Lambda (Safe to update):**
```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"

# Create deployment package
powershell Compress-Archive -Path query-orders-lambda.mjs,node_modules,package.json -DestinationPath lambda-query-deploy.zip -Force

# Deploy to AWS
aws lambda update-function-code \
  --function-name queryPackagingProductsOrders \
  --zip-file fileb://lambda-query-deploy.zip \
  --region ap-southeast-2

# Test after deployment
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview"
```

**Import Lambda (⚠️ Use caution):**
```bash
# Backup current version first
cp index-dual-table.mjs index-dual-table.mjs.backup

# Deploy only after thorough testing
powershell Compress-Archive -Path index-dual-table.mjs,node_modules,package.json -DestinationPath lambda-import-deploy.zip -Force

aws lambda update-function-code \
  --function-name importPackagingProductsContacts \
  --zip-file fileb://lambda-import-deploy.zip \
  --region ap-southeast-2

# Verify import still works
curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
  -H "Content-Type: application/json" \
  -d @sample-complete-payload.json
```

### Testing Endpoints

```bash
# Test all query endpoints
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview"
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders?limit=5"
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers?limit=5"
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products"
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/sales?groupBy=week"

# Test with search (v2 feature)
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders?search=ash"
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers?search=mediterranean"

# Test import endpoint
curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
  -H "Content-Type: application/json" \
  -d @sample-complete-payload.json
```

### Tagging AWS Resources

```bash
# Tag all resources with project tags (run once, idempotent)
bash tag-all-resources.sh

# Verify tags
aws lambda list-tags \
  --resource arn:aws:lambda:ap-southeast-2:235494808985:function:queryPackagingProductsOrders \
  --region ap-southeast-2
```

### Monitoring

```bash
# Watch CloudWatch logs (query Lambda)
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/queryPackagingProductsOrders --follow --region ap-southeast-2

# Watch CloudWatch logs (import Lambda)
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/importPackagingProductsContacts --follow --region ap-southeast-2

# Check for errors in last hour
MSYS_NO_PATHCONV=1 aws logs filter-log-events \
  --log-group-name /aws/lambda/queryPackagingProductsOrders \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region ap-southeast-2
```

## Key Architectural Patterns

### Response Format Standardization

All query Lambda endpoints use `formatResponse()` wrapper for consistency:

```javascript
function formatResponse(data, options = {}) {
  const { count, lastEvaluatedKey, total, error, statusCode } = options;
  return {
    statusCode: error ? 500 : statusCode || 200,
    headers: { /* CORS headers */ },
    body: JSON.stringify({
      success: !error,
      data: data,              // Always 'data' field
      error: error,            // null or error message
      meta: {                  // Pagination metadata
        count,
        limit: null,
        total,
        lastEvaluatedKey
      }
    })
  };
}
```

**Frontend compatibility:** React dashboard expects `{ success, data, error, meta }` format.

### Cursor-Based Pagination

DynamoDB uses cursor-based pagination (not page numbers):

```javascript
// Response includes lastEvaluatedKey for next page
{
  data: [...],
  meta: {
    count: 50,
    lastEvaluatedKey: "%7B%22orderID%22%3A%22ORD-123%22%7D"  // URL-encoded
  }
}

// Next request uses it
curl "https://.../api/orders?lastEvaluatedKey=%7B%22orderID%22%3A%22ORD-123%22%7D"
```

### Search Implementation

Search uses DynamoDB `FilterExpression` (less efficient than indexes, but works for MVP):

```javascript
// Orders search - checks order reference, customer name, email
if (search) {
  params.FilterExpression = 'contains(#orderRef, :search) OR contains(customer.contact_name, :search) OR contains(customer.email, :search)';
  params.ExpressionAttributeValues[':search'] = search;
}

// Customers search - checks name, email, company
if (search) {
  params.FilterExpression = 'contains(#name, :search) OR contains(email, :search) OR contains(company, :search)';
  params.ExpressionAttributeValues[':search'] = search.toLowerCase();
}
```

**Performance Note:** Consider adding OpenSearch or DynamoDB Streams → Elasticsearch if search performance becomes an issue.

### Duplicate Contact Detection

Import Lambda checks for duplicate contacts before writing:

```javascript
// Query by clientID + email to find existing contact
const duplicateCheckParams = {
  TableName: CONTACTS_TABLE_NAME,
  IndexName: "clientID-status-index",
  KeyConditionExpression: "clientID = :clientID",
  FilterExpression: "email = :email",
  ExpressionAttributeValues: {
    ":clientID": clientID,
    ":email": customerData.email.toLowerCase().trim()
  }
};

// If duplicate found, reuse existing contactID
// Always write order record (even if contact is duplicate)
```

### Customer Metrics Calculation

Customer endpoints calculate metrics on-the-fly by querying orders:

```javascript
// Get all orders for this customer
const ordersParams = {
  TableName: ORDERS_TABLE_NAME,
  IndexName: 'contactID-index',
  KeyConditionExpression: 'contactID = :contactID',
  ExpressionAttributeValues: { ':contactID': contactID }
};

// Calculate metrics
const orderCount = ordersResult.Items.length;
const totalSpend = ordersResult.Items.reduce((sum, order) => {
  return sum + parseFloat(order.totals?.total || 0);
}, 0);
```

**Performance Note:** Consider caching customer metrics in DynamoDB if customer list queries become slow.

## Important Constraints

### What NOT to Change

1. **Import Lambda request format** - n8n depends on exact structure
2. **Import Lambda response format** - n8n workflow validates response
3. **DynamoDB table schemas** - Would break existing data
4. **Table names** - Hardcoded in environment variables
5. **GSI names** - Queries depend on specific index names
6. **Order ID format** - `ORD-{reference}-{timestamp}` pattern used for uniqueness

### Safe Changes

1. **Query Lambda endpoints** - Frontend has adapter layer
2. **Adding new query parameters** - Backward compatible
3. **Adding new report endpoints** - Additive only
4. **Response format fields** - Can add new fields to `meta` or `data`
5. **AWS resource tags** - No functional impact

### Breaking Changes (Require Coordination)

1. **Changing import Lambda** → Notify n8n workflow maintainer
2. **Changing query response format** → Update frontend adapter
3. **Changing API Gateway paths** → Update frontend API client
4. **Adding authentication** → Update both frontend and API Gateway

## Common Tasks

### Adding a New Query Endpoint

1. Add route handler in `query-orders-lambda.mjs`:
```javascript
if (httpMethod === 'GET' && path.includes('/api/new-endpoint')) {
  return await getNewData(queryStringParameters);
}
```

2. Implement handler function:
```javascript
async function getNewData(queryParams) {
  const { limit = 50 } = queryParams;
  const params = {
    TableName: ORDERS_TABLE_NAME,
    Limit: parseInt(limit)
  };
  const result = await docClient.send(new ScanCommand(params));
  return formatResponse(result.Items, {
    count: result.Items.length
  });
}
```

3. Add API Gateway resource and method (or use setup script):
```bash
# Create resource
RESOURCE_ID=$(aws apigateway create-resource \
  --rest-api-id bw4agz6xn4 \
  --parent-id <parent-resource-id> \
  --path-part new-endpoint \
  --region ap-southeast-2 \
  --query 'id' \
  --output text)

# Add GET method
aws apigateway put-method \
  --rest-api-id bw4agz6xn4 \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --authorization-type NONE \
  --region ap-southeast-2

# Deploy
aws apigateway create-deployment \
  --rest-api-id bw4agz6xn4 \
  --stage-name prod \
  --region ap-southeast-2
```

### Adding Search/Filter Parameters

Add to existing handler function in `query-orders-lambda.mjs`:

```javascript
async function listOrders(queryParams) {
  const { limit = 50, newFilter } = queryParams;

  let params = {
    TableName: ORDERS_TABLE_NAME,
    Limit: parseInt(limit)
  };

  // Add filter condition
  if (newFilter) {
    params.FilterExpression = 'attribute = :value';
    params.ExpressionAttributeValues = { ':value': newFilter };
  }

  const result = await docClient.send(new ScanCommand(params));
  return formatResponse(result.Items, { count: result.Items.length });
}
```

**Note:** Always use `formatResponse()` wrapper for consistency.

### Rollback a Lambda Deployment

```bash
# List versions
aws lambda list-versions-by-function \
  --function-name queryPackagingProductsOrders \
  --region ap-southeast-2

# Or restore from backup
cp query-orders-lambda.mjs.backup query-orders-lambda.mjs
powershell Compress-Archive -Path query-orders-lambda.mjs,node_modules,package.json -DestinationPath lambda-query-deploy.zip -Force
aws lambda update-function-code \
  --function-name queryPackagingProductsOrders \
  --zip-file fileb://lambda-query-deploy.zip \
  --region ap-southeast-2
```

## Key Files Reference

- **`query-orders-lambda.mjs`** - Query API Lambda (deployed v2 with search + standardized responses)
- **`index-dual-table.mjs`** - Import Lambda (writes to both tables, active in production)
- **`tag-all-resources.sh`** - Tags all AWS resources with project tags
- **`sample-complete-payload.json`** - Test data for import endpoint
- **`DEPLOY-IMPROVEMENTS.md`** - Step-by-step deployment guide
- **`BACKEND-IMPROVEMENTS-PLAN.md`** - Detailed technical plan for backend changes
- **`LOVABLE-API-COMPATIBILITY.md`** - Frontend compatibility analysis and gaps
- **`README-ENHANCED.md`** - Original documentation for enhanced order import

## Environment Variables

Both Lambda functions require:

```bash
AWS_REGION=ap-southeast-2
CONTACTS_TABLE_NAME=RocketReview_Contacts
ORDERS_TABLE_NAME=packprod-weborders
```

Query Lambda additionally uses:
```javascript
const CLIENT_ID = "7b0d485f-8ef9-45b0-881a-9d8f4447ced2"; // Hardcoded in source
```

## Dependencies

```json
{
  "dependencies": {
    "@aws-sdk/client-dynamodb": "^3.913.0",
    "@aws-sdk/lib-dynamodb": "^3.913.0"
  }
}
```

Import Lambda additionally requires:
```json
{
  "dependencies": {
    "uuid": "^9.0.0"
  }
}
```

## Current System Status

As of October 21, 2025:

✅ **Deployed and Working:**
- Import Lambda processing n8n emails successfully
- Query Lambda serving React dashboard with 8 endpoints
- All AWS resources tagged with project tags
- Standardized response format implemented (`{ success, data, error, meta }`)
- Search functionality added to orders and customers endpoints
- 14 orders in system totaling $1,122.08
- 1,846 customers in database

🔄 **In Progress:**
- Frontend React dashboard development (Lovable.dev)
- AWS Cognito authentication (Phase 2)
- Email alerts system (Phase 3)
- Marketing automation campaigns (Phase 5)

📋 **Known Limitations:**
- No authentication on query endpoints (public access)
- Search uses FilterExpression (slower than dedicated search index)
- Customer metrics calculated on-the-fly (not cached)
- No support for modifying/deleting orders (read-only API)
