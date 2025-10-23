import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION || "ap-southeast-2" });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const ORDERS_TABLE_NAME = process.env.ORDERS_TABLE_NAME || "packprod-weborders";

/**
 * Calculate totals from order items
 */
function calculateTotals(items, existingTotals) {
  // Calculate subtotal from line items
  const calculatedSubtotal = items.reduce((sum, item) => {
    return sum + (parseFloat(item.total_price) || 0);
  }, 0);

  // Use provided values or fallback to calculated
  const subtotal = existingTotals?.subtotal && existingTotals.subtotal !== ""
    ? existingTotals.subtotal
    : calculatedSubtotal.toFixed(2);

  const freight = existingTotals?.freight && existingTotals.freight !== ""
    ? existingTotals.freight
    : "0.00";

  const gst = existingTotals?.gst && existingTotals.gst !== ""
    ? existingTotals.gst
    : "";

  // Calculate total: if not provided, use subtotal + freight
  const total = existingTotals?.total && existingTotals.total !== ""
    ? existingTotals.total
    : (parseFloat(subtotal) + parseFloat(freight)).toFixed(2);

  return {
    subtotal: subtotal,
    freight: freight,
    freight_description: existingTotals?.freight_description || "",
    gst: gst,
    total: total
  };
}

/**
 * Check if order needs totals backfill
 */
function needsBackfill(order) {
  // Check if totals object exists
  if (!order.totals) {
    return true;
  }

  // Check if total is empty or missing
  if (!order.totals.total || order.totals.total === "") {
    return true;
  }

  return false;
}

/**
 * Main backfill function
 */
async function backfillOrderTotals(dryRun = true) {
  console.log(`Starting backfill process (DRY RUN: ${dryRun})...`);
  console.log(`Table: ${ORDERS_TABLE_NAME}\n`);

  let processedCount = 0;
  let updatedCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  let lastEvaluatedKey = null;

  const ordersToFix = [];

  try {
    // Scan all orders
    do {
      const scanParams = {
        TableName: ORDERS_TABLE_NAME
      };

      if (lastEvaluatedKey) {
        scanParams.ExclusiveStartKey = lastEvaluatedKey;
      }

      const result = await docClient.send(new ScanCommand(scanParams));

      for (const order of result.Items) {
        processedCount++;

        if (needsBackfill(order)) {
          const calculatedTotals = calculateTotals(order.items || [], order.totals);

          ordersToFix.push({
            orderID: order.orderID,
            orderReference: order.order_reference,
            oldTotal: order.totals?.total || "MISSING",
            newTotal: calculatedTotals.total,
            subtotal: calculatedTotals.subtotal,
            freight: calculatedTotals.freight,
            itemCount: order.items?.length || 0
          });

          if (!dryRun) {
            try {
              // Update the order with calculated totals
              await docClient.send(new UpdateCommand({
                TableName: ORDERS_TABLE_NAME,
                Key: { orderID: order.orderID },
                UpdateExpression: "SET totals = :totals, updatedAt = :updatedAt",
                ExpressionAttributeValues: {
                  ":totals": calculatedTotals,
                  ":updatedAt": new Date().toISOString()
                }
              }));

              updatedCount++;
              console.log(`✓ Updated ${order.orderID} (${order.order_reference}): total = $${calculatedTotals.total}`);
            } catch (error) {
              errorCount++;
              console.error(`✗ Error updating ${order.orderID}:`, error.message);
            }
          }
        } else {
          skippedCount++;
        }
      }

      lastEvaluatedKey = result.LastEvaluatedKey;
    } while (lastEvaluatedKey);

    // Print summary
    console.log("\n" + "=".repeat(60));
    console.log("BACKFILL SUMMARY");
    console.log("=".repeat(60));
    console.log(`Total orders scanned: ${processedCount}`);
    console.log(`Orders needing fix: ${ordersToFix.length}`);
    console.log(`Orders with valid totals: ${skippedCount}`);

    if (dryRun) {
      console.log(`\nDRY RUN - No changes made to database`);
      console.log(`\nOrders that would be updated:\n`);

      ordersToFix.forEach((order, index) => {
        console.log(`${index + 1}. ${order.orderReference} (${order.orderID})`);
        console.log(`   Old total: ${order.oldTotal}`);
        console.log(`   New total: $${order.newTotal} (subtotal: $${order.subtotal}, freight: $${order.freight})`);
        console.log(`   Items: ${order.itemCount}\n`);
      });

      console.log(`\nTo apply these changes, run:`);
      console.log(`node backfill-totals.mjs --apply\n`);
    } else {
      console.log(`\nOrders updated: ${updatedCount}`);
      console.log(`Errors: ${errorCount}`);
      console.log("\n✓ Backfill complete!\n");
    }

  } catch (error) {
    console.error("Error during backfill:", error);
    throw error;
  }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = !args.includes("--apply");

// Run the backfill
backfillOrderTotals(dryRun)
  .then(() => {
    console.log("Backfill process completed successfully");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Backfill process failed:", error);
    process.exit(1);
  });
