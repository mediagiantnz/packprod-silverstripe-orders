# Lovable.dev Prompt: Web Order Reporting & Sales Dashboard (Updated)

## Project Overview

Build a comprehensive web order analytics platform for Packaging Products. The backend API is **partially deployed** with core analytics features working. You'll build the React frontend to consume the existing API, using mock data and placeholders for features not yet implemented.

---

## Tech Stack Requirements

- **Frontend Framework:** React 18+ with TypeScript
- **UI Library:** shadcn/ui (preferred) or Material-UI
- **State Management:** React Query (TanStack Query) for API calls, Zustand for client state
- **Charts/Visualization:** Recharts or Chart.js
- **Workflow Builder:** React Flow (for future marketing workflows - show placeholder)
- **Authentication:** Temporary mock auth (AWS Cognito to be added later)
- **Styling:** Tailwind CSS
- **Forms:** React Hook Form with Zod validation
- **API Communication:** Axios or fetch with proper error handling
- **Date Handling:** date-fns or day.js
- **Routing:** React Router v6

---

## API Integration

**Base API Gateway URL:** `https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api`

### ✅ Working Endpoints (Deploy Immediately)

#### Orders
- `GET /api/orders` - List all orders
  - Query params: `limit`, `startDate`, `endDate`, `minTotal`, `maxTotal`, `lastEvaluatedKey`
  - Returns: `{ success: true, orders: [...], count: 10, lastEvaluatedKey: "..." }`

- `GET /api/orders/{orderID}` - Get single order
  - Returns: `{ success: true, order: {...} }`

#### Customers
- `GET /api/customers` - List all customers with metrics
  - Query params: `limit`, `lastEvaluatedKey`
  - Returns: `{ success: true, customers: [...], count: 10 }`
  - Each customer includes: `metrics: { orderCount, totalSpend, lastOrderDate }`

- `GET /api/customers/{contactID}` - Get customer details
  - Returns: `{ success: true, customer: {...} }`
  - Includes order metrics

- `GET /api/customers/{contactID}/orders` - Customer order history
  - Query params: `limit`, `lastEvaluatedKey`
  - Returns: `{ success: true, orders: [...], count: 10 }`

#### Reports
- `GET /api/reports/overview` - Dashboard overview
  - Returns:
    ```json
    {
      "success": true,
      "overview": {
        "today": { "order_count": 8, "revenue": "686.44", "avg_order_value": "85.80" },
        "this_week": { "order_count": 8, "revenue": "686.44", "avg_order_value": "85.80" },
        "this_month": { "order_count": 8, "revenue": "686.44", "avg_order_value": "85.80" },
        "total_customers": 1843
      },
      "recent_orders": [...]
    }
    ```

- `GET /api/reports/products` - Product analytics
  - Query params: `startDate`, `endDate`
  - Returns:
    ```json
    {
      "success": true,
      "summary": { "total_products": 87, "total_orders_analyzed": 234 },
      "topByRevenue": [...],
      "topByQuantity": [...]
    }
    ```

- `GET /api/reports/sales` - Sales timeline
  - Query params: `startDate`, `endDate`, `groupBy` (day|week|month)
  - Returns:
    ```json
    {
      "success": true,
      "summary": { "total_revenue": "45678.90", "total_orders": 234, "average_order_value": "195.16" },
      "timeline": [{ "date": "2025-10-01", "revenue": 1234.56, "order_count": 8 }, ...]
    }
    ```

---

### ❌ Not Implemented - Use Mocks/Placeholders

#### Authentication (Coming Soon - Phase 2)
- `POST /auth/login` - **MOCK THIS**
- `POST /auth/logout` - **MOCK THIS**
- `GET /auth/me` - **MOCK THIS**

**Implementation:**
```typescript
// src/services/auth.ts
export const authApi = {
  async login(email: string, password: string) {
    // TODO: Replace with real Cognito integration
    await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call
    return {
      success: true,
      data: {
        token: 'mock-token-12345',
        user: { id: '1', email, name: 'Admin User', role: 'admin' }
      }
    };
  },

  async logout() {
    return { success: true };
  },

  async getCurrentUser() {
    return {
      success: true,
      data: { id: '1', email: 'admin@packagingproducts.co.nz', name: 'Admin User', role: 'admin' }
    };
  }
};
```

#### Marketing Campaigns (Coming Phase 5 - Show "Feature in Development")
- `GET /campaigns` - **RETURN EMPTY ARRAY**
- `POST /campaigns` - **MOCK SUCCESS**
- `PUT /campaigns/{id}` - **MOCK SUCCESS**
- `DELETE /campaigns/{id}` - **MOCK SUCCESS**
- `POST /campaigns/{id}/activate` - **MOCK SUCCESS**
- `GET /campaigns/{id}/analytics` - **RETURN EMPTY DATA**

**Implementation:**
```typescript
// src/services/campaigns.ts
export const campaignsApi = {
  async listCampaigns() {
    return { success: true, data: [], meta: { total: 0 } };
  },

  // ... other campaign methods return success but don't do anything
};

// In the UI, show:
// "🚧 Marketing Campaigns - Feature in Development (Phase 5)"
```

#### Email Alerts (Coming Phase 4 - Show "Coming Soon")
- `GET /alerts/config` - **RETURN EMPTY CONFIG**
- `PUT /alerts/config` - **MOCK SUCCESS**
- `GET /alerts/history` - **RETURN EMPTY ARRAY**

**Implementation:**
```typescript
// src/services/alerts.ts
export const alertsApi = {
  async getConfig() {
    return {
      success: true,
      data: { newCustomer: false, highValue: false, largeQuantity: false }
    };
  },

  async updateConfig(config: any) {
    return { success: true, data: config };
  },

  async getHistory() {
    return { success: true, data: [], meta: { total: 0 } };
  }
};

// In the UI, show:
// "🚧 Email Alerts - Coming in Phase 4"
```

#### Admin Features (Coming Phase 2 - Show "Coming Soon")
- `GET /admin/users` - **RETURN EMPTY ARRAY**
- `POST /admin/users` - **MOCK SUCCESS**
- `PUT /admin/users/{id}` - **MOCK SUCCESS**
- `DELETE /admin/users/{id}` - **MOCK SUCCESS**
- `GET /admin/settings` - **RETURN DEFAULT SETTINGS**
- `PUT /admin/settings` - **MOCK SUCCESS**
- `GET /admin/audit-logs` - **RETURN EMPTY ARRAY**

---

## CRITICAL: Response Format Adapter

**The backend returns a different format than you might expect.** Create an adapter to normalize responses.

### Backend Returns:
```json
{
  "success": true,
  "orders": [...],      // or "customers", "overview", etc.
  "count": 10,
  "lastEvaluatedKey": "token"
}
```

### Your App Should Use:
```typescript
// src/services/api-adapter.ts
interface StandardResponse<T> {
  success: boolean;
  data: T;
  error: string | null;
  meta?: {
    count?: number;
    lastEvaluatedKey?: string;
    limit?: number;
    total?: number;
  };
}

export function adaptResponse<T>(backendResponse: any): StandardResponse<T> {
  // Handle different response shapes
  const data =
    backendResponse.orders ||
    backendResponse.customers ||
    backendResponse.overview ||
    backendResponse.order ||
    backendResponse.customer ||
    backendResponse;

  return {
    success: backendResponse.success ?? true,
    data: data,
    error: null,
    meta: {
      count: backendResponse.count,
      lastEvaluatedKey: backendResponse.lastEvaluatedKey,
      total: backendResponse.count // Backend doesn't return total count yet
    }
  };
}

// Usage in API client:
export const ordersApi = {
  async listOrders(params: OrdersParams) {
    const response = await fetch(`${API_BASE_URL}/orders?${queryString}`);
    const json = await response.json();
    return adaptResponse<Order[]>(json);
  }
};
```

---

## Data Models (TypeScript Types)

### Order
```typescript
interface Order {
  orderID: string;              // e.g., "ORD-442894-1761011792356"
  order_reference: string;      // e.g., "442894"
  order_date: string;           // e.g., "21/10/2025 14:53 pm"
  greentree_id: string;
  clientID: string;
  contactID: string;

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

  items: Array<{
    product_code: string;       // e.g., "CCPP2"
    description: string;        // e.g., "PP2 Cardboard Box"
    unit_price: number;
    quantity: number;
    total_price: number;
  }>;

  totals: {
    subtotal: string;
    freight: string;
    freight_description: string;
    gst: string;
    total: string;
  };

  payment: {
    payment_type: string;       // e.g., "PxPay", "Account"
    transaction_id: string;
    amount: string;
  };

  status: string;               // "pending", "completed", etc.
  createdAt: string;            // ISO 8601 timestamp
  updatedAt: string;
}
```

### Customer
```typescript
interface Customer {
  contactID: string;
  clientID: string;
  email: string;
  firstName: string;
  lastName: string;
  name: string;                 // Full name
  phone: string;
  company: string;
  ppl_account: string;
  ppl_account_number: string;

  // Calculated metrics (included automatically)
  metrics: {
    orderCount: number;
    totalSpend: string;         // Formatted as "1234.56"
    lastOrderDate: string | null;
    lastOrderReference: string | null;
  };

  status: string;               // You may need to calculate: "New", "Active", "Dormant"
  createdAt: string;
  updatedAt: string;
}
```

### Product (from reports)
```typescript
interface ProductAnalytics {
  product_code: string;
  description: string;
  total_quantity: number;
  total_revenue: number;
  order_count: number;
}
```

---

## Feature Flags Configuration

Create a feature flags system to show/hide incomplete features:

```typescript
// src/config/features.ts
export const FEATURES = {
  // Working features (Phase 1)
  DASHBOARD: true,
  ORDERS: true,
  CUSTOMERS: true,
  REPORTS: true,

  // Coming soon features (show placeholders)
  CAMPAIGNS: false,        // Phase 5 (Months 9-11)
  ALERTS: false,           // Phase 4 (Months 7-8)
  USER_MANAGEMENT: false,  // Phase 2 (Months 3-4)
  SETTINGS: false,         // Phase 2
  AUDIT_LOGS: false        // Phase 2
};

// Usage in navigation:
{FEATURES.CAMPAIGNS && (
  <NavLink to="/campaigns">Campaigns</NavLink>
)}

// Or show placeholder:
{!FEATURES.CAMPAIGNS && (
  <div className="text-gray-500">
    🚧 Campaigns - Coming in Phase 5
  </div>
)}
```

---

## Pagination Handling

**Important:** The backend uses **cursor-based pagination**, not page numbers.

```typescript
interface PaginationState {
  limit: number;
  lastEvaluatedKey: string | null;
}

// In your component:
const [pagination, setPagination] = useState<PaginationState>({
  limit: 50,
  lastEvaluatedKey: null
});

// Fetch next page:
const { data } = useQuery({
  queryKey: ['orders', pagination],
  queryFn: () => ordersApi.listOrders(pagination)
});

// Load more button:
<button
  onClick={() => setPagination(prev => ({
    ...prev,
    lastEvaluatedKey: data?.meta?.lastEvaluatedKey || null
  }))}
  disabled={!data?.meta?.lastEvaluatedKey}
>
  Load More
</button>
```

---

## Missing Features - Implementation Strategy

### 1. Customer Segmentation (Calculate Client-Side)

The backend doesn't return customer segment status yet. Calculate it:

```typescript
function getCustomerSegment(customer: Customer): 'New' | 'Active' | 'Dormant' | 'VIP' {
  const daysSinceLastOrder = customer.metrics.lastOrderDate
    ? differenceInDays(new Date(), new Date(customer.metrics.lastOrderDate))
    : Infinity;

  const totalSpend = parseFloat(customer.metrics.totalSpend || '0');

  // VIP: Top 10% by spend (you'll need to calculate threshold)
  if (totalSpend > VIP_THRESHOLD) return 'VIP';

  // New: First order within 30 days
  if (customer.metrics.orderCount === 1 && daysSinceLastOrder <= 30) return 'New';

  // Dormant: No order in 90+ days
  if (daysSinceLastOrder > 90) return 'Dormant';

  // Active: Default
  return 'Active';
}
```

### 2. Search & Filtering (Client-Side for Now)

Backend doesn't support search yet. Do it client-side:

```typescript
const [searchTerm, setSearchTerm] = useState('');

const filteredCustomers = customers.filter(c =>
  c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
  c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
  c.company.toLowerCase().includes(searchTerm.toLowerCase())
);
```

**Note:** This only searches the current page. For production, request backend search support.

### 3. Authentication (Mock for Now)

```typescript
// src/contexts/AuthContext.tsx
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = async (email: string, password: string) => {
    // Mock login - always succeeds
    const mockUser = {
      id: '1',
      email,
      name: 'Admin User',
      role: 'admin' // Hard-code admin for now
    };
    setUser(mockUser);
    localStorage.setItem('auth-token', 'mock-token-12345');
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('auth-token');
  };

  // Auto-login on mount (skip login page during development)
  useEffect(() => {
    const token = localStorage.getItem('auth-token');
    if (token) {
      setUser({
        id: '1',
        email: 'admin@packagingproducts.co.nz',
        name: 'Admin User',
        role: 'admin'
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
```

---

## Core Features & Pages (Build These)

### 1. Main Dashboard (`/dashboard`) ✅

**Fully Functional with Real API**

```typescript
import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/services/reports';

export function Dashboard() {
  const { data, isLoading } = useQuery({
    queryKey: ['overview'],
    queryFn: () => reportsApi.getOverview()
  });

  if (isLoading) return <LoadingSpinner />;

  const { overview, recent_orders } = data.data;

  return (
    <div className="dashboard">
      <h1>Dashboard Overview</h1>

      <div className="grid grid-cols-4 gap-6">
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
        />
      </div>

      <RecentOrdersTable orders={recent_orders} />
    </div>
  );
}
```

---

### 2. Customer List (`/customers`) ✅

**Fully Functional with Real API**

```typescript
export function CustomersList() {
  const { data, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => customersApi.listCustomers({ limit: 50 })
  });

  const customers = data?.data || [];

  return (
    <div>
      <h1>Customers ({customers.length})</h1>

      {/* Search input (client-side for now) */}
      <input
        type="search"
        placeholder="Search customers..."
        onChange={(e) => setSearchTerm(e.target.value)}
      />

      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Company</th>
            <th>Total Orders</th>
            <th>Total Spend</th>
            <th>Last Order</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {customers.map(customer => (
            <tr key={customer.contactID}>
              <td>{customer.name}</td>
              <td>{customer.email}</td>
              <td>{customer.company}</td>
              <td>{customer.metrics.orderCount}</td>
              <td>${customer.metrics.totalSpend}</td>
              <td>{formatDate(customer.metrics.lastOrderDate)}</td>
              <td>
                <Badge variant={getSegmentColor(getCustomerSegment(customer))}>
                  {getCustomerSegment(customer)}
                </Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
```

---

### 3. Order List (`/orders`) ✅

**Fully Functional with Real API**

```typescript
export function OrdersList() {
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    minTotal: '',
    maxTotal: ''
  });

  const { data, isLoading } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => ordersApi.listOrders(filters)
  });

  return (
    <div>
      <h1>Orders</h1>

      {/* Date range filters */}
      <div className="filters">
        <input type="date" value={filters.startDate}
          onChange={(e) => setFilters(f => ({ ...f, startDate: e.target.value }))}
        />
        <input type="date" value={filters.endDate}
          onChange={(e) => setFilters(f => ({ ...f, endDate: e.target.value }))}
        />
      </div>

      <table>
        {/* Order table implementation */}
      </table>
    </div>
  );
}
```

---

### 4. Product Reports (`/reports/products`) ✅

**Fully Functional with Real API**

```typescript
export function ProductReport() {
  const { data } = useQuery({
    queryKey: ['products-report'],
    queryFn: () => reportsApi.getProductReport()
  });

  const { topByRevenue, topByQuantity } = data?.data || {};

  return (
    <div className="grid grid-cols-2 gap-6">
      <Card>
        <h2>Top Products by Revenue</h2>
        <table>
          {topByRevenue?.map(product => (
            <tr key={product.product_code}>
              <td>{product.product_code}</td>
              <td>{product.description}</td>
              <td>${product.total_revenue.toFixed(2)}</td>
            </tr>
          ))}
        </table>
      </Card>

      <Card>
        <h2>Top Products by Quantity</h2>
        <table>
          {topByQuantity?.map(product => (
            <tr key={product.product_code}>
              <td>{product.product_code}</td>
              <td>{product.description}</td>
              <td>{product.total_quantity}</td>
            </tr>
          ))}
        </table>
      </Card>
    </div>
  );
}
```

---

### 5. Sales Reports (`/reports/sales`) ✅

**Fully Functional with Real API**

```typescript
export function SalesReport() {
  const [groupBy, setGroupBy] = useState<'day' | 'week' | 'month'>('day');

  const { data } = useQuery({
    queryKey: ['sales-report', groupBy],
    queryFn: () => reportsApi.getSalesReport({ groupBy })
  });

  const { summary, timeline } = data?.data || {};

  return (
    <div>
      <h1>Sales Report</h1>

      <div className="metrics">
        <MetricCard label="Total Revenue" value={`$${summary?.total_revenue}`} />
        <MetricCard label="Total Orders" value={summary?.total_orders} />
        <MetricCard label="Average Order Value" value={`$${summary?.average_order_value}`} />
      </div>

      <LineChart
        data={timeline}
        xKey="date"
        yKey="revenue"
        label="Revenue Over Time"
      />

      <LineChart
        data={timeline}
        xKey="date"
        yKey="order_count"
        label="Orders Over Time"
      />
    </div>
  );
}
```

---

### 6. Marketing Campaigns (`/campaigns`) ⏸️

**Show Placeholder - Not Implemented**

```typescript
export function CampaignsList() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold mb-4">Marketing Campaigns</h1>
      <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-8 max-w-md mx-auto">
        <div className="text-6xl mb-4">🚧</div>
        <h2 className="text-xl font-semibold mb-2">Feature in Development</h2>
        <p className="text-gray-600 mb-4">
          Marketing automation and campaign builder will be available in Phase 5 (Months 9-11).
        </p>
        <p className="text-sm text-gray-500">
          Features include:
        </p>
        <ul className="text-sm text-gray-500 mt-2 space-y-1">
          <li>✓ Visual workflow builder</li>
          <li>✓ Email template editor</li>
          <li>✓ Campaign analytics</li>
          <li>✓ A/B testing</li>
        </ul>
      </div>
    </div>
  );
}
```

---

### 7. Email Alerts (`/alerts`) ⏸️

**Show Placeholder - Not Implemented**

```typescript
export function AlertsConfig() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold mb-4">Email Alerts</h1>
      <div className="bg-blue-50 border-2 border-blue-200 rounded-lg p-8 max-w-md mx-auto">
        <div className="text-6xl mb-4">🔔</div>
        <h2 className="text-xl font-semibold mb-2">Coming in Phase 4</h2>
        <p className="text-gray-600">
          Email alerts and notifications will be available in Phase 4 (Months 7-8).
        </p>
      </div>
    </div>
  );
}
```

---

### 8. User Management (`/admin/users`) ⏸️

**Show Placeholder - Not Implemented**

```typescript
export function UserManagement() {
  return (
    <div className="text-center py-12">
      <h1 className="text-2xl font-bold mb-4">User Management</h1>
      <div className="bg-purple-50 border-2 border-purple-200 rounded-lg p-8 max-w-md mx-auto">
        <div className="text-6xl mb-4">👥</div>
        <h2 className="text-xl font-semibold mb-2">Coming in Phase 2</h2>
        <p className="text-gray-600">
          User management will be available in Phase 2 (Months 3-4).
        </p>
      </div>
    </div>
  );
}
```

---

## Environment Variables

```env
# .env
VITE_API_BASE_URL=https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api
VITE_APP_NAME=Packaging Products Dashboard
VITE_MOCK_AUTH=true
```

---

## Error Handling

```typescript
// src/services/api-client.ts
export async function apiRequest<T>(
  endpoint: string,
  options?: RequestInit
): Promise<StandardResponse<T>> {
  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options?.headers
      },
      ...options
    });

    if (!response.ok) {
      throw new Error(`API Error: ${response.statusText}`);
    }

    const json = await response.json();
    return adaptResponse<T>(json);

  } catch (error) {
    console.error('API Request failed:', error);
    return {
      success: false,
      data: null as any,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}
```

---

## Navigation Structure

```typescript
// src/components/Sidebar.tsx
const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    icon: HomeIcon,
    enabled: FEATURES.DASHBOARD
  },
  {
    name: 'Orders',
    href: '/orders',
    icon: ShoppingCartIcon,
    enabled: FEATURES.ORDERS
  },
  {
    name: 'Customers',
    href: '/customers',
    icon: UsersIcon,
    enabled: FEATURES.CUSTOMERS
  },
  {
    name: 'Reports',
    icon: ChartBarIcon,
    enabled: FEATURES.REPORTS,
    children: [
      { name: 'Products', href: '/reports/products' },
      { name: 'Sales', href: '/reports/sales' }
    ]
  },
  {
    name: 'Campaigns',
    href: '/campaigns',
    icon: MegaphoneIcon,
    enabled: FEATURES.CAMPAIGNS,
    badge: '🚧 Phase 5'
  },
  {
    name: 'Alerts',
    href: '/alerts',
    icon: BellIcon,
    enabled: FEATURES.ALERTS,
    badge: '🚧 Phase 4'
  },
  {
    name: 'Admin',
    icon: CogIcon,
    enabled: FEATURES.USER_MANAGEMENT,
    badge: '🚧 Phase 2',
    children: [
      { name: 'Users', href: '/admin/users' },
      { name: 'Settings', href: '/admin/settings' }
    ]
  }
];
```

---

## Testing the API

Before building components, test the API endpoints:

```bash
# Dashboard overview
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview"

# Orders list
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders?limit=5"

# Customers
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers?limit=5"

# Single order
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders/ORD-442894-1761011792356"

# Products report
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products"

# Sales report
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/sales?groupBy=month"
```

---

## Build Priorities

### Week 1 - Core UI & Real Data
1. ✅ Set up project with TypeScript, Tailwind, shadcn/ui
2. ✅ Create API client with response adapter
3. ✅ Build Dashboard page (real API)
4. ✅ Build Orders list (real API)
5. ✅ Build Order detail page (real API)

### Week 2 - Customers & Reports
6. ✅ Build Customers list (real API)
7. ✅ Build Customer detail page (real API)
8. ✅ Build Product reports (real API)
9. ✅ Build Sales reports (real API)

### Week 3 - Polish & Placeholders
10. ✅ Add charts to reports
11. ✅ Add search/filter UI (client-side)
12. ⏸️ Create Campaign placeholder page
13. ⏸️ Create Alerts placeholder page
14. ⏸️ Create User Management placeholder page

### Week 4 - Authentication & Final Touches
15. ✅ Mock authentication flow
16. ✅ Route protection
17. ✅ Loading states
18. ✅ Error boundaries
19. ✅ Responsive design
20. ✅ Deploy to production

---

## Summary

### ✅ What Works (Build Against Real API)
- Dashboard with real metrics
- Orders CRUD (read-only)
- Customers with order history
- Product analytics
- Sales reports

### ⏸️ What to Mock/Placeholder
- Authentication (mock for now)
- Campaigns (show "Phase 5" message)
- Alerts (show "Phase 4" message)
- User Management (show "Phase 2" message)

### 🔧 Required Workarounds
- Response adapter for API format differences
- Client-side search/filtering
- Client-side customer segmentation
- Cursor-based pagination instead of page numbers

The goal is to build a **functional MVP** with real data where available, and clear placeholders for features coming in later phases. This allows stakeholders to see progress and provide feedback while backend development continues.

---

**Start with the working features. Make them beautiful, fast, and user-friendly. Add placeholders for future features with clear "Coming in Phase X" messaging.**
