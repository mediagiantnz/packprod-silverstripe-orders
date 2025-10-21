import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, ScanCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const ORDERS_TABLE_NAME = process.env.ORDERS_TABLE_NAME; // packprod-weborders
const CLIENT_ID = "7b0d485f-8ef9-45b0-881a-9d8f4447ced2";

// Product Categories Data
const PRODUCT_CATEGORIES = {
  "Cardboard Boxes": {
    products: ["CCPP2", "CCPP4", "CCPP10", "CCQ"],
    description: "Cardboard packaging boxes in various sizes for shipping and storage",
    keywords: ["box", "cardboard", "PP", "wine bottle"]
  },
  "Packaging Tape & Dispensers": {
    products: ["TSPAKPTH", "MTDD2"],
    description: "Packaging tape, premium tape, and tape dispensers for sealing packages",
    keywords: ["tape", "dispenser", "clear pak", "premium"]
  },
  "Labels & Stickers": {
    products: ["LMETBBB", "LMETPB", "LSHIP12", "1LMED4"],
    description: "Shipping labels, price gun labels, warning labels, and specialty stickers",
    keywords: ["label", "sticker", "meto", "shipping", "glass with care", "top stow"]
  },
  "Wrapping Paper & Materials": {
    products: ["PWR0900B"],
    description: "Wrapping paper rolls and protective wrapping materials",
    keywords: ["wrapping paper", "gift wrap", "roll", "GSM"]
  },
  "Protective Materials & Films": {
    products: ["YSFHCA20"],
    description: "Stretch film, cast film, and protective wrapping materials",
    keywords: ["film", "stretch", "cast", "power grade", "hand film"]
  },
  "Mailers & Envelopes": {
    products: ["BMST5"],
    description: "Shurtuff mailers, bubble mailers, and shipping envelopes",
    keywords: ["mailer", "shurtuff", "envelope", "bubble"]
  },
  "Office Supplies & Markers": {
    products: ["OMVIVCT"],
    description: "Markers, pens, permanent markers, and office stationery",
    keywords: ["marker", "pen", "permanent", "intensity", "chisel tip", "black"]
  },
  "Gloves & Safety Equipment": {
    products: ["HGPLPFC"],
    description: "Disposable gloves, safety gloves, and protective equipment",
    keywords: ["gloves", "latex", "powder free", "disposable", "safety", "extra large"]
  }
};

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

    if (httpMethod === 'GET' && (path.includes('/reports/products') || path.includes('/products'))) {
      return await getProductReport(queryStringParameters);
    }

    if (httpMethod === 'GET' && path.includes('/reports/sales')) {
      return await getSalesReport(queryStringParameters);
    }

    if (httpMethod === 'GET' && path.includes('/reports/overview')) {
      return await getOverviewReport(queryStringParameters);
    }

    if (httpMethod === 'GET' && path.includes('/reports/statistics')) {
      return await getOrderStatistics(queryStringParameters);
    }

    if (httpMethod === 'GET' && path.includes('/reports/categories')) {
      return await getCategoryReport(queryStringParameters);
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
    status,        // NEW: Filter by order status (pending, completed, cancelled)
    customerID,    // NEW: Filter by specific customer (contactID)
    paymentType,   // NEW: Filter by payment method (PxPay, Account)
    productCode,   // NEW: Filter orders containing specific product
    search,        // Text search
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

    return formatResponse(result.Items, {
      count: result.Items.length,
      lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null
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

    return formatResponse(result.Items, {
      count: result.Items.length,
      lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null
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

  return formatResponse(sortedOrders, {
    count: sortedOrders.length,
    lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null
  });
}

/**
 * Calculate customer segment based on order history and spending
 * @param {number} orderCount - Total number of orders
 * @param {number} totalSpend - Total amount spent
 * @param {string|null} lastOrderDate - ISO date string of last order
 * @param {string|null} firstOrderDate - ISO date string of first order
 * @returns {string} Customer segment: 'VIP', 'Active', 'New', or 'Dormant'
 */
function calculateCustomerSegment(orderCount, totalSpend, lastOrderDate, firstOrderDate) {
  // Handle edge case: no orders
  if (orderCount === 0 || !lastOrderDate) {
    return 'New';
  }

  const now = new Date();
  const lastOrder = new Date(lastOrderDate);
  const lastOrderDaysAgo = Math.floor((now - lastOrder) / (1000 * 60 * 60 * 24));

  // VIP: Total spend > $500 AND 5+ orders
  if (totalSpend > 500 && orderCount >= 5) {
    return 'VIP';
  }

  // Dormant: Last order > 90 days ago
  if (lastOrderDaysAgo > 90) {
    return 'Dormant';
  }

  // New: 0-1 orders OR first order within last 30 days
  if (orderCount <= 1) {
    return 'New';
  }

  if (firstOrderDate) {
    const firstOrder = new Date(firstOrderDate);
    const firstOrderDaysAgo = Math.floor((now - firstOrder) / (1000 * 60 * 60 * 24));
    if (firstOrderDaysAgo <= 30) {
      return 'New';
    }
  }

  // Active: 2+ orders AND last order within 90 days
  if (orderCount >= 2 && lastOrderDaysAgo <= 90) {
    return 'Active';
  }

  // Default fallback
  return 'New';
}

// Get single customer/contact by contactID (from orders)
async function getCustomer(contactID) {
  // Get all orders for this customer
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
    return formatResponse(null, {
      error: `Customer not found: ${contactID}`,
      statusCode: 404
    });
  }

  const orders = ordersResult.Items;
  const orderCount = orders.length;
  const totalSpend = orders.reduce((sum, order) => {
    const total = parseFloat(order.totals?.total || 0);
    return sum + total;
  }, 0);

  // Sort orders by date to find first and last orders
  const sortedOrders = orders.sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  const lastOrder = sortedOrders[0];
  const firstOrder = sortedOrders[sortedOrders.length - 1];

  // Calculate customer segment
  const segment = calculateCustomerSegment(
    orderCount,
    totalSpend,
    lastOrder?.createdAt || null,
    firstOrder?.createdAt || null
  );

  // Build customer profile from orders
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
      segment
    }
  };

  return formatResponse(customerWithMetrics);
}

// List all customers (aggregated from orders)
async function listCustomers(queryParams) {
  const { limit = 50, search } = queryParams;

  // Scan all orders to aggregate unique customers
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

    // Sort orders by date to find first and last orders
    const sortedOrders = customer.orders.sort((a, b) =>
      new Date(b.createdAt) - new Date(a.createdAt)
    );

    const lastOrder = sortedOrders[0];
    const firstOrder = sortedOrders[sortedOrders.length - 1];

    // Calculate customer segment
    const segment = calculateCustomerSegment(
      orderCount,
      totalSpend,
      lastOrder?.createdAt || null,
      firstOrder?.createdAt || null
    );

    // Return customer without orders array (we don't need it in the response)
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
        segment
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

  return formatResponse(limitedCustomers, {
    count: limitedCustomers.length,
    total: customers.length
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
    ScanIndexForward: false // Most recent first
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

// Product analytics report
async function getProductReport(queryParams) {
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

  // List of garbage/invalid product codes to filter out (CSS/HTML junk from import)
  const INVALID_PRODUCT_CODES = new Set([
    'font', 'line', 'col', 'border', 'margin', 'text', 'vertical', 'max', 'mobile',
    'content', 'list', 'padding', 'inline', '16', 'CLIENT', 'webkit', 'mso', 'ms',
    'x', 'button', 'full', 'header', 'style', 'width', 'height', 'color', 'display',
    'background', 'align', 'size'
  ]);

  // Helper function to check if a product code is valid
  const isValidProductCode = (code) => {
    if (!code) return false;
    // Reject if in invalid list
    if (INVALID_PRODUCT_CODES.has(code.toLowerCase())) return false;
    // Reject if looks like CSS (contains common CSS characters)
    if (code.includes(':') || code.includes('{') || code.includes('}') || code.includes(';')) return false;
    // Accept if it's a known valid pattern (contains letters and numbers, mostly uppercase)
    return true;
  };

  // Aggregate product data
  const productMap = {};

  orders.forEach(order => {
    (order.items || []).forEach(item => {
      const key = item.product_code;

      // Skip invalid product codes
      if (!isValidProductCode(key)) {
        return;
      }

      if (!productMap[key]) {
        productMap[key] = {
          product_code: item.product_code,
          description: item.description,
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

  // Sort by revenue
  const topByRevenue = [...products].sort((a, b) => b.total_revenue - a.total_revenue).slice(0, 20);

  // Sort by quantity
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

  // Calculate totals
  const totalRevenue = orders.reduce((sum, order) => {
    const total = parseFloat(order.totals?.total || 0);
    return sum + total;
  }, 0);

  const totalOrders = orders.length;
  const averageOrderValue = totalOrders > 0 ? totalRevenue / totalOrders : 0;

  // Group by date
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
  // Get today's date range
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayISO = today.toISOString();

  // Get this week's date range
  const weekStart = new Date(today);
  weekStart.setDate(today.getDate() - today.getDay());
  const weekStartISO = weekStart.toISOString();

  // Get this month's date range
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const monthStartISO = monthStart.toISOString();

  // Query for this month's orders
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

  // Filter for today and this week
  const todayOrders = allOrders.filter(o => o.createdAt >= todayISO);
  const weekOrders = allOrders.filter(o => o.createdAt >= weekStartISO);

  const calculateMetrics = (orders) => ({
    order_count: orders.length,
    revenue: orders.reduce((sum, o) => sum + parseFloat(o.totals?.total || 0), 0).toFixed(2),
    avg_order_value: orders.length > 0 ?
      (orders.reduce((sum, o) => sum + parseFloat(o.totals?.total || 0), 0) / orders.length).toFixed(2) :
      '0.00'
  });

  // Get total customer count by counting unique contactIDs from all orders
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

  return formatResponse(overviewData);
}

// Comprehensive order statistics aggregation
async function getOrderStatistics(queryParams) {
  const {
    startDate,
    endDate,
    includeCustomerStats = 'true'
  } = queryParams;

  const includeCustomers = includeCustomerStats === 'true' || includeCustomerStats === true;

  // Query orders with optional date range
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

  // Calculate date ranges for trends
  const now = new Date();
  const last7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const last30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const last90Days = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Initialize aggregation objects
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

  // Process each order
  orders.forEach(order => {
    const orderTotal = parseFloat(order.totals?.total || 0);
    const orderDate = new Date(order.createdAt);
    const orderDateISO = order.createdAt;
    const status = order.status || 'unknown';
    const paymentType = order.payment?.payment_type || 'Unknown';
    const contactID = order.contactID;
    const deliveryCity = order.delivery?.city || 'Unknown';
    const itemCount = order.items?.length || 0;

    // Overall metrics
    stats.totalRevenue += orderTotal;
    stats.totalItems += itemCount;

    // Status breakdown
    if (!stats.ordersByStatus[status]) {
      stats.ordersByStatus[status] = { count: 0, revenue: 0 };
    }
    stats.ordersByStatus[status].count += 1;
    stats.ordersByStatus[status].revenue += orderTotal;

    // Payment type breakdown
    if (!stats.ordersByPaymentType[paymentType]) {
      stats.ordersByPaymentType[paymentType] = { count: 0, revenue: 0 };
    }
    stats.ordersByPaymentType[paymentType].count += 1;
    stats.ordersByPaymentType[paymentType].revenue += orderTotal;

    // Customer metrics (if enabled)
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

    // Delivery city metrics
    if (deliveryCity && deliveryCity !== 'Unknown') {
      stats.deliveryCities[deliveryCity] = (stats.deliveryCities[deliveryCity] || 0) + 1;
    }

    // Hour and day of week analysis
    const hour = orderDate.getHours();
    const dayOfWeek = orderDate.getDay(); // 0 = Sunday, 6 = Saturday

    stats.ordersByHour[hour] = (stats.ordersByHour[hour] || 0) + 1;
    stats.ordersByDay[dayOfWeek] = (stats.ordersByDay[dayOfWeek] || 0) + 1;

    // Trends
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

  // Calculate average order value
  const averageOrderValue = stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

  // Calculate average items per order
  const avgItemsPerOrder = stats.totalOrders > 0 ? stats.totalItems / stats.totalOrders : 0;

  // Get top 5 customers by revenue
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

  // Get top 5 customers by order count
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

  // Get top 10 delivery cities
  const topCities = Object.entries(stats.deliveryCities)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([city, count]) => ({ city, orderCount: count }));

  // Find peak ordering hour
  const peakHourEntry = Object.entries(stats.ordersByHour)
    .sort((a, b) => b[1] - a[1])[0];
  const peakHour = peakHourEntry ? `${peakHourEntry[0]}:00` : 'N/A';

  // Find peak ordering day
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const peakDayEntry = Object.entries(stats.ordersByDay)
    .sort((a, b) => b[1] - a[1])[0];
  const peakDay = peakDayEntry ? dayNames[parseInt(peakDayEntry[0])] : 'N/A';

  // Format payment type breakdown
  const byPaymentType = {};
  Object.entries(stats.ordersByPaymentType).forEach(([type, data]) => {
    byPaymentType[type] = {
      count: data.count,
      revenue: data.revenue.toFixed(2)
    };
  });

  // Format status breakdown
  const byStatus = {};
  Object.entries(stats.ordersByStatus).forEach(([status, data]) => {
    byStatus[status] = {
      count: data.count,
      revenue: data.revenue.toFixed(2)
    };
  });

  // Build response
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

  // Add customer stats if included
  if (includeCustomers) {
    statisticsData.topCustomers = {
      byRevenue: topCustomersByRevenue,
      byOrderCount: topCustomersByOrderCount
    };
  }

  // Add metadata
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
    ...meta
  });
}

// Product category report with sales breakdown
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

  // Initialize category stats
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

  // Uncategorized tracking
  categoryStats['Uncategorized'] = {
    description: 'Products not assigned to any category',
    totalRevenue: 0,
    totalQuantity: 0,
    orderCount: 0,
    products: {}
  };

  // Process all order items
  orders.forEach(order => {
    const processedCategories = new Set();

    (order.items || []).forEach(item => {
      const category = getCategoryForProduct(item.product_code) || 'Uncategorized';
      const productCode = item.product_code;
      const quantity = item.quantity || 0;
      const revenue = item.total_price || 0;

      // Update category totals
      categoryStats[category].totalRevenue += revenue;
      categoryStats[category].totalQuantity += quantity;

      // Track unique orders per category
      if (!processedCategories.has(category)) {
        categoryStats[category].orderCount += 1;
        processedCategories.add(category);
      }

      // Update product-specific stats
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

  // Format response
  const categories = {};
  for (const [categoryName, stats] of Object.entries(categoryStats)) {
    if (stats.totalRevenue === 0 && categoryName !== 'Uncategorized') {
      continue; // Skip categories with no sales
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

  // Calculate overall stats
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

  return formatResponse(reportData);
}
