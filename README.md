# Packaging Products Order Import & Analytics System

Automated system for importing complete order data from Packaging Products email notifications into AWS DynamoDB, with REST API for review collection and business analytics dashboards.

## Overview

This solution processes order notification emails from Packaging Products' SilverStripe e-commerce platform, stores comprehensive order data in AWS DynamoDB, and provides a REST API for building React-based analytics dashboards and business intelligence tools.

### Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  DATA INGESTION                                                 │
│  Email Notification → n8n → Import Lambda → DynamoDB           │
└─────────────────────────────────────────────────────────────────┘
                                    ↓
                          ┌─────────────────────┐
                          │  DynamoDB (2 tables) │
                          │  • RocketReview_Contacts│
                          │  • packprod-weborders   │
                          └─────────────────────┘
                                    ↓
┌─────────────────────────────────────────────────────────────────┐
│  DATA ACCESS API                                                │
│  React Dashboard ← API Gateway ← Query Lambda ← DynamoDB       │
└─────────────────────────────────────────────────────────────────┘
```

**Two-Table Design:**
1. **RocketReview_Contacts** - Contact records for review workflows (backward compatible)
2. **packprod-weborders** - Complete order records with tags (`ClientName: Packaging Products`, `Project: WebOrders`)

**Dual Lambda Architecture:**
1. **importPackagingProductsContacts** - Write orders and contacts (from n8n)
2. **queryPackagingProductsOrders** - Read-only API for React dashboards

## Features

✅ **Complete Order Capture**
- Order details (reference #, date, Greentree ID, CMS Shop ID)
- Product line items (code, description, quantity, price)
- Delivery address (full shipping details)
- Payment information (PxPay transaction details)
- Order totals (subtotal, freight, GST, total)

✅ **Intelligent Processing**
- Contact deduplication (by email + clientID)
- Dual-table writes (contacts + orders)
- Flexible data format handling (n8n compatibility)
- Comprehensive error handling and logging

✅ **Business Intelligence Ready**
- Product-specific review targeting
- Regional customer analysis
- High-value customer tracking
- Order history per customer

✅ **REST API for Dashboards**
- Query orders with filtering (date range, value, customer)
- Customer list with metrics (lifetime value, order count)
- Product analytics (top products by revenue/quantity)
- Sales reports (daily/weekly/monthly timelines)
- Dashboard overview (today/week/month metrics)
- Full React integration examples

## Quick Start

### Prerequisites
- AWS Account with DynamoDB access
- AWS Lambda function deployed
- n8n instance (for email processing)
- IMAP email account

### Deployment

1. **Create DynamoDB Table**
   ```bash
   bash create-table.sh
   ```

2. **Deploy Lambda Function**
   - Upload `index-dual-table.mjs` to AWS Lambda
   - Add environment variables:
     - `CONTACTS_TABLE_NAME=RocketReview_Contacts`
     - `ORDERS_TABLE_NAME=packprod-weborders`
     - `AWS_REGION=ap-southeast-2`
   - Update IAM permissions for both tables

3. **Import n8n Workflow**
   - Import `Rocket Review - PackProd Enhanced.json`
   - Configure IMAP credentials
   - Activate workflow

4. **Test**
   ```bash
   curl -X POST https://[API_ENDPOINT]/prod/admin/contacts/import/packaging-products \
     -H "Content-Type: application/json" \
     -d @sample-complete-payload.json
   ```

See [`DEPLOYMENT-DUAL-TABLE.md`](DEPLOYMENT-DUAL-TABLE.md) for complete instructions.

## Repository Structure

```
├── index-dual-table.mjs              # Import Lambda (write orders/contacts)
├── query-orders-lambda.mjs           # Query Lambda (read-only API)
├── n8n-extract-complete-order-v2.js  # n8n extraction code (latest)
├── Rocket Review - PackProd Enhanced.json  # n8n workflow
├── create-table.sh                   # DynamoDB table creation
├── setup-api-endpoints.sh            # API Gateway setup script
├── dynamodb-table-schema.json        # Table definition
├── sample-complete-payload.json      # Test data
├── DEPLOYMENT-DUAL-TABLE.md          # Import Lambda deployment guide
├── API-GATEWAY-SETUP.md              # Query API deployment guide
├── REACT-INTEGRATION-GUIDE.md        # React dashboard integration
├── QUICK-REFERENCE.md                # Commands & queries
├── README-FINAL.md                   # Detailed documentation
└── lambda-extracted/                 # Original Lambda code (reference)
```

## API Endpoints

### Import API (n8n → Lambda)

**POST** `https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products`

**Request:**
```json
{
  "clientID": "7b0d485f-8ef9-45b0-881a-9d8f4447ced2",
  "order": {
    "order_reference": "442856",
    "order_date": "21/10/2025 11:49 am",
    "greentree_id": "3493.344774"
  },
  "customer": {
    "contact_name": "ash harrington",
    "email": "ashleighlouise21@yahoo.co.nz",
    "phone": "0210399366",
    "company": "Ash H C/O Kingfisher Gifts",
    "account_name": "PPL Web Sales",
    "account_code": "100014"
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
    "total": "78.84"
  },
  "payment": {
    "payment_type": "PxPay",
    "transaction_id": "0000000a097310ca"
  }
}
```

**Response:**
```json
{
  "message": "Packaging Products import completed",
  "result": "SUCCESS",
  "contactID": "abc-123",
  "orderID": "ORD-442856-1729468200000",
  "writes": {
    "contactWritten": true,
    "orderWritten": true
  }
}
```

### Query API (React Dashboard → Lambda)

**Base URL:** `https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api`

**Orders:**
- `GET /orders` - List all orders with filtering
- `GET /orders/{orderID}` - Get single order details

**Customers:**
- `GET /customers` - List all customers with metrics
- `GET /customers/{contactID}` - Get customer details
- `GET /customers/{contactID}/orders` - Get customer's order history

**Reports:**
- `GET /reports/overview` - Dashboard overview (today/week/month)
- `GET /reports/products` - Product analytics (top by revenue/quantity)
- `GET /reports/sales` - Sales timeline (daily/weekly/monthly)

**Example:**
```bash
# Get dashboard overview
curl https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview

# Get orders from last 30 days
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders?startDate=2025-09-21&endDate=2025-10-21"
```

See [API-GATEWAY-SETUP.md](API-GATEWAY-SETUP.md) for deployment and [REACT-INTEGRATION-GUIDE.md](REACT-INTEGRATION-GUIDE.md) for React examples.

## Use Cases

### 1. Product-Specific Reviews
Target customers who bought specific products:
```
"Hi ash, how are you finding the PP2 Cardboard Boxes you ordered?"
```

### 2. Timing-Based Campaigns
Send review requests 7-14 days after order date.

### 3. Regional Marketing
Group customers by delivery city for regional campaigns.

### 4. High-Value Customers
Identify customers with large or frequent orders.

### 5. Product Analytics
- Most ordered products
- Product combinations
- Regional product preferences

## Database Schema

### Table: packprod-weborders

**Primary Key:** `orderID`

**Global Secondary Indexes:**
- `contactID-index` - All orders for a customer
- `clientID-createdAt-index` - Orders by date range
- `order_reference-index` - Lookup by PPL order number

**Tags:**
- `ClientName: Packaging Products`
- `Project: WebOrders`

## Query Examples

### Get all orders for a contact
```javascript
await dynamodb.query({
  TableName: 'packprod-weborders',
  IndexName: 'contactID-index',
  KeyConditionExpression: 'contactID = :cid',
  ExpressionAttributeValues: { ':cid': contactID }
});
```

### Get orders from last 30 days
```javascript
await dynamodb.query({
  TableName: 'packprod-weborders',
  IndexName: 'clientID-createdAt-index',
  KeyConditionExpression: 'clientID = :client AND createdAt > :date',
  ExpressionAttributeValues: {
    ':client': '7b0d485f-8ef9-45b0-881a-9d8f4447ced2',
    ':date': thirtyDaysAgo.toISOString()
  }
});
```

See [`QUICK-REFERENCE.md`](QUICK-REFERENCE.md) for more query examples.

## Documentation

### Data Import
- **[DEPLOYMENT-DUAL-TABLE.md](DEPLOYMENT-DUAL-TABLE.md)** - Import Lambda deployment guide
- **[QUICK-REFERENCE.md](QUICK-REFERENCE.md)** - Commands, queries, troubleshooting
- **[README-FINAL.md](README-FINAL.md)** - Complete detailed documentation

### React Dashboard API
- **[API-GATEWAY-SETUP.md](API-GATEWAY-SETUP.md)** - Query Lambda and API Gateway setup
- **[REACT-INTEGRATION-GUIDE.md](REACT-INTEGRATION-GUIDE.md)** - React hooks and component examples
- **[setup-api-endpoints.sh](setup-api-endpoints.sh)** - Automated API Gateway configuration

## Monitoring

**CloudWatch Logs:**
```
Log Group: /aws/lambda/importPackagingProductsContacts
```

**Key Metrics:**
- Write success/failure rates
- Contact deduplication rate
- Order processing time

## Cost Estimate

**Monthly (1,000 orders):**
- DynamoDB: < $0.01
- Lambda: $0.00 (within free tier)
- **Total: < $0.01/month**

## Support

### Common Issues

**Contact not written?**
- Check if email already exists (expected for duplicates)
- Verify `CONTACTS_TABLE_NAME` environment variable

**Order not written?**
- Check CloudWatch logs for errors
- Verify `ORDERS_TABLE_NAME` environment variable
- Confirm IAM permissions for packprod-weborders table

**n8n extraction failing?**
- Verify email HTML format matches extraction patterns
- Test with sample email

See [`DEPLOYMENT-DUAL-TABLE.md`](DEPLOYMENT-DUAL-TABLE.md#troubleshooting) for full troubleshooting guide.

## Contributing

This is a private repository for Packaging Products integration. For issues or enhancements, contact the development team.

## License

Proprietary - Media Giant NZ / Packaging Products

## Tech Stack

- **AWS Lambda** - Serverless compute
- **AWS DynamoDB** - NoSQL database
- **n8n** - Workflow automation
- **Node.js 20.x** - Runtime
- **AWS SDK v3** - AWS integrations

---

**Version:** 1.0
**Last Updated:** October 2025
**Client:** Packaging Products
**Project:** WebOrders
