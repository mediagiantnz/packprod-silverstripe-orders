#!/bin/bash

# Initial population script for customer metrics cache
# This script scans all orders and populates the cache with customer metrics

echo "Populating customer metrics cache..."
echo ""

# Get all orders and group by customer
echo "Step 1: Scanning orders table..."

aws dynamodb scan \
  --table-name packprod-weborders \
  --projection-expression "contactID,customer,totals,createdAt,order_reference" \
  --region ap-southeast-2 \
  --output json > orders-scan.json

echo "Orders scanned. Processing..."

# Use Node.js to process and populate cache
cat > populate-cache.mjs <<'EOF'
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { readFileSync } from 'fs';

const dynamoDBClient = new DynamoDBClient({ region: 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const ORDERS_TABLE_NAME = 'packprod-weborders';
const CACHE_TABLE_NAME = 'packprod-customer-metrics-cache';

function calculateCustomerSegment(orderCount, totalSpend, lastOrderDate, firstOrderDate) {
  if (orderCount === 0 || !lastOrderDate) {
    return { segment: 'New', lastOrderDaysAgo: null, purchaseFrequency: 'None' };
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

      if (avgDaysBetweenOrders <= 7) purchaseFrequency = 'Weekly';
      else if (avgDaysBetweenOrders <= 30) purchaseFrequency = 'Monthly';
      else if (avgDaysBetweenOrders <= 90) purchaseFrequency = 'Quarterly';
    }
  } else if (orderCount === 1) {
    purchaseFrequency = 'One-time';
  }

  let segment;
  if (totalSpend > 5000) segment = 'VIP';
  else if (lastOrderDaysAgo > 90) segment = 'Dormant';
  else if (firstOrderDate) {
    const firstOrder = new Date(firstOrderDate);
    const firstOrderDaysAgo = Math.floor((now - firstOrder) / (1000 * 60 * 60 * 24));
    segment = firstOrderDaysAgo <= 30 ? 'New' : 'Active';
  } else {
    segment = lastOrderDaysAgo <= 90 ? 'Active' : 'New';
  }

  return { segment, lastOrderDaysAgo, purchaseFrequency };
}

async function recalculateAndCache(contactID) {
  const ordersParams = {
    TableName: ORDERS_TABLE_NAME,
    IndexName: 'contactID-index',
    KeyConditionExpression: 'contactID = :contactID',
    ExpressionAttributeValues: { ':contactID': contactID }
  };

  const ordersResult = await docClient.send(new QueryCommand(ordersParams));
  const orders = ordersResult.Items || [];

  if (orders.length === 0) return null;

  const orderCount = orders.length;
  const totalSpend = orders.reduce((sum, order) => sum + parseFloat(order.totals?.total || 0), 0);

  const sortedOrders = orders.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  const lastOrder = sortedOrders[0];
  const firstOrder = sortedOrders[sortedOrders.length - 1];

  const segmentationData = calculateCustomerSegment(
    orderCount,
    totalSpend,
    lastOrder?.createdAt || null,
    firstOrder?.createdAt || null
  );

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
    ttl: Math.floor(Date.now() / 1000) + (90 * 24 * 60 * 60)
  };

  await docClient.send(new PutCommand({
    TableName: CACHE_TABLE_NAME,
    Item: metricsData
  }));

  return metricsData;
}

async function main() {
  const scanData = JSON.parse(readFileSync('orders-scan.json', 'utf8'));
  const orders = scanData.Items;

  // Get unique contactIDs
  const contactIDs = [...new Set(orders.filter(o => o.contactID).map(o => o.contactID.S))];

  console.log(`Found ${contactIDs.length} unique customers`);

  let processed = 0;
  let errors = 0;

  for (const contactID of contactIDs) {
    try {
      await recalculateAndCache(contactID);
      processed++;
      if (processed % 10 === 0) {
        console.log(`Processed ${processed}/${contactIDs.length} customers...`);
      }
    } catch (error) {
      console.error(`Error processing customer ${contactID}:`, error.message);
      errors++;
    }
  }

  console.log('');
  console.log('========================================');
  console.log('Cache Population Complete!');
  console.log('========================================');
  console.log(`Total customers processed: ${processed}`);
  console.log(`Errors: ${errors}`);
  console.log('');

  // Cleanup
  import('fs').then(fs => {
    fs.unlinkSync('orders-scan.json');
    fs.unlinkSync('populate-cache.mjs');
  });
}

main().catch(console.error);
EOF

echo ""
echo "Step 2: Running population script..."
node populate-cache.mjs

echo ""
echo "Cache population complete!"
