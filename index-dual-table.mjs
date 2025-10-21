import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const CONTACTS_TABLE_NAME = process.env.CONTACTS_TABLE_NAME; // RocketReview_Contacts
const ORDERS_TABLE_NAME = process.env.ORDERS_TABLE_NAME; // packprod-weborders
const AWS_REGION = process.env.AWS_REGION;

export const handler = async (event) => {
  console.log("Event: ", JSON.stringify(event, null, 2));

  // CORS headers for all responses
  const headers = {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
    "Access-Control-Allow-Methods": "POST,OPTIONS"
  };

  // Handle OPTIONS request for CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' })
    };
  }

  try {
    // Parse the request body
    let requestBody;
    if (event.body) {
      if (typeof event.body === 'string') {
        requestBody = JSON.parse(event.body);
      } else {
        requestBody = event.body;
      }
    } else {
      requestBody = event;
    }

    console.log("Parsed request body: ", JSON.stringify(requestBody, null, 2));

    // Extract data from the request
    const clientID = requestBody.clientID || "7b0d485f-8ef9-45b0-881a-9d8f4447ced2";
    const orderData = requestBody.order || {};
    const customerData = requestBody.customer || {};
    const deliveryData = requestBody.delivery || {};
    const orderItems = requestBody.items || [];
    const totalsData = requestBody.totals || {};
    const paymentData = requestBody.payment || {};

    const timestamp = new Date().toISOString();
    const hasOrderData = !!(orderData.order_reference || orderItems.length > 0);

    // Validate required fields
    if (!customerData.email && !customerData.contact_name) {
      return {
        statusCode: 400,
        body: JSON.stringify({
          message: "At least one of customer email or contact_name is required",
          receivedData: requestBody
        }),
        headers,
      };
    }

    // Check for duplicate contact based on email + clientID
    let isDuplicateContact = false;
    let existingContactID = null;

    if (customerData.email) {
      const duplicateCheckParams = {
        TableName: CONTACTS_TABLE_NAME,
        IndexName: "clientID-status-index",
        KeyConditionExpression: "clientID = :clientID",
        FilterExpression: "email = :email",
        ExpressionAttributeValues: {
          ":clientID": clientID,
          ":email": customerData.email.toLowerCase().trim()
        }
      };

      const duplicateResult = await docClient.send(new QueryCommand(duplicateCheckParams));

      if (duplicateResult.Items && duplicateResult.Items.length > 0) {
        isDuplicateContact = true;
        existingContactID = duplicateResult.Items[0].contactID;
        console.log(`Duplicate contact found for email: ${customerData.email}, contactID: ${existingContactID}`);
      }
    }

    // Parse name into first and last name
    let firstName = "";
    let lastName = "";
    let fullName = customerData.contact_name || "";

    if (fullName) {
      const nameParts = fullName.trim().split(' ');
      firstName = nameParts[0] || "";
      lastName = nameParts.slice(1).join(' ') || "";
    }

    // Generate or use existing contact ID
    const contactID = existingContactID || customerData.contact_id || customerData.contactID || uuidv4();

    // Handle phone number
    let phoneNumber = "";
    if (customerData.phone) {
      phoneNumber = typeof customerData.phone === 'number'
        ? customerData.phone.toString()
        : customerData.phone.toString();
    }

    // Generate unique order ID
    const orderID = orderData.order_reference
      ? `ORD-${orderData.order_reference}-${Date.now()}`
      : uuidv4();

    // Prepare contact item for RocketReview_Contacts (backward compatible)
    const contactItem = {
      contactID: contactID,
      clientID: clientID,

      // Standard contact fields
      email: customerData.email ? customerData.email.toLowerCase().trim() : "",
      firstName: firstName,
      lastName: lastName,
      name: fullName,
      phone: phoneNumber,
      company: customerData.company || "",

      // Packaging Products specific fields
      ppl_account: customerData.account_name || "",
      ppl_account_number: customerData.account_code ?
        (typeof customerData.account_code === 'number' ?
          customerData.account_code.toString() :
          customerData.account_code) : "",

      // Import tracking
      ImportBatchId: `ppl_import_${new Date().toISOString()}`,

      // System fields
      status: customerData.status || "pending",
      source: "packaging_products_import",
      metadata: {
        originalData: customerData,
        importSource: "packaging_products",
        importedAt: timestamp,
        hasOrderData: hasOrderData,
        linkedOrderID: hasOrderData ? orderID : null
      },
      createdAt: customerData.created_at || timestamp,
      updatedAt: timestamp
    };

    // Prepare complete order record for packprod-weborders
    const orderRecord = {
      orderID: orderID,
      contactID: contactID,
      clientID: clientID,

      // Tags
      ClientName: "Packaging Products",
      Project: "WebOrders",

      // Order information
      order_reference: orderData.order_reference || "",
      order_date: orderData.order_date || "",
      greentree_order_reference: orderData.greentree_order_reference || "",
      greentree_id: orderData.greentree_id || "",
      greentree_status: orderData.greentree_status || "",
      cms_shop_reference: orderData.cms_shop_reference || "",
      cms_shop_id: orderData.cms_shop_id || "",

      // Customer/Contact Information
      customer: {
        contact_name: fullName,
        firstName: firstName,
        lastName: lastName,
        email: customerData.email ? customerData.email.toLowerCase().trim() : "",
        phone: phoneNumber,
        company: customerData.company || "",
        account_name: customerData.account_name || "",
        account_code: customerData.account_code || ""
      },

      // Delivery address
      delivery: {
        name: deliveryData.name || "",
        company: deliveryData.company || "",
        street: deliveryData.street || "",
        city: deliveryData.city || "",
        country: deliveryData.country || "",
        phone: deliveryData.phone || ""
      },

      // Order items
      items: orderItems.map(item => ({
        product_code: item.product_code || "",
        description: item.description || "",
        unit_price: item.unit_price || 0,
        quantity: item.quantity || 0,
        total_price: item.total_price || 0
      })),

      // Order totals
      totals: {
        subtotal: totalsData.subtotal || "",
        freight: totalsData.freight || "",
        freight_description: totalsData.freight_description || "",
        gst: totalsData.gst || "",
        total: totalsData.total || ""
      },

      // Payment details
      payment: {
        payment_type: paymentData.payment_type || "",
        transaction_id: paymentData.transaction_id || "",
        amount: paymentData.amount || ""
      },

      // System fields
      status: "pending",
      source: "packaging_products_email_import",
      metadata: {
        originalData: requestBody,
        importSource: "packaging_products",
        importedAt: timestamp,
        orderItemCount: orderItems.length,
        emailProcessed: true
      },
      createdAt: timestamp,
      updatedAt: timestamp
    };

    // Write to both tables
    const writes = [];

    // Write contact to RocketReview_Contacts (skip if duplicate)
    if (!isDuplicateContact) {
      writes.push(
        docClient.send(new PutCommand({
          TableName: CONTACTS_TABLE_NAME,
          Item: contactItem,
          ConditionExpression: "attribute_not_exists(contactID)"
        }))
        .then(() => ({ table: 'contacts', success: true }))
        .catch(err => {
          if (err.name === 'ConditionalCheckFailedException') {
            console.log(`Contact already exists: ${contactID}`);
            return { table: 'contacts', success: false, reason: 'duplicate' };
          }
          throw err;
        })
      );
    } else {
      console.log(`Skipping duplicate contact write for ${contactID}`);
    }

    // Write complete order to packprod-weborders (always write if we have order data)
    if (hasOrderData) {
      writes.push(
        docClient.send(new PutCommand({
          TableName: ORDERS_TABLE_NAME,
          Item: orderRecord
        }))
        .then(() => ({ table: 'orders', success: true }))
        .catch(err => {
          console.error(`Error writing to orders table: ${err.message}`);
          return { table: 'orders', success: false, error: err.message };
        })
      );
    }

    // Execute all writes
    const results = await Promise.all(writes);
    console.log("Write results:", JSON.stringify(results, null, 2));

    const contactWritten = results.find(r => r.table === 'contacts')?.success || isDuplicateContact;
    const orderWritten = results.find(r => r.table === 'orders')?.success || false;

    // Prepare response
    const response = {
      message: "Packaging Products import completed",
      result: "SUCCESS",
      clientID: clientID,
      contactID: contactID,
      orderID: hasOrderData ? orderID : null,
      email: contactItem.email,
      name: contactItem.name,
      company: contactItem.company,
      orderReference: orderData.order_reference || null,
      orderDate: orderData.order_date || null,
      orderTotal: totalsData.total || null,
      itemCount: orderItems.length,
      writes: {
        contactWritten: contactWritten,
        contactDuplicate: isDuplicateContact,
        orderWritten: orderWritten
      },
      timestamp: timestamp
    };

    return {
      statusCode: 200,
      body: JSON.stringify(response),
      headers,
    };

  } catch (error) {
    console.error("Error importing Packaging Products data: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({
        message: "Failed to import Packaging Products data",
        error: error.message,
        stack: error.stack
      }),
      headers,
    };
  }
};
