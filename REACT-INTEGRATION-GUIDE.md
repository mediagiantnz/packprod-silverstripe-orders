# React Dashboard Integration Guide

Quick reference for integrating the Packaging Products Order API into a React application.

## API Base URL

```javascript
const API_BASE_URL = 'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api';
```

---

## API Client Setup

### 1. Create API Client (`src/api/client.js`)

```javascript
const API_BASE_URL = process.env.REACT_APP_API_URL ||
  'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api';

class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.status = status;
    this.data = data;
    this.name = 'ApiError';
  }
}

export const apiClient = {
  async get(endpoint, params = {}) {
    const queryString = new URLSearchParams(
      Object.entries(params).filter(([_, v]) => v != null)
    ).toString();

    const url = `${API_BASE_URL}${endpoint}${queryString ? '?' + queryString : ''}`;

    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      const data = await response.json();

      if (!response.ok) {
        throw new ApiError(
          data.message || 'API request failed',
          response.status,
          data
        );
      }

      return data;
    } catch (error) {
      if (error instanceof ApiError) throw error;

      throw new ApiError(
        'Network error',
        0,
        { originalError: error.message }
      );
    }
  }
};

export { ApiError };
```

### 2. Environment Variables (`.env`)

```env
REACT_APP_API_URL=https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api
```

---

## API Modules

### Orders API (`src/api/orders.js`)

```javascript
import { apiClient } from './client';

export const ordersApi = {
  /**
   * List all orders with optional filtering
   * @param {Object} params
   * @param {number} params.limit - Max number of results (default: 50)
   * @param {string} params.startDate - ISO 8601 date string
   * @param {string} params.endDate - ISO 8601 date string
   * @param {number} params.minTotal - Minimum order value
   * @param {number} params.maxTotal - Maximum order value
   * @param {string} params.lastEvaluatedKey - Pagination token
   * @returns {Promise<{success: boolean, orders: Array, count: number, lastEvaluatedKey: string|null}>}
   */
  async listOrders({ startDate, endDate, limit = 50, minTotal, maxTotal, lastEvaluatedKey } = {}) {
    return apiClient.get('/orders', {
      limit,
      startDate,
      endDate,
      minTotal,
      maxTotal,
      lastEvaluatedKey
    });
  },

  /**
   * Get single order by ID
   * @param {string} orderID - Order ID (e.g., "ORD-442894-1761011792356")
   * @returns {Promise<{success: boolean, order: Object}>}
   */
  async getOrder(orderID) {
    return apiClient.get(`/orders/${orderID}`);
  }
};
```

### Customers API (`src/api/customers.js`)

```javascript
import { apiClient } from './client';

export const customersApi = {
  /**
   * List all customers
   * @param {Object} params
   * @param {number} params.limit - Max number of results
   * @param {string} params.lastEvaluatedKey - Pagination token
   * @returns {Promise<{success: boolean, customers: Array, count: number}>}
   */
  async listCustomers({ limit = 50, lastEvaluatedKey } = {}) {
    return apiClient.get('/customers', { limit, lastEvaluatedKey });
  },

  /**
   * Get customer details with metrics
   * @param {string} contactID - Contact/Customer ID
   * @returns {Promise<{success: boolean, customer: Object}>}
   */
  async getCustomer(contactID) {
    return apiClient.get(`/customers/${contactID}`);
  },

  /**
   * Get all orders for a specific customer
   * @param {string} contactID - Contact/Customer ID
   * @param {Object} params
   * @param {number} params.limit - Max number of results
   * @returns {Promise<{success: boolean, orders: Array, count: number}>}
   */
  async getCustomerOrders(contactID, { limit = 50 } = {}) {
    return apiClient.get(`/customers/${contactID}/orders`, { limit });
  }
};
```

### Reports API (`src/api/reports.js`)

```javascript
import { apiClient } from './client';

export const reportsApi = {
  /**
   * Get dashboard overview with today/week/month metrics
   * @returns {Promise<{success: boolean, overview: Object, recent_orders: Array}>}
   */
  async getOverview() {
    return apiClient.get('/reports/overview');
  },

  /**
   * Get product analytics report
   * @param {Object} params
   * @param {string} params.startDate - ISO 8601 date string
   * @param {string} params.endDate - ISO 8601 date string
   * @returns {Promise<{success: boolean, summary: Object, topByRevenue: Array, topByQuantity: Array}>}
   */
  async getProductReport({ startDate, endDate } = {}) {
    return apiClient.get('/reports/products', { startDate, endDate });
  },

  /**
   * Get sales report with timeline
   * @param {Object} params
   * @param {string} params.startDate - ISO 8601 date string
   * @param {string} params.endDate - ISO 8601 date string
   * @param {string} params.groupBy - 'day', 'week', or 'month' (default: 'day')
   * @returns {Promise<{success: boolean, summary: Object, timeline: Array}>}
   */
  async getSalesReport({ startDate, endDate, groupBy = 'day' } = {}) {
    return apiClient.get('/reports/sales', { startDate, endDate, groupBy });
  }
};
```

---

## React Hooks

### useOrders Hook

```javascript
// src/hooks/useOrders.js
import { useState, useEffect } from 'react';
import { ordersApi } from '../api/orders';

export function useOrders(filters = {}) {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchOrders() {
      try {
        setLoading(true);
        setError(null);

        const response = await ordersApi.listOrders(filters);

        if (!cancelled) {
          setOrders(response.orders);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchOrders();

    return () => {
      cancelled = true;
    };
  }, [JSON.stringify(filters)]);

  return { orders, loading, error };
}
```

### useCustomers Hook

```javascript
// src/hooks/useCustomers.js
import { useState, useEffect } from 'react';
import { customersApi } from '../api/customers';

export function useCustomers() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCustomers() {
      try {
        setLoading(true);
        setError(null);

        const response = await customersApi.listCustomers();

        if (!cancelled) {
          setCustomers(response.customers);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchCustomers();

    return () => {
      cancelled = true;
    };
  }, []);

  return { customers, loading, error };
}
```

### useOverview Hook

```javascript
// src/hooks/useOverview.js
import { useState, useEffect } from 'react';
import { reportsApi } from '../api/reports';

export function useOverview() {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchOverview() {
      try {
        setLoading(true);
        setError(null);

        const response = await reportsApi.getOverview();

        if (!cancelled) {
          setOverview(response.overview);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchOverview();

    return () => {
      cancelled = true;
    };
  }, []);

  return { overview, loading, error };
}
```

---

## Component Examples

### Dashboard Component

```javascript
// src/pages/Dashboard.jsx
import React from 'react';
import { useOverview } from '../hooks/useOverview';

export function Dashboard() {
  const { overview, loading, error } = useOverview();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="spinner">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
        Error loading dashboard: {error}
      </div>
    );
  }

  if (!overview) return null;

  return (
    <div className="dashboard">
      <h1 className="text-3xl font-bold mb-6">Dashboard Overview</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <MetricCard
          title="Today"
          revenue={overview.today.revenue}
          orders={overview.today.order_count}
          avgOrder={overview.today.avg_order_value}
        />

        <MetricCard
          title="This Week"
          revenue={overview.this_week.revenue}
          orders={overview.this_week.order_count}
          avgOrder={overview.this_week.avg_order_value}
        />

        <MetricCard
          title="This Month"
          revenue={overview.this_month.revenue}
          orders={overview.this_month.order_count}
          avgOrder={overview.this_month.avg_order_value}
        />

        <MetricCard
          title="Total Customers"
          value={overview.total_customers}
          icon="👥"
        />
      </div>
    </div>
  );
}

function MetricCard({ title, revenue, orders, avgOrder, value, icon }) {
  return (
    <div className="bg-white rounded-lg shadow p-6">
      <h3 className="text-gray-500 text-sm font-medium mb-2">{title}</h3>

      {value !== undefined ? (
        <div className="text-4xl font-bold text-gray-900">
          {icon} {value}
        </div>
      ) : (
        <>
          <div className="text-3xl font-bold text-gray-900 mb-2">
            ${revenue}
          </div>
          <div className="text-sm text-gray-600">
            {orders} orders • Avg ${avgOrder}
          </div>
        </>
      )}
    </div>
  );
}
```

### Orders List Component

```javascript
// src/pages/OrdersList.jsx
import React, { useState } from 'react';
import { useOrders } from '../hooks/useOrders';
import { Link } from 'react-router-dom';

export function OrdersList() {
  const [dateRange, setDateRange] = useState({
    startDate: null,
    endDate: null
  });

  const { orders, loading, error } = useOrders(dateRange);

  if (loading) return <div>Loading orders...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="orders-list">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Orders ({orders.length})</h1>

        <div className="flex gap-4">
          <input
            type="date"
            onChange={(e) => setDateRange(prev => ({ ...prev, startDate: e.target.value }))}
            className="border rounded px-3 py-2"
          />
          <input
            type="date"
            onChange={(e) => setDateRange(prev => ({ ...prev, endDate: e.target.value }))}
            className="border rounded px-3 py-2"
          />
        </div>
      </div>

      <table className="min-w-full bg-white shadow-md rounded">
        <thead className="bg-gray-100">
          <tr>
            <th className="px-4 py-3 text-left">Order #</th>
            <th className="px-4 py-3 text-left">Customer</th>
            <th className="px-4 py-3 text-left">Date</th>
            <th className="px-4 py-3 text-right">Items</th>
            <th className="px-4 py-3 text-right">Total</th>
            <th className="px-4 py-3 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.orderID} className="border-t hover:bg-gray-50">
              <td className="px-4 py-3">
                <Link to={`/orders/${order.orderID}`} className="text-blue-600 hover:underline">
                  {order.order_reference}
                </Link>
              </td>
              <td className="px-4 py-3">{order.customer.contact_name}</td>
              <td className="px-4 py-3">
                {new Date(order.createdAt).toLocaleDateString()}
              </td>
              <td className="px-4 py-3 text-right">
                {order.items?.length || 0}
              </td>
              <td className="px-4 py-3 text-right font-medium">
                ${order.totals.total}
              </td>
              <td className="px-4 py-3 text-center">
                <Link
                  to={`/orders/${order.orderID}`}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View
                </Link>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {orders.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No orders found for the selected date range.
        </div>
      )}
    </div>
  );
}
```

### Customers List Component

```javascript
// src/pages/CustomersList.jsx
import React from 'react';
import { useCustomers } from '../hooks/useCustomers';
import { Link } from 'react-router-dom';

export function CustomersList() {
  const { customers, loading, error } = useCustomers();

  if (loading) return <div>Loading customers...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div className="customers-list">
      <h1 className="text-3xl font-bold mb-6">
        Customers ({customers.length})
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {customers.map((customer) => (
          <div key={customer.contactID} className="bg-white rounded-lg shadow p-6">
            <h3 className="text-xl font-semibold mb-2">
              {customer.name || customer.email}
            </h3>

            {customer.company && (
              <p className="text-gray-600 mb-1">{customer.company}</p>
            )}

            <p className="text-sm text-gray-500 mb-4">{customer.email}</p>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Total Orders:</span>
                <span className="font-medium">{customer.metrics.orderCount}</span>
              </div>

              <div className="flex justify-between">
                <span className="text-gray-600">Total Spend:</span>
                <span className="font-medium">${customer.metrics.totalSpend}</span>
              </div>

              {customer.metrics.lastOrderDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Last Order:</span>
                  <span className="text-sm">
                    {new Date(customer.metrics.lastOrderDate).toLocaleDateString()}
                  </span>
                </div>
              )}
            </div>

            <Link
              to={`/customers/${customer.contactID}`}
              className="mt-4 block text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
            >
              View Details
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}
```

### Product Report Component

```javascript
// src/pages/ProductReport.jsx
import React, { useState, useEffect } from 'react';
import { reportsApi } from '../api/reports';

export function ProductReport() {
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      try {
        const data = await reportsApi.getProductReport();
        setReport(data);
      } catch (error) {
        console.error('Failed to load product report:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, []);

  if (loading) return <div>Loading product report...</div>;
  if (!report) return <div>No data available</div>;

  return (
    <div className="product-report">
      <h1 className="text-3xl font-bold mb-6">Product Analytics</h1>

      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <h2 className="text-xl font-semibold mb-4">Summary</h2>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <span className="text-gray-600">Total Products:</span>
            <span className="ml-2 font-medium">{report.summary.total_products}</span>
          </div>
          <div>
            <span className="text-gray-600">Orders Analyzed:</span>
            <span className="ml-2 font-medium">{report.summary.total_orders_analyzed}</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top Products by Revenue</h2>
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Revenue</th>
                <th className="text-right py-2">Qty</th>
              </tr>
            </thead>
            <tbody>
              {report.topByRevenue.map((product) => (
                <tr key={product.product_code} className="border-b">
                  <td className="py-2">
                    <div className="font-medium">{product.product_code}</div>
                    <div className="text-sm text-gray-600">{product.description}</div>
                  </td>
                  <td className="text-right py-2 font-medium">
                    ${product.total_revenue.toFixed(2)}
                  </td>
                  <td className="text-right py-2">
                    {product.total_quantity}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-semibold mb-4">Top Products by Quantity</h2>
          <table className="min-w-full">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2">Product</th>
                <th className="text-right py-2">Qty</th>
                <th className="text-right py-2">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {report.topByQuantity.map((product) => (
                <tr key={product.product_code} className="border-b">
                  <td className="py-2">
                    <div className="font-medium">{product.product_code}</div>
                    <div className="text-sm text-gray-600">{product.description}</div>
                  </td>
                  <td className="text-right py-2 font-medium">
                    {product.total_quantity}
                  </td>
                  <td className="text-right py-2">
                    ${product.total_revenue.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
```

---

## TypeScript Types (Optional)

```typescript
// src/types/api.ts

export interface Order {
  orderID: string;
  contactID: string;
  clientID: string;
  order_reference: string;
  order_date: string;
  greentree_id: string;
  customer: {
    contact_name: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    company: string;
    account_name: string;
    account_code: string;
  };
  delivery: {
    name: string;
    company: string;
    street: string;
    city: string;
    country: string;
    phone: string;
  };
  items: OrderItem[];
  totals: {
    subtotal: string;
    freight: string;
    gst: string;
    total: string;
  };
  payment: {
    payment_type: string;
    transaction_id: string;
    amount: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OrderItem {
  product_code: string;
  description: string;
  unit_price: number;
  quantity: number;
  total_price: number;
}

export interface Customer {
  contactID: string;
  clientID: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;
  phone: string;
  company: string;
  ppl_account: string;
  ppl_account_number: string;
  metrics: {
    orderCount: number;
    totalSpend: string;
    lastOrderDate: string | null;
    lastOrderReference: string | null;
  };
  createdAt: string;
  updatedAt: string;
}

export interface OverviewMetrics {
  order_count: number;
  revenue: string;
  avg_order_value: string;
}

export interface Overview {
  today: OverviewMetrics;
  this_week: OverviewMetrics;
  this_month: OverviewMetrics;
  total_customers: number;
}
```

---

## Testing Examples

```javascript
// src/api/__tests__/orders.test.js
import { ordersApi } from '../orders';

// Mock fetch
global.fetch = jest.fn();

describe('ordersApi', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should fetch orders list', async () => {
    const mockResponse = {
      success: true,
      orders: [
        { orderID: 'ORD-1', order_reference: '442894' }
      ],
      count: 1
    };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockResponse
    });

    const result = await ordersApi.listOrders({ limit: 50 });

    expect(result).toEqual(mockResponse);
    expect(fetch).toHaveBeenCalledWith(
      expect.stringContaining('/orders?limit=50'),
      expect.any(Object)
    );
  });

  it('should fetch single order', async () => {
    const orderID = 'ORD-442894-1761011792356';
    const mockOrder = { orderID, order_reference: '442894' };

    fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, order: mockOrder })
    });

    const result = await ordersApi.getOrder(orderID);

    expect(result.order).toEqual(mockOrder);
  });
});
```

---

## Quick Start Checklist

- [ ] Deploy `query-orders-lambda.mjs` to AWS Lambda
- [ ] Set up API Gateway endpoints (run `setup-api-endpoints.sh`)
- [ ] Test endpoints with curl
- [ ] Copy API client code to React project
- [ ] Create `.env` with API URL
- [ ] Install dependencies: `npm install`
- [ ] Build dashboard components using hooks
- [ ] Test in development
- [ ] Deploy React app to production

---

## Support

For issues or questions:
- Check [API-GATEWAY-SETUP.md](API-GATEWAY-SETUP.md) for detailed deployment instructions
- Review CloudWatch logs for Lambda errors
- Test endpoints with curl before integrating with React
- Verify CORS headers if seeing browser errors

**Related Documentation:**
- [API-GATEWAY-SETUP.md](API-GATEWAY-SETUP.md) - Full API setup guide
- [README.md](README.md) - System overview
