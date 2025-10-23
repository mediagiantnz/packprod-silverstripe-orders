import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
// IMPORT CATEGORY HELPERS
import {
  getCategoryForProduct,
  enrichOrderItemsWithCategories,
  calculateCategoryTotals,
  getCategoryStats
} from './product-category-helper.mjs';

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const ORDERS_TABLE_NAME = process.env.ORDERS_TABLE_NAME; // packprod-weborders
const CONTACTS_TABLE_NAME = process.env.CONTACTS_TABLE_NAME; // RocketReview_Contacts
const CLIENT_ID = "7b0d485f-8ef9-45b0-881a-9d8f4447ced2";

// CORS headers for all responses
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

/**
 * Standardized response format wrapper
 * Frontend expects: { success, data, error, meta }
 */
function formatResponse(data, options = {}) {
  const {
    count = null,
    lastEvaluatedKey = null,
    total = null,
    error = null,
    statusCode = error ? 500 : 200
  } = options;

  return {
    statusCode,
    headers,
    body: JSON.stringify({
      success: !error,
      data: data,
      error: error,
      meta: {
        count,
        limit: null,
        total,
        lastEvaluatedKey
      }
    })
  };
}

export const handler = async (event) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }

  try {
    const path = event.path || event.resource;
    const httpMethod = event.httpMethod;
    const pathParameters = event.pathParameters || {};
    const queryStringParameters = event.queryStringParameters || {};

    // Route handling
    if (httpMethod === 'GET' && path.includes('/orders') && pathParameters.orderID) {
      return await getOrder(pathParameters.orderID);
    }

    if (httpMethod === 'GET' && path.includes('/orders')) {
      return await listOrders(queryStringParameters);
    }

    if (httpMethod === 'GET' && path.includes('/customers') && pathParameters.contactID && path.includes('/orders')) {
      return await getCustomerOrders(pathParameters.contactID, queryStringParameters);
    }

    if (httpMethod === 'GET' && path.includes('/customers') && pathParameters.contactID) {
      return await getCustomer(pathParameters.contactID);
    }

    if (httpMethod === 'GET' && path.includes('/customers')) {
      return await listCustomers(queryStringParameters);
    }

    // NEW: Category report endpoint
    if (httpMethod === 'GET' && path.includes('/reports/categories')) {
      return await getCategoryReport(queryStringParameters);
    }

    if (httpMethod === 'GET' && path.includes('/reports/products')) {
      return await getProductReport(queryStringParameters);
    }

    if (httpMethod === 'GET' && path.includes('/reports/sales')) {
      return await getSalesReport(queryStringParameters);
    }

    if (httpMethod === 'GET' && path.includes('/reports/overview')) {
      return await getOverviewReport(queryStringParameters);
    }

    return formatResponse(null, {
      error: `Route not found: ${path}`,
      statusCode: 404
    });

  } catch (error) {
    console.error("Error processing request: ", error);
    return formatResponse(null, {
      error: error.message
    });
  }
};

// Get single order by orderID (ENHANCED with category information)
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

  // ENHANCEMENT: Enrich items with category information
  if (result.Item.items) {
    result.Item.items = enrichOrderItemsWithCategories(result.Item.items);

    // Add category summary to order
    result.Item.categoryBreakdown = calculateCategoryTotals(result.Item.items);
  }

  return formatResponse(result.Item);
}

// List orders with filtering and pagination
async function listOrders(queryParams) {
  const {
    limit = 50,
    startDate,
    endDate,
    minTotal,
    maxTotal,
    search,
    lastEvaluatedKey
  } = queryParams;

  let params = {
    TableName: ORDERS_TABLE_NAME,
    Limit: parseInt(limit)
  };

  // If filtering by date range, use clientID-createdAt-index
  if (startDate || endDate) {
    params.IndexName = 'clientID-createdAt-index';
    params.KeyConditionExpression = 'clientID = :clientID';
    params.ExpressionAttributeValues = {
      ':clientID': CLIENT_ID
    };

    if (startDate && endDate) {
      params.KeyConditionExpression += ' AND createdAt BETWEEN :startDate AND :endDate';
      params.ExpressionAttributeValues[':startDate'] = startDate;
      params.ExpressionAttributeValues[':endDate'] = endDate;
    } else if (startDate) {
      params.KeyConditionExpression += ' AND createdAt >= :startDate';
      params.ExpressionAttributeValues[':startDate'] = startDate;
    } else if (endDate) {
      params.KeyConditionExpression += ' AND createdAt <= :endDate';
      params.ExpressionAttributeValues[':endDate'] = endDate;
    }

    const filterExpressions = [];
    if (minTotal || maxTotal) {
      params.ExpressionAttributeValues = params.ExpressionAttributeValues || {};

      if (minTotal) {
        filterExpressions.push('totals.total >= :minTotal');
        params.ExpressionAttributeValues[':minTotal'] = minTotal;
      }
      if (maxTotal) {
        filterExpressions.push('totals.total <= :maxTotal');
        params.ExpressionAttributeValues[':maxTotal'] = maxTotal;
      }
    }

    if (search) {
      params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};
      params.ExpressionAttributeNames['#orderRef'] = 'order_reference';

      filterExpressions.push('contains(#orderRef, :search) OR contains(customer.contact_name, :search) OR contains(customer.email, :search)');
      params.ExpressionAttributeValues[':search'] = search;
    }

    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
    }

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
    }

    const result = await docClient.send(new QueryCommand(params));

    return formatResponse(result.Items, {
      count: result.Items.length,
      lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null
    });
  }

  // No date filter - use Scan
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  if (search) {
    params.FilterExpression = 'contains(order_reference, :search) OR contains(customer.contact_name, :search) OR contains(customer.email, :search)';
    params.ExpressionAttributeValues = {
      ':search': search
    };
  }

  const result = await docClient.send(new ScanCommand(params));

  const sortedOrders = result.Items.sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  return formatResponse(sortedOrders, {
    count: sortedOrders.length,
    lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null
  });
}

// Get single customer/contact by contactID
async function getCustomer(contactID) {
  const params = {
    TableName: CONTACTS_TABLE_NAME,
    Key: { contactID }
  };

  const result = await docClient.send(new GetCommand(params));

  if (!result.Item) {
    return formatResponse(null, {
      error: `Customer not found: ${contactID}`,
      statusCode: 404
    });
  }

  const ordersParams = {
    TableName: ORDERS_TABLE_NAME,
    IndexName: 'contactID-index',
    KeyConditionExpression: 'contactID = :contactID',
    ExpressionAttributeValues: {
      ':contactID': contactID
    }
  };

  const ordersResult = await docClient.send(new QueryCommand(ordersParams));

  const orderCount = ordersResult.Items.length;
  const totalSpend = ordersResult.Items.reduce((sum, order) => {
    const total = parseFloat(order.totals?.total || 0);
    return sum + total;
  }, 0);

  const lastOrder = ordersResult.Items.sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  )[0];

  const customerWithMetrics = {
    ...result.Item,
    metrics: {
      orderCount,
      totalSpend: totalSpend.toFixed(2),
      lastOrderDate: lastOrder?.createdAt || null,
      lastOrderReference: lastOrder?.order_reference || null
    }
  };

  return formatResponse(customerWithMetrics);
}

// List all customers
async function listCustomers(queryParams) {
  const { limit = 50, search, lastEvaluatedKey } = queryParams;

  const params = {
    TableName: CONTACTS_TABLE_NAME,
    Limit: parseInt(limit)
  };

  if (search) {
    params.FilterExpression = 'contains(#name, :search) OR contains(email, :search) OR contains(company, :search)';
    params.ExpressionAttributeNames = {
      '#name': 'name'
    };
    params.ExpressionAttributeValues = {
      ':search': search.toLowerCase()
    };
  }

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  const result = await docClient.send(new ScanCommand(params));

  const customersWithMetrics = await Promise.all(
    result.Items.map(async (customer) => {
      const ordersParams = {
        TableName: ORDERS_TABLE_NAME,
        IndexName: 'contactID-index',
        KeyConditionExpression: 'contactID = :contactID',
        ExpressionAttributeValues: {
          ':contactID': customer.contactID
        }
      };

      const ordersResult = await docClient.send(new QueryCommand(ordersParams));

      const orderCount = ordersResult.Items.length;
      const totalSpend = ordersResult.Items.reduce((sum, order) => {
        const total = parseFloat(order.totals?.total || 0);
        return sum + total;
      }, 0);

      const lastOrder = ordersResult.Items.sort((a, b) =>
        new Date(b.createdAt) - new Date(a.createdAt)
      )[0];

      return {
        ...customer,
        metrics: {
          orderCount,
          totalSpend: totalSpend.toFixed(2),
          lastOrderDate: lastOrder?.createdAt || null
        }
      };
    })
  );

  const sortedCustomers = customersWithMetrics.sort((a, b) =>
    parseFloat(b.metrics.totalSpend) - parseFloat(a.metrics.totalSpend)
  );

  return formatResponse(sortedCustomers, {
    count: sortedCustomers.length,
    lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null
  });
}

// Get all orders for a specific customer
async function getCustomerOrders(contactID, queryParams) {
  const { limit = 50, lastEvaluatedKey } = queryParams;

  const params = {
    TableName: ORDERS_TABLE_NAME,
    IndexName: 'contactID-index',
    KeyConditionExpression: 'contactID = :contactID',
    ExpressionAttributeValues: {
      ':contactID': contactID
    },
    Limit: parseInt(limit),
    ScanIndexForward: false
  };

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  const result = await docClient.send(new QueryCommand(params));

  return formatResponse(result.Items, {
    count: result.Items.length,
    lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null
  });
}

// NEW: Category analytics report
async function getCategoryReport(queryParams) {
  const { startDate, endDate } = queryParams;

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
    category: cat.category,
    total_quantity: cat.total_quantity,
    total_revenue: cat.total_revenue,
    order_count: cat.order_count,
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

// Product analytics report (ENHANCED with category information)
async function getProductReport(queryParams) {
  const { startDate, endDate } = queryParams;

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

  // Aggregate product data
  const productMap = {};

  orders.forEach(order => {
    (order.items || []).forEach(item => {
      const key = item.product_code;
      if (!productMap[key]) {
        productMap[key] = {
          product_code: item.product_code,
          description: item.description,
          category: getCategoryForProduct(item.product_code), // ENHANCEMENT: Add category
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

  const products = Object.values(productMap);

  const topByRevenue = [...products].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 20);
  const topByQuantity = [...products].sort((a, b) => b.total_quantity - a.total_quantity).slice(0, 20);

  const reportData = {
    summary: {
      total_products: products.length,
      total_orders_analyzed: orders.length,
      date_range: { startDate, endDate }
    },
    topByRevenue,
    topByQuantity
  };

  return formatResponse(reportData);
}

// Sales overview report
async function getSalesReport(queryParams) {
  const { startDate, endDate, groupBy = 'day' } = queryParams;

  let params = {
    TableName: ORDERS_TABLE_NAME,
    IndexName: 'clientID-createdAt-index',
    KeyConditionExpression = 'clientID = :clientID',
    ExpressionAttributeValues: { ':clientID': CLIENT_ID }
  };

  if (startDate && endDate) {
    params.KeyConditionExpression += ' AND createdAt BETWEEN :startDate AND :endDate';
    params.ExpressionAttributeValues[':startDate'] = startDate;
    params.ExpressionAttributeValues[':endDate'] = endDate;
  }

  const result = await docClient.send(new QueryCommand(params));
  const orders = result.Items;

  const totalRevenue = orders.reduce((sum, order) => {
    const total = parseFloat(order.totals?.total || 0);
    return sum + total;
  }, 0);

  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  const salesByDate = {};
  orders.forEach(order => {
    const date = new Date(order.createdAt);
    let key;

    if (groupBy === 'month') {
      key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    } else if (groupBy === 'week') {
      const weekStart = new Date(date);
      weekStart.setDate(date.getDate() - date.getDay());
      key = weekStart.toISOString().split('T')[0];
    } else {
      key = date.toISOString().split('T')[0];
    }

    if (!salesByDate[key]) {
      salesByDate[key] = {
        date: key,
        revenue: 0,
        order_count: 0
      };
    }

    salesByDate[key].revenue += parseFloat(order.totals?.total || 0);
    salesByDate[key].order_count += 1;
  });

  const timeline = Object.values(salesByDate).sort((a, b) =>
    a.date.localeCompare(b.date)
  );

  const reportData = {
    summary: {
      total_revenue: totalRevenue.toFixed(2),
      total_orders: totalOrders,
      average_order_value: averageOrderValue.toFixed(2),
      date_range: { startDate, endDate },
      group_by: groupBy
    },
    timeline
  };

  return formatResponse(reportData);
}

// Dashboard overview report
async function getOverviewReport(queryParams) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartISO = weekStart.toISOString();

  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartISO = monthStart.toISOString();

  const params = {
    TableName: ORDERS_TABLE_NAME,
    IndexName: 'clientID-createdAt-index',
    KeyConditionExpression: 'clientID = :clientID AND createdAt >= :monthStart',
    ExpressionAttributeValues: {
      ':clientID': CLIENT_ID,
      ':monthStart': monthStartISO
    }
  };

  const result = await docClient.send(new QueryCommand(params));
  const allOrders = result.Items;

  const todayOrders = allOrders.filter(o => o.createdAt >= todayISO);
  const weekOrders = allOrders.filter(o => o.createdAt >= weekStartISO);

  const calculateMetrics = (orders) => ({
    order_count: orders.length,
    revenue: orders.reduce((sum, o) => sum + parseFloat(o.totals?.total || 0), 0).toFixed(2),
    avg_order_value: orders.length > 0 ?
      (orders.reduce((sum, o) => sum + parseFloat(o.totals?.total || 0), 0) / orders.length).toFixed(2) :
      '0.00'
  });

  const customersResult = await docClient.send(new ScanCommand({
    TableName: CONTACTS_TABLE_NAME,
    Select: 'COUNT'
  }));

  const overviewData = {
    overview: {
      today: calculateMetrics(todayOrders),
      this_week: calculateMetrics(weekOrders),
      this_month: calculateMetrics(allOrders),
      total_customers: customersResult.Count || 0
    },
    recent_orders: allOrders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
  };

  return formatResponse(overviewData);
}
