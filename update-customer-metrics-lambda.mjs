/**
 * Update Customer Metrics Lambda
 *
 * Triggered by DynamoDB Stream on packprod-weborders table
 * Updates customer-metrics-cache table when orders are inserted/modified/deleted
 *
 * This Lambda maintains an aggregated cache of customer metrics to improve
 * query performance for listCustomers() and getCustomer() endpoints
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, PutCommand, GetCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const ORDERS_TABLE_NAME = process.env.ORDERS_TABLE_NAME; // packprod-weborders
const CACHE_TABLE_NAME = process.env.CACHE_TABLE_NAME; // packprod-customer-metrics-cache

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

/**
 * Recalculate metrics for a specific customer by querying all their orders
 */
async function recalculateCustomerMetrics(contactID) {
  console.log(`Recalculating metrics for customer: ${contactID}`);

  // Query all orders for this customer
  const ordersParams = {
    TableName: ORDERS_TABLE_NAME,
    IndexName: 'contactID-index',
    KeyConditionExpression: 'contactID = :contactID',
    ExpressionAttributeValues: {
      ':contactID': contactID
    }
  };

  const ordersResult = await docClient.send(new QueryCommand(ordersParams));
  const orders = ordersResult.Items || [];

  if (orders.length === 0) {
    console.log(`No orders found for customer ${contactID}, skipping cache update`);
    return null;
  }

  // Calculate metrics
  const orderCount = orders.length;
  const totalSpend = orders.reduce((sum, order) => {
    const total = parseFloat(order.totals?.total || 0);
    return sum + total;
  }, 0);

  // Sort orders by date
  const sortedOrders = orders.sort((a, b) =>
    new Date(b.createdAt) - new Date(a.createdAt)
  );

  const lastOrder = sortedOrders[0];
  const firstOrder = sortedOrders[sortedOrders.length - 1];

  // Calculate segmentation
  const segmentationData = calculateCustomerSegment(
    orderCount,
    totalSpend,
    lastOrder?.createdAt || null,
    firstOrder?.createdAt || null
  );

  // Build customer info from most recent order
  const customerInfo = lastOrder.customer || {};

  const metricsData = {
    contactID,
    name: customerInfo.contact_name || `${customerInfo.firstName || ''} ${customerInfo.lastName || ''}`.trim(),
    firstName: customerInfo.firstName || '',
    lastName: customerInfo.lastName || '',
    email: customerInfo.email || '',
    phone: customerInfo.phone || '',
    company: customerInfo.company || '',
    accountName: customerInfo.account_name || '',
    accountCode: customerInfo.account_code || '',
    orderCount,
    totalSpend: parseFloat(totalSpend.toFixed(2)),
    lastOrderDate: lastOrder?.createdAt || null,
    lastOrderReference: lastOrder?.order_reference || null,
    firstOrderDate: firstOrder?.createdAt || null,
    segment: segmentationData.segment,
    lastOrderDaysAgo: segmentationData.lastOrderDaysAgo,
    purchaseFrequency: segmentationData.purchaseFrequency,
    lastUpdated: new Date().toISOString(),
    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60) // 90 days TTL
  };

  return metricsData;
}

/**
 * Update the cache table with new metrics
 */
async function updateCache(metricsData) {
  const params = {
    TableName: CACHE_TABLE_NAME,
    Item: metricsData
  };

  await docClient.send(new PutCommand(params));
  console.log(`Cache updated for customer ${metricsData.contactID}`);
}

/**
 * Main handler for DynamoDB Stream events
 */
export const handler = async (event) => {
  console.log(`Processing ${event.Records.length} DynamoDB Stream records`);

  const processedCustomers = new Set();

  for (const record of event.Records) {
    try {
      console.log(`Event: ${record.eventName}`);

      // Extract contactID from the record
      let contactID;

      if (record.eventName === 'INSERT' || record.eventName === 'MODIFY') {
        contactID = record.dynamodb.NewImage?.contactID?.S;
      } else if (record.eventName === 'REMOVE') {
        contactID = record.dynamodb.OldImage?.contactID?.S;
      }

      if (!contactID) {
        console.log('No contactID found in record, skipping');
        continue;
      }

      // Skip if we've already processed this customer in this batch
      if (processedCustomers.has(contactID)) {
        console.log(`Customer ${contactID} already processed in this batch, skipping`);
        continue;
      }

      // Recalculate metrics for this customer
      const metricsData = await recalculateCustomerMetrics(contactID);

      if (metricsData) {
        await updateCache(metricsData);
        processedCustomers.add(contactID);
      }

    } catch (error) {
      console.error('Error processing record:', error);
      console.error('Record:', JSON.stringify(record, null, 2));
      // Continue processing other records even if one fails
    }
  }

  console.log(`Successfully processed metrics for ${processedCustomers.size} customers`);

  return {
    statusCode: 200,
    body: JSON.stringify({
      message: `Processed ${processedCustomers.size} customers`,
      processedCustomers: Array.from(processedCustomers)
    })
  };
};
