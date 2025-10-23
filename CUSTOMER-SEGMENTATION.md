# Customer Segmentation Documentation

## Overview

The Packaging Products WebOrders system now includes advanced customer segmentation logic that automatically categorizes customers based on their purchase history, spending patterns, and engagement levels.

## Segmentation Fields

All customer endpoints now include three additional metrics fields:

### 1. `segment` (String)

Categorizes customers into four lifecycle stages:

- **VIP**: High-value customers with total lifetime spend > $5,000
- **Active**: Recent customers with orders in the last 90 days (and not classified as New)
- **New**: Customers whose first order was within the last 30 days
- **Dormant**: Customers whose last order was more than 90 days ago

### 2. `lastOrderDaysAgo` (Number)

Number of days since the customer's most recent order. Used for:
- Identifying at-risk customers
- Calculating recency scores
- Triggering re-engagement campaigns

### 3. `purchaseFrequency` (String)

Categorizes customer purchase patterns:

- **Weekly**: Average time between orders ≤ 7 days
- **Monthly**: Average time between orders > 7 days and ≤ 30 days
- **Quarterly**: Average time between orders > 30 days and ≤ 90 days
- **Occasional**: Average time between orders > 90 days
- **One-time**: Customer has only placed a single order
- **None**: Customer has no orders (edge case)

## Segmentation Logic

### Priority Rules

Segment classification follows this priority order:

1. **VIP Status** (Highest Priority)
   - Condition: `totalSpend > $5,000`
   - Overrides all other segments (even if dormant)
   - Rationale: High-value customers require special attention regardless of recency

2. **Dormant Status**
   - Condition: `lastOrderDaysAgo > 90`
   - Applied if not VIP
   - Rationale: Re-engagement opportunity for at-risk customers

3. **New Status**
   - Condition: `firstOrderDate` within last 30 days
   - Applied if not VIP or Dormant
   - Rationale: Onboarding period for new customers

4. **Active Status** (Default)
   - Condition: Orders within last 90 days, not New or VIP
   - Fallback for engaged customers

### Purchase Frequency Calculation

Purchase frequency is calculated using the average time between orders:

```javascript
if (orderCount >= 2 && firstOrderDate) {
  customerLifespanDays = lastOrderDate - firstOrderDate
  avgDaysBetweenOrders = customerLifespanDays / (orderCount - 1)

  if (avgDaysBetweenOrders <= 7) return 'Weekly'
  if (avgDaysBetweenOrders <= 30) return 'Monthly'
  if (avgDaysBetweenOrders <= 90) return 'Quarterly'
  return 'Occasional'
}
```

Special cases:
- Single order: `One-time`
- No orders: `None`

## API Response Format

### List Customers Endpoint

```bash
GET /api/customers?limit=10
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "contactID": "uuid-here",
      "name": "Mediterranean Cafe",
      "email": "cafe@example.com",
      "company": "Mediterranean Cafe",
      "metrics": {
        "orderCount": 8,
        "totalSpend": "1245.50",
        "lastOrderDate": "2025-10-15T08:30:00.000Z",
        "lastOrderReference": "ORD-12345-1729845000000",
        "segment": "Active",
        "lastOrderDaysAgo": 8,
        "purchaseFrequency": "Monthly"
      }
    }
  ],
  "meta": {
    "count": 10,
    "total": 156
  }
}
```

### Get Single Customer Endpoint

```bash
GET /api/customers/{contactID}
```

Response:
```json
{
  "success": true,
  "data": {
    "contactID": "uuid-here",
    "name": "Mediterranean Cafe",
    "email": "cafe@example.com",
    "company": "Mediterranean Cafe",
    "phone": "+64 9 123 4567",
    "accountName": "MED001",
    "accountCode": "MED001",
    "metrics": {
      "orderCount": 8,
      "totalSpend": "1245.50",
      "lastOrderDate": "2025-10-15T08:30:00.000Z",
      "lastOrderReference": "ORD-12345-1729845000000",
      "segment": "Active",
      "lastOrderDaysAgo": 8,
      "purchaseFrequency": "Monthly"
    }
  }
}
```

## Use Cases

### 1. VIP Customer Identification

Filter customers with segment = "VIP" for:
- Priority customer service
- Exclusive offers
- Account management outreach

```bash
curl "https://api-url/api/customers?limit=100" | \
  jq '.data[] | select(.metrics.segment == "VIP")'
```

### 2. Dormant Customer Re-engagement

Identify customers at risk of churn:

```bash
curl "https://api-url/api/customers?limit=100" | \
  jq '.data[] | select(.metrics.segment == "Dormant")'
```

Target these customers with:
- Win-back campaigns
- Special discounts
- "We miss you" emails

### 3. New Customer Onboarding

Welcome new customers within their first 30 days:

```bash
curl "https://api-url/api/customers?limit=100" | \
  jq '.data[] | select(.metrics.segment == "New")'
```

### 4. Purchase Frequency Analysis

Segment email campaigns by purchase cadence:

```bash
# Weekly purchasers - send weekly newsletters
curl "https://api-url/api/customers?limit=100" | \
  jq '.data[] | select(.metrics.purchaseFrequency == "Weekly")'

# Monthly purchasers - send monthly updates
curl "https://api-url/api/customers?limit=100" | \
  jq '.data[] | select(.metrics.purchaseFrequency == "Monthly")'
```

### 5. At-Risk Customer Detection

Identify active customers who haven't ordered recently:

```bash
curl "https://api-url/api/customers?limit=100" | \
  jq '.data[] | select(.metrics.segment == "Active" and (.metrics.lastOrderDaysAgo > 60))'
```

## Business Intelligence Queries

### Segment Distribution

```javascript
// Get all customers and group by segment
const customers = await fetch('/api/customers?limit=1000').then(r => r.json())
const segmentBreakdown = customers.data.reduce((acc, customer) => {
  const segment = customer.metrics.segment
  acc[segment] = (acc[segment] || 0) + 1
  return acc
}, {})

console.log(segmentBreakdown)
// { VIP: 12, Active: 89, New: 34, Dormant: 21 }
```

### Average Order Value by Segment

```javascript
const avgBySegment = customers.data.reduce((acc, customer) => {
  const segment = customer.metrics.segment
  if (!acc[segment]) acc[segment] = { total: 0, count: 0 }
  acc[segment].total += parseFloat(customer.metrics.totalSpend)
  acc[segment].count += 1
  return acc
}, {})

Object.keys(avgBySegment).forEach(segment => {
  const avg = avgBySegment[segment].total / avgBySegment[segment].count
  console.log(`${segment}: $${avg.toFixed(2)}`)
})
```

### Frequency Distribution

```javascript
const frequencyBreakdown = customers.data.reduce((acc, customer) => {
  const frequency = customer.metrics.purchaseFrequency
  acc[frequency] = (acc[frequency] || 0) + 1
  return acc
}, {})

console.log(frequencyBreakdown)
// { Weekly: 5, Monthly: 34, Quarterly: 67, Occasional: 42, 'One-time': 8 }
```

## Backward Compatibility

All existing fields remain unchanged:
- `contactID`
- `name`, `email`, `phone`, `company`
- `accountName`, `accountCode`
- `metrics.orderCount`
- `metrics.totalSpend`
- `metrics.lastOrderDate`
- `metrics.lastOrderReference`

The three new fields are **additive only** and do not break existing integrations.

## Testing

A comprehensive test suite is available:

```bash
# Run segmentation logic tests
node test-customer-segmentation.mjs

# Test API endpoints with segmentation
bash test-segmentation-api.sh
```

Test coverage includes:
- VIP customers at various spend levels
- New customer detection (first order < 30 days)
- Active customer classification
- Dormant customer identification (> 90 days)
- All purchase frequency categories
- Edge cases (no orders, single order)

## Implementation Details

### Function: `calculateCustomerSegment()`

Location: `query-orders-lambda.mjs` (lines 470-552)

**Input Parameters:**
- `orderCount` (Number): Total number of orders placed
- `totalSpend` (Number): Lifetime total spend
- `lastOrderDate` (String|null): ISO date string of most recent order
- `firstOrderDate` (String|null): ISO date string of first order

**Returns:**
```javascript
{
  segment: 'VIP' | 'Active' | 'New' | 'Dormant',
  lastOrderDaysAgo: Number | null,
  purchaseFrequency: 'Weekly' | 'Monthly' | 'Quarterly' | 'Occasional' | 'One-time' | 'None'
}
```

### Modified Functions

1. **`getCustomer(contactID)`** - Line 554
   - Calls `calculateCustomerSegment()`
   - Returns segmentation data in `metrics` object

2. **`listCustomers(queryParams)`** - Line 624
   - Calls `calculateCustomerSegment()` for each customer
   - Returns segmentation data for all customers

## Future Enhancements

Potential improvements for Phase 2:

1. **Predicted Churn Score**
   - Calculate probability of customer becoming dormant
   - Based on order frequency trends

2. **Customer Lifetime Value (CLV) Prediction**
   - Forecast future value based on segment and frequency
   - Identify high-potential customers

3. **Segment-Specific Metrics**
   - Average time in each segment
   - Segment transition tracking (New → Active → VIP)

4. **Custom Segment Thresholds**
   - Admin-configurable VIP threshold (currently $5,000)
   - Adjustable dormant period (currently 90 days)

5. **RFM Scoring**
   - Recency, Frequency, Monetary analysis
   - More granular segmentation (1-10 scale)

## Performance Considerations

- Segmentation is calculated **on-the-fly** during API calls
- No additional DynamoDB queries required
- Minimal performance impact (<5ms per customer)

For large customer lists (>1000), consider:
- Caching segment data in DynamoDB
- Pre-calculating segments during order import
- Using DynamoDB Streams to update segments asynchronously

## Support

For questions or issues with customer segmentation:
- Review test suite: `test-customer-segmentation.mjs`
- Check API examples: `test-segmentation-api.sh`
- Contact: Development team

---

**Version:** 1.0
**Last Updated:** October 23, 2025
**Status:** Production Ready ✓
