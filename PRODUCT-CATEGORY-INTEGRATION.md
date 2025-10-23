# Product Category Mapping System - Integration Guide

## Overview

This guide explains how to integrate the product category mapping system into the Packaging Products order system. The system provides a structured way to categorize products and analyze orders by product category.

## Files Created

1. **product-categories.json** - Category definitions and product mappings
2. **product-category-helper.mjs** - Helper functions for category operations
3. **PRODUCT-CATEGORY-INTEGRATION.md** - This integration guide

## Product Categories

The system currently includes 8 product categories:

| Category | Product Codes | Description |
|----------|--------------|-------------|
| **Cardboard Boxes** | CCPP2, CCPP4, CCPP10, CCQ | Cardboard packaging boxes in various sizes |
| **Packaging Tape & Dispensers** | TSPAKPTH, MTDD2 | Packaging tape and tape dispensers |
| **Labels & Stickers** | LMETBBB, LMETPB, LSHIP12, 1LMED4 | Shipping labels, price gun labels, warning labels |
| **Wrapping Paper & Materials** | PWR0900B | Wrapping paper rolls and materials |
| **Protective Materials & Films** | YSFHCA20 | Stretch film and protective wrapping |
| **Mailers & Envelopes** | BMST5 | Shurtuff mailers and shipping envelopes |
| **Office Supplies & Markers** | OMVIVCT | Markers, pens, and office stationery |
| **Gloves & Safety Equipment** | HGPLPFC | Disposable gloves and protective equipment |

## Integration into Query Lambda

### Step 1: Import the Helper Functions

Add the import statement at the top of `query-orders-lambda-v2.mjs`:

```javascript
import {
  getCategoryForProduct,
  getAllCategories,
  enrichOrderItemsWithCategories,
  groupItemsByCategory,
  calculateCategoryTotals,
  getCategoryStats
} from './product-category-helper.mjs';
```

### Step 2: Add Category Analytics Endpoint

Add a new route handler in the `handler` function:

```javascript
if (httpMethod === 'GET' && path.includes('/reports/categories')) {
  return await getCategoryReport(queryStringParameters);
}
```

### Step 3: Implement Category Report Function

Add this new function to `query-orders-lambda-v2.mjs`:

```javascript
// Category analytics report
async function getCategoryReport(queryParams) {
  const { startDate, endDate } = queryParams;

  // Get all orders (optionally filtered by date)
  let params = {
    TableName: ORDERS_TABLE_NAME
  };

  let orders;
  if (startDate || endDate) {
    params.IndexName = 'clientID-createdAt-index';
    params.KeyConditionExpression = 'clientID = :clientID';
    params.ExpressionAttributeValues = { ':clientID': CLIENT_ID };

    if (startDate && endDate) {
      params.KeyConditionExpression += ' AND createdAt BETWEEN :startDate AND :endDate';
      params.ExpressionAttributeValues[':startDate'] = startDate;
      params.ExpressionAttributeValues[':endDate'] = endDate;
    }

    const result = await docClient.send(new QueryCommand(params));
    orders = result.Items;
  } else {
    const result = await docClient.send(new ScanCommand(params));
    orders = result.Items;
  }

  // Aggregate data by category
  const categoryStats = {};
  let uncategorizedCount = 0;
  let uncategorizedRevenue = 0;

  orders.forEach(order => {
    (order.items || []).forEach(item => {
      const category = getCategoryForProduct(item.product_code);

      if (category) {
        if (!categoryStats[category]) {
          categoryStats[category] = {
            category: category,
            total_quantity: 0,
            total_revenue: 0,
            order_count: 0,
            unique_products: new Set()
          };
        }

        categoryStats[category].total_quantity += item.quantity || 0;
        categoryStats[category].total_revenue += item.total_price || 0;
        categoryStats[category].order_count += 1;
        categoryStats[category].unique_products.add(item.product_code);
      } else {
        uncategorizedCount += item.quantity || 0;
        uncategorizedRevenue += item.total_price || 0;
      }
    });
  });

  // Convert Set to count for unique products
  const categoriesArray = Object.values(categoryStats).map(cat => ({
    ...cat,
    unique_products: cat.unique_products.size
  }));

  // Sort by revenue
  const topByRevenue = [...categoriesArray].sort((a, b) =>
    b.total_revenue - a.total_revenue
  );

  // Sort by quantity
  const topByQuantity = [...categoriesArray].sort((a, b) =>
    b.total_quantity - a.total_quantity
  );

  const reportData = {
    summary: {
      total_categories: categoriesArray.length,
      total_orders_analyzed: orders.length,
      date_range: { startDate, endDate },
      uncategorized: {
        item_count: uncategorizedCount,
        revenue: uncategorizedRevenue
      }
    },
    categoryStats: getCategoryStats(),
    topByRevenue,
    topByQuantity,
    allCategories: categoriesArray
  };

  return formatResponse(reportData);
}
```

### Step 4: Enhance Existing Product Report

Modify the existing `getProductReport` function to include category information:

```javascript
// In getProductReport function, update the productMap building:
orders.forEach(order => {
  (order.items || []).forEach(item => {
    const key = item.product_code;
    if (!productMap[key]) {
      productMap[key] = {
        product_code: item.product_code,
        description: item.description,
        category: getCategoryForProduct(item.product_code), // ADD THIS LINE
        total_quantity: 0,
        total_revenue: 0,
        order_count: 0
      };
    }

    productMap[key].total_quantity += item.quantity || 0;
    productMap[key].total_revenue += item.total_price || 0;
    productMap[key].order_count += 1;
  });
});
```

### Step 5: Enrich Order Items in Response

Optionally enrich order items with category information when returning order details:

```javascript
// In getOrder function, add category enrichment before returning:
async function getOrder(orderID) {
  const params = {
    TableName: ORDERS_TABLE_NAME,
    Key: { orderID }
  };

  const result = await docClient.send(new GetCommand(params));

  if (!result.Item) {
    return formatResponse(null, {
      error: `Order not found: ${orderID}`,
      statusCode: 404
    });
  }

  // Enrich items with category information
  if (result.Item.items) {
    result.Item.items = enrichOrderItemsWithCategories(result.Item.items);
  }

  return formatResponse(result.Item);
}
```

## API Gateway Setup

### Add Category Report Endpoint

Add this new endpoint to your API Gateway configuration:

**Path:** `/reports/categories`
**Method:** GET
**Query Parameters:**
- `startDate` (optional) - ISO 8601 date string
- `endDate` (optional) - ISO 8601 date string

## Usage Examples

### 1. Get All Categories

```javascript
import { getAllCategories } from './product-category-helper.mjs';

const categories = getAllCategories();
console.log(categories);
```

### 2. Get Category for a Product

```javascript
import { getCategoryForProduct } from './product-category-helper.mjs';

const category = getCategoryForProduct('CCPP2');
console.log(category); // "Cardboard Boxes"
```

### 3. Enrich Order Items

```javascript
import { enrichOrderItemsWithCategories } from './product-category-helper.mjs';

const items = [
  { product_code: 'CCPP2', description: 'PP2 Box', quantity: 10, total_price: 100 },
  { product_code: 'TSPAKPTH', description: 'Clear Tape', quantity: 5, total_price: 40 }
];

const enrichedItems = enrichOrderItemsWithCategories(items);
console.log(enrichedItems);
// [
//   { product_code: 'CCPP2', ..., category: 'Cardboard Boxes' },
//   { product_code: 'TSPAKPTH', ..., category: 'Packaging Tape & Dispensers' }
// ]
```

### 4. Group Items by Category

```javascript
import { groupItemsByCategory } from './product-category-helper.mjs';

const items = [
  { product_code: 'CCPP2', quantity: 10, total_price: 100 },
  { product_code: 'CCPP4', quantity: 5, total_price: 50 },
  { product_code: 'TSPAKPTH', quantity: 20, total_price: 40 }
];

const grouped = groupItemsByCategory(items);
console.log(grouped);
// {
//   "Cardboard Boxes": [
//     { product_code: 'CCPP2', ... },
//     { product_code: 'CCPP4', ... }
//   ],
//   "Packaging Tape & Dispensers": [
//     { product_code: 'TSPAKPTH', ... }
//   ]
// }
```

### 5. Calculate Category Totals

```javascript
import { calculateCategoryTotals } from './product-category-helper.mjs';

const items = [
  { product_code: 'CCPP2', quantity: 10, total_price: 100 },
  { product_code: 'CCPP4', quantity: 5, total_price: 50 },
  { product_code: 'TSPAKPTH', quantity: 20, total_price: 40 }
];

const totals = calculateCategoryTotals(items);
console.log(totals);
// {
//   "Cardboard Boxes": { quantity: 15, revenue: 150, itemCount: 2 },
//   "Packaging Tape & Dispensers": { quantity: 20, revenue: 40, itemCount: 1 }
// }
```

## API Endpoint Examples

### Get Category Report

**Request:**
```
GET https://your-api.execute-api.region.amazonaws.com/prod/reports/categories?startDate=2025-10-01&endDate=2025-10-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_categories": 5,
      "total_orders_analyzed": 50,
      "date_range": {
        "startDate": "2025-10-01",
        "endDate": "2025-10-31"
      },
      "uncategorized": {
        "item_count": 5,
        "revenue": 45.50
      }
    },
    "categoryStats": {
      "totalCategories": 8,
      "totalProducts": 17,
      "averageProductsPerCategory": "2.13",
      "categoriesBreakdown": {
        "Cardboard Boxes": 4,
        "Packaging Tape & Dispensers": 2,
        "Labels & Stickers": 4,
        "Wrapping Paper & Materials": 1,
        "Protective Materials & Films": 1,
        "Mailers & Envelopes": 1,
        "Office Supplies & Markers": 1,
        "Gloves & Safety Equipment": 1
      }
    },
    "topByRevenue": [
      {
        "category": "Cardboard Boxes",
        "total_quantity": 1250,
        "total_revenue": 3500.00,
        "order_count": 35,
        "unique_products": 4
      },
      {
        "category": "Packaging Tape & Dispensers",
        "total_quantity": 800,
        "total_revenue": 1520.00,
        "order_count": 25,
        "unique_products": 2
      }
    ],
    "topByQuantity": [
      {
        "category": "Cardboard Boxes",
        "total_quantity": 1250,
        "total_revenue": 3500.00,
        "order_count": 35,
        "unique_products": 4
      }
    ]
  },
  "error": null,
  "meta": {
    "count": null,
    "limit": null,
    "total": null,
    "lastEvaluatedKey": null
  }
}
```

### Enhanced Product Report (with categories)

**Request:**
```
GET https://your-api.execute-api.region.amazonaws.com/prod/reports/products?startDate=2025-10-01&endDate=2025-10-31
```

**Response:**
```json
{
  "success": true,
  "data": {
    "summary": {
      "total_products": 12,
      "total_orders_analyzed": 50,
      "date_range": {
        "startDate": "2025-10-01",
        "endDate": "2025-10-31"
      }
    },
    "topByRevenue": [
      {
        "product_code": "CCPP2",
        "description": "PP2 Cardboard Box",
        "category": "Cardboard Boxes",
        "total_quantity": 500,
        "total_revenue": 1500.00,
        "order_count": 20
      },
      {
        "product_code": "TSPAKPTH",
        "description": "Clear Pak Tape Premium Packaging Tape 48mm",
        "category": "Packaging Tape & Dispensers",
        "total_quantity": 400,
        "total_revenue": 760.00,
        "order_count": 15
      }
    ],
    "topByQuantity": [
      {
        "product_code": "CCPP2",
        "description": "PP2 Cardboard Box",
        "category": "Cardboard Boxes",
        "total_quantity": 500,
        "total_revenue": 1500.00,
        "order_count": 20
      }
    ]
  }
}
```

## Frontend Integration (React)

### Example: Category Breakdown Chart

```javascript
import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend } from 'recharts';

const CategoryBreakdown = ({ startDate, endDate }) => {
  const [categoryData, setCategoryData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCategoryReport();
  }, [startDate, endDate]);

  const fetchCategoryReport = async () => {
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('startDate', startDate);
      if (endDate) params.append('endDate', endDate);

      const response = await fetch(
        `https://your-api.execute-api.region.amazonaws.com/prod/reports/categories?${params}`
      );
      const result = await response.json();

      if (result.success) {
        setCategoryData(result.data);
      }
    } catch (error) {
      console.error('Error fetching category report:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Loading category breakdown...</div>;
  if (!categoryData) return <div>No data available</div>;

  const chartData = categoryData.topByRevenue.map(cat => ({
    name: cat.category,
    value: cat.total_revenue
  }));

  const COLORS = [
    '#0088FE', '#00C49F', '#FFBB28', '#FF8042',
    '#8884D8', '#82CA9D', '#FFC658', '#FF6B9D'
  ];

  return (
    <div className="category-breakdown">
      <h2>Sales by Category</h2>

      <div className="stats-summary">
        <div className="stat">
          <label>Total Categories:</label>
          <value>{categoryData.summary.total_categories}</value>
        </div>
        <div className="stat">
          <label>Orders Analyzed:</label>
          <value>{categoryData.summary.total_orders_analyzed}</value>
        </div>
      </div>

      <PieChart width={400} height={400}>
        <Pie
          data={chartData}
          cx={200}
          cy={200}
          labelLine={false}
          label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip />
        <Legend />
      </PieChart>

      <div className="category-details">
        <h3>Category Performance</h3>
        <table>
          <thead>
            <tr>
              <th>Category</th>
              <th>Quantity</th>
              <th>Revenue</th>
              <th>Orders</th>
              <th>Products</th>
            </tr>
          </thead>
          <tbody>
            {categoryData.topByRevenue.map(cat => (
              <tr key={cat.category}>
                <td>{cat.category}</td>
                <td>{cat.total_quantity}</td>
                <td>${cat.total_revenue.toFixed(2)}</td>
                <td>{cat.order_count}</td>
                <td>{cat.unique_products}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default CategoryBreakdown;
```

## Adding New Products/Categories

### To Add a New Product to an Existing Category:

1. Open `product-categories.json`
2. Find the appropriate category
3. Add the product code to the `products` array
4. Update the `metadata.last_updated` field

Example:
```json
{
  "categories": {
    "Cardboard Boxes": {
      "products": [
        "CCPP2",
        "CCPP4",
        "CCPP10",
        "CCQ",
        "CCPP6"  // <-- Add new product here
      ],
      "description": "Cardboard packaging boxes in various sizes for shipping and storage",
      "keywords": ["box", "cardboard", "PP", "wine bottle"]
    }
  }
}
```

### To Add a New Category:

1. Open `product-categories.json`
2. Add a new entry under `categories`
3. Update `metadata.total_categories` and `metadata.total_products`

Example:
```json
{
  "categories": {
    "Existing Category": { ... },
    "Bubble Wrap & Cushioning": {
      "products": ["BWRAP12", "BWRAP24", "CUSHION01"],
      "description": "Bubble wrap and protective cushioning materials",
      "keywords": ["bubble wrap", "cushioning", "protective", "padding"]
    }
  },
  "metadata": {
    "version": "1.0.0",
    "last_updated": "2025-10-21",
    "total_categories": 9,
    "total_products": 20,
    "description": "Product category mapping for Packaging Products order system"
  }
}
```

## Testing

### Test the Helper Functions

Create a test file `test-category-helper.mjs`:

```javascript
import {
  getCategoryForProduct,
  getAllCategories,
  enrichOrderItemsWithCategories,
  groupItemsByCategory,
  calculateCategoryTotals,
  getCategoryStats
} from './product-category-helper.mjs';

// Test 1: Get category for product
console.log('Test 1: Get category for product');
console.log(getCategoryForProduct('CCPP2')); // Should return "Cardboard Boxes"
console.log(getCategoryForProduct('UNKNOWN')); // Should return null

// Test 2: Get all categories
console.log('\nTest 2: Get all categories');
console.log(getAllCategories());

// Test 3: Enrich items
console.log('\nTest 3: Enrich order items');
const items = [
  { product_code: 'CCPP2', quantity: 10, total_price: 100 },
  { product_code: 'TSPAKPTH', quantity: 5, total_price: 40 }
];
console.log(enrichOrderItemsWithCategories(items));

// Test 4: Group by category
console.log('\nTest 4: Group items by category');
console.log(groupItemsByCategory(items));

// Test 5: Calculate totals
console.log('\nTest 5: Calculate category totals');
console.log(calculateCategoryTotals(items));

// Test 6: Get stats
console.log('\nTest 6: Get category stats');
console.log(getCategoryStats());
```

Run the test:
```bash
node test-category-helper.mjs
```

## Deployment Checklist

- [ ] Upload `product-categories.json` to Lambda deployment package
- [ ] Upload `product-category-helper.mjs` to Lambda deployment package
- [ ] Update `query-orders-lambda-v2.mjs` with new import and functions
- [ ] Add `/reports/categories` endpoint to API Gateway
- [ ] Deploy Lambda function with updated code
- [ ] Test endpoints using Postman or curl
- [ ] Update frontend to use new category endpoints
- [ ] Document any new product codes discovered in production

## Maintenance

### Regular Updates

- **Weekly:** Review uncategorized products in reports
- **Monthly:** Add new product codes to categories
- **Quarterly:** Review category structure and consider reorganization

### Monitoring

Monitor the `uncategorized` section in the category report to identify products that need categorization.

## Support

For questions or issues with the category mapping system, contact the development team or refer to the source code documentation in `product-category-helper.mjs`.
