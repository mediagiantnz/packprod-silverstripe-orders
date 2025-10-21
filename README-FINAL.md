# Packaging Products Order Import - Complete Solution

## Overview

This solution imports **complete order data** from Packaging Products email notifications into AWS DynamoDB for review collection and analytics.

## Architecture

```
┌─────────────────┐
│ Email: Order    │
│ Notification    │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ n8n: Extract    │
│ Order Data      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Lambda: Process │
│ & Store         │
└────┬────────┬───┘
     │        │
     ▼        ▼
┌─────────┐ ┌──────────────────┐
│ Contacts│ │ packprod-weborders│
│ Table   │ │ Table             │
└─────────┘ └──────────────────┘
```

## Two-Table Design

### Table 1: RocketReview_Contacts (Existing)
**Purpose**: Backward-compatible contact records for review workflows

**What's stored:**
- ✅ Contact info (name, email, phone, company)
- ✅ PPL account details
- ✅ Link to order via `metadata.linkedOrderID`
- ✅ Prevents duplicate contacts (by email + clientID)

### Table 2: packprod-weborders (New)
**Purpose**: Complete order records with full business intelligence

**What's stored:**
- ✅ Order details (reference #, date, Greentree ID, CMS Shop ID)
- ✅ Customer information
- ✅ Product line items (code, description, quantity, price)
- ✅ Delivery address (full shipping details)
- ✅ Payment information (type, transaction ID, amount)
- ✅ Order totals (subtotal, freight, GST, total)

**Tags:**
- `ClientName: Packaging Products`
- `Project: WebOrders`

## What's Captured

Based on your email format (Order #442856):

```
Order reference: 442856                  ✅ order_reference
Order date: 21/10/2025 11:49 am         ✅ order_date
Greentree order reference: 442856        ✅ greentree_order_reference
Greentree ID: 3493.344774               ✅ greentree_id
Greentree status: Entered               ✅ greentree_status
CMS Shop reference: 285118              ✅ cms_shop_reference
CMS Shop ID: 285118                     ✅ cms_shop_id

PPL Web Sales (100014)                  ✅ customer.account_name, account_code
ash harrington                          ✅ customer.contact_name
Email: ashleighlouise21@yahoo.co.nz     ✅ customer.email
Phone: 0210399366                       ✅ customer.phone

Delivery address:
ash harrington                          ✅ delivery.name
Ash H C/O Kingfisher Gifts             ✅ delivery.company
70 High St                              ✅ delivery.street
Waipawa                                 ✅ delivery.city
New Zealand                             ✅ delivery.country
0210399366                              ✅ delivery.phone

Items:
CCPP2 - PP2 Cardboard Box              ✅ items[0].product_code, description
$1.00 each + GST × 25 = $25.00         ✅ items[0].unit_price, quantity, total_price
CCPP4 - PP4 Cardboard Box              ✅ items[1].*

Sub-total: $53.00                       ✅ totals.subtotal
Freight (Hawke's Bay): $15.56           ✅ totals.freight, freight_description
GST: $10.28                             ✅ totals.gst
Total: $78.84                           ✅ totals.total

Payment type: PxPay                     ✅ payment.payment_type
Transaction ID: 0000000a097310ca        ✅ payment.transaction_id
Amount: NZ$78.84                        ✅ payment.amount
```

## Files

### Core Implementation
- **`index-dual-table.mjs`** - Lambda function (writes to both tables)
- **`n8n-extract-complete-order.js`** - Data extraction code for n8n
- **`Rocket Review - PackProd Enhanced.json`** - Complete n8n workflow

### Database Setup
- **`create-table.sh`** - Bash script to create packprod-weborders table
- **`dynamodb-table-schema.json`** - Table definition (JSON format)

### Testing & Documentation
- **`sample-complete-payload.json`** - Test data from order #442856
- **`DEPLOYMENT-DUAL-TABLE.md`** - Step-by-step deployment guide
- **`QUICK-REFERENCE.md`** - Commands, queries, troubleshooting
- **`README-FINAL.md`** - This file

## Quick Start

### 1. Create Database Table
```bash
bash create-table.sh
```

### 2. Update Lambda
```bash
# Add environment variable
ORDERS_TABLE_NAME=packprod-weborders

# Deploy code
# Copy index-dual-table.mjs to Lambda function
# Click Deploy
```

### 3. Update IAM Permissions
Add packprod-weborders to Lambda execution role policy.

### 4. Import n8n Workflow
Import `Rocket Review - PackProd Enhanced.json` into n8n.

### 5. Test
```bash
curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
  -H "Content-Type: application/json" \
  -d @sample-complete-payload.json
```

## Use Cases

### 1. Product-Specific Review Requests
Query orders by product code, send targeted reviews:
```
"Hi ash, how are you finding the PP2 Cardboard Boxes you ordered?"
```

### 2. Timing-Based Campaigns
Query orders from 7-14 days ago, send review requests at optimal time.

### 3. Regional Marketing
Group customers by delivery city for regional campaigns:
```javascript
// All Hawke's Bay customers
FilterExpression: "totals.freight_description = :region"
```

### 4. High-Value Customer Tracking
Identify and prioritize customers with large orders:
```javascript
// Orders over $100
FilterExpression: "totals.total > :amount"
```

### 5. Product Analytics
- Most ordered products
- Average order quantities
- Product combinations (what's ordered together)

### 6. Customer Insights
- Repeat customers (multiple orders for same contactID)
- Delivery patterns (common cities/regions)
- Account distribution (PPL Web Sales vs PPL Direct)

## Query Examples

All queries use the `packprod-weborders` table.

### Get all orders for a contact
```javascript
const orders = await dynamodb.query({
  TableName: 'packprod-weborders',
  IndexName: 'contactID-index',
  KeyConditionExpression: 'contactID = :cid',
  ExpressionAttributeValues: { ':cid': contactID }
});
```

### Get orders from last 30 days
```javascript
const thirtyDaysAgo = new Date();
thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

const orders = await dynamodb.query({
  TableName: 'packprod-weborders',
  IndexName: 'clientID-createdAt-index',
  KeyConditionExpression: 'clientID = :client AND createdAt > :date',
  ExpressionAttributeValues: {
    ':client': '7b0d485f-8ef9-45b0-881a-9d8f4447ced2',
    ':date': thirtyDaysAgo.toISOString()
  }
});
```

### Find order by PPL order number
```javascript
const order = await dynamodb.query({
  TableName: 'packprod-weborders',
  IndexName: 'order_reference-index',
  KeyConditionExpression: 'order_reference = :ref',
  ExpressionAttributeValues: { ':ref': '442856' }
});
```

## Benefits

### Before (Contact Only)
- ❌ No order history
- ❌ Generic review requests
- ❌ No product insights
- ❌ Can't time review requests
- ❌ No analytics

### After (Complete Orders)
- ✅ Full order history per customer
- ✅ Product-specific review requests
- ✅ Analytics on products, regions, values
- ✅ Time reviews based on order date
- ✅ Track customer lifetime value
- ✅ Identify repeat customers
- ✅ Regional marketing campaigns

## Data Privacy & Storage

- **Contact deduplication**: Prevents duplicate contacts in RocketReview_Contacts
- **Order deduplication**: Each order gets unique orderID (even for same order reference)
- **Data retention**: No automatic deletion (manage via DynamoDB TTL if needed)
- **Tags**: Easy to identify and manage via AWS resource tags

## Support

### Deployment Issues
See `DEPLOYMENT-DUAL-TABLE.md` for:
- Complete setup steps
- IAM permission templates
- Troubleshooting guide

### Query Help
See `QUICK-REFERENCE.md` for:
- Common query patterns
- Index usage
- Performance tips

### Email Format Changes
If Packaging Products changes email format:
1. Update `n8n-extract-complete-order.js` extraction patterns
2. Test with new email sample
3. Redeploy n8n workflow

### Lambda Errors
Check CloudWatch Logs:
```
Log Group: /aws/lambda/importPackagingProductsContacts
```

Look for:
- "Write results" - Success/failure per table
- "Duplicate contact found" - Normal for repeat customers
- "Error writing to orders table" - Permissions/table issue

## Cost Estimate

**DynamoDB (PAY_PER_REQUEST mode):**
- 1,000 orders/month
- Write cost: $0.00125
- Storage cost: ~$0.00 (< 1 GB)
- **Total: < $0.01/month**

**Lambda:**
- 1,000 executions/month
- Free tier: 1M requests/month
- **Total: $0.00**

**Total monthly cost: < $0.01**

## Next Steps

1. **Deploy** using `DEPLOYMENT-DUAL-TABLE.md`
2. **Test** with `sample-complete-payload.json`
3. **Monitor** CloudWatch logs for first few orders
4. **Build** review campaign using order data
5. **Create** analytics dashboard for product insights

## Questions?

- **Lambda not working?** → Check environment variables and IAM permissions
- **Table creation failed?** → Check AWS CLI credentials and region
- **n8n extraction failing?** → Test with sample email HTML
- **Queries slow?** → Ensure you're using appropriate GSI

---

**Ready to deploy?** Start with `DEPLOYMENT-DUAL-TABLE.md`

**Need quick reference?** See `QUICK-REFERENCE.md`

**Testing locally?** Use `sample-complete-payload.json`
