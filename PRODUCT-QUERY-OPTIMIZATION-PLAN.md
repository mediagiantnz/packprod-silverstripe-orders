# Product Query Optimization Plan

## Problem Statement

The `getProductOrders()` endpoint currently performs a **full table scan** of `packprod-weborders` to find orders containing a specific product. This is inefficient and slow (1500-3000ms).

---

## Current Implementation

```javascript
async function getProductOrders(productCode, queryParams) {
  // PROBLEM: Scans entire orders table
  const params = {
    TableName: ORDERS_TABLE_NAME,
    Limit: parseInt(limit)
  };

  const result = await docClient.send(new ScanCommand(params));

  // PROBLEM: Filters in memory
  const ordersWithProduct = result.Items.filter(order => {
    return (order.items || []).some(item => item.product_code === productCode);
  });

  // ... process and return
}
```

**Performance:** 1500-3000ms for 14-100 orders

---

## Solution Options

### Option 1: GSI on Product Codes (Recommended)

**Approach:** Add `product_codes` string set to orders, create GSI

**Implementation:**

1. **Update Import Lambda** to extract product codes:
```javascript
// In index-dual-table.mjs
const productCodes = orderData.items.map(item => item.product_code);

const orderRecord = {
  orderID,
  // ... existing fields ...
  product_codes: productCodes, // NEW: String set for GSI
  items: orderData.items
};
```

2. **Add GSI to packprod-weborders:**
```json
{
  "IndexName": "product-codes-index",
  "KeySchema": [
    { "AttributeName": "product_code", "KeyType": "HASH" }
  ],
  "Projection": { "ProjectionType": "ALL" }
}
```

**Issue:** DynamoDB doesn't support GSI on string sets directly

**Workaround:** Use multiple single-attribute GSIs or create a separate index table (see Option 2)

**Performance Improvement:** Not viable due to DynamoDB limitations

---

### Option 2: Separate Product Index Table (Recommended)

**Approach:** Create dedicated table for product→order mapping

**Schema:**
```javascript
{
  TableName: "packprod-product-order-index",
  Keys: {
    productCode: "STRING (HASH)", // Partition key
    orderID: "STRING (RANGE)"     // Sort key
  },
  Attributes: {
    productCode: "string",
    orderID: "string",
    quantity: "number",
    revenue: "number",
    customerID: "string",
    customerName: "string",
    orderDate: "string",
    createdAt: "string"
  }
}
```

**How it works:**

1. **DynamoDB Stream on orders table** triggers Lambda
2. **Lambda extracts product items** from order
3. **Lambda writes one record per product** to index table
4. **Query by productCode** returns all orders instantly

**Query Lambda changes:**
```javascript
async function getProductOrders(productCode, queryParams) {
  // NEW: Query index table (FAST!)
  const params = {
    TableName: 'packprod-product-order-index',
    KeyConditionExpression: 'productCode = :productCode',
    ExpressionAttributeValues: {
      ':productCode': productCode
    }
  };

  const result = await docClient.send(new QueryCommand(params));

  // Result already has all necessary data
  return formatResponse({
    productCode,
    orders: result.Items
  });
}
```

**Advantages:**
- Ultra-fast queries (50-100ms)
- No table scans
- Efficient for product analytics
- Can include pre-aggregated metrics

**Trade-offs:**
- Additional table to maintain (~$5/month)
- More storage (1 record per product per order)
- Stream-based updates (near real-time, not instant)

**Estimated Performance:** 1500-3000ms → **50-100ms** (20-30x faster)

---

### Option 3: Flatten Product Codes in Orders (Alternative)

**Approach:** Store comma-separated product codes as single string

**Implementation:**

1. Add `product_codes_flat` to orders:
```javascript
const productCodesFlat = orderData.items
  .map(item => item.product_code)
  .join(',');

// Store: "PRODUCT1,PRODUCT2,PRODUCT3"
```

2. Use `FilterExpression` with `contains()`:
```javascript
params.FilterExpression = 'contains(product_codes_flat, :productCode)';
```

**Advantages:**
- Simple to implement
- No additional tables

**Disadvantages:**
- Still uses Scan (just with server-side filtering)
- Partial match issues ("PROD1" matches "PROD10")
- Only marginally faster than current approach

**Performance Improvement:** Minimal (maybe 20-30% faster)

**Not Recommended**

---

## Recommended Solution: Option 2 (Product Index Table)

### Implementation Steps

#### 1. Create Product Index Table

**File:** `product-index-table-schema.json`
```json
{
  "TableName": "packprod-product-order-index",
  "AttributeDefinitions": [
    { "AttributeName": "productCode", "AttributeType": "S" },
    { "AttributeName": "orderID", "AttributeType": "S" }
  ],
  "KeySchema": [
    { "AttributeName": "productCode", "KeyType": "HASH" },
    { "AttributeName": "orderID", "KeyType": "RANGE" }
  ],
  "BillingMode": "PAY_PER_REQUEST",
  "Tags": [
    { "Key": "ClientName", "Value": "Packaging Products" },
    { "Key": "Project", "Value": "WebOrders" }
  ]
}
```

**Create:**
```bash
aws dynamodb create-table \
  --cli-input-json file://product-index-table-schema.json \
  --region ap-southeast-2
```

---

#### 2. Create Product Index Update Lambda

**File:** `update-product-index-lambda.mjs`

```javascript
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const INDEX_TABLE_NAME = 'packprod-product-order-index';

export const handler = async (event) => {
  console.log(`Processing ${event.Records.length} stream records`);

  for (const record of event.Records) {
    try {
      if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
        // Extract order data
        const newImage = record.dynamodb.NewImage;
        const orderID = newImage.orderID.S;
        const orderDate = newImage.order_date?.S || newImage.createdAt?.S;
        const createdAt = newImage.createdAt?.S;
        const customerID = newImage.contactID?.S;
        const customerName = newImage.customer?.M?.contact_name?.S || '';
        const items = newImage.items?.L || [];

        // Create index entry for each product
        for (const item of items) {
          const productCode = item.M.product_code?.S;
          if (!productCode) continue;

          const indexEntry = {
            productCode,
            orderID,
            quantity: parseFloat(item.M.quantity?.N || 0),
            revenue: parseFloat(item.M.total_price?.N || 0),
            customerID,
            customerName,
            orderDate,
            createdAt,
            description: item.M.description?.S || ''
          };

          await docClient.send(new PutCommand({
            TableName: INDEX_TABLE_NAME,
            Item: indexEntry
          }));
        }

        console.log(`Indexed ${items.length} products for order ${orderID}`);
      } else if (record.eventName === 'REMOVE') {
        // Delete all index entries for this order
        const oldImage = record.dynamodb.OldImage;
        const orderID = oldImage.orderID.S;
        const items = oldImage.items?.L || [];

        for (const item of items) {
          const productCode = item.M.product_code?.S;
          if (!productCode) continue;

          await docClient.send(new DeleteCommand({
            TableName: INDEX_TABLE_NAME,
            Key: { productCode, orderID }
          }));
        }

        console.log(`Removed ${items.length} product index entries for order ${orderID}`);
      }
    } catch (error) {
      console.error('Error processing record:', error);
    }
  }

  return { statusCode: 200 };
};
```

---

#### 3. Update Query Lambda

**Modify `getProductOrders()` in query-orders-lambda.mjs:**

```javascript
async function getProductOrders(productCode, queryParams, requestStart) {
  const { limit = 100, lastEvaluatedKey } = queryParams;

  // NEW: Query product index table (FAST!)
  const params = {
    TableName: 'packprod-product-order-index',
    KeyConditionExpression: 'productCode = :productCode',
    ExpressionAttributeValues: {
      ':productCode': productCode
    },
    Limit: parseInt(limit),
    ScanIndexForward: false // Most recent first
  };

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  const result = await docClient.send(new QueryCommand(params));

  // Format response (data already aggregated in index)
  const orders = result.Items.map(item => ({
    orderID: item.orderID,
    orderDate: item.orderDate,
    createdAt: item.createdAt,
    customer: {
      contactID: item.customerID,
      contact_name: item.customerName
    },
    productItem: {
      product_code: item.productCode,
      description: item.description,
      quantity: item.quantity,
      revenue: item.revenue
    }
  }));

  // Calculate summary
  const totalQuantity = orders.reduce((sum, o) => sum + o.productItem.quantity, 0);
  const totalRevenue = orders.reduce((sum, o) => sum + o.productItem.revenue, 0);
  const uniqueCustomers = new Set(orders.map(o => o.customer.contactID)).size;

  const responseTime = Date.now() - requestStart;

  return formatResponse({
    productCode,
    summary: {
      totalOrders: orders.length,
      uniqueCustomers,
      totalQuantitySold: totalQuantity,
      totalRevenue: totalRevenue.toFixed(2)
    },
    orders
  }, {
    count: orders.length,
    lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
    responseTime
  });
}
```

---

#### 4. Deployment Script

**File:** `deploy-product-index-optimization.sh`

```bash
#!/bin/bash

echo "Deploying Product Index Optimization..."
echo ""

# Create index table
echo "Step 1: Creating product index table..."
aws dynamodb create-table \
  --cli-input-json file://product-index-table-schema.json \
  --region ap-southeast-2

aws dynamodb wait table-exists \
  --table-name packprod-product-order-index \
  --region ap-southeast-2

# Deploy index update Lambda
echo "Step 2: Deploying product index update Lambda..."
# ... similar to cache Lambda deployment ...

# Update query Lambda
echo "Step 3: Updating query Lambda with product index support..."
# ... deploy updated query Lambda ...

# Populate index from existing orders
echo "Step 4: Populating product index from existing orders..."
# ... run populate script ...

echo ""
echo "Product index optimization complete!"
```

---

## Cost Analysis

### Additional Costs

**DynamoDB Table:**
- `packprod-product-order-index`: ~$5-10/month
- Pay-per-request billing
- Estimated size: 5-10KB per product-order pair
- For 14 orders with avg 5 products each: ~70 records = <1MB

**Lambda:**
- `updateProductIndex` executions: ~$1-2/month
- Triggered on order changes only

**Total:** ~$6-12/month additional

### Cost Savings

**Reduced query costs:**
- Current: Expensive Scans (~$0.01 per query)
- After: Cheap Queries (~$0.0001 per query)
- Potential savings: $5-10/month if product queries are frequent

---

## Estimated Effort

- **Table creation:** 30 minutes
- **Lambda development:** 2 hours
- **Query Lambda updates:** 1 hour
- **Testing & deployment:** 1 hour
- **Documentation:** 30 minutes

**Total: 4-5 hours**

---

## Success Metrics

### Before
- `GET /api/products/{code}/orders`: 1500-3000ms
- Method: Full table scan

### After
- `GET /api/products/{code}/orders`: **50-100ms**
- Method: Indexed query
- **Improvement: 20-30x faster**

---

## Risks & Mitigation

**Risk 1:** Stream lag causes index to be out of sync
- **Mitigation:** DynamoDB Streams are highly reliable; lag is typically <1 second
- **Fallback:** Implement periodic reconciliation job

**Risk 2:** Index table grows large
- **Mitigation:** Use TTL on old entries if needed
- **Reality:** Even 10,000 orders × 10 products = 100K records = only ~50MB

**Risk 3:** Deployment disrupts existing functionality
- **Mitigation:** Product index is additive; doesn't affect existing queries
- **Testing:** Deploy to dev environment first

---

## Recommendation

**Implement Option 2 (Product Index Table)** as the next performance optimization after customer caching is stable.

**Priority:** HIGH
- Product analytics is frequently accessed
- Current performance is unacceptable (>2 seconds)
- Solution is proven and scalable
- ROI is clear (20-30x faster)

**Timeline:** Can be implemented immediately after customer cache deployment is verified stable (~1 week buffer)

---

## Future Enhancements

Once product index is deployed:

1. **Product Analytics Dashboard**
   - Pre-aggregate product stats in index
   - Add trend analysis (weekly/monthly sales)
   - Track product performance over time

2. **Smart Product Recommendations**
   - Find frequently co-purchased products
   - Identify top products per customer segment
   - Seasonal trend analysis

3. **Low Stock Alerts**
   - Track product velocity
   - Alert when popular items haven't been ordered recently
   - Suggest restock timing

---

**Status:** RECOMMENDED - Ready for implementation
**Depends on:** Customer cache optimization (in progress)
**Next Action:** Create detailed technical spec and begin development
