# Quick Reference - Dual Table Architecture

## Tables

### RocketReview_Contacts (Existing)
- **Purpose**: Simplified contact records for review workflows
- **Primary Key**: contactID
- **Data**: Contact info + link to orders via `metadata.linkedOrderID`

### packprod-weborders (New)
- **Purpose**: Complete order records with full details
- **Primary Key**: orderID
- **Tags**: ClientName="Packaging Products", Project="WebOrders"
- **Data**: Everything - customer, items, delivery, payment, totals

## Deployment Commands

### 1. Create Table
```bash
bash create-table.sh
```

### 2. Update Lambda
- Add env var: `ORDERS_TABLE_NAME=packprod-weborders`
- Deploy code: `index-dual-table.mjs`
- Update IAM: Grant permissions to packprod-weborders

### 3. Test
```bash
curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
  -H "Content-Type: application/json" \
  -d @sample-complete-payload.json
```

## Common Queries

### Get all orders for a contact
```javascript
// Using contactID-index
await dynamodb.query({
  TableName: 'packprod-weborders',
  IndexName: 'contactID-index',
  KeyConditionExpression: 'contactID = :cid',
  ExpressionAttributeValues: { ':cid': contactID }
});
```

### Get orders by date range
```javascript
// Using clientID-createdAt-index
await dynamodb.query({
  TableName: 'packprod-weborders',
  IndexName: 'clientID-createdAt-index',
  KeyConditionExpression: 'clientID = :client AND createdAt BETWEEN :start AND :end',
  ExpressionAttributeValues: {
    ':client': '7b0d485f-8ef9-45b0-881a-9d8f4447ced2',
    ':start': '2025-10-01T00:00:00Z',
    ':end': '2025-10-31T23:59:59Z'
  }
});
```

### Find order by PPL order number
```javascript
// Using order_reference-index
await dynamodb.query({
  TableName: 'packprod-weborders',
  IndexName: 'order_reference-index',
  KeyConditionExpression: 'order_reference = :ref',
  ExpressionAttributeValues: { ':ref': '442856' }
});
```

### Get orders containing specific product
```javascript
// Scan with filter (not indexed)
await dynamodb.scan({
  TableName: 'packprod-weborders',
  FilterExpression: 'contains(#items, :code)',
  ExpressionAttributeNames: { '#items': 'items' },
  ExpressionAttributeValues: {
    ':code': JSON.stringify({ product_code: 'CCPP2' })
  }
});
```

### Get high-value orders
```javascript
// Scan with filter
await dynamodb.scan({
  TableName: 'packprod-weborders',
  FilterExpression: 'totals.total > :amount',
  ExpressionAttributeValues: { ':amount': '100.00' }
});
```

### Get orders by delivery city
```javascript
// Scan with filter
await dynamodb.scan({
  TableName: 'packprod-weborders',
  FilterExpression: 'delivery.city = :city',
  ExpressionAttributeValues: { ':city': 'Waipawa' }
});
```

## Response Format

```json
{
  "message": "Packaging Products import completed",
  "result": "SUCCESS",
  "contactID": "abc-123-def",
  "orderID": "ORD-442856-1729468200000",
  "email": "ashleighlouise21@yahoo.co.nz",
  "name": "ash harrington",
  "orderReference": "442856",
  "orderTotal": "78.84",
  "itemCount": 2,
  "writes": {
    "contactWritten": true,
    "contactDuplicate": false,
    "orderWritten": true
  }
}
```

## Data Structure - packprod-weborders

```json
{
  "orderID": "ORD-442856-1729468200000",
  "contactID": "abc-123-def",
  "clientID": "7b0d485f-8ef9-45b0-881a-9d8f4447ced2",
  "ClientName": "Packaging Products",
  "Project": "WebOrders",

  "order_reference": "442856",
  "order_date": "21/10/2025 11:49 am",
  "greentree_id": "3493.344774",
  "greentree_status": "Entered",

  "customer": {
    "contact_name": "ash harrington",
    "email": "ashleighlouise21@yahoo.co.nz",
    "phone": "0210399366",
    "company": "Ash H C/O Kingfisher Gifts",
    "account_name": "PPL Web Sales",
    "account_code": "100014"
  },

  "delivery": {
    "name": "ash harrington",
    "street": "70 High St",
    "city": "Waipawa",
    "country": "New Zealand",
    "phone": "0210399366"
  },

  "items": [
    {
      "product_code": "CCPP2",
      "description": "PP2 Cardboard Box",
      "quantity": 25,
      "unit_price": 1.00,
      "total_price": 25.00
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
  },

  "createdAt": "2025-10-21T00:51:00.000Z",
  "updatedAt": "2025-10-21T00:51:00.000Z"
}
```

## Indexes

| Index Name | Partition Key | Sort Key | Use Case |
|------------|---------------|----------|----------|
| Primary | orderID | - | Direct order lookup |
| contactID-index | contactID | createdAt | All orders for a customer |
| clientID-createdAt-index | clientID | createdAt | Orders by date range |
| order_reference-index | order_reference | - | Lookup by PPL order # |

## File Reference

| File | Purpose |
|------|---------|
| `index-dual-table.mjs` | Lambda function (dual-write) |
| `n8n-extract-complete-order.js` | n8n extraction code |
| `Rocket Review - PackProd Enhanced.json` | n8n workflow |
| `sample-complete-payload.json` | Test data |
| `create-table.sh` | Create DynamoDB table |
| `dynamodb-table-schema.json` | Table definition |
| `DEPLOYMENT-DUAL-TABLE.md` | Full deployment guide |

## Environment Variables

```bash
# Lambda Configuration → Environment Variables
CONTACTS_TABLE_NAME = RocketReview_Contacts
ORDERS_TABLE_NAME = packprod-weborders
AWS_REGION = ap-southeast-2
```

## Tags

Table tags for `packprod-weborders`:
```
ClientName = Packaging Products
Project = WebOrders
Environment = Production
```

## Troubleshooting

**Contact written but not order?**
- Check CloudWatch logs for errors
- Verify ORDERS_TABLE_NAME env var
- Verify IAM permissions

**Order written but not contact?**
- This is normal for duplicate contacts
- Check `writes.contactDuplicate` in response

**GSI not available?**
- Wait for index to become ACTIVE
- Check DynamoDB console → Tables → packprod-weborders → Indexes
