# Performance Optimization Architecture Diagram

## System Architecture (After Optimization)

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          n8n Email Workflow                              │
│                    (Order Email → Parse → POST)                         │
└─────────────────────────────────┬───────────────────────────────────────┘
                                  │
                                  │ POST /admin/contacts/import
                                  ▼
┌─────────────────────────────────────────────────────────────────────────┐
│                     importPackagingProductsContacts                      │
│                            (Import Lambda)                               │
│  - Validates order data                                                  │
│  - Checks for duplicate contacts                                         │
│  - Writes to TWO tables                                                  │
└─────┬───────────────────────────────────────────────────┬───────────────┘
      │                                                     │
      │ Write                                               │ Write
      ▼                                                     ▼
┌──────────────────────┐                         ┌──────────────────────┐
│  RocketReview_       │                         │  packprod-weborders  │
│  Contacts            │                         │                      │
│  (Legacy)            │                         │  PK: orderID         │
└──────────────────────┘                         │  GSI: clientID-      │
                                                 │       createdAt      │
                                                 │  GSI: contactID      │
                                                 │                      │
                                                 │  📊 STREAMS ENABLED  │
                                                 └──────────┬───────────┘
                                                            │
                                                            │ DynamoDB Stream
                                                            │ (NEW_AND_OLD_IMAGES)
                                                            ▼
                                            ┌───────────────────────────────┐
                                            │ updateCustomerMetricsCache    │
                                            │        (Stream Lambda)        │
                                            │  - Detects order changes      │
                                            │  - Extracts contactID         │
                                            │  - Queries all customer orders│
                                            │  - Recalculates metrics       │
                                            │  - Updates cache table        │
                                            └───────────┬───────────────────┘
                                                        │
                                                        │ Write (PutCommand)
                                                        ▼
                                            ┌───────────────────────────────┐
                                            │ packprod-customer-            │
                                            │ metrics-cache                 │
                                            │                               │
                                            │ PK: contactID                 │
                                            │                               │
                                            │ Cached Metrics:               │
                                            │  - orderCount                 │
                                            │  - totalSpend                 │
                                            │  - segment                    │
                                            │  - purchaseFrequency          │
                                            │  - lastOrderDate              │
                                            │                               │
                                            │ TTL: 90 days                  │
                                            └───────────────────────────────┘
                                                        ▲
                                                        │
                                                        │ Read (cache-first)
                                                        │
┌───────────────────────────────────────────────────────┴───────────────────┐
│                    queryPackagingProductsOrders                            │
│                         (Query Lambda v3)                                  │
│                                                                             │
│  Customer Endpoints (OPTIMIZED):                                           │
│   ✅ GET /api/customers        → Cache Scan (50-100ms)                    │
│   ✅ GET /api/customers/{id}   → Cache Get (20-50ms)                      │
│                                                                             │
│  Order Endpoints:                                                          │
│   📊 GET /api/orders           → Orders Query/Scan                        │
│   📊 GET /api/orders/{id}      → Orders Get                               │
│                                                                             │
│  Product Endpoints (NOT YET OPTIMIZED):                                   │
│   ⚠️  GET /api/products/{code}/orders → Orders Scan (1500-3000ms)        │
│                                                                             │
│  Report Endpoints:                                                         │
│   📊 GET /api/reports/overview    → Orders Query + Aggregation           │
│   📊 GET /api/reports/products    → Orders Query + Aggregation           │
│   📊 GET /api/reports/sales       → Orders Query + Aggregation           │
│   📊 GET /api/reports/statistics  → Orders Scan + Aggregation            │
│                                                                             │
│  Performance Features:                                                     │
│   ⏱️  Response time logging                                               │
│   🐌 Slow query detection (>1s)                                           │
│   📈 Performance metadata in responses                                    │
│   🔄 Graceful fallback if cache unavailable                              │
└─────────────────────────────────────┬───────────────────────────────────┘
                                      │
                                      │ API Gateway
                                      │
                                      ▼
                         ┌─────────────────────────┐
                         │   React Dashboard       │
                         │   (Frontend)            │
                         │                         │
                         │  Pages:                 │
                         │  - Orders               │
                         │  - Customers ✅ FAST    │
                         │  - Products             │
                         │  - Reports              │
                         └─────────────────────────┘
```

## Data Flow Diagrams

### 1. Order Import Flow
```
n8n Email Workflow
      │
      │ 1. POST order data
      ▼
Import Lambda
      │
      ├─ 2a. Write to RocketReview_Contacts
      │
      └─ 2b. Write to packprod-weborders
            │
            │ 3. DynamoDB Stream triggers
            ▼
Update Cache Lambda
      │
      │ 4. Query all orders for customer
      │ 5. Calculate metrics
      │ 6. Update cache table
      ▼
Customer Metrics Cache
```

### 2. Customer Query Flow (WITH CACHE)
```
Frontend Request: GET /api/customers
      │
      ▼
Query Lambda
      │
      ├─ 1. Try cache table first (Scan)
      ▼
Customer Metrics Cache
      │
      │ 2. Cache HIT ✅
      │    Return pre-calculated data
      │
      ▼
Response (50-100ms) 🚀
      │
      └─ meta: { "cacheHit": true, "responseTime": "78ms" }
```

### 3. Customer Query Flow (WITHOUT CACHE / FALLBACK)
```
Frontend Request: GET /api/customers?search=john
      │
      ▼
Query Lambda
      │
      ├─ 1. Search requires filtering, skip cache
      │ 2. Scan orders table
      ▼
packprod-weborders (FULL SCAN)
      │
      │ 3. Group orders by contactID
      │ 4. Calculate metrics for each
      │ 5. Filter by search term
      │
      ▼
Response (1500-3000ms) 🐌
      │
      └─ meta: { "cacheHit": false, "responseTime": "2134ms" }
```

### 4. Cache Update Flow (Real-time)
```
New Order Created
      │
      │ Write to packprod-weborders
      ▼
DynamoDB Stream
      │
      │ Stream Record: { eventName: "INSERT", contactID: "abc123" }
      ▼
Update Cache Lambda
      │
      ├─ 1. Extract contactID
      │ 2. Query all orders for customer (using contactID-index)
      ▼
packprod-weborders
      │
      │ 3. Get all orders for customer
      │ 4. Aggregate: count, totalSpend, dates
      │ 5. Calculate segment, frequency
      │
      ▼
      │ 6. PutItem to cache
      ▼
Customer Metrics Cache (UPDATED) ✅
      │
      │ Next query will see updated data
      ▼
Response with new metrics (<5 seconds lag)
```

## Query Performance Comparison

### Before Optimization

```
┌─────────────────────────────────────────────────────────┐
│ GET /api/customers                                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Scan packprod-weborders (ALL records)  ⏱️  ~1500ms │
│     └─ Read: 14 orders × 10KB = 140KB                  │
│                                                          │
│  2. Group by contactID in Lambda memory    ⏱️  ~200ms  │
│     └─ Build customerMap object                         │
│                                                          │
│  3. Calculate metrics for each customer    ⏱️  ~300ms  │
│     └─ Sort orders, calculate totals, segmentation      │
│                                                          │
│  4. Sort and filter results                ⏱️  ~50ms   │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ TOTAL: ~2050ms 🐌                                       │
└─────────────────────────────────────────────────────────┘
```

### After Optimization (Cache Hit)

```
┌─────────────────────────────────────────────────────────┐
│ GET /api/customers                                       │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  1. Scan cache table (50 customers)       ⏱️  ~60ms    │
│     └─ Read: 50 records × 1KB = 50KB                   │
│                                                          │
│  2. Sort by totalSpend                     ⏱️  ~10ms   │
│                                                          │
│  3. Format response                        ⏱️  ~8ms    │
│                                                          │
├─────────────────────────────────────────────────────────┤
│ TOTAL: ~78ms 🚀                                         │
│ IMPROVEMENT: 26x faster                                 │
└─────────────────────────────────────────────────────────┘
```

## Cache Architecture

```
┌───────────────────────────────────────────────────────────────┐
│             Customer Metrics Cache Table                       │
├───────────────────────────────────────────────────────────────┤
│                                                                │
│  Primary Key: contactID (UUID)                                │
│                                                                │
│  Attributes:                                                   │
│    contactID          : "abc-123-def"                         │
│    name               : "John Smith"                          │
│    email              : "john@example.com"                    │
│    company            : "Acme Corp"                           │
│    orderCount         : 5                                     │
│    totalSpend         : 1234.56                               │
│    lastOrderDate      : "2025-10-20T10:30:00Z"               │
│    lastOrderReference : "ORD-12345"                           │
│    firstOrderDate     : "2025-01-15T14:20:00Z"               │
│    segment            : "Active" | "VIP" | "New" | "Dormant" │
│    lastOrderDaysAgo   : 3                                     │
│    purchaseFrequency  : "Monthly"                             │
│    lastUpdated        : "2025-10-23T08:15:30Z"               │
│    ttl                : 1735905330 (90 days from lastUpdated) │
│                                                                │
│  GSI: lastUpdated-index (for maintenance queries)             │
│                                                                │
│  Size: ~1KB per customer                                      │
│  Total: ~50KB for 50 customers                                │
│                                                                │
└───────────────────────────────────────────────────────────────┘
```

## Deployment Architecture

```
                      ┌───────────────┐
                      │   Developer   │
                      │   Workstation │
                      └───────┬───────┘
                              │
                              │ Run deployment scripts
                              ▼
        ┌─────────────────────────────────────────────┐
        │                                             │
        ▼                                             ▼
┌───────────────────┐                    ┌───────────────────┐
│  AWS CLI          │                    │  PowerShell       │
│                   │                    │                   │
│  - Create tables  │                    │  - Compress .mjs  │
│  - Deploy Lambdas │                    │  - Create .zip    │
│  - Configure IAM  │                    │                   │
│  - Setup triggers │                    │                   │
└─────────┬─────────┘                    └─────────┬─────────┘
          │                                        │
          │                                        │
          └─────────────────┬──────────────────────┘
                            │
                            ▼
               ┌────────────────────────┐
               │   AWS ap-southeast-2   │
               │                        │
               │  Resources Created:    │
               │  ✅ Cache Table        │
               │  ✅ Stream Lambda      │
               │  ✅ Query Lambda (v3)  │
               │  ✅ IAM Roles          │
               │  ✅ Event Mappings     │
               │  ✅ Streams Enabled    │
               └────────────────────────┘
```

## Monitoring & Observability

```
┌────────────────────────────────────────────────────────────┐
│                    CloudWatch Logs                          │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  /aws/lambda/queryPackagingProductsOrders                  │
│    ├─ "Cache HIT for listCustomers - 45 items"            │
│    ├─ "listCustomers response time (from cache): 78ms"    │
│    └─ "SLOW QUERY: getProductOrders took 2341ms" ⚠️       │
│                                                             │
│  /aws/lambda/updateCustomerMetricsCache                    │
│    ├─ "Recalculating metrics for customer: abc-123"       │
│    ├─ "Cache updated for customer abc-123"                │
│    └─ "Processed metrics for 1 customers"                 │
│                                                             │
└────────────────────────────────────────────────────────────┘
                            │
                            │ CloudWatch Metrics
                            ▼
┌────────────────────────────────────────────────────────────┐
│                   Performance Dashboard                     │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  Query Lambda:                                             │
│    ├─ Invocations: 1,234 / hour                           │
│    ├─ Duration: P50=78ms, P90=120ms, P99=200ms           │
│    ├─ Errors: 0.1%                                        │
│    └─ Cache Hit Rate: 87%                                 │
│                                                             │
│  Stream Lambda:                                            │
│    ├─ Invocations: 14 / hour                              │
│    ├─ Duration: P50=450ms, P90=800ms                      │
│    ├─ Errors: 0%                                           │
│    └─ Stream Lag: <2 seconds                              │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Legend

```
✅ - Optimized / Fast
⚠️  - Needs optimization / Slow
📊 - Standard performance
🚀 - Significant improvement
🐌 - Slow performance
⏱️  - Timing measurement
```

---

**Note:** This diagram represents the system architecture AFTER the performance optimization deployment. The product query optimization (Phase 2) is not yet implemented and remains a future enhancement.
