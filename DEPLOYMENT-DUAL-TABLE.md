# Dual-Table Deployment Guide

## Overview

This solution writes data to **TWO tables**:

1. **`RocketReview_Contacts`** (existing) - Simplified contact data for backward compatibility
2. **`packprod-weborders`** (new) - Complete order records with all details

### Why Two Tables?

- **RocketReview_Contacts**: Maintains backward compatibility with existing review workflows
- **packprod-weborders**: Dedicated order tracking with complete data, proper indexing, and tagging

## Architecture

```
Email → n8n → Lambda → {
  ├─> RocketReview_Contacts (contact info + order link)
  └─> packprod-weborders (complete order record)
}
```

## Pre-Deployment Steps

### Step 1: Create packprod-weborders Table

**Option A: Using AWS CLI (Recommended)**
```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"
bash create-table.sh
```

**Option B: Using AWS Console**
1. Open DynamoDB Console → Tables → Create table
2. Table name: `packprod-weborders`
3. Partition key: `orderID` (String)
4. Use default settings, then create table
5. After creation, add Global Secondary Indexes:
   - `contactID-index`: Partition: contactID, Sort: createdAt
   - `clientID-createdAt-index`: Partition: clientID, Sort: createdAt
   - `order_reference-index`: Partition: order_reference
6. Add tags:
   - `ClientName`: Packaging Products
   - `Project`: WebOrders
   - `Environment`: Production

**Verify Table Creation**
```bash
aws dynamodb describe-table --table-name packprod-weborders --region ap-southeast-2
```

### Step 2: Update Lambda Environment Variables

Add the new environment variable:

**AWS Console → Lambda → importPackagingProductsContacts → Configuration → Environment Variables**

Add:
```
ORDERS_TABLE_NAME = packprod-weborders
```

Existing variables (keep these):
```
CONTACTS_TABLE_NAME = RocketReview_Contacts
AWS_REGION = ap-southeast-2
```

### Step 3: Update Lambda IAM Permissions

The Lambda execution role needs permissions for the new table.

**AWS Console → IAM → Roles → [Lambda Execution Role]**

Add this policy (or update existing DynamoDB policy):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:PutItem",
        "dynamodb:GetItem",
        "dynamodb:Query",
        "dynamodb:Scan"
      ],
      "Resource": [
        "arn:aws:dynamodb:ap-southeast-2:235494808985:table/RocketReview_Contacts",
        "arn:aws:dynamodb:ap-southeast-2:235494808985:table/RocketReview_Contacts/index/*",
        "arn:aws:dynamodb:ap-southeast-2:235494808985:table/packprod-weborders",
        "arn:aws:dynamodb:ap-southeast-2:235494808985:table/packprod-weborders/index/*"
      ]
    }
  ]
}
```

## Deployment Steps

### Step 4: Deploy Lambda Function

1. **Open Lambda Console**
   ```
   AWS Console → Lambda → importPackagingProductsContacts
   ```

2. **Update the code**
   - Replace code with contents of `index-dual-table.mjs`
   - Click "Deploy"

3. **Test the deployment**
   ```bash
   curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
     -H "Content-Type: application/json" \
     -d @sample-complete-payload.json
   ```

   Expected response:
   ```json
   {
     "message": "Packaging Products import completed",
     "result": "SUCCESS",
     "contactID": "...",
     "orderID": "ORD-442856-...",
     "writes": {
       "contactWritten": true,
       "contactDuplicate": false,
       "orderWritten": true
     }
   }
   ```

### Step 5: Update n8n Workflow

**No changes needed!** The existing enhanced workflow (`Rocket Review - PackProd Enhanced.json`) already sends the complete order data.

Just ensure you're using the enhanced extraction code from `n8n-extract-complete-order.js`.

## Data Flow

### Input (from n8n)
```json
{
  "clientID": "7b0d485f-8ef9-45b0-881a-9d8f4447ced2",
  "order": { "order_reference": "442856", ... },
  "customer": { "email": "...", ... },
  "items": [ ... ],
  "totals": { ... },
  "payment": { ... }
}
```

### Output Table 1: RocketReview_Contacts
```json
{
  "contactID": "uuid",
  "email": "ashleighlouise21@yahoo.co.nz",
  "name": "ash harrington",
  "ppl_account": "PPL Web Sales",
  "metadata": {
    "hasOrderData": true,
    "linkedOrderID": "ORD-442856-1729468200000"
  }
}
```

### Output Table 2: packprod-weborders
```json
{
  "orderID": "ORD-442856-1729468200000",
  "contactID": "uuid",
  "ClientName": "Packaging Products",
  "Project": "WebOrders",
  "order_reference": "442856",
  "order_date": "21/10/2025 11:49 am",
  "customer": { ... },
  "items": [ ... ],
  "totals": { ... },
  "payment": { ... }
}
```

## Table Schemas

### packprod-weborders

**Primary Key:**
- `orderID` (String) - Unique identifier: `ORD-{order_reference}-{timestamp}`

**Attributes:**
- `contactID` (String) - Links to RocketReview_Contacts
- `clientID` (String) - Always "7b0d485f-8ef9-45b0-881a-9d8f4447ced2"
- `ClientName` (String) - "Packaging Products" (tag)
- `Project` (String) - "WebOrders" (tag)
- `order_reference` (String) - PPL order number (e.g., "442856")
- `order_date` (String) - Order date/time
- `greentree_order_reference` (String)
- `greentree_id` (String)
- `greentree_status` (String)
- `cms_shop_reference` (String)
- `cms_shop_id` (String)
- `customer` (Object) - Contact details
- `delivery` (Object) - Shipping address
- `items` (Array) - Product line items
- `totals` (Object) - Order totals
- `payment` (Object) - Payment details
- `createdAt` (String) - ISO timestamp
- `updatedAt` (String) - ISO timestamp

**Global Secondary Indexes:**
1. **contactID-index**: Query all orders for a contact
   - Partition: contactID
   - Sort: createdAt

2. **clientID-createdAt-index**: Query all orders by date
   - Partition: clientID
   - Sort: createdAt

3. **order_reference-index**: Lookup by PPL order number
   - Partition: order_reference

## Query Examples

### Find all orders for a contact
```javascript
const params = {
  TableName: 'packprod-weborders',
  IndexName: 'contactID-index',
  KeyConditionExpression: 'contactID = :contactID',
  ExpressionAttributeValues: {
    ':contactID': 'abc-123-def'
  }
};
```

### Find orders in date range
```javascript
const params = {
  TableName: 'packprod-weborders',
  IndexName: 'clientID-createdAt-index',
  KeyConditionExpression: 'clientID = :clientID AND createdAt BETWEEN :startDate AND :endDate',
  ExpressionAttributeValues: {
    ':clientID': '7b0d485f-8ef9-45b0-881a-9d8f4447ced2',
    ':startDate': '2025-10-01T00:00:00.000Z',
    ':endDate': '2025-10-31T23:59:59.999Z'
  }
};
```

### Find order by PPL order reference
```javascript
const params = {
  TableName: 'packprod-weborders',
  IndexName: 'order_reference-index',
  KeyConditionExpression: 'order_reference = :orderRef',
  ExpressionAttributeValues: {
    ':orderRef': '442856'
  }
};
```

### Find orders with specific product
```javascript
const params = {
  TableName: 'packprod-weborders',
  FilterExpression: 'contains(items, :productCode)',
  ExpressionAttributeValues: {
    ':productCode': { product_code: 'CCPP2' }
  }
};
```

## Testing

### Test 1: New Contact + Order
```bash
curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
  -H "Content-Type: application/json" \
  -d @sample-complete-payload.json
```

**Verify:**
- ✅ New contact in RocketReview_Contacts
- ✅ New order in packprod-weborders
- ✅ `contactID` matches in both tables
- ✅ Order has `ClientName` and `Project` tags

### Test 2: Duplicate Contact + New Order
Send the same email twice.

**Verify:**
- ✅ Contact NOT duplicated in RocketReview_Contacts
- ✅ Both orders created in packprod-weborders
- ✅ Different `orderID` for each order
- ✅ Same `contactID` in both orders

### Test 3: Query Orders by Contact
```bash
aws dynamodb query \
  --table-name packprod-weborders \
  --index-name contactID-index \
  --key-condition-expression "contactID = :cid" \
  --expression-attribute-values '{":cid":{"S":"[YOUR_CONTACT_ID]"}}' \
  --region ap-southeast-2
```

## Monitoring

### CloudWatch Logs
```
Log Group: /aws/lambda/importPackagingProductsContacts
```

**Look for:**
- "Write results" - Shows which tables were written
- "Duplicate contact found" - When contact already exists
- "Error writing to orders table" - If orders write fails

### DynamoDB Metrics
Monitor:
- **RocketReview_Contacts**: ConsumedReadCapacity, ConsumedWriteCapacity
- **packprod-weborders**: ConsumedReadCapacity, ConsumedWriteCapacity

## Rollback

If issues occur:

1. **Revert Lambda code** to previous version (Lambda → Versions → Previous)
2. **Keep packprod-weborders table** - No harm in leaving it
3. **Remove environment variable** ORDERS_TABLE_NAME from Lambda
4. **Existing data** in both tables is safe

## Cost Implications

### DynamoDB Costs (PAY_PER_REQUEST mode)
- **Write requests**: ~$1.25 per million
- **Read requests**: ~$0.25 per million
- **Storage**: ~$0.25 per GB/month

**Expected monthly cost** (assuming 1000 orders/month):
- Writes: 1000 * $0.00000125 = $0.00125
- Storage: Minimal (< 1 MB) = ~$0.00
- **Total: < $0.01/month**

## Post-Deployment Checklist

- [ ] packprod-weborders table created with GSIs
- [ ] Table tags applied (ClientName, Project)
- [ ] Lambda environment variable ORDERS_TABLE_NAME added
- [ ] Lambda IAM role has permissions for new table
- [ ] Lambda code updated with index-dual-table.mjs
- [ ] Test import successful (both tables written)
- [ ] Test duplicate contact handling
- [ ] Query indexes working
- [ ] CloudWatch logs showing successful writes

## Support & Troubleshooting

### Contact not written but order written
- This is expected for duplicate contacts
- Check `writes.contactDuplicate` in response

### Order not written
- Check CloudWatch logs for "Error writing to orders table"
- Verify ORDERS_TABLE_NAME environment variable
- Verify IAM permissions

### Missing GSIs
- Create manually via DynamoDB console
- Or re-run create-table.sh script

### Query performance issues
- Ensure you're using the correct GSI for your query pattern
- Check that indexes are ACTIVE status
