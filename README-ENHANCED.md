# Enhanced Packaging Products Contact & Order Import

This enhanced Lambda function imports both customer contacts AND complete order data from Packaging Products into RocketReview for review collection.

## What's New

### Complete Order Tracking
Now captures:
- ✅ **Order Details**: Reference numbers, dates, Greentree & CMS Shop IDs
- ✅ **Product Items**: What they ordered, quantities, prices
- ✅ **Delivery Address**: Full shipping information
- ✅ **Payment Info**: Transaction IDs and amounts
- ✅ **Order Totals**: Subtotal, freight, GST, total

### Benefits
1. **Targeted Reviews**: Ask about specific products they purchased
2. **Timing**: Send reviews based on order date
3. **Context**: Reference their order when requesting feedback
4. **Analytics**: Track which products generate the most orders/reviews

## API Endpoint

```
POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products
```

## Request Format

### Complete Order Import
```json
{
  "clientID": "7b0d485f-8ef9-45b0-881a-9d8f4447ced2",
  "order": {
    "order_reference": "442856",
    "order_date": "21/10/2025 11:49 am",
    "greentree_order_reference": "442856",
    "greentree_id": "3493.344774",
    "greentree_status": "Entered",
    "cms_shop_reference": "285118",
    "cms_shop_id": "285118"
  },
  "customer": {
    "contact_name": "ash harrington",
    "company": "Ash H C/O Kingfisher Gifts",
    "email": "ashleighlouise21@yahoo.co.nz",
    "phone": "0210399366",
    "account_name": "PPL Web Sales",
    "account_code": "100014"
  },
  "delivery": {
    "name": "ash harrington",
    "company": "Ash H C/O Kingfisher Gifts",
    "street": "70 High St",
    "city": "Waipawa",
    "country": "New Zealand",
    "phone": "0210399366"
  },
  "items": [
    {
      "product_code": "CCPP2",
      "description": "PP2 Cardboard Box",
      "unit_price": 1.00,
      "quantity": 25,
      "total_price": 25.00
    },
    {
      "product_code": "CCPP4",
      "description": "PP4 Cardboard Box",
      "unit_price": 1.12,
      "quantity": 25,
      "total_price": 28.00
    }
  ],
  "totals": {
    "subtotal": "53.00",
    "freight": "15.56",
    "freight_description": "Hawke's Bay",
    "gst": "10.28",
    "total": "78.84"
  },
  "payment": {
    "payment_type": "PxPay",
    "transaction_id": "0000000a097310ca",
    "amount": "NZ$78.84"
  }
}
```

## Response Format

```json
{
  "message": "Packaging Products contact with order data imported successfully",
  "result": "SUCCESS",
  "clientID": "7b0d485f-8ef9-45b0-881a-9d8f4447ced2",
  "contactID": "9b6d1b10-8e7f-485a-abe3-506168567a61",
  "email": "ashleighlouise21@yahoo.co.nz",
  "name": "ash harrington",
  "company": "Ash H C/O Kingfisher Gifts",
  "orderReference": "442856",
  "orderDate": "21/10/2025 11:49 am",
  "orderTotal": "78.84",
  "itemCount": 2,
  "timestamp": "2025-10-21T00:51:00.000Z"
}
```

## DynamoDB Schema

Data is stored in the `RocketReview_Contacts` table with the following structure:

### Primary Fields
- `contactID` (String, Primary Key)
- `clientID` (String, GSI)
- `email` (String)
- `firstName` (String)
- `lastName` (String)
- `name` (String)
- `phone` (String)
- `company` (String)

### PPL-Specific Fields
- `ppl_account` (String)
- `ppl_account_number` (String)

### Order Object
```
order: {
  order_reference: String,
  order_date: String,
  greentree_order_reference: String,
  greentree_id: String,
  greentree_status: String,
  cms_shop_reference: String,
  cms_shop_id: String
}
```

### Delivery Object
```
delivery: {
  name: String,
  company: String,
  street: String,
  city: String,
  country: String,
  phone: String
}
```

### Items Array
```
items: [
  {
    product_code: String,
    description: String,
    unit_price: Number,
    quantity: Number,
    total_price: Number
  }
]
```

### Totals Object
```
totals: {
  subtotal: String,
  freight: String,
  freight_description: String,
  gst: String,
  total: String
}
```

### Payment Object
```
payment: {
  payment_type: String,
  transaction_id: String,
  amount: String
}
```

### Metadata
```
metadata: {
  originalData: Object,
  importSource: "packaging_products",
  importedAt: ISO8601 Timestamp,
  hasOrderData: true,
  orderItemCount: Number
}
```

## n8n Workflow Integration

### 1. Extract Data from Email
Use the JavaScript code in `n8n-extract-complete-order.js` in your n8n Code node.

### 2. Send to Lambda
Configure HTTP Request node:

```
Method: POST
URL: https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products
Headers: Content-Type: application/json
Body: {{ $json }}
```

The extraction code returns the data in the exact format expected by the Lambda function.

## Deployment

1. Update the Lambda function code with `index-enhanced.mjs`
2. Update your n8n workflow with the new extraction code
3. Test with `sample-complete-payload.json`

```bash
# Test the Lambda function
curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
  -H "Content-Type: application/json" \
  -d @sample-complete-payload.json
```

## Use Cases for Review Collection

### 1. Product-Specific Reviews
```
"Hi ash, thanks for your recent order of PP2 Cardboard Boxes and PP4 Cardboard Boxes.
How are they working out for you?"
```

### 2. Timing-Based Reviews
Wait 7-14 days after `order_date` before sending review request.

### 3. High-Value Customer Tracking
Track customers with multiple orders or high order totals.

### 4. Regional Insights
Group reviews by delivery city/region (e.g., Hawke's Bay).

## Migration Notes

- ✅ **Backward Compatible**: Still accepts simple contact-only imports
- ✅ **Duplicate Detection**: Still checks email + clientID
- ✅ **Existing Data**: Old contacts without order data remain valid
- ⚠️ **New Fields**: Order data only populated for new imports after deployment

## Support

For questions about:
- **Lambda Function**: Check CloudWatch logs for `importPackagingProductsContacts`
- **n8n Workflow**: Test extraction with sample email HTML
- **DynamoDB**: Query `RocketReview_Contacts` table with `metadata.hasOrderData = true`
