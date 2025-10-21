# API Gateway Setup for React Dashboard

This guide covers deploying the query Lambda function and configuring API Gateway endpoints for the React dashboard.

## Overview

The React dashboard requires read-only API endpoints to:
- List and filter orders
- View customer details and order history
- Generate product and sales reports
- Display dashboard overview metrics

## Architecture

```
React App → API Gateway → Lambda (query-orders-lambda) → DynamoDB
                                                         ↓
                                              packprod-weborders
                                              RocketReview_Contacts
```

---

## 1. Deploy Query Lambda Function

### Step 1: Create Deployment Package

```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"

# Ensure dependencies are installed
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb

# Create deployment package
powershell Compress-Archive -Path query-orders-lambda.mjs,node_modules,package.json -DestinationPath lambda-query-deploy.zip -Force
```

### Step 2: Create Lambda Function

```bash
# Create the Lambda function
aws lambda create-function \
  --function-name queryPackagingProductsOrders \
  --runtime nodejs20.x \
  --role arn:aws:iam::235494808985:role/lambda-execution-role \
  --handler query-orders-lambda.handler \
  --zip-file fileb://lambda-query-deploy.zip \
  --timeout 30 \
  --memory-size 512 \
  --region ap-southeast-2
```

**Note:** Use the same IAM role as your import Lambda (should already have DynamoDB permissions).

### Step 3: Set Environment Variables

```bash
aws lambda update-function-configuration \
  --function-name queryPackagingProductsOrders \
  --environment "Variables={ORDERS_TABLE_NAME=packprod-weborders,CONTACTS_TABLE_NAME=RocketReview_Contacts}" \
  --region ap-southeast-2
```

### Step 4: Test the Lambda

```bash
# Create test event
echo '{
  "httpMethod": "GET",
  "path": "/api/reports/overview",
  "queryStringParameters": {},
  "pathParameters": {}
}' > test-query-event.json

# Invoke the function
aws lambda invoke \
  --function-name queryPackagingProductsOrders \
  --payload file://test-query-event.json \
  --region ap-southeast-2 \
  response.json

# View response
cat response.json
```

---

## 2. Configure API Gateway Endpoints

### Existing API Gateway

Your existing API Gateway: `bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com`

We'll add new endpoints to this gateway.

### Option A: Using AWS Console

1. **Go to API Gateway Console**
   - Navigate to your existing API Gateway
   - Select the `/prod` stage

2. **Create Resource: `/api`**
   - Actions → Create Resource
   - Resource Name: `api`
   - Resource Path: `/api`
   - Enable CORS: ✓

3. **Create Resources and Methods:**

   **Orders Endpoints:**
   ```
   /api/orders              [GET]  → queryPackagingProductsOrders
   /api/orders/{orderID}    [GET]  → queryPackagingProductsOrders
   ```

   **Customers Endpoints:**
   ```
   /api/customers                       [GET]  → queryPackagingProductsOrders
   /api/customers/{contactID}           [GET]  → queryPackagingProductsOrders
   /api/customers/{contactID}/orders    [GET]  → queryPackagingProductsOrders
   ```

   **Reports Endpoints:**
   ```
   /api/reports/overview    [GET]  → queryPackagingProductsOrders
   /api/reports/products    [GET]  → queryPackagingProductsOrders
   /api/reports/sales       [GET]  → queryPackagingProductsOrders
   ```

4. **Configure Each Method:**
   - Integration Type: Lambda Function
   - Lambda Proxy Integration: ✓ (IMPORTANT!)
   - Lambda Function: `queryPackagingProductsOrders`
   - Use Default Timeout: ✓

5. **Enable CORS for Each Method:**
   - Actions → Enable CORS
   - Access-Control-Allow-Origin: `*` (or your domain)
   - Confirm changes

6. **Deploy API:**
   - Actions → Deploy API
   - Deployment stage: `prod`
   - Deploy

### Option B: Using AWS CLI (Automated)

Create a script to set up all endpoints:

```bash
# Get API Gateway ID
API_ID="bw4agz6xn4"
REGION="ap-southeast-2"
LAMBDA_ARN="arn:aws:lambda:ap-southeast-2:235494808985:function:queryPackagingProductsOrders"

# Get root resource ID
ROOT_ID=$(aws apigateway get-resources --rest-api-id $API_ID --region $REGION --query 'items[?path==`/`].id' --output text)

# Create /api resource
API_RESOURCE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $ROOT_ID \
  --path-part api \
  --region $REGION \
  --query 'id' \
  --output text)

# Create /api/orders resource
ORDERS_RESOURCE=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $API_RESOURCE \
  --path-part orders \
  --region $REGION \
  --query 'id' \
  --output text)

# Create GET method on /api/orders
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $ORDERS_RESOURCE \
  --http-method GET \
  --authorization-type NONE \
  --region $REGION

# Integrate with Lambda
aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $ORDERS_RESOURCE \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
  --region $REGION

# Grant API Gateway permission to invoke Lambda
aws lambda add-permission \
  --function-name queryPackagingProductsOrders \
  --statement-id apigateway-query-orders-get \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:$REGION:235494808985:$API_ID/*/GET/api/orders" \
  --region $REGION

# Deploy to prod stage
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region $REGION
```

**Note:** Repeat similar steps for all other endpoints. Full script available in `setup-api-endpoints.sh`.

---

## 3. API Endpoints Reference

### Base URL
```
https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod
```

### Orders

**List All Orders**
```http
GET /api/orders?limit=50&startDate=2025-01-01&endDate=2025-12-31
```

Query Parameters:
- `limit` (optional): Number of results (default: 50)
- `startDate` (optional): ISO 8601 date string
- `endDate` (optional): ISO 8601 date string
- `minTotal` (optional): Minimum order value
- `maxTotal` (optional): Maximum order value
- `lastEvaluatedKey` (optional): Pagination token

**Get Single Order**
```http
GET /api/orders/{orderID}
```

Example:
```http
GET /api/orders/ORD-442894-1761011792356
```

### Customers

**List All Customers**
```http
GET /api/customers?limit=50
```

**Get Customer Details**
```http
GET /api/customers/{contactID}
```

**Get Customer's Orders**
```http
GET /api/customers/{contactID}/orders?limit=50
```

### Reports

**Dashboard Overview**
```http
GET /api/reports/overview
```

Returns:
```json
{
  "success": true,
  "overview": {
    "today": {
      "order_count": 5,
      "revenue": "1234.56",
      "avg_order_value": "246.91"
    },
    "this_week": { ... },
    "this_month": { ... },
    "total_customers": 142
  },
  "recent_orders": [...]
}
```

**Product Analytics**
```http
GET /api/reports/products?startDate=2025-01-01&endDate=2025-12-31
```

Returns:
```json
{
  "success": true,
  "summary": {
    "total_products": 87,
    "total_orders_analyzed": 234
  },
  "topByRevenue": [
    {
      "product_code": "CCQ",
      "description": "Q Cardboard Box",
      "total_quantity": 1250,
      "total_revenue": 3687.50,
      "order_count": 45
    },
    ...
  ],
  "topByQuantity": [...]
}
```

**Sales Report**
```http
GET /api/reports/sales?startDate=2025-01-01&endDate=2025-12-31&groupBy=day
```

Query Parameters:
- `startDate`, `endDate`: Date range
- `groupBy`: `day`, `week`, or `month` (default: `day`)

Returns:
```json
{
  "success": true,
  "summary": {
    "total_revenue": "45678.90",
    "total_orders": 234,
    "average_order_value": "195.16",
    "group_by": "day"
  },
  "timeline": [
    {
      "date": "2025-10-01",
      "revenue": 1234.56,
      "order_count": 8
    },
    ...
  ]
}
```

---

## 4. CORS Configuration

All endpoints return CORS headers:

```javascript
{
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
}
```

For production, update Lambda to restrict origins:

```javascript
const headers = {
  "Access-Control-Allow-Origin": "https://yourdomain.com",
  // ... other headers
};
```

---

## 5. React Integration Examples

### Setup API Client

```javascript
// src/api/client.js
const API_BASE_URL = 'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api';

export const apiClient = {
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(params).toString();
    const url = `${API_BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    return response.json();
  }
};
```

### Example: List Orders

```javascript
// src/api/orders.js
import { apiClient } from './client';

export const ordersApi = {
  async listOrders({ startDate, endDate, limit = 50 }) {
    const params = { limit };
    if (startDate) params.startDate = startDate;
    if (endDate) params.endDate = endDate;

    return apiClient.get('/orders', params);
  },

  async getOrder(orderID) {
    return apiClient.get(`/orders/${orderID}`);
  }
};
```

### Example: React Component

```javascript
// src/components/OrdersList.jsx
import React, { useEffect, useState } from 'react';
import { ordersApi } from '../api/orders';

export function OrdersList() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchOrders() {
      try {
        const response = await ordersApi.listOrders({
          limit: 50
        });
        setOrders(response.orders);
      } catch (error) {
        console.error('Failed to fetch orders:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrders();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      <h1>Orders ({orders.length})</h1>
      <table>
        <thead>
          <tr>
            <th>Order #</th>
            <th>Customer</th>
            <th>Date</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.map(order => (
            <tr key={order.orderID}>
              <td>{order.order_reference}</td>
              <td>{order.customer.contact_name}</td>
              <td>{new Date(order.createdAt).toLocaleDateString()}</td>
              <td>${order.totals.total}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

### Example: Dashboard Overview

```javascript
// src/components/Dashboard.jsx
import React, { useEffect, useState } from 'react';
import { apiClient } from '../api/client';

export function Dashboard() {
  const [overview, setOverview] = useState(null);

  useEffect(() => {
    async function fetchOverview() {
      const response = await apiClient.get('/reports/overview');
      setOverview(response.overview);
    }

    fetchOverview();
  }, []);

  if (!overview) return <div>Loading...</div>;

  return (
    <div className="dashboard">
      <h1>Dashboard Overview</h1>

      <div className="metrics-grid">
        <div className="metric-card">
          <h3>Today</h3>
          <p className="revenue">${overview.today.revenue}</p>
          <p className="orders">{overview.today.order_count} orders</p>
          <p className="avg">Avg: ${overview.today.avg_order_value}</p>
        </div>

        <div className="metric-card">
          <h3>This Week</h3>
          <p className="revenue">${overview.this_week.revenue}</p>
          <p className="orders">{overview.this_week.order_count} orders</p>
          <p className="avg">Avg: ${overview.this_week.avg_order_value}</p>
        </div>

        <div className="metric-card">
          <h3>This Month</h3>
          <p className="revenue">${overview.this_month.revenue}</p>
          <p className="orders">{overview.this_month.order_count} orders</p>
          <p className="avg">Avg: ${overview.this_month.avg_order_value}</p>
        </div>

        <div className="metric-card">
          <h3>Total Customers</h3>
          <p className="count">{overview.total_customers}</p>
        </div>
      </div>
    </div>
  );
}
```

---

## 6. Testing the Endpoints

### Using curl

```bash
# Test overview report
curl https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview

# Test order list
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders?limit=10"

# Test specific order
curl https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders/ORD-442894-1761011792356

# Test customers list
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers?limit=10"

# Test product report
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products"

# Test sales report
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/sales?groupBy=month"
```

### Using Postman

1. Create new request
2. Method: GET
3. URL: `https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview`
4. Send

---

## 7. Security Considerations

### Current Setup (Development)
- No authentication required
- CORS allows all origins (`*`)
- Suitable for development/testing

### Production Recommendations

1. **Add Authentication:**
   - AWS Cognito authorizer
   - API Key requirements
   - JWT token validation

2. **Restrict CORS:**
   ```javascript
   "Access-Control-Allow-Origin": "https://packagingproducts.co.nz"
   ```

3. **Rate Limiting:**
   - Enable API Gateway usage plans
   - Set throttle limits (requests/second)

4. **IAM Policies:**
   - Least-privilege Lambda execution role
   - Separate read/write permissions

---

## 8. Monitoring

### CloudWatch Metrics

Monitor Lambda performance:
```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=queryPackagingProductsOrders \
  --start-time 2025-10-21T00:00:00Z \
  --end-time 2025-10-21T23:59:59Z \
  --period 3600 \
  --statistics Sum \
  --region ap-southeast-2
```

### CloudWatch Logs

View Lambda logs:
```bash
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/queryPackagingProductsOrders --follow --region ap-southeast-2
```

---

## 9. Troubleshooting

### Lambda Not Returning Data

**Check environment variables:**
```bash
aws lambda get-function-configuration \
  --function-name queryPackagingProductsOrders \
  --query 'Environment.Variables' \
  --region ap-southeast-2
```

**Check CloudWatch logs:**
```bash
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/queryPackagingProductsOrders --since 1h --region ap-southeast-2
```

### CORS Errors in Browser

**Ensure OPTIONS method is configured:**
- Each endpoint needs OPTIONS method
- Enable CORS in API Gateway console
- Redeploy API after changes

### 403 Forbidden Errors

**Check Lambda permissions:**
```bash
aws lambda get-policy \
  --function-name queryPackagingProductsOrders \
  --region ap-southeast-2
```

**Grant API Gateway permission:**
```bash
aws lambda add-permission \
  --function-name queryPackagingProductsOrders \
  --statement-id apigateway-invoke \
  --action lambda:InvokeFunction \
  --principal apigateway.amazonaws.com \
  --source-arn "arn:aws:execute-api:ap-southeast-2:235494808985:bw4agz6xn4/*/GET/*" \
  --region ap-southeast-2
```

---

## 10. Next Steps

1. **Deploy Lambda function** (Section 1)
2. **Configure API Gateway endpoints** (Section 2)
3. **Test endpoints** (Section 6)
4. **Integrate with React app** (Section 5)
5. **Add authentication** (AWS Cognito - Phase 2)
6. **Set up monitoring** (CloudWatch dashboards)

---

## Support

For issues or questions:
- Check CloudWatch logs for Lambda errors
- Verify API Gateway configuration
- Test with curl before testing in React
- Review DynamoDB table permissions

**Related Documentation:**
- [DEPLOYMENT-DUAL-TABLE.md](DEPLOYMENT-DUAL-TABLE.md) - Lambda deployment guide
- [QUICK-REFERENCE.md](QUICK-REFERENCE.md) - DynamoDB query examples
- [README.md](README.md) - System overview
