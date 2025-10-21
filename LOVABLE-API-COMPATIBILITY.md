# Lovable.dev Frontend API Compatibility Analysis

## Overview

This document analyzes the compatibility between the deployed API and the Lovable.dev frontend requirements, identifying gaps and providing implementation recommendations.

---

## Current API Status

**Base URL:** `https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api`

### ✅ Implemented Endpoints

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/orders` | GET | ✓ Deployed | List orders with filtering |
| `/orders/{orderID}` | GET | ✓ Deployed | Get single order |
| `/customers` | GET | ✓ Deployed | List customers with metrics |
| `/customers/{contactID}` | GET | ✓ Deployed | Get customer details |
| `/customers/{contactID}/orders` | GET | ✓ Deployed | Customer order history |
| `/reports/overview` | GET | ✓ Deployed | Dashboard overview metrics |
| `/reports/products` | GET | ✓ Deployed | Product analytics |
| `/reports/sales` | GET | ✓ Deployed | Sales timeline |

---

## Response Format Compatibility

### ❌ Format Mismatch - Action Required

**Lovable Expects:**
```json
{
  "success": true,
  "data": { ... },
  "error": null,
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 250
  }
}
```

**Current API Returns:**
```json
{
  "success": true,
  "orders": [...],
  "count": 10,
  "lastEvaluatedKey": "..."
}
```

### 🔧 Recommended Solution

**Option 1: Update Lambda (Recommended)**
Create a wrapper layer in the Lambda function to transform responses to the expected format.

**Option 2: Frontend Adapter**
Create an API adapter layer in the React app to transform responses.

**Recommendation:** Option 1 ensures consistency and prevents every frontend dev from writing adapters.

---

## Endpoint Gap Analysis

### ❌ Missing - Phase 1 (Critical for MVP)

**Authentication Endpoints:**
- `POST /auth/login` - Not implemented (requires AWS Cognito setup)
- `POST /auth/logout` - Not implemented
- `GET /auth/me` - Not implemented

**Status:** Authentication/authorization is mentioned in the SOW but not implemented in backend yet.

**Recommendation:**
- Use AWS Cognito with API Gateway authorizer
- Frontend can use Amplify Auth library
- Estimate: 4-6 hours implementation

---

### ❌ Missing - Phase 2 (Marketing Automation)

**Campaign Endpoints:**
- `GET /campaigns` - Not implemented
- `POST /campaigns` - Not implemented
- `PUT /campaigns/{id}` - Not implemented
- `DELETE /campaigns/{id}` - Not implemented
- `POST /campaigns/{id}/activate` - Not implemented
- `POST /campaigns/{id}/pause` - Not implemented
- `GET /campaigns/{id}/analytics` - Not implemented

**Status:** Marketing automation is Phase 5 of the SOW (months 9-11).

**Recommendation:**
- Create placeholder endpoints that return empty arrays
- Frontend can build UI against mock data
- Backend implements when ready in Phase 5

---

### ❌ Missing - Phase 2 (Email Alerts)

**Alert Endpoints:**
- `GET /alerts/config` - Not implemented
- `PUT /alerts/config` - Not implemented
- `GET /alerts/history` - Not implemented

**Status:** Email alerts are Phase 4 of the SOW (months 7-8).

**Recommendation:**
- Implement basic config storage in DynamoDB
- Store per-user alert preferences
- Estimate: 8-12 hours

---

### ❌ Missing - Phase 1 (Admin Features)

**Admin Endpoints:**
- `GET /admin/users` - Not implemented
- `POST /admin/users` - Not implemented
- `PUT /admin/users/{id}` - Not implemented
- `DELETE /admin/users/{id}` - Not implemented
- `GET /admin/settings` - Not implemented
- `PUT /admin/settings` - Not implemented
- `GET /admin/audit-logs` - Not implemented

**Status:** User management requires Cognito setup.

**Recommendation:**
- Use AWS Cognito Admin APIs
- Create Lambda layer for user CRUD
- Estimate: 6-8 hours

---

## Data Model Compatibility

### ✅ Compatible Data Structures

**Orders:** Current structure includes all fields Lovable expects
- Order ID, customer info, items, totals, payment
- Delivery address, timestamps

**Customers:** Current structure includes:
- Contact info, metrics (order count, lifetime value)
- Missing: Segmentation tags (New/Active/Dormant)

**Products:** Extracted from order items
- Product code, description, quantity, revenue
- Missing: Category grouping

### 🔧 Recommended Enhancements

1. **Customer Segmentation**
   ```javascript
   // Add to customer object:
   {
     segment: "Active" | "New" | "Dormant" | "VIP",
     lastOrderDaysAgo: 15,
     purchaseFrequency: "Monthly"
   }
   ```

2. **Product Categories**
   ```javascript
   // Add product category mapping:
   {
     product_code: "CCPP2",
     category: "Cardboard Boxes",
     subcategory: "PP Series"
   }
   ```

---

## Pagination Compatibility

### ❌ Format Mismatch

**Lovable Expects:**
```json
{
  "meta": {
    "page": 1,
    "limit": 50,
    "total": 250
  }
}
```

**Current API Uses:**
```json
{
  "count": 50,
  "lastEvaluatedKey": "encodedToken"
}
```

**Issue:** DynamoDB uses cursor-based pagination, not page numbers.

**Solution:**
- Keep cursor-based pagination in backend (it's more efficient)
- Frontend uses `lastEvaluatedKey` for "Load More" or "Next Page"
- Add `total` count where possible (requires separate COUNT query)

---

## Search & Filtering Compatibility

### ✅ Current Support

**Orders:**
- Date range: `startDate`, `endDate`
- Value range: `minTotal`, `maxTotal`
- Limit: `limit`
- Pagination: `lastEvaluatedKey`

**Customers:**
- Limit and pagination supported
- **Missing:** Search by name, email, company

**Products:**
- Date range for reports
- **Missing:** Category filtering, SKU search

### 🔧 Recommendations

Add query parameters to existing endpoints:

```javascript
// Orders
GET /api/orders?search=ash&status=completed&customer=contactID

// Customers
GET /api/customers?search=mediterranean&minSpend=500&segment=VIP

// Products
GET /api/reports/products?category=boxes&search=cardboard
```

**Estimate:** 4-6 hours to add search/filter support

---

## Phase-Based Implementation Plan

### Phase 1 (Weeks 1-4) - Core Analytics

**Implemented:**
- ✅ Orders CRUD (read-only)
- ✅ Customers CRUD (read-only)
- ✅ Dashboard overview
- ✅ Product reports
- ✅ Sales reports

**To Implement:**
- ⏳ Response format wrapper
- ⏳ Customer segmentation logic
- ⏳ Enhanced search/filtering
- ⏳ AWS Cognito authentication

**Effort:** 16-20 hours

---

### Phase 2 (Weeks 5-8) - Admin Features

**To Implement:**
- ⏳ User management (Cognito integration)
- ⏳ System settings endpoints
- ⏳ Audit logging
- ⏳ Role-based access control

**Effort:** 12-16 hours

---

### Phase 3 (Weeks 9-12) - Email Alerts

**To Implement:**
- ⏳ Alert configuration endpoints
- ⏳ Alert history storage
- ⏳ Alert trigger logic
- ⏳ Mailgun integration for sending

**Effort:** 16-20 hours

---

### Phase 4 (Months 4-6) - Marketing Automation

**To Implement:**
- ⏳ Campaign CRUD endpoints
- ⏳ Workflow execution engine
- ⏳ Email template management
- ⏳ Campaign analytics

**Effort:** 40-50 hours

---

## Immediate Actions for Frontend Team

### 1. Update Base URL

```typescript
// src/config/api.ts
export const API_BASE_URL =
  'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api';
```

### 2. Create Response Adapter (Temporary)

```typescript
// src/services/api-adapter.ts
interface LovableResponse<T> {
  success: boolean;
  data: T;
  error: null | string;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
}

export function adaptResponse<T>(backendResponse: any): LovableResponse<T> {
  // Transform current format to Lovable expected format
  return {
    success: backendResponse.success,
    data: backendResponse.orders || backendResponse.customers || backendResponse.overview || backendResponse,
    error: null,
    meta: {
      limit: backendResponse.count,
      // lastEvaluatedKey can be used for pagination
    }
  };
}
```

### 3. Use Mock Data for Missing Endpoints

```typescript
// src/services/api/campaigns.ts
export const campaignsApi = {
  async listCampaigns() {
    // TODO: Replace with real endpoint when available
    return {
      success: true,
      data: [],
      error: null,
      meta: { total: 0 }
    };
  }
};
```

### 4. Disable Features Not Yet Implemented

```typescript
// src/features/feature-flags.ts
export const FEATURES = {
  CAMPAIGNS: false,  // Enable in Phase 4
  ALERTS: false,     // Enable in Phase 3
  USER_MGMT: false,  // Enable in Phase 2
  REPORTS: true,     // Already working
  ORDERS: true       // Already working
};
```

---

## Testing Endpoints

### Quick Tests

```bash
# Overview
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/overview"

# Orders
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders?limit=5"

# Customers
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/customers?limit=5"

# Single Order
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders/ORD-442894-1761011792356"

# Product Report
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products"

# Sales Report
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/sales?groupBy=week"
```

---

## Critical Issues & Blockers

### 🔴 High Priority (Blocks Frontend Development)

1. **Response Format Mismatch**
   - **Impact:** Every API call needs custom handling
   - **Solution:** Update Lambda to use standard format
   - **Timeline:** 2-3 hours
   - **Status:** Can be worked around with adapter for now

2. **No Authentication**
   - **Impact:** Can't implement login/protected routes
   - **Solution:** Deploy AWS Cognito + API Gateway authorizer
   - **Timeline:** 4-6 hours
   - **Status:** Frontend can use mock auth temporarily

### 🟡 Medium Priority (Limits Functionality)

3. **Missing Search/Filter**
   - **Impact:** Limited user experience
   - **Solution:** Add query parameter support
   - **Timeline:** 4-6 hours

4. **No Customer Segmentation**
   - **Impact:** Can't show New/Active/Dormant status
   - **Solution:** Add calculation logic to customer endpoint
   - **Timeline:** 2-3 hours

### 🟢 Low Priority (Future Features)

5. **Campaigns Not Implemented**
   - **Status:** Phase 4 feature (months away)
   - **Solution:** Use mock data in frontend

6. **Alerts Not Implemented**
   - **Status:** Phase 3 feature
   - **Solution:** Use mock data in frontend

---

## Recommended Backend Updates (Next Sprint)

### Priority 1: Response Format Standardization

Update `query-orders-lambda.mjs` to wrap all responses:

```javascript
function formatResponse(data, type = 'data', meta = {}) {
  return {
    statusCode: 200,
    headers: { /* CORS */ },
    body: JSON.stringify({
      success: true,
      data: data,
      error: null,
      meta: {
        limit: meta.limit || null,
        total: meta.total || null,
        ...meta
      }
    })
  };
}

// Example usage:
return formatResponse(orders, 'data', {
  limit: queryParams.limit,
  lastEvaluatedKey: result.LastEvaluatedKey
});
```

### Priority 2: Add Authentication

```bash
# Create Cognito User Pool
aws cognito-idp create-user-pool \
  --pool-name PackagingProductsUsers \
  --policies "PasswordPolicy={MinimumLength=8}" \
  --region ap-southeast-2

# Add authorizer to API Gateway
aws apigateway create-authorizer \
  --rest-api-id bw4agz6xn4 \
  --name CognitoAuthorizer \
  --type COGNITO_USER_POOLS \
  --provider-arns arn:aws:cognito-idp:ap-southeast-2:xxx:userpool/xxx
```

### Priority 3: Enhanced Filtering

Add search support to endpoints:

```javascript
// In listOrders function:
if (queryParams.search) {
  params.FilterExpression = 'contains(customer.contact_name, :search) OR contains(order_reference, :search)';
  params.ExpressionAttributeValues[':search'] = queryParams.search;
}
```

---

## Frontend Development Recommendations

### Start With:
1. ✅ Dashboard overview (working)
2. ✅ Orders list and detail pages (working)
3. ✅ Customers list and detail pages (working)
4. ✅ Product reports (working)
5. ✅ Sales reports (working)

### Phase Out (Use Placeholders):
6. ⏸️ Campaign builder (show "Coming Soon")
7. ⏸️ Email alerts config (show "Coming Soon")
8. ⏸️ User management (mock or coming soon)

### Mock Until Ready:
- Login/logout (use temporary token)
- User roles (hard-code admin role)
- Campaign list (empty state)

---

## Summary

### What Works Now ✅
- Dashboard overview with today/week/month metrics
- Orders listing with date/value filtering
- Single order details
- Customer listing with lifetime value metrics
- Customer detail with order history
- Product analytics (top by revenue/quantity)
- Sales timeline reports

### What Needs Work 🔧
- **Immediate:** Response format wrapper
- **Week 1:** Authentication (Cognito)
- **Week 2:** Search and filtering
- **Week 3:** Customer segmentation
- **Month 2-3:** Admin features
- **Month 4-6:** Alerts and campaigns

### Frontend Can Start Now 🚀
- Build UI components against existing endpoints
- Use response adapter for format differences
- Mock missing endpoints with empty states
- Implement authentication later (use temp tokens for now)

The core analytics features are **100% functional** and ready for frontend development. Missing features are primarily in admin/marketing automation areas that can be deferred to later phases.

---

**Last Updated:** October 21, 2025
**API Version:** v1.0
**Frontend Framework:** React + TypeScript (Lovable.dev)
