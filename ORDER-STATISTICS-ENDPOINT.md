# Order Statistics Aggregation Endpoint

## Overview

The Order Statistics endpoint provides comprehensive analytics and insights about orders in the system. It aggregates data across multiple dimensions including revenue, payment types, customer behavior, delivery locations, and temporal trends.

## Endpoint Details

**URL:** `GET /api/reports/statistics`

**Lambda Function:** `query-orders-lambda.mjs`

**Function Name:** `getOrderStatistics()`

## Query Parameters

| Parameter | Type | Required | Default | Description |
|-----------|------|----------|---------|-------------|
| `startDate` | ISO 8601 String | No | null | Filter orders from this date (inclusive) |
| `endDate` | ISO 8601 String | No | null | Filter orders until this date (inclusive) |
| `includeCustomerStats` | Boolean | No | true | Include top customer rankings in response |

## Response Format

```json
{
  "success": true,
  "data": {
    "overall": {
      "totalRevenue": "12345.67",
      "totalOrders": 150,
      "averageOrderValue": "82.30"
    },
    "byPaymentType": {
      "PxPay": {
        "count": 120,
        "revenue": "10000.00"
      },
      "Account": {
        "count": 30,
        "revenue": "2345.67"
      }
    },
    "byStatus": {
      "pending": {
        "count": 10,
        "revenue": "850.00"
      },
      "completed": {
        "count": 140,
        "revenue": "11495.67"
      }
    },
    "trends": {
      "last7Days": {
        "orders": 25,
        "revenue": "2100.00"
      },
      "last30Days": {
        "orders": 80,
        "revenue": "6800.00"
      },
      "last90Days": {
        "orders": 140,
        "revenue": "11500.00"
      }
    },
    "topCustomers": {
      "byRevenue": [
        {
          "contactID": "abc-123",
          "name": "John Smith",
          "email": "john@example.com",
          "company": "Acme Corp",
          "totalRevenue": "5000.00",
          "orderCount": 15
        }
        // ... top 5 customers
      ],
      "byOrderCount": [
        {
          "contactID": "xyz-789",
          "name": "Jane Doe",
          "email": "jane@example.com",
          "company": "Tech Inc",
          "orderCount": 25,
          "totalRevenue": "3500.00"
        }
        // ... top 5 customers
      ]
    },
    "insights": {
      "peakOrderHour": "14:00",
      "peakOrderDay": "Monday",
      "commonCities": [
        {
          "city": "Auckland",
          "orderCount": 45
        },
        {
          "city": "Wellington",
          "orderCount": 30
        }
        // ... top 10 cities
      ],
      "avgItemsPerOrder": "2.4"
    }
  },
  "error": null,
  "meta": {
    "count": 150,
    "limit": null,
    "total": 150,
    "lastEvaluatedKey": null,
    "dateRange": {
      "startDate": "2025-01-01T00:00:00.000Z",
      "endDate": "2025-12-31T23:59:59.999Z"
    },
    "generatedAt": "2025-10-21T12:00:00.000Z",
    "includeCustomerStats": true
  }
}
```

## Statistics Calculated

### Overall Metrics
- **Total Revenue**: Sum of all order totals (all time or filtered by date range)
- **Total Orders**: Count of all orders
- **Average Order Value**: Total revenue divided by total orders

### Payment Type Breakdown
Groups orders by payment type (e.g., PxPay, Account) showing:
- Count of orders per payment type
- Total revenue per payment type

### Status Breakdown
Groups orders by status (e.g., pending, completed) showing:
- Count of orders per status
- Total revenue per status

### Trends Analysis
Calculates metrics for three time periods:
- **Last 7 Days**: Orders and revenue from the past week
- **Last 30 Days**: Orders and revenue from the past month
- **Last 90 Days**: Orders and revenue from the past quarter

### Top Customers (Optional)
When `includeCustomerStats=true`:
- **Top 5 by Revenue**: Customers ranked by total spending
- **Top 5 by Order Count**: Customers ranked by number of orders

Each customer entry includes:
- Contact ID, name, email, company
- Total revenue and order count

### Insights
- **Peak Order Hour**: Hour of day (0-23) with most orders
- **Peak Order Day**: Day of week with most orders
- **Common Cities**: Top 10 delivery cities by order count
- **Average Items per Order**: Mean number of items across all orders

## Example API Calls

### 1. Get All-Time Statistics

```bash
curl -X GET "https://your-api-gateway-url/api/reports/statistics"
```

### 2. Get Statistics for Specific Date Range

```bash
curl -X GET "https://your-api-gateway-url/api/reports/statistics?startDate=2025-01-01T00:00:00.000Z&endDate=2025-12-31T23:59:59.999Z"
```

### 3. Get Statistics Without Customer Details

```bash
curl -X GET "https://your-api-gateway-url/api/reports/statistics?includeCustomerStats=false"
```

### 4. Get Last Quarter Statistics

```bash
# Calculate dates in your code
START_DATE=$(date -u -d "90 days ago" +"%Y-%m-%dT%H:%M:%S.000Z")
END_DATE=$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")

curl -X GET "https://your-api-gateway-url/api/reports/statistics?startDate=${START_DATE}&endDate=${END_DATE}"
```

### 5. JavaScript/Fetch Example

```javascript
async function getOrderStatistics(startDate = null, endDate = null, includeCustomers = true) {
  const params = new URLSearchParams();

  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  params.append('includeCustomerStats', includeCustomers);

  const response = await fetch(
    `https://your-api-gateway-url/api/reports/statistics?${params.toString()}`,
    {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    }
  );

  if (!response.ok) {
    throw new Error(`API Error: ${response.statusText}`);
  }

  const result = await response.json();
  return result.data;
}

// Usage examples:

// Get all-time stats
const allTimeStats = await getOrderStatistics();

// Get stats for 2025
const yearStats = await getOrderStatistics(
  '2025-01-01T00:00:00.000Z',
  '2025-12-31T23:59:59.999Z'
);

// Get stats without customer details
const basicStats = await getOrderStatistics(null, null, false);
```

### 6. React/TypeScript Example

```typescript
interface OrderStatistics {
  overall: {
    totalRevenue: string;
    totalOrders: number;
    averageOrderValue: string;
  };
  byPaymentType: Record<string, { count: number; revenue: string }>;
  byStatus: Record<string, { count: number; revenue: string }>;
  trends: {
    last7Days: { orders: number; revenue: string };
    last30Days: { orders: number; revenue: string };
    last90Days: { orders: number; revenue: string };
  };
  topCustomers?: {
    byRevenue: Array<{
      contactID: string;
      name: string;
      email: string;
      company: string;
      totalRevenue: string;
      orderCount: number;
    }>;
    byOrderCount: Array<{
      contactID: string;
      name: string;
      email: string;
      company: string;
      orderCount: number;
      totalRevenue: string;
    }>;
  };
  insights: {
    peakOrderHour: string;
    peakOrderDay: string;
    commonCities: Array<{ city: string; orderCount: number }>;
    avgItemsPerOrder: string;
  };
}

const fetchOrderStats = async (): Promise<OrderStatistics> => {
  const response = await fetch(
    'https://your-api-gateway-url/api/reports/statistics'
  );

  const result = await response.json();

  if (!result.success) {
    throw new Error(result.error || 'Failed to fetch statistics');
  }

  return result.data;
};
```

## Integration Steps

### 1. Deploy Updated Lambda Function

```bash
# Navigate to your project directory
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"

# Create deployment package
zip -r query-lambda-deployment.zip query-orders-lambda.mjs node_modules/

# Upload to AWS Lambda (replace with your function name)
aws lambda update-function-code \
  --function-name packprod-query-orders-lambda \
  --zip-file fileb://query-lambda-deployment.zip \
  --region ap-southeast-2
```

### 2. Update API Gateway

Add a new resource and method to your API Gateway:

```bash
# Get your API ID
API_ID="your-api-id"
REGION="ap-southeast-2"

# Get the reports resource ID
REPORTS_ID=$(aws apigateway get-resources \
  --rest-api-id $API_ID \
  --region $REGION \
  --query 'items[?path==`/api/reports`].id' \
  --output text)

# Create statistics resource
STATS_ID=$(aws apigateway create-resource \
  --rest-api-id $API_ID \
  --parent-id $REPORTS_ID \
  --path-part statistics \
  --region $REGION \
  --query 'id' \
  --output text)

# Create GET method
aws apigateway put-method \
  --rest-api-id $API_ID \
  --resource-id $STATS_ID \
  --http-method GET \
  --authorization-type NONE \
  --region $REGION

# Integrate with Lambda
LAMBDA_ARN="arn:aws:lambda:ap-southeast-2:your-account-id:function:packprod-query-orders-lambda"

aws apigateway put-integration \
  --rest-api-id $API_ID \
  --resource-id $STATS_ID \
  --http-method GET \
  --type AWS_PROXY \
  --integration-http-method POST \
  --uri "arn:aws:apigateway:$REGION:lambda:path/2015-03-31/functions/$LAMBDA_ARN/invocations" \
  --region $REGION

# Deploy API
aws apigateway create-deployment \
  --rest-api-id $API_ID \
  --stage-name prod \
  --region $REGION
```

### 3. Test the Endpoint

```bash
# Test without parameters
curl -X GET "https://your-api-url/api/reports/statistics"

# Test with date range
curl -X GET "https://your-api-url/api/reports/statistics?startDate=2025-01-01T00:00:00.000Z&endDate=2025-12-31T23:59:59.999Z"

# Test without customer stats
curl -X GET "https://your-api-url/api/reports/statistics?includeCustomerStats=false"
```

### 4. Frontend Integration

Add to your API client:

```javascript
// api/reports.js
export const getOrderStatistics = async (filters = {}) => {
  const { startDate, endDate, includeCustomerStats = true } = filters;

  const params = new URLSearchParams();
  if (startDate) params.append('startDate', startDate);
  if (endDate) params.append('endDate', endDate);
  params.append('includeCustomerStats', includeCustomerStats);

  const response = await fetch(
    `${API_BASE_URL}/api/reports/statistics?${params.toString()}`
  );

  return response.json();
};
```

## Performance Considerations

### Optimization Tips

1. **Use Date Ranges**: When possible, specify `startDate` and `endDate` to reduce the dataset size
2. **Disable Customer Stats**: Set `includeCustomerStats=false` when you don't need customer rankings
3. **Cache Results**: Consider caching statistics for frequently requested date ranges
4. **Pagination**: For very large datasets, the function scans/queries all orders - consider adding pagination for datasets over 10,000 orders

### Expected Response Times

- **Small Dataset** (< 1,000 orders): 500-1000ms
- **Medium Dataset** (1,000-10,000 orders): 1-3 seconds
- **Large Dataset** (> 10,000 orders): 3-10 seconds

### DynamoDB Considerations

- Uses `clientID-createdAt-index` when date filters are provided (efficient)
- Falls back to table scan when no date filters are provided (less efficient)
- Each invocation consumes read capacity units based on data size

## Error Handling

### Common Errors

**Invalid Date Format:**
```json
{
  "success": false,
  "data": null,
  "error": "Invalid date format"
}
```

**Lambda Timeout:**
```json
{
  "success": false,
  "data": null,
  "error": "Task timed out after 30.00 seconds"
}
```

**Solution**: Increase Lambda timeout or use date range filtering

## Use Cases

### 1. Executive Dashboard
Display high-level metrics:
- Total revenue and orders
- Average order value
- Top customers

### 2. Sales Analytics
Analyze trends:
- Revenue by payment type
- Order trends over time periods
- Peak ordering times

### 3. Customer Insights
Understand customer behavior:
- Top customers by revenue and frequency
- Customer ordering patterns
- Geographic distribution

### 4. Operational Planning
Optimize operations:
- Peak ordering hours for staffing
- Common delivery cities for logistics
- Average items per order for inventory

## Extending the Function

### Adding New Metrics

To add additional statistics:

1. Update the `stats` object initialization:
```javascript
const stats = {
  // ... existing fields
  newMetric: {}
};
```

2. Add calculation logic in the `forEach` loop:
```javascript
orders.forEach(order => {
  // ... existing calculations
  stats.newMetric[someKey] = someCalculation;
});
```

3. Include in response:
```javascript
const statisticsData = {
  // ... existing fields
  newMetricData: processedNewMetric
};
```

### Example: Adding Product Category Stats

```javascript
// In stats initialization
productCategories: {},

// In forEach loop
const category = item.category || 'Uncategorized';
if (!stats.productCategories[category]) {
  stats.productCategories[category] = { count: 0, revenue: 0 };
}
stats.productCategories[category].count += 1;
stats.productCategories[category].revenue += orderTotal;

// In response
byCategory: Object.entries(stats.productCategories).map(([cat, data]) => ({
  category: cat,
  orderCount: data.count,
  revenue: data.revenue.toFixed(2)
}))
```

## Troubleshooting

### No Data Returned

**Check:**
- Date range parameters are in ISO 8601 format
- Orders exist in the specified date range
- Lambda has correct DynamoDB permissions

### Slow Response

**Solutions:**
- Add date range filters to reduce dataset
- Increase Lambda memory allocation
- Disable customer statistics if not needed

### Missing Customer Data

**Check:**
- `includeCustomerStats` is set to `true`
- Orders have valid `contactID` fields
- Customer table has corresponding records

## Security Considerations

- Endpoint should require authentication (API key or JWT)
- Consider implementing rate limiting
- Restrict access to authorized users only
- Sanitize any query parameters before use

## Related Endpoints

- `GET /api/reports/sales` - Sales report with timeline
- `GET /api/reports/products` - Product analytics
- `GET /api/reports/overview` - Dashboard overview
- `GET /api/orders` - List orders with filters
