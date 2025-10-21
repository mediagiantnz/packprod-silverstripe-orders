# Implementation Guide - Enhanced Order Import

## Summary of Changes

We've expanded the Packaging Products import system to capture **complete order data** instead of just contact information.

### What We're Now Capturing

#### Before (Contact Only)
- ❌ Contact name, email, phone, company
- ❌ PPL account info

#### After (Complete Order Data)
- ✅ **All contact info** (same as before)
- ✅ **Order Details**: Reference #442856, Order date, Greentree ID/status, CMS Shop ID
- ✅ **Product Items**: CCPP2, CCPP4 with quantities and prices
- ✅ **Delivery Address**: Full shipping details
- ✅ **Payment Info**: PxPay transaction ID and amount
- ✅ **Order Totals**: Subtotal, freight, GST, total

## Files Created

### 1. n8n-extract-complete-order.js
**Purpose**: Enhanced extraction code for n8n workflow
**What it does**: Parses email HTML and extracts all order data fields
**Status**: ✅ Ready to use

### 2. index-enhanced.mjs
**Purpose**: Updated Lambda function
**What it does**: Accepts and stores complete order data in DynamoDB
**Status**: ✅ Ready to deploy

### 3. Rocket Review - PackProd Enhanced.json
**Purpose**: Updated n8n workflow configuration
**What it does**: Complete workflow with new extraction code
**Status**: ✅ Ready to import into n8n

### 4. sample-complete-payload.json
**Purpose**: Test data
**What it does**: Example request with real order #442856 data
**Status**: ✅ Ready for testing

### 5. README-ENHANCED.md
**Purpose**: Complete documentation
**What it does**: API docs, schema, use cases
**Status**: ✅ Reference guide

## Deployment Steps

### Step 1: Update Lambda Function (AWS)

1. **Navigate to Lambda Console**
   ```
   AWS Console → Lambda → importPackagingProductsContacts
   ```

2. **Replace the code**
   - Copy contents of `index-enhanced.mjs`
   - Paste into Lambda function editor
   - Click "Deploy"

3. **Environment Variables** (should already exist)
   ```
   CONTACTS_TABLE_NAME = RocketReview_Contacts
   AWS_REGION = ap-southeast-2
   ```

4. **Test the Lambda**
   ```bash
   # From your local machine
   curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
     -H "Content-Type: application/json" \
     -d @sample-complete-payload.json
   ```

   Expected response:
   ```json
   {
     "message": "Packaging Products contact with order data imported successfully",
     "result": "SUCCESS",
     "orderReference": "442856",
     "itemCount": 2
   }
   ```

### Step 2: Update n8n Workflow

**Option A: Import New Workflow (Recommended)**
1. Open n8n
2. Import `Rocket Review - PackProd Enhanced.json`
3. Update IMAP credentials
4. Activate the workflow
5. Deactivate the old workflow

**Option B: Update Existing Workflow**
1. Open existing "Rocket Review - PackProd add to DynamoDB" workflow
2. Replace the "Extract Contacts" Code node with contents from `n8n-extract-complete-order.js`
3. Update the HTTP Request node:
   - Change "Body Parameters" to "JSON"
   - Set body to: `{{ JSON.stringify($json) }}`
4. Save and test

### Step 3: Test End-to-End

1. **Forward a test email** to packprod@sms.automateai.co.nz with order data
2. **Check n8n execution logs** - verify extraction worked
3. **Check Lambda CloudWatch logs** - verify import succeeded
4. **Query DynamoDB** to verify data structure:
   ```
   Table: RocketReview_Contacts
   Filter: metadata.hasOrderData = true
   ```

## Validation Checklist

- [ ] Lambda function deployed successfully
- [ ] Test payload returns SUCCESS response
- [ ] n8n workflow updated with new extraction code
- [ ] Test email processed successfully
- [ ] DynamoDB contains order data (items array, totals, payment)
- [ ] Contact deduplication still working (email + clientID)

## Data Structure in DynamoDB

```json
{
  "contactID": "uuid",
  "clientID": "7b0d485f-8ef9-45b0-881a-9d8f4447ced2",
  "email": "ashleighlouise21@yahoo.co.nz",
  "name": "ash harrington",
  "company": "Ash H C/O Kingfisher Gifts",

  "order": {
    "order_reference": "442856",
    "order_date": "21/10/2025 11:49 am",
    "greentree_id": "3493.344774"
  },

  "items": [
    {
      "product_code": "CCPP2",
      "description": "PP2 Cardboard Box",
      "quantity": 25,
      "total_price": 25.00
    }
  ],

  "totals": {
    "total": "78.84"
  },

  "metadata": {
    "hasOrderData": true,
    "orderItemCount": 2
  }
}
```

## Use Cases After Deployment

### 1. Send Product-Specific Review Requests
```
"Hi ash, how are you finding the PP2 and PP4 Cardboard Boxes you ordered?"
```

### 2. Timing-Based Campaigns
- Query by `order.order_date`
- Send review requests 7-14 days after order

### 3. Analytics
- Most ordered products
- Average order value
- Regional distribution (by delivery.city)

### 4. Targeted Follow-ups
```sql
-- High-value orders
SELECT * WHERE totals.total > 100

-- Specific product buyers
SELECT * WHERE items[].product_code = 'CCPP2'

-- Regional customers
SELECT * WHERE delivery.city = 'Waipawa'
```

## Rollback Plan

If something goes wrong:

1. **Lambda**: Restore previous version from Lambda console → Versions
2. **n8n**: Reactivate old workflow, deactivate new one
3. **Data**: Old contact records unaffected, new records have `metadata.hasOrderData = true`

## Backward Compatibility

✅ **The enhanced Lambda is backward compatible**

It still accepts the old simple format:
```json
{
  "clientID": "...",
  "contact": {
    "email": "...",
    "contact_name": "..."
  }
}
```

## Questions?

- **Lambda not receiving data?** Check API Gateway mapping
- **n8n extraction failing?** Check email HTML format hasn't changed
- **Duplicates being created?** Verify clientID-status-index exists on DynamoDB

## Next Steps After Deployment

1. Monitor CloudWatch logs for errors
2. Verify a few test orders import correctly
3. Update review campaign templates to use order data
4. Build queries/dashboards using the new fields
