import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);
const sesClient = new SESClient({ region: process.env.AWS_REGION });

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "andy@automateai.co.nz";
const FROM_EMAIL = process.env.FROM_EMAIL || "noreply@automateai.co.nz";

/**
 * Generate HTML email template for customer order confirmation
 */
function generateCustomerEmailHtml(order) {
  const orderDate = order.order_date || order.createdAt || "N/A";
  const orderRef = order.order_reference || "N/A";
  const customerName = order.customer?.contact_name || "Valued Customer";
  const total = order.totals?.total || "0.00";

  // Format items table
  const itemsHtml = order.items?.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.product_code || ""}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee;">${item.description || ""}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 0}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.unit_price || 0).toFixed(2)}</td>
      <td style="padding: 10px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.total_price || 0).toFixed(2)}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="padding: 10px;">No items</td></tr>';

  const deliveryHtml = order.delivery ? `
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px; margin-top: 20px;">
      <h3 style="color: #333; margin-top: 0;">Delivery Address</h3>
      <p style="margin: 5px 0;">${order.delivery.name || ""}</p>
      ${order.delivery.company ? `<p style="margin: 5px 0;">${order.delivery.company}</p>` : ""}
      <p style="margin: 5px 0;">${order.delivery.street || ""}</p>
      <p style="margin: 5px 0;">${order.delivery.city || ""}</p>
      <p style="margin: 5px 0;">${order.delivery.country || ""}</p>
      ${order.delivery.phone ? `<p style="margin: 5px 0;">Phone: ${order.delivery.phone}</p>` : ""}
    </div>
  ` : "";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Order Confirmation - ${orderRef}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #0066cc; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0;">
    <h1 style="margin: 0;">Order Confirmation</h1>
  </div>

  <div style="background-color: #ffffff; padding: 30px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
    <p>Dear ${customerName},</p>

    <p>Thank you for your order! We're pleased to confirm that we've received your order and it's being processed.</p>

    <div style="background-color: #f0f8ff; padding: 15px; border-left: 4px solid #0066cc; margin: 20px 0;">
      <p style="margin: 5px 0;"><strong>Order Reference:</strong> ${orderRef}</p>
      <p style="margin: 5px 0;"><strong>Order Date:</strong> ${orderDate}</p>
      <p style="margin: 5px 0;"><strong>Order Total:</strong> $${total}</p>
    </div>

    <h3 style="color: #333; border-bottom: 2px solid #0066cc; padding-bottom: 10px;">Order Details</h3>

    <table style="width: 100%; border-collapse: collapse; margin: 20px 0;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Code</th>
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
          <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Unit Price</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="text-align: right; margin-top: 20px;">
      <table style="width: 100%; max-width: 300px; margin-left: auto;">
        <tr>
          <td style="padding: 5px;"><strong>Subtotal:</strong></td>
          <td style="padding: 5px; text-align: right;">$${order.totals?.subtotal || "0.00"}</td>
        </tr>
        <tr>
          <td style="padding: 5px;"><strong>Freight${order.totals?.freight_description ? ` (${order.totals.freight_description})` : ""}:</strong></td>
          <td style="padding: 5px; text-align: right;">$${order.totals?.freight || "0.00"}</td>
        </tr>
        ${order.totals?.gst ? `
        <tr>
          <td style="padding: 5px;"><strong>GST:</strong></td>
          <td style="padding: 5px; text-align: right;">$${order.totals.gst}</td>
        </tr>
        ` : ""}
        <tr style="border-top: 2px solid #333;">
          <td style="padding: 5px;"><strong>Total:</strong></td>
          <td style="padding: 5px; text-align: right;"><strong>$${total}</strong></td>
        </tr>
      </table>
    </div>

    ${deliveryHtml}

    ${order.payment?.payment_type ? `
    <div style="margin-top: 20px;">
      <h3 style="color: #333;">Payment Information</h3>
      <p style="margin: 5px 0;">Payment Type: ${order.payment.payment_type}</p>
      ${order.payment.transaction_id ? `<p style="margin: 5px 0;">Transaction ID: ${order.payment.transaction_id}</p>` : ""}
    </div>
    ` : ""}

    <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
      <p>If you have any questions about your order, please don't hesitate to contact us.</p>
      <p>Thank you for choosing Packaging Products!</p>
    </div>
  </div>

  <div style="text-align: center; padding: 20px; color: #666; font-size: 12px;">
    <p>Packaging Products</p>
    <p style="margin: 5px 0;">This is an automated message. Please do not reply to this email.</p>
    <p style="margin: 5px 0;">
      <a href="mailto:support@packagingproducts.co.nz" style="color: #0066cc;">Contact Support</a>
    </p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email for customer order confirmation
 */
function generateCustomerEmailText(order) {
  const orderDate = order.order_date || order.createdAt || "N/A";
  const orderRef = order.order_reference || "N/A";
  const customerName = order.customer?.contact_name || "Valued Customer";
  const total = order.totals?.total || "0.00";

  const itemsText = order.items?.map(item =>
    `${item.product_code || ""} - ${item.description || ""}\n` +
    `  Quantity: ${item.quantity || 0} x $${parseFloat(item.unit_price || 0).toFixed(2)} = $${parseFloat(item.total_price || 0).toFixed(2)}`
  ).join('\n\n') || 'No items';

  let deliveryText = "";
  if (order.delivery) {
    deliveryText = `
DELIVERY ADDRESS
================
${order.delivery.name || ""}
${order.delivery.company || ""}
${order.delivery.street || ""}
${order.delivery.city || ""}
${order.delivery.country || ""}
${order.delivery.phone ? `Phone: ${order.delivery.phone}` : ""}
    `.trim();
  }

  return `
ORDER CONFIRMATION
==================

Dear ${customerName},

Thank you for your order! We're pleased to confirm that we've received your order and it's being processed.

Order Reference: ${orderRef}
Order Date: ${orderDate}
Order Total: $${total}

ORDER DETAILS
=============

${itemsText}

TOTALS
======
Subtotal: $${order.totals?.subtotal || "0.00"}
Freight${order.totals?.freight_description ? ` (${order.totals.freight_description})` : ""}: $${order.totals?.freight || "0.00"}
${order.totals?.gst ? `GST: $${order.totals.gst}\n` : ""}Total: $${total}

${deliveryText}

${order.payment?.payment_type ? `
PAYMENT INFORMATION
===================
Payment Type: ${order.payment.payment_type}
${order.payment.transaction_id ? `Transaction ID: ${order.payment.transaction_id}` : ""}
` : ""}

If you have any questions about your order, please don't hesitate to contact us.

Thank you for choosing Packaging Products!

---
Packaging Products
This is an automated message. Please do not reply to this email.
Contact Support: support@packagingproducts.co.nz
  `.trim();
}

/**
 * Generate HTML email template for admin notification
 */
function generateAdminEmailHtml(order) {
  const orderDate = order.order_date || order.createdAt || "N/A";
  const orderRef = order.order_reference || "N/A";
  const customerName = order.customer?.contact_name || "N/A";
  const customerEmail = order.customer?.email || "N/A";
  const total = order.totals?.total || "0.00";

  const itemsHtml = order.items?.map(item => `
    <tr>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.product_code || ""}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.description || ""}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity || 0}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.unit_price || 0).toFixed(2)}</td>
      <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">$${parseFloat(item.total_price || 0).toFixed(2)}</td>
    </tr>
  `).join('') || '<tr><td colspan="5" style="padding: 8px;">No items</td></tr>';

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Order Alert - ${orderRef}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 700px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #ff6600; color: white; padding: 15px; text-align: center; border-radius: 5px 5px 0 0;">
    <h1 style="margin: 0;">🔔 New Order Received</h1>
  </div>

  <div style="background-color: #ffffff; padding: 25px; border: 1px solid #ddd; border-top: none; border-radius: 0 0 5px 5px;">
    <div style="background-color: #fff3e0; padding: 15px; border-left: 4px solid #ff6600; margin-bottom: 20px;">
      <p style="margin: 5px 0; font-size: 16px;"><strong>Order Reference:</strong> ${orderRef}</p>
      <p style="margin: 5px 0;"><strong>Order Date:</strong> ${orderDate}</p>
      <p style="margin: 5px 0;"><strong>Order Total:</strong> $${total}</p>
      <p style="margin: 5px 0;"><strong>Order ID:</strong> <code style="background: #f5f5f5; padding: 2px 5px;">${order.orderID}</code></p>
    </div>

    <h3 style="color: #333; border-bottom: 2px solid #ff6600; padding-bottom: 10px;">Customer Information</h3>
    <table style="width: 100%; margin-bottom: 20px;">
      <tr>
        <td style="padding: 5px; width: 150px;"><strong>Name:</strong></td>
        <td style="padding: 5px;">${customerName}</td>
      </tr>
      ${order.customer?.company ? `
      <tr>
        <td style="padding: 5px;"><strong>Company:</strong></td>
        <td style="padding: 5px;">${order.customer.company}</td>
      </tr>
      ` : ""}
      <tr>
        <td style="padding: 5px;"><strong>Email:</strong></td>
        <td style="padding: 5px;"><a href="mailto:${customerEmail}" style="color: #0066cc;">${customerEmail}</a></td>
      </tr>
      ${order.customer?.phone ? `
      <tr>
        <td style="padding: 5px;"><strong>Phone:</strong></td>
        <td style="padding: 5px;">${order.customer.phone}</td>
      </tr>
      ` : ""}
      ${order.customer?.account_code ? `
      <tr>
        <td style="padding: 5px;"><strong>Account Code:</strong></td>
        <td style="padding: 5px;">${order.customer.account_code}</td>
      </tr>
      ` : ""}
    </table>

    <h3 style="color: #333; border-bottom: 2px solid #ff6600; padding-bottom: 10px;">Order Items</h3>
    <table style="width: 100%; border-collapse: collapse; margin: 15px 0;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Code</th>
          <th style="padding: 8px; text-align: left; border-bottom: 2px solid #ddd;">Description</th>
          <th style="padding: 8px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Unit Price</th>
          <th style="padding: 8px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsHtml}
      </tbody>
    </table>

    <div style="text-align: right; margin-top: 15px;">
      <table style="width: 100%; max-width: 300px; margin-left: auto;">
        <tr>
          <td style="padding: 5px;"><strong>Subtotal:</strong></td>
          <td style="padding: 5px; text-align: right;">$${order.totals?.subtotal || "0.00"}</td>
        </tr>
        <tr>
          <td style="padding: 5px;"><strong>Freight:</strong></td>
          <td style="padding: 5px; text-align: right;">$${order.totals?.freight || "0.00"}</td>
        </tr>
        ${order.totals?.gst ? `
        <tr>
          <td style="padding: 5px;"><strong>GST:</strong></td>
          <td style="padding: 5px; text-align: right;">$${order.totals.gst}</td>
        </tr>
        ` : ""}
        <tr style="border-top: 2px solid #333;">
          <td style="padding: 5px;"><strong>Total:</strong></td>
          <td style="padding: 5px; text-align: right;"><strong>$${total}</strong></td>
        </tr>
      </table>
    </div>

    ${order.delivery ? `
    <h3 style="color: #333; border-bottom: 2px solid #ff6600; padding-bottom: 10px; margin-top: 25px;">Delivery Details</h3>
    <div style="background-color: #f9f9f9; padding: 15px; border-radius: 5px;">
      <p style="margin: 5px 0;">${order.delivery.name || ""}</p>
      ${order.delivery.company ? `<p style="margin: 5px 0;">${order.delivery.company}</p>` : ""}
      <p style="margin: 5px 0;">${order.delivery.street || ""}</p>
      <p style="margin: 5px 0;">${order.delivery.city || ""}</p>
      <p style="margin: 5px 0;">${order.delivery.country || ""}</p>
      ${order.delivery.phone ? `<p style="margin: 5px 0;">Phone: ${order.delivery.phone}</p>` : ""}
    </div>
    ` : ""}

    ${order.payment?.payment_type ? `
    <h3 style="color: #333; border-bottom: 2px solid #ff6600; padding-bottom: 10px; margin-top: 25px;">Payment Details</h3>
    <table style="width: 100%;">
      <tr>
        <td style="padding: 5px; width: 150px;"><strong>Payment Type:</strong></td>
        <td style="padding: 5px;">${order.payment.payment_type}</td>
      </tr>
      ${order.payment.transaction_id ? `
      <tr>
        <td style="padding: 5px;"><strong>Transaction ID:</strong></td>
        <td style="padding: 5px;"><code style="background: #f5f5f5; padding: 2px 5px;">${order.payment.transaction_id}</code></td>
      </tr>
      ` : ""}
      ${order.payment.amount ? `
      <tr>
        <td style="padding: 5px;"><strong>Amount:</strong></td>
        <td style="padding: 5px;">${order.payment.amount}</td>
      </tr>
      ` : ""}
    </table>
    ` : ""}

    ${order.greentree_order_reference ? `
    <h3 style="color: #333; border-bottom: 2px solid #ff6600; padding-bottom: 10px; margin-top: 25px;">System Information</h3>
    <table style="width: 100%;">
      ${order.greentree_order_reference ? `
      <tr>
        <td style="padding: 5px; width: 150px;"><strong>Greentree Order:</strong></td>
        <td style="padding: 5px;">${order.greentree_order_reference}</td>
      </tr>
      ` : ""}
      ${order.greentree_id ? `
      <tr>
        <td style="padding: 5px;"><strong>Greentree ID:</strong></td>
        <td style="padding: 5px;">${order.greentree_id}</td>
      </tr>
      ` : ""}
      ${order.greentree_status ? `
      <tr>
        <td style="padding: 5px;"><strong>Status:</strong></td>
        <td style="padding: 5px;">${order.greentree_status}</td>
      </tr>
      ` : ""}
    </table>
    ` : ""}
  </div>

  <div style="text-align: center; padding: 15px; color: #666; font-size: 12px;">
    <p>Packaging Products WebOrders System</p>
    <p style="margin: 5px 0;">Automated notification from DynamoDB Stream</p>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generate plain text email for admin notification
 */
function generateAdminEmailText(order) {
  const orderDate = order.order_date || order.createdAt || "N/A";
  const orderRef = order.order_reference || "N/A";
  const customerName = order.customer?.contact_name || "N/A";
  const customerEmail = order.customer?.email || "N/A";
  const total = order.totals?.total || "0.00";

  const itemsText = order.items?.map(item =>
    `${item.product_code || ""} - ${item.description || ""}\n` +
    `  Quantity: ${item.quantity || 0} x $${parseFloat(item.unit_price || 0).toFixed(2)} = $${parseFloat(item.total_price || 0).toFixed(2)}`
  ).join('\n\n') || 'No items';

  return `
NEW ORDER RECEIVED
==================

Order Reference: ${orderRef}
Order Date: ${orderDate}
Order Total: $${total}
Order ID: ${order.orderID}

CUSTOMER INFORMATION
====================
Name: ${customerName}
${order.customer?.company ? `Company: ${order.customer.company}\n` : ""}Email: ${customerEmail}
${order.customer?.phone ? `Phone: ${order.customer.phone}\n` : ""}${order.customer?.account_code ? `Account Code: ${order.customer.account_code}\n` : ""}

ORDER ITEMS
===========

${itemsText}

TOTALS
======
Subtotal: $${order.totals?.subtotal || "0.00"}
Freight: $${order.totals?.freight || "0.00"}
${order.totals?.gst ? `GST: $${order.totals.gst}\n` : ""}Total: $${total}

${order.delivery ? `
DELIVERY DETAILS
================
${order.delivery.name || ""}
${order.delivery.company || ""}
${order.delivery.street || ""}
${order.delivery.city || ""}
${order.delivery.country || ""}
${order.delivery.phone ? `Phone: ${order.delivery.phone}` : ""}
` : ""}

${order.payment?.payment_type ? `
PAYMENT DETAILS
===============
Payment Type: ${order.payment.payment_type}
${order.payment.transaction_id ? `Transaction ID: ${order.payment.transaction_id}\n` : ""}${order.payment.amount ? `Amount: ${order.payment.amount}\n` : ""}
` : ""}

${order.greentree_order_reference ? `
SYSTEM INFORMATION
==================
${order.greentree_order_reference ? `Greentree Order: ${order.greentree_order_reference}\n` : ""}${order.greentree_id ? `Greentree ID: ${order.greentree_id}\n` : ""}${order.greentree_status ? `Status: ${order.greentree_status}\n` : ""}
` : ""}

---
Packaging Products WebOrders System
Automated notification from DynamoDB Stream
  `.trim();
}

/**
 * Send email using AWS SES
 */
async function sendEmail({ to, subject, htmlBody, textBody }) {
  const params = {
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: Array.isArray(to) ? to : [to]
    },
    Message: {
      Subject: {
        Data: subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: htmlBody,
          Charset: 'UTF-8'
        },
        Text: {
          Data: textBody,
          Charset: 'UTF-8'
        }
      }
    }
  };

  try {
    const command = new SendEmailCommand(params);
    const result = await sesClient.send(command);
    console.log(`Email sent successfully to ${to}`, result);
    return { success: true, messageId: result.MessageId };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Process DynamoDB Stream record
 */
async function processRecord(record) {
  console.log("Processing record:", JSON.stringify(record, null, 2));

  // Only process INSERT events (new orders)
  if (record.eventName !== 'INSERT') {
    console.log(`Skipping ${record.eventName} event`);
    return { skipped: true, reason: 'Not an INSERT event' };
  }

  // Extract the new order data
  const order = record.dynamodb?.NewImage;
  if (!order) {
    console.log("No NewImage found in record");
    return { skipped: true, reason: 'No NewImage' };
  }

  // Unmarshal DynamoDB record (convert from DynamoDB JSON to regular JSON)
  const unmarshalledOrder = unmarshalDynamoDBRecord(order);

  console.log("Unmarshalled order:", JSON.stringify(unmarshalledOrder, null, 2));

  // Validate we have required data
  if (!unmarshalledOrder.orderID || !unmarshalledOrder.customer) {
    console.log("Missing required order data");
    return { skipped: true, reason: 'Missing required data' };
  }

  const results = {
    orderID: unmarshalledOrder.orderID,
    customerEmail: null,
    adminEmail: null
  };

  // Send customer confirmation email (if customer has email)
  if (unmarshalledOrder.customer?.email) {
    console.log(`Sending customer confirmation to ${unmarshalledOrder.customer.email}`);

    const customerSubject = `Order Confirmation - ${unmarshalledOrder.order_reference || unmarshalledOrder.orderID}`;
    const customerHtml = generateCustomerEmailHtml(unmarshalledOrder);
    const customerText = generateCustomerEmailText(unmarshalledOrder);

    results.customerEmail = await sendEmail({
      to: unmarshalledOrder.customer.email,
      subject: customerSubject,
      htmlBody: customerHtml,
      textBody: customerText
    });
  } else {
    console.log("No customer email found, skipping customer notification");
    results.customerEmail = { skipped: true, reason: 'No customer email' };
  }

  // Send admin notification email
  console.log(`Sending admin notification to ${ADMIN_EMAIL}`);

  const adminSubject = `New Order Alert - ${unmarshalledOrder.order_reference || unmarshalledOrder.orderID}`;
  const adminHtml = generateAdminEmailHtml(unmarshalledOrder);
  const adminText = generateAdminEmailText(unmarshalledOrder);

  results.adminEmail = await sendEmail({
    to: ADMIN_EMAIL,
    subject: adminSubject,
    htmlBody: adminHtml,
    textBody: adminText
  });

  return results;
}

/**
 * Unmarshal DynamoDB record from stream format to regular JSON
 */
function unmarshalDynamoDBRecord(record) {
  const unmarshal = (item) => {
    if (!item || typeof item !== 'object') return item;

    // Handle DynamoDB type descriptors
    if (item.S !== undefined) return item.S;
    if (item.N !== undefined) return parseFloat(item.N);
    if (item.BOOL !== undefined) return item.BOOL;
    if (item.NULL !== undefined) return null;
    if (item.M !== undefined) return unmarshal(item.M);
    if (item.L !== undefined) return item.L.map(unmarshal);
    if (item.SS !== undefined) return item.SS;
    if (item.NS !== undefined) return item.NS.map(parseFloat);
    if (item.BS !== undefined) return item.BS;

    // Handle objects
    const result = {};
    for (const [key, value] of Object.entries(item)) {
      result[key] = unmarshal(value);
    }
    return result;
  };

  return unmarshal(record);
}

/**
 * Lambda handler for DynamoDB Stream events
 */
export const handler = async (event) => {
  console.log("Received DynamoDB Stream event:", JSON.stringify(event, null, 2));

  const results = [];

  try {
    // Process each record in the stream
    for (const record of event.Records) {
      try {
        const result = await processRecord(record);
        results.push({
          eventID: record.eventID,
          eventName: record.eventName,
          result: result
        });
      } catch (error) {
        console.error("Error processing record:", error);
        results.push({
          eventID: record.eventID,
          eventName: record.eventName,
          error: error.message,
          stack: error.stack
        });

        // Continue processing other records even if one fails
        // This ensures one bad record doesn't block the entire batch
      }
    }

    console.log("Processing complete:", JSON.stringify(results, null, 2));

    return {
      statusCode: 200,
      body: JSON.stringify({
        message: "Email alerts processed",
        recordsProcessed: event.Records.length,
        results: results
      })
    };

  } catch (error) {
    console.error("Fatal error processing stream:", error);

    // Return error but don't throw - we don't want to retry the entire batch
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Error processing email alerts",
        error: error.message,
        stack: error.stack
      })
    };
  }
};
