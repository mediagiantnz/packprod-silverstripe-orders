import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const ORDERS_TABLE_NAME = process.env.ORDERS_TABLE_NAME; // packprod-weborders
const CACHE_TABLE_NAME = process.env.CACHE_TABLE_NAME; // packprod-customer-metrics-cache (optional)
const CLIENT_ID = "7b0d485f-8ef9-45b0-881a-9d8f4447ced2";

// Load Product Categories from JSON file
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const categoriesPath = join(__dirname, 'product-categories.json');
const categoriesData = JSON.parse(readFileSync(categoriesPath, 'utf8'));
const PRODUCT_CATEGORIES = categoriesData.categories;
const CATEGORIES_METADATA = categoriesData.metadata;

// CORS headers for all responses
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
};

/**
 * Standardized response format wrapper with performance timing
 * Frontend expects: { success, data, error, meta }
 */
function formatResponse(data, options = {}) {
  const {
    count = null,
    lastEvaluatedKey = null,
    total = null,
    error = null,
    statusCode = error ? 500 : 200,
    responseTime = null,
    cacheHit = null
  } = options;

  const meta = {
    count,
    limit: null,
    total,
    lastEvaluatedKey
  };

  // Add performance metadata
  if (responseTime !== null) {
    meta.responseTime = `${responseTime}ms`;
  }
  if (cacheHit !== null) {
    meta.cacheHit = cacheHit;
  }

  return {
    statusCode,
    headers,
    body: JSON.stringify({
      success: !error,
      data: data,
      error: error,
      meta
    })
  };
}

/**
 * Log slow queries to CloudWatch for monitoring
 */
function logSlowQuery(endpoint, responseTime, params) {
  if (responseTime > 1000) {
    console.warn(`SLOW QUERY: ${endpoint} took ${responseTime}ms`, {
      endpoint,
      responseTime,
      params: JSON.stringify(params)
    });
  }
}

// Product Category Helper Functions
function getCategoryForProduct(productCode) {
  if (!productCode) return null;
  for (const [categoryName, categoryData] of Object.entries(PRODUCT_CATEGORIES)) {
    if (categoryData.products.includes(productCode)) {
      return categoryName;
    }
  }
  return null;
}

function getAllCategories() {
  return PRODUCT_CATEGORIES;
}

function getCategoryStats() {
  const categoryNames = Object.keys(PRODUCT_CATEGORIES);
  const totalCategories = categoryNames.length;
  let totalProducts = 0;
  const categoriesBreakdown = {};

  for (const [name, data] of Object.entries(PRODUCT_CATEGORIES)) {
    const productCount = data.products.length;
    totalProducts += productCount;
    categoriesBreakdown[name] = productCount;
  }

  return {
    totalCategories,
    totalProducts,
    averageProductsPerCategory: totalCategories > 0 ? (totalProducts / totalCategories).toFixed(2) : 0,
    categoriesBreakdown,
    metadata: {
      version: "1.0.0",
      last_updated: "2025-10-21",
      description: "Product category mapping for Packaging Products order system"
    }
  };
}

export const handler = async (event) => {
  const requestStart = Date.now();
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

    // Route handling - IMPORTANT: More specific routes must come BEFORE general routes

    // Specific product routes (must come before general /orders route)
    if (httpMethod === 'GET' && pathParameters.productCode && path.includes('/products') && path.includes('/orders')) {
      return await getProductOrders(pathParameters.productCode, queryStringParameters, requestStart);
    }

    if (httpMethod === 'GET' && path.includes('/products/categories')) {
      return await getProductCategories(queryStringParameters, requestStart);
    }

    // Specific customer routes (must come before general routes)
    if (httpMethod === 'GET' && path.includes('/customers') && pathParameters.contactID && path.includes('/orders')) {
      return await getCustomerOrders(pathParameters.contactID, queryStringParameters, requestStart);
    }

    if (httpMethod === 'GET' && path.includes('/customers') && pathParameters.contactID) {
      return await getCustomer(pathParameters.contactID, requestStart);
    }

    if (httpMethod === 'GET' && path.includes('/customers')) {
      return await listCustomers(queryStringParameters, requestStart);
    }

    // General order routes
    if (httpMethod === 'GET' && path.includes('/orders') && pathParameters.orderID) {
      return await getOrder(pathParameters.orderID, requestStart);
    }

    if (httpMethod === 'GET' && path.includes('/orders')) {
      return await listOrders(queryStringParameters, requestStart);
    }

    if (httpMethod === 'GET' && (path.includes('/reports/products') || path.includes('/products'))) {
      return await getProductReport(queryStringParameters, requestStart);
    }

    if (httpMethod === 'GET' && path.includes('/reports/sales')) {
      return await getSalesReport(queryStringParameters, requestStart);
    }

    if (httpMethod === 'GET' && path.includes('/reports/overview')) {
      return await getOverviewReport(queryStringParameters, requestStart);
    }

    if (httpMethod === 'GET' && path.includes('/reports/statistics')) {
      return await getOrderStatistics(queryStringParameters, requestStart);
    }

    if (httpMethod === 'GET' && path.includes('/reports/categories')) {
      return await getCategoryReport(queryStringParameters, requestStart);
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

// Get single order by orderID
async function getOrder(orderID, requestStart) {
  const params = {
    TableName: ORDERS_TABLE_NAME,
    Key: { orderID }
  };

  const result = await docClient.send(new GetCommand(params));

  const responseTime = Date.now() - requestStart;
  logSlowQuery('getOrder', responseTime, params);

  if (!result.Item) {
    return formatResponse(null, {
      error: `Order not found: ${orderID}`,
      statusCode: 404,
      responseTime
    });
  }

  return formatResponse(result.Item, { responseTime });
}

// List orders with filtering and pagination
async function listOrders(queryParams, requestStart) {
  const {
    limit = 50,
    startDate,
    endDate,
    minTotal,
    maxTotal,
    status,
    customerID,
    paymentType,
    productCode,
    search,
    lastEvaluatedKey
  } = queryParams;

  let params = {
    TableName: ORDERS_TABLE_NAME,
    Limit: parseInt(limit)
  };

  // If filtering by customerID, use contactID-index for efficiency
  if (customerID && !startDate && !endDate) {
    params.IndexName = 'contactID-index';
    params.KeyConditionExpression = 'contactID = :customerID';
    params.ExpressionAttributeValues = {
      ':customerID': customerID
    };
    params.ScanIndexForward = false; // Most recent first

    // Build filter expressions for additional filters
    const filterExpressions = [];
    params.ExpressionAttributeValues = params.ExpressionAttributeValues || {};
    params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};

    // Status filter
    if (status) {
      filterExpressions.push('#status = :status');
      params.ExpressionAttributeNames['#status'] = 'status';
      params.ExpressionAttributeValues[':status'] = status;
    }

    // Payment type filter
    if (paymentType) {
      filterExpressions.push('payment.payment_type = :paymentType');
      params.ExpressionAttributeValues[':paymentType'] = paymentType;
    }

    // Min/max total filters
    if (minTotal) {
      filterExpressions.push('totals.total >= :minTotal');
      params.ExpressionAttributeValues[':minTotal'] = parseFloat(minTotal);
    }
    if (maxTotal) {
      filterExpressions.push('totals.total <= :maxTotal');
      params.ExpressionAttributeValues[':maxTotal'] = parseFloat(maxTotal);
    }

    // Product code filter - check if any item in the order contains the product
    if (productCode) {
      filterExpressions.push('contains(product_codes, :productCode)');
      params.ExpressionAttributeValues[':productCode'] = productCode;
    }

    // Text search filter
    if (search) {
      params.ExpressionAttributeNames['#orderRef'] = 'order_reference';
      filterExpressions.push('(contains(#orderRef, :search) OR contains(customer.contact_name, :search) OR contains(customer.email, :search))');
      params.ExpressionAttributeValues[':search'] = search;
    }

    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
    }

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
    }

    const result = await docClient.send(new QueryCommand(params));

    const responseTime = Date.now() - requestStart;
    logSlowQuery('listOrders (by customerID)', responseTime, params);

    return formatResponse(result.Items, {
      count: result.Items.length,
      lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
      responseTime
    });
  }

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

    // Build filter expressions array
    const filterExpressions = [];
    params.ExpressionAttributeValues = params.ExpressionAttributeValues || {};
    params.ExpressionAttributeNames = params.ExpressionAttributeNames || {};

    // Status filter
    if (status) {
      filterExpressions.push('#status = :status');
      params.ExpressionAttributeNames['#status'] = 'status';
      params.ExpressionAttributeValues[':status'] = status;
    }

    // Customer ID filter
    if (customerID) {
      filterExpressions.push('contactID = :customerID');
      params.ExpressionAttributeValues[':customerID'] = customerID;
    }

    // Payment type filter
    if (paymentType) {
      filterExpressions.push('payment.payment_type = :paymentType');
      params.ExpressionAttributeValues[':paymentType'] = paymentType;
    }

    // Min/max total filters
    if (minTotal) {
      filterExpressions.push('totals.total >= :minTotal');
      params.ExpressionAttributeValues[':minTotal'] = parseFloat(minTotal);
    }
    if (maxTotal) {
      filterExpressions.push('totals.total <= :maxTotal');
      params.ExpressionAttributeValues[':maxTotal'] = parseFloat(maxTotal);
    }

    // Product code filter
    if (productCode) {
      filterExpressions.push('contains(product_codes, :productCode)');
      params.ExpressionAttributeValues[':productCode'] = productCode;
    }

    // Text search filter
    if (search) {
      params.ExpressionAttributeNames['#orderRef'] = 'order_reference';
      filterExpressions.push('(contains(#orderRef, :search) OR contains(customer.contact_name, :search) OR contains(customer.email, :search))');
      params.ExpressionAttributeValues[':search'] = search;
    }

    if (filterExpressions.length > 0) {
      params.FilterExpression = filterExpressions.join(' AND ');
    }

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
    }

    const result = await docClient.send(new QueryCommand(params));

    const responseTime = Date.now() - requestStart;
    logSlowQuery('listOrders (by date range)', responseTime, params);

    return formatResponse(result.Items, {
      count: result.Items.length,
      lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
      responseTime
    });
  }

  // No date filter and no customerID - use Scan (less efficient, but works)
  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  // Build filter expressions for Scan
  const filterExpressions = [];
  params.ExpressionAttributeValues = {};
  params.ExpressionAttributeNames = {};

  // Status filter
  if (status) {
    filterExpressions.push('#status = :status');
    params.ExpressionAttributeNames['#status'] = 'status';
    params.ExpressionAttributeValues[':status'] = status;
  }

  // Customer ID filter
  if (customerID) {
    filterExpressions.push('contactID = :customerID');
    params.ExpressionAttributeValues[':customerID'] = customerID;
  }

  // Payment type filter
  if (paymentType) {
    filterExpressions.push('payment.payment_type = :paymentType');
    params.ExpressionAttributeValues[':paymentType'] = paymentType;
  }

  // Min/max total filters
  if (minTotal) {
    filterExpressions.push('totals.total >= :minTotal');
    params.ExpressionAttributeValues[':minTotal'] = parseFloat(minTotal);
  }
  if (maxTotal) {
    filterExpressions.push('totals.total <= :maxTotal');
    params.ExpressionAttributeValues[':maxTotal'] = parseFloat(maxTotal);
  }

  // Product code filter
  if (productCode) {
    filterExpressions.push('contains(product_codes, :productCode)');
    params.ExpressionAttributeValues[':productCode'] = productCode;
  }

  // Text search filter
  if (search) {
    params.ExpressionAttributeNames['#orderRef'] = 'order_reference';
    filterExpressions.push('(contains(#orderRef, :search) OR contains(customer.contact_name, :search) OR contains(customer.email, :search))');
    params.ExpressionAttributeValues[':search'] = search;
  }

  if (filterExpressions.length > 0) {
    params.FilterExpression = filterExpressions.join(' AND ');
  }

  // Clean up empty objects
  if (Object.keys(params.ExpressionAttributeValues).length === 0) {
    delete params.ExpressionAttributeValues;
  }
  if (Object.keys(params.ExpressionAttributeNames).length === 0) {
    delete params.ExpressionAttributeNames;
  }

  const result = await docClient.send(new ScanCommand(params));

  // Sort by createdAt descending (most recent first)
  const sortedOrders = result.Items.sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  const responseTime = Date.now() - requestStart;
  logSlowQuery('listOrders (scan)', responseTime, params);

  return formatResponse(sortedOrders, {
    count: sortedOrders.length,
    lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
    responseTime
  });
}

/**
 * Calculate customer segment based on order history and spending
 */
function calculateCustomerSegment(orderCount, totalSpend, lastOrderDate, firstOrderDate) {
  if (orderCount === 0 || !lastOrderDate) {
    return {
      segment: 'New',
      lastOrderDaysAgo: null,
      purchaseFrequency: 'None'
    };
  }

  const now = new Date();
  const lastOrder = new Date(lastOrderDate);
  const lastOrderDaysAgo = Math.floor((now - lastOrder) / (1000 * 60 * 60 * 24));

  let purchaseFrequency = 'Occasional';

  if (orderCount >= 2 && firstOrderDate) {
    const firstOrder = new Date(firstOrderDate);
    const customerLifespanDays = Math.floor((lastOrder - firstOrder) / (1000 * 60 * 60 * 24));

    if (customerLifespanDays > 0) {
      const avgDaysBetweenOrders = customerLifespanDays / (orderCount - 1);

      if (avgDaysBetweenOrders <= 7) {
        purchaseFrequency = 'Weekly';
      } else if (avgDaysBetweenOrders <= 30) {
        purchaseFrequency = 'Monthly';
      } else if (avgDaysBetweenOrders <= 90) {
        purchaseFrequency = 'Quarterly';
      } else {
        purchaseFrequency = 'Occasional';
      }
    }
  } else if (orderCount === 1) {
    purchaseFrequency = 'One-time';
  }

  let segment;

  if (totalSpend > 5000) {
    segment = 'VIP';
  } else if (lastOrderDaysAgo > 90) {
    segment = 'Dormant';
  } else if (firstOrderDate) {
    const firstOrder = new Date(firstOrderDate);
    const firstOrderDaysAgo = Math.floor((now - firstOrder) / (1000 * 60 * 60 * 24));
    if (firstOrderDaysAgo <= 30) {
      segment = 'New';
    } else {
      segment = 'Active';
    }
  } else if (lastOrderDaysAgo <= 90) {
    segment = 'Active';
  } else {
    segment = 'New';
  }

  return {
    segment,
    lastOrderDaysAgo,
    purchaseFrequency
  };
}

// Get single customer/contact by contactID (OPTIMIZED with cache)
async function getCustomer(contactID, requestStart) {
  let cacheHit = false;

  // Try cache first (if cache table is configured)
  if (CACHE_TABLE_NAME) {
    try {
      const cacheParams = {
        TableName: CACHE_TABLE_NAME,
        Key: { contactID }
      };

      const cacheResult = await docClient.send(new GetCommand(cacheParams));

      if (cacheResult.Item) {
        cacheHit = true;
        const responseTime = Date.now() - requestStart;

        console.log(`Cache HIT for customer ${contactID} (${responseTime}ms)`);

        // Format cached data to match expected response format
        const cachedData = {
          contactID: cacheResult.Item.contactID,
          name: cacheResult.Item.name,
          firstName: cacheResult.Item.firstName,
          lastName: cacheResult.Item.lastName,
          email: cacheResult.Item.email,
          phone: cacheResult.Item.phone,
          company: cacheResult.Item.company,
          accountName: cacheResult.Item.accountName,
          accountCode: cacheResult.Item.accountCode,
          metrics: {
            orderCount: cacheResult.Item.orderCount,
            totalSpend: cacheResult.Item.totalSpend.toFixed(2),
            lastOrderDate: cacheResult.Item.lastOrderDate,
            lastOrderReference: cacheResult.Item.lastOrderReference,
            segment: cacheResult.Item.segment,
            lastOrderDaysAgo: cacheResult.Item.lastOrderDaysAgo,
            purchaseFrequency: cacheResult.Item.purchaseFrequency
          }
        };

        return formatResponse(cachedData, { responseTime, cacheHit });
      }
    } catch (cacheError) {
      console.log('Cache miss or error, falling back to orders query:', cacheError.message);
    }
  }

  // Fallback: Query orders directly (original implementation)
  const ordersParams = {
    TableName: ORDERS_TABLE_NAME,
    IndexName: 'contactID-index',
    KeyConditionExpression: 'contactID = :contactID',
    ExpressionAttributeValues: {
      ':contactID': contactID
    }
  };

  const ordersResult = await docClient.send(new QueryCommand(ordersParams));

  if (!ordersResult.Items || ordersResult.Items.length === 0) {
    const responseTime = Date.now() - requestStart;
    return formatResponse(null, {
      error: `Customer not found: ${contactID}`,
      statusCode: 404,
      responseTime,
      cacheHit
    });
  }

  const orders = ordersResult.Items;
  const orderCount = orders.length;
  const totalSpend = orders.reduce((sum, order) => {
    const total = parseFloat(order.totals?.total || 0);
    return sum + total;
  }, 0);

  const sortedOrders = orders.sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  const lastOrder = sortedOrders[0];
  const firstOrder = sortedOrders[sortedOrders.length - 1];

  const segmentationData = calculateCustomerSegment(
    orderCount,
    totalSpend,
    lastOrder?.createdAt || null,
    firstOrder?.createdAt || null
  );

  const customerInfo = lastOrder.customer || {};
  const customerWithMetrics = {
    contactID,
    name: customerInfo.contact_name || `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim(),
    firstName: customerInfo.firstName || '',
    lastName: customerInfo.lastName || '',
    email: customerInfo.email || '',
    phone: customerInfo.phone || '',
    company: customerInfo.company || '',
    accountName: customerInfo.account_name || '',
    accountCode: customerInfo.account_code || '',
    metrics: {
      orderCount,
      totalSpend: totalSpend.toFixed(2),
      lastOrderDate: lastOrder?.createdAt || null,
      lastOrderReference: lastOrder?.order_reference || null,
      segment: segmentationData.segment,
      lastOrderDaysAgo: segmentationData.lastOrderDaysAgo,
      purchaseFrequency: segmentationData.purchaseFrequency
    }
  };

  const responseTime = Date.now() - requestStart;
  logSlowQuery('getCustomer', responseTime, ordersParams);

  return formatResponse(customerWithMetrics, { responseTime, cacheHit });
}

// List all customers (OPTIMIZED with cache)
async function listCustomers(queryParams, requestStart) {
  const { limit = 50, search } = queryParams;
  let cacheHit = false;

  // Try cache first (if cache table is configured)
  if (CACHE_TABLE_NAME && !search) {
    try {
      const cacheParams = {
        TableName: CACHE_TABLE_NAME,
        Limit: parseInt(limit) * 2 // Get more from cache since we'll filter/sort
      };

      const cacheResult = await docClient.send(new ScanCommand(cacheParams));

      if (cacheResult.Items && cacheResult.Items.length > 0) {
        cacheHit = true;

        console.log(`Cache HIT for listCustomers - ${cacheResult.Items.length} items from cache`);

        // Format cached data
        let customers = cacheResult.Items.map(item => ({
          contactID: item.contactID,
          name: item.name,
          firstName: item.firstName,
          lastName: item.lastName,
          email: item.email,
          phone: item.phone,
          company: item.company,
          accountName: item.accountName,
          accountCode: item.accountCode,
          metrics: {
            orderCount: item.orderCount,
            totalSpend: item.totalSpend.toFixed(2),
            lastOrderDate: item.lastOrderDate,
            lastOrderReference: item.lastOrderReference,
            segment: item.segment,
            lastOrderDaysAgo: item.lastOrderDaysAgo,
            purchaseFrequency: item.purchaseFrequency
          }
        }));

        // Sort by total spend descending
        customers.sort((a, b) =>
          parseFloat(b.metrics.totalSpend) - parseFloat(a.metrics.totalSpend)
        );

        // Apply limit
        const limitedCustomers = customers.slice(0, parseInt(limit));

        const responseTime = Date.now() - requestStart;
        console.log(`listCustomers response time (from cache): ${responseTime}ms`);

        return formatResponse(limitedCustomers, {
          count: limitedCustomers.length,
          total: customers.length,
          responseTime,
          cacheHit
        });
      }
    } catch (cacheError) {
      console.log('Cache miss or error, falling back to orders scan:', cacheError.message);
    }
  }

  // Fallback: Scan all orders to aggregate (original implementation)
  console.log('Using fallback: scanning orders to build customer list');

  const params = {
    TableName: ORDERS_TABLE_NAME
  };

  const result = await docClient.send(new ScanCommand(params));
  const orders = result.Items;

  // Group orders by contactID to build customer profiles
  const customerMap = {};

  orders.forEach(order => {
    const contactID = order.contactID;
    if (!contactID) return;

    if (!customerMap[contactID]) {
      const customerInfo = order.customer || {};
      customerMap[contactID] = {
        contactID,
        name: customerInfo.contact_name || `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim(),
        firstName: customerInfo.firstName || '',
        lastName: customerInfo.lastName || '',
        email: customerInfo.email || '',
        phone: customerInfo.phone || '',
        company: customerInfo.company || '',
        accountName: customerInfo.account_name || '',
        accountCode: customerInfo.account_code || '',
        orders: []
      };
    }

    customerMap[contactID].orders.push(order);
  });

  // Calculate metrics for each customer
  let customers = Object.values(customerMap).map(customer => {
    const orderCount = customer.orders.length;
    const totalSpend = customer.orders.reduce((sum, order) => {
      const total = parseFloat(order.totals?.total || 0);
      return sum + total;
    }, 0);

    const sortedOrders = customer.orders.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    const lastOrder = sortedOrders[0];
    const firstOrder = sortedOrders[sortedOrders.length - 1];

    const segmentationData = calculateCustomerSegment(
      orderCount,
      totalSpend,
      lastOrder?.createdAt || null,
      firstOrder?.createdAt || null
    );

    return {
      contactID: customer.contactID,
      name: customer.name,
      firstName: customer.firstName,
      lastName: customer.lastName,
      email: customer.email,
      phone: customer.phone,
      company: customer.company,
      accountName: customer.accountName,
      accountCode: customer.accountCode,
      metrics: {
        orderCount,
        totalSpend: totalSpend.toFixed(2),
        lastOrderDate: lastOrder?.createdAt || null,
        lastOrderReference: lastOrder?.order_reference || null,
        segment: segmentationData.segment,
        lastOrderDaysAgo: segmentationData.lastOrderDaysAgo,
        purchaseFrequency: segmentationData.purchaseFrequency
      }
    };
  });

  // Apply search filter if provided
  if (search) {
    const searchLower = search.toLowerCase();
    customers = customers.filter(customer =>
      customer.name?.toLowerCase().includes(searchLower) ||
      customer.email?.toLowerCase().includes(searchLower) ||
      customer.company?.toLowerCase().includes(searchLower)
    );
  }

  // Sort by total spend descending
  customers.sort((a, b) =>
    parseFloat(b.metrics.totalSpend) - parseFloat(a.metrics.totalSpend)
  );

  // Apply limit
  const limitedCustomers = customers.slice(0, parseInt(limit));

  const responseTime = Date.now() - requestStart;
  logSlowQuery('listCustomers (fallback)', responseTime, params);

  return formatResponse(limitedCustomers, {
    count: limitedCustomers.length,
    total: customers.length,
    responseTime,
    cacheHit
  });
}

// Get all orders for a specific customer
async function getCustomerOrders(contactID, queryParams, requestStart) {
  const { limit = 50, lastEvaluatedKey } = queryParams;

  const params = {
    TableName: ORDERS_TABLE_NAME,
    IndexName: 'contactID-index',
    KeyConditionExpression: 'contactID = :contactID',
    ExpressionAttributeValues: {
      ':contactID': contactID
    },
    Limit: parseInt(limit),
    ScanIndexForward: false // Most recent first
  };

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  const result = await docClient.send(new QueryCommand(params));

  const responseTime = Date.now() - requestStart;
  logSlowQuery('getCustomerOrders', responseTime, params);

  return formatResponse(result.Items, {
    count: result.Items.length,
    lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
    responseTime
  });
}

// Get all orders containing a specific product (NEEDS OPTIMIZATION - Consider GSI)
async function getProductOrders(productCode, queryParams, requestStart) {
  const { limit = 100, lastEvaluatedKey } = queryParams;

  // NOTE: This still uses Scan. For better performance, consider adding a GSI on product_codes
  // Current approach: Scan table and filter (expensive for large datasets)
  const params = {
    TableName: ORDERS_TABLE_NAME,
    Limit: parseInt(limit)
  };

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  const result = await docClient.send(new ScanCommand(params));

  // Filter orders that contain the specified product
  const ordersWithProduct = result.Items.filter(order => {
    return (order.items || []).some(item => item.product_code === productCode);
  }).map(order => {
    const productItem = order.items.find(item => item.product_code === productCode);

    return {
      orderID: order.orderID,
      order_reference: order.order_reference,
      order_date: order.order_date,
      createdAt: order.createdAt,
      status: order.status,
      customer: {
        contactID: order.contactID,
        contact_name: order.customer?.contact_name || '',
        firstName: order.customer?.firstName || '',
        lastName: order.customer?.lastName || '',
        email: order.customer?.email || '',
        phone: order.customer?.phone || '',
        company: order.customer?.company || '',
        account_name: order.customer?.account_name || '',
        account_code: order.customer?.account_code || ''
      },
      productItem: {
        product_code: productItem.product_code,
        description: productItem.description,
        quantity: productItem.quantity,
        unit_price: productItem.unit_price,
        total_price: productItem.total_price
      },
      orderTotals: order.totals,
      delivery: order.delivery,
      payment: order.payment
    };
  });

  ordersWithProduct.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const totalQuantity = ordersWithProduct.reduce((sum, o) => sum + (o.productItem.quantity || 0), 0);
  const totalRevenue = ordersWithProduct.reduce((sum, o) => sum + (parseFloat(o.productItem.total_price) || 0), 0);
  const avgQuantityPerOrder = ordersWithProduct.length > 0 ? (totalQuantity / ordersWithProduct.length).toFixed(2) : 0;

  const uniqueCustomers = new Set(ordersWithProduct.map(o => o.customer.contactID));
  const category = getCategoryForProduct(productCode);

  const responseTime = Date.now() - requestStart;
  logSlowQuery('getProductOrders', responseTime, params);

  return formatResponse({
    productCode,
    category: category || 'Uncategorized',
    summary: {
      totalOrders: ordersWithProduct.length,
      uniqueCustomers: uniqueCustomers.size,
      totalQuantitySold: totalQuantity,
      totalRevenue: totalRevenue.toFixed(2),
      avgQuantityPerOrder
    },
    orders: ordersWithProduct
  }, {
    count: ordersWithProduct.length,
    lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null,
    responseTime
  });
}

// Product analytics report
async function getProductReport(queryParams, requestStart) {
  const { startDate, endDate, category } = queryParams;

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

  const INVALID_PRODUCT_CODES = new Set([
    'font', 'line', 'col', 'border', 'margin', 'text', 'vertical', 'max', 'mobile',
    'content', 'list', 'padding', 'inline', '16', 'CLIENT', 'webkit', 'mso', 'ms',
    'x', 'button', 'full', 'header', 'style', 'width', 'height', 'color', 'display',
    'background', 'align', 'size'
  ]);

  const isValidProductCode = (code) => {
    if (!code) return false;
    if (INVALID_PRODUCT_CODES.has(code.toLowerCase())) return false;
    if (code.includes(':') || code.includes('{') || code.includes('}') || code.includes(';')) return false;
    return true;
  };

  const productMap = {};

  orders.forEach(order => {
    (order.items || []).forEach(item => {
      const key = item.product_code;

      if (!isValidProductCode(key)) {
        return;
      }

      const productCategory = getCategoryForProduct(item.product_code);

      if (category && productCategory !== category) {
        return;
      }

      if (!productMap[key]) {
        productMap[key] = {
          product_code: item.product_code,
          description: item.description,
          category: productCategory || 'Uncategorized',
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
  const sortedByRevenue = [...products].sort((a, b) => b.total_revenue - a.total_revenue);
  const sortedByQuantity = [...products].sort((a, b) => b.total_quantity - a.total_quantity);

  const productListData = {
    products: sortedByRevenue,
    topByRevenue: sortedByRevenue,
    topByQuantity: sortedByQuantity,
    summary: {
      total_products: products.length,
      total_orders_analyzed: orders.length,
      category_filter: category || null
    }
  };

  const responseTime = Date.now() - requestStart;
  logSlowQuery('getProductReport', responseTime, params);

  return formatResponse(productListData, {
    count: products.length,
    total: products.length,
    responseTime
  });
}

// Get all product categories
async function getProductCategories(queryParams, requestStart) {
  const categoryList = Object.keys(PRODUCT_CATEGORIES).map(categoryName => {
    const categoryData = PRODUCT_CATEGORIES[categoryName];
    return {
      name: categoryName,
      description: categoryData.description,
      keywords: categoryData.keywords,
      product_count: categoryData.products.length,
      products: categoryData.products
    };
  });

  const responseData = {
    categories: categoryList,
    metadata: {
      total_categories: categoryList.length,
      total_products: categoryList.reduce((sum, cat) => sum + cat.product_count, 0),
      version: CATEGORIES_METADATA.version,
      last_updated: CATEGORIES_METADATA.last_updated
    }
  };

  const responseTime = Date.now() - requestStart;

  return formatResponse(responseData, {
    count: categoryList.length,
    responseTime
  });
}

// Sales overview report
async function getSalesReport(queryParams, requestStart) {
  const { startDate, endDate, groupBy = 'day' } = queryParams;

  let params = {
    TableName: ORDERS_TABLE_NAME,
    IndexName: 'clientID-createdAt-index',
    KeyConditionExpression: 'clientID = :clientID',
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

  const responseTime = Date.now() - requestStart;
  logSlowQuery('getSalesReport', responseTime, params);

  return formatResponse(reportData, { responseTime });
}

// Dashboard overview report
async function getOverviewReport(queryParams, requestStart) {
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

  // Get total customer count
  const allOrdersForCustomerCount = await docClient.send(new ScanCommand({
    TableName: ORDERS_TABLE_NAME,
    ProjectionExpression: 'contactID'
  }));

  const uniqueCustomerIDs = new Set(
    allOrdersForCustomerCount.Items
      .map(order => order.contactID)
      .filter(id => id)
  );
  const totalCustomerCount = uniqueCustomerIDs.size;

  const overviewData = {
    overview: {
      today: calculateMetrics(todayOrders),
      this_week: calculateMetrics(weekOrders),
      this_month: calculateMetrics(allOrders),
      total_customers: totalCustomerCount
    },
    recent_orders: allOrders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
  };

  const responseTime = Date.now() - requestStart;
  logSlowQuery('getOverviewReport', responseTime, params);

  return formatResponse(overviewData, { responseTime });
}

// Comprehensive order statistics aggregation
async function getOrderStatistics(queryParams, requestStart) {
  const {
    startDate,
    endDate,
    includeCustomerStats = 'true'
  } = queryParams;

  const includeCustomers = includeCustomerStats === 'true' || includeCustomerStats === true;

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
    } else if (startDate) {
      params.KeyConditionExpression += ' AND createdAt >= :startDate';
      params.ExpressionAttributeValues[':startDate'] = startDate;
    } else if (endDate) {
      params.KeyConditionExpression += ' AND createdAt <= :endDate';
      params.ExpressionAttributeValues[':endDate'] = endDate;
    }

    const result = await docClient.send(new QueryCommand(params));
    orders = result.Items;
  } else {
    const result = await docClient.send(new ScanCommand(params));
    orders = result.Items;
  }

  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const stats = {
    totalRevenue: 0,
    totalOrders: orders.length,
    ordersByStatus: {},
    ordersByPaymentType: {},
    customerRevenue: {},
    customerOrderCount: {},
    deliveryCities: {},
    ordersByHour: {},
    ordersByDay: {},
    totalItems: 0,
    trends: {
      last7Days: { orders: 0, revenue: 0 },
      last30Days: { orders: 0, revenue: 0 },
      last90Days: { orders: 0, revenue: 0 }
    }
  };

  orders.forEach(order => {
    const orderTotal = parseFloat(order.totals?.total || 0);
    const orderDate = new Date(order.createdAt);
    const orderDateISO = order.createdAt;
    const status = order.status || 'unknown';
    const paymentType = order.payment?.payment_type || 'Unknown';
    const contactID = order.contactID;
    const deliveryCity = order.delivery?.city || 'Unknown';
    const itemCount = order.items?.length || 0;

    stats.totalRevenue += orderTotal;
    stats.totalItems += itemCount;

    if (!stats.ordersByStatus[status]) {
      stats.ordersByStatus[status] = { count: 0, revenue: 0 };
    }
    stats.ordersByStatus[status].count += 1;
    stats.ordersByStatus[status].revenue += orderTotal;

    if (!stats.ordersByPaymentType[paymentType]) {
      stats.ordersByPaymentType[paymentType] = { count: 0, revenue: 0 };
    }
    stats.ordersByPaymentType[paymentType].count += 1;
    stats.ordersByPaymentType[paymentType].revenue += orderTotal;

    if (includeCustomers && contactID) {
      if (!stats.customerRevenue[contactID]) {
        stats.customerRevenue[contactID] = {
          contactID,
          name: order.customer?.contact_name || 'Unknown',
          email: order.customer?.email || '',
          company: order.customer?.company || '',
          totalRevenue: 0,
          orderCount: 0
        };
      }
      stats.customerRevenue[contactID].totalRevenue += orderTotal;
      stats.customerRevenue[contactID].orderCount += 1;

      if (!stats.customerOrderCount[contactID]) {
        stats.customerOrderCount[contactID] = {
          contactID,
          name: order.customer?.contact_name || 'Unknown',
          email: order.customer?.email || '',
          company: order.customer?.company || '',
          orderCount: 0,
          totalRevenue: 0
        };
      }
      stats.customerOrderCount[contactID].orderCount += 1;
      stats.customerOrderCount[contactID].totalRevenue += orderTotal;
    }

    if (deliveryCity && deliveryCity !== 'Unknown') {
      stats.deliveryCities[deliveryCity] = (stats.deliveryCities[deliveryCity] || 0) + 1;
    }

    const hour = orderDate.getHours();
    const dayOfWeek = orderDate.getDay();

    stats.ordersByHour[hour] = (stats.ordersByHour[hour] || 0) + 1;
    stats.ordersByDay[dayOfWeek] = (stats.ordersByDay[dayOfWeek] || 0) + 1;

    if (orderDateISO >= last7Days) {
      stats.trends.last7Days.orders += 1;
      stats.trends.last7Days.revenue += orderTotal;
    }
    if (orderDateISO >= last30Days) {
      stats.trends.last30Days.orders += 1;
      stats.trends.last30Days.revenue += orderTotal;
    }
    if (orderDateISO >= last90Days) {
      stats.trends.last90Days.orders += 1;
      stats.trends.last90Days.revenue += orderTotal;
    }
  });

  const averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;
  const avgItemsPerOrder = stats.totalOrders > 0 ? stats.totalItems / stats.totalOrders : 0;

  const topCustomersByRevenue = includeCustomers
    ? Object.values(stats.customerRevenue)
        .sort((a, b) => b.totalRevenue - a.totalRevenue)
        .slice(0, 5)
        .map(c => ({
          contactID: c.contactID,
          name: c.name,
          email: c.email,
          company: c.company,
          totalRevenue: c.totalRevenue.toFixed(2),
          orderCount: c.orderCount
        }))
    : [];

  const topCustomersByOrderCount = includeCustomers
    ? Object.values(stats.customerOrderCount)
        .sort((a, b) => b.orderCount - a.orderCount)
        .slice(0, 5)
        .map(c => ({
          contactID: c.contactID,
          name: c.name,
          email: c.email,
          company: c.company,
          orderCount: c.orderCount,
          totalRevenue: c.totalRevenue.toFixed(2)
        }))
    : [];

  const topCities = Object.entries(stats.deliveryCities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([city, count]) => ({ city, orderCount: count }));

  const peakHourEntry = Object.entries(stats.ordersByHour)
    .sort((a, b) => b[1] - a[1])[0];
  const peakHour = peakHourEntry ? `${peakHourEntry[0]}:00` : 'N/A';

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const peakDayEntry = Object.entries(stats.ordersByDay)
    .sort((a, b) => b[1] - a[1])[0];
  const peakDay = peakDayEntry ? dayNames[parseInt(peakDayEntry[0])] : 'N/A';

  const byPaymentType = {};
  Object.entries(stats.ordersByPaymentType).forEach(([type, data]) => {
    byPaymentType[type] = {
      count: data.count,
      revenue: data.revenue.toFixed(2)
    };
  });

  const byStatus = {};
  Object.entries(stats.ordersByStatus).forEach(([status, data]) => {
    byStatus[status] = {
      count: data.count,
      revenue: data.revenue.toFixed(2)
    };
  });

  const statisticsData = {
    overall: {
      totalRevenue: stats.totalRevenue.toFixed(2),
      totalOrders: stats.totalOrders,
      averageOrderValue: averageOrderValue.toFixed(2)
    },
    byPaymentType,
    byStatus,
    trends: {
      last7Days: {
        orders: stats.trends.last7Days.orders,
        revenue: stats.trends.last7Days.revenue.toFixed(2)
      },
      last30Days: {
        orders: stats.trends.last30Days.orders,
        revenue: stats.trends.last30Days.revenue.toFixed(2)
      },
      last90Days: {
        orders: stats.trends.last90Days.orders,
        revenue: stats.trends.last90Days.revenue.toFixed(2)
      }
    },
    insights: {
      peakOrderHour: peakHour,
      peakOrderDay: peakDay,
      commonCities: topCities,
      avgItemsPerOrder: avgItemsPerOrder.toFixed(2)
    }
  };

  if (includeCustomers) {
    statisticsData.topCustomers = {
      byRevenue: topCustomersByRevenue,
      byOrderCount: topCustomersByOrderCount
    };
  }

  const responseTime = Date.now() - requestStart;
  logSlowQuery('getOrderStatistics', responseTime, params);

  const meta = {
    count: stats.totalOrders,
    dateRange: {
      startDate: startDate || null,
      endDate: endDate || null
    },
    generatedAt: new Date().toISOString(),
    includeCustomerStats: includeCustomers
  };

  return formatResponse(statisticsData, {
    count: stats.totalOrders,
    total: stats.totalOrders,
    responseTime,
    ...meta
  });
}

// Product category report with sales breakdown
async function getCategoryReport(queryParams, requestStart) {
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

  const categoryStats = {};
  for (const [categoryName, categoryData] of Object.entries(PRODUCT_CATEGORIES)) {
    categoryStats[categoryName] = {
      ...categoryData,
      totalRevenue: 0,
      totalQuantity: 0,
      orderCount: 0,
      products: {}
    };
  }

  categoryStats['Uncategorized'] = {
    description: 'Products not assigned to any category',
    totalRevenue: 0,
    totalQuantity: 0,
    orderCount: 0,
    products: {}
  };

  orders.forEach(order => {
    const processedCategories = new Set();

    (order.items || []).forEach(item => {
      const category = getCategoryForProduct(item.product_code) || 'Uncategorized';
      const productCode = item.product_code;
      const quantity = item.quantity || 0;
      const revenue = item.total_price || 0;

      categoryStats[category].totalRevenue += revenue;
      categoryStats[category].totalQuantity += quantity;

      if (!processedCategories.has(category)) {
        categoryStats[category].orderCount += 1;
        processedCategories.add(category);
      }

      if (!categoryStats[category].products[productCode]) {
        categoryStats[category].products[productCode] = {
          product_code: productCode,
          description: item.description,
          totalRevenue: 0,
          totalQuantity: 0,
          orderCount: 0
        };
      }
      categoryStats[category].products[productCode].totalRevenue += revenue;
      categoryStats[category].products[productCode].totalQuantity += quantity;
      categoryStats[category].products[productCode].orderCount += 1;
    });
  });

  const categories = {};
  for (const [categoryName, stats] of Object.entries(categoryStats)) {
    if (stats.totalRevenue === 0 && categoryName !== 'Uncategorized') {
      continue;
    }

    categories[categoryName] = {
      description: stats.description,
      keywords: stats.keywords,
      totalRevenue: stats.totalRevenue.toFixed(2),
      totalQuantity: stats.totalQuantity,
      orderCount: stats.orderCount,
      products: Object.values(stats.products).sort((a, b) => b.totalRevenue - a.totalRevenue)
    };
  }

  const overallStats = getCategoryStats();
  const categoriesWithSales = Object.keys(categories).filter(c => c !== 'Uncategorized').length;

  const reportData = {
    summary: {
      totalCategories: overallStats.totalCategories,
      categoriesWithSales,
      totalProductTypes: overallStats.totalProducts,
      ordersAnalyzed: orders.length,
      dateRange: { startDate, endDate }
    },
    categoryBreakdown: categories,
    metadata: overallStats.metadata
  };

  const responseTime = Date.now() - requestStart;
  logSlowQuery('getCategoryReport', responseTime, params);

  return formatResponse(reportData, { responseTime });
}
