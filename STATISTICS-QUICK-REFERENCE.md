# Order Statistics Endpoint - Quick Reference

## Endpoint
```
GET /api/reports/statistics
```

## Query Parameters
| Parameter | Type | Default | Example |
|-----------|------|---------|---------|
| startDate | ISO 8601 | null | 2025-01-01T00:00:00.000Z |
| endDate | ISO 8601 | null | 2025-12-31T23:59:59.999Z |
| includeCustomerStats | boolean | true | false |

## Quick Examples

### All-Time Stats
```bash
curl https://your-api/api/reports/statistics
```

### Year 2025
```bash
curl "https://your-api/api/reports/statistics?startDate=2025-01-01T00:00:00.000Z&endDate=2025-12-31T23:59:59.999Z"
```

### Last 30 Days
```javascript
const end = new Date().toISOString();
const start = new Date(Date.now() - 30*24*60*60*1000).toISOString();
const url = `/api/reports/statistics?startDate=${start}&endDate=${end}`;
```

### Without Customer Details
```bash
curl "https://your-api/api/reports/statistics?includeCustomerStats=false"
```

## Response Overview

```json
{
  "success": true,
  "data": {
    "overall": { /* revenue, orders, avg */ },
    "byPaymentType": { /* PxPay, Account */ },
    "byStatus": { /* pending, completed */ },
    "trends": { /* 7d, 30d, 90d */ },
    "topCustomers": { /* byRevenue, byOrderCount */ },
    "insights": { /* peak hour/day, cities, avg items */ }
  },
  "meta": { /* dateRange, count, generatedAt */ }
}
```

## Key Metrics

### Overall
- `totalRevenue` - Sum of all orders
- `totalOrders` - Count of orders
- `averageOrderValue` - Revenue / Orders

### By Payment Type
- Count per type (PxPay, Account, etc.)
- Revenue per type

### By Status
- Count per status (pending, completed, etc.)
- Revenue per status

### Trends
- `last7Days` - Orders & revenue
- `last30Days` - Orders & revenue
- `last90Days` - Orders & revenue

### Top Customers
- `byRevenue` - Top 5 by spending
- `byOrderCount` - Top 5 by frequency

### Insights
- `peakOrderHour` - Hour with most orders (0-23)
- `peakOrderDay` - Day with most orders
- `commonCities` - Top 10 delivery cities
- `avgItemsPerOrder` - Mean items per order

## JavaScript Client

```javascript
class StatsClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async getStats(options = {}) {
    const { startDate, endDate, includeCustomerStats = true } = options;
    const params = new URLSearchParams();

    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('includeCustomerStats', includeCustomerStats);

    const res = await fetch(`${this.baseUrl}/api/reports/statistics?${params}`);
    const data = await res.json();
    return data.data;
  }

  getAllTime() {
    return this.getStats();
  }

  getYear(year) {
    return this.getStats({
      startDate: `${year}-01-01T00:00:00.000Z`,
      endDate: `${year}-12-31T23:59:59.999Z`
    });
  }

  getLastNDays(days) {
    const end = new Date();
    const start = new Date(Date.now() - days*24*60*60*1000);
    return this.getStats({
      startDate: start.toISOString(),
      endDate: end.toISOString()
    });
  }

  getBasic() {
    return this.getStats({ includeCustomerStats: false });
  }
}

// Usage
const client = new StatsClient('https://your-api');
const stats = await client.getLastNDays(30);
console.log(stats.overall.totalRevenue);
```

## React Hook

```javascript
import { useState, useEffect } from 'react';

function useOrderStatistics(filters = {}) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const params = new URLSearchParams();

        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);
        if (filters.includeCustomerStats !== undefined) {
          params.append('includeCustomerStats', filters.includeCustomerStats);
        }

        const res = await fetch(`/api/reports/statistics?${params}`);
        const data = await res.json();

        if (data.success) {
          setStats(data.data);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [filters.startDate, filters.endDate, filters.includeCustomerStats]);

  return { stats, loading, error };
}

// Usage in component
function Dashboard() {
  const { stats, loading, error } = useOrderStatistics({
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-12-31T23:59:59.999Z'
  });

  if (loading) return <div>Loading...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h1>Revenue: ${stats.overall.totalRevenue}</h1>
      <h2>Orders: {stats.overall.totalOrders}</h2>
      <h3>Avg: ${stats.overall.averageOrderValue}</h3>
    </div>
  );
}
```

## Performance Tips

1. **Use Date Ranges** - Queries with dates are faster (use GSI)
2. **Disable Customer Stats** - Set `includeCustomerStats=false` if not needed
3. **Cache Results** - Cache for 5-15 minutes for common queries
4. **Limit Date Range** - Shorter ranges = faster responses

## Performance Expectations

| Orders | Response Time |
|--------|---------------|
| < 1K | 500-1000ms |
| 1K-10K | 1-3 seconds |
| > 10K | 3-10 seconds |

## Common Patterns

### Dashboard KPIs
```javascript
const stats = await client.getAllTime();
const kpis = {
  revenue: stats.overall.totalRevenue,
  orders: stats.overall.totalOrders,
  avgOrder: stats.overall.averageOrderValue,
  topCustomer: stats.topCustomers.byRevenue[0]?.name
};
```

### Monthly Comparison
```javascript
const thisMonth = await client.getStats({
  startDate: '2025-10-01T00:00:00.000Z',
  endDate: '2025-10-31T23:59:59.999Z'
});

const lastMonth = await client.getStats({
  startDate: '2025-09-01T00:00:00.000Z',
  endDate: '2025-09-30T23:59:59.999Z'
});

const growth = (
  (thisMonth.overall.totalRevenue - lastMonth.overall.totalRevenue) /
  lastMonth.overall.totalRevenue * 100
).toFixed(2);

console.log(`Revenue growth: ${growth}%`);
```

### Top Customers Widget
```javascript
const stats = await client.getLastNDays(90);
const topCustomers = stats.topCustomers.byRevenue.slice(0, 5);

topCustomers.forEach(customer => {
  console.log(`${customer.name}: $${customer.totalRevenue} (${customer.orderCount} orders)`);
});
```

### Peak Hours Analysis
```javascript
const stats = await client.getAllTime();
console.log(`Peak ordering hour: ${stats.insights.peakOrderHour}`);
console.log(`Peak ordering day: ${stats.insights.peakOrderDay}`);
console.log(`Avg items per order: ${stats.insights.avgItemsPerOrder}`);
```

## Deployment Checklist

- [ ] Update Lambda function code
- [ ] Create API Gateway resource `/api/reports/statistics`
- [ ] Add GET method
- [ ] Configure Lambda integration
- [ ] Deploy API stage
- [ ] Test endpoint with curl
- [ ] Update frontend API client
- [ ] Set up CloudWatch alarms
- [ ] Document for team

## Testing

```bash
# Basic test
curl https://your-api/api/reports/statistics | jq .

# Validate structure
curl https://your-api/api/reports/statistics | jq '.data | keys'
# Should return: ["byPaymentType", "byStatus", "insights", "overall", "topCustomers", "trends"]

# Check specific metric
curl https://your-api/api/reports/statistics | jq '.data.overall.totalRevenue'
```

## Troubleshooting

| Issue | Solution |
|-------|----------|
| Slow (> 10s) | Add date range filter |
| No customers | Set `includeCustomerStats=true` |
| Empty data | Check date range has orders |
| 500 error | Check CloudWatch logs |
| Timeout | Increase Lambda timeout or add date filter |

## Files Reference

- **Implementation**: `query-orders-lambda.mjs` (lines 674-950)
- **Full Documentation**: `ORDER-STATISTICS-ENDPOINT.md`
- **Test Suite**: `test-statistics-endpoint.mjs`
- **Summary**: `IMPLEMENTATION-SUMMARY.md`

## Support

Check logs:
```bash
aws logs tail /aws/lambda/packprod-query-orders-lambda --follow
```

Test locally:
```bash
node test-statistics-endpoint.mjs test
```

---

**Quick Start**: Copy JavaScript client code above and start using!
