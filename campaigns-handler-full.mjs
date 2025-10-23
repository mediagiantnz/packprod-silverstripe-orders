/**
 * Campaigns Handler Lambda - Full Implementation
 * Phase 4: Marketing Campaign Management
 *
 * Complete email campaign management with:
 * - CRUD operations for campaigns
 * - Customer segmentation
 * - AWS SES email delivery
 * - Campaign analytics tracking
 *
 * AWS Region: ap-southeast-2
 * AWS Account: 235494808985
 * Client: Packaging Products
 * Project: WebOrders
 */

import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, GetCommand, QueryCommand, ScanCommand, UpdateCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";
import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";
import { randomUUID } from 'crypto';

// Initialize AWS clients
const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);
const sesClient = new SESClient({ region: process.env.AWS_REGION || 'ap-southeast-2' });

// Table names
const CAMPAIGNS_TABLE = "packprod-campaigns";
const CACHE_TABLE = "packprod-customer-metrics-cache";
const ORDERS_TABLE = "packprod-weborders";
const CLIENT_ID = "7b0d485f-8ef9-45b0-881a-9d8f4447ced2";

// SES Configuration
const FROM_EMAIL = "noreply@automateai.co.nz";
const ADMIN_EMAIL = "andy@automateai.co.nz";

// CORS headers for all responses
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS"
};

/**
 * Standardized response format wrapper
 */
function formatResponse(data, options = {}) {
  const {
    count = null,
    lastEvaluatedKey = null,
    total = null,
    error = null,
    statusCode = error ? 500 : 200,
    message = null
  } = options;

  return {
    statusCode,
    headers,
    body: JSON.stringify({
      success: !error,
      data: data,
      error: error,
      message: message,
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

    // Route handling - More specific routes first!

    // POST /api/campaigns/{id}/send - Send campaign to customers
    if (httpMethod === 'POST' && pathParameters.id && path.includes('/send')) {
      return await sendCampaign(pathParameters.id);
    }

    // GET /api/campaigns/{id}/analytics - Campaign analytics
    if (httpMethod === 'GET' && pathParameters.id && path.includes('/analytics')) {
      return await getCampaignAnalytics(pathParameters.id);
    }

    // GET /api/campaigns/{id} - Get single campaign
    if (httpMethod === 'GET' && pathParameters.id) {
      return await getCampaign(pathParameters.id);
    }

    // PUT /api/campaigns/{id} - Update campaign
    if (httpMethod === 'PUT' && pathParameters.id) {
      return await updateCampaign(pathParameters.id, event.body);
    }

    // DELETE /api/campaigns/{id} - Delete campaign
    if (httpMethod === 'DELETE' && pathParameters.id) {
      return await deleteCampaign(pathParameters.id);
    }

    // GET /api/campaigns - List campaigns
    if (httpMethod === 'GET' && path.includes('/campaigns')) {
      return await listCampaigns(queryStringParameters);
    }

    // POST /api/campaigns - Create campaign
    if (httpMethod === 'POST' && path.includes('/campaigns')) {
      return await createCampaign(event.body);
    }

    return formatResponse(null, {
      error: `Route not found: ${httpMethod} ${path}`,
      statusCode: 404
    });

  } catch (error) {
    console.error("Error processing request: ", error);
    return formatResponse(null, {
      error: error.message
    });
  }
};

/**
 * GET /api/campaigns - List all campaigns
 */
async function listCampaigns(queryParams) {
  const { limit = 50, status, lastEvaluatedKey } = queryParams;

  let params = {
    TableName: CAMPAIGNS_TABLE,
    Limit: parseInt(limit)
  };

  // Filter by status if provided
  if (status) {
    params.IndexName = "clientID-status-index";
    params.KeyConditionExpression = "clientID = :clientID AND #status = :status";
    params.ExpressionAttributeNames = {
      "#status": "status"
    };
    params.ExpressionAttributeValues = {
      ":clientID": CLIENT_ID,
      ":status": status
    };

    if (lastEvaluatedKey) {
      params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
    }

    const result = await docClient.send(new QueryCommand(params));

    return formatResponse(result.Items || [], {
      count: result.Items?.length || 0,
      total: result.Items?.length || 0,
      lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null
    });
  }

  // No status filter - scan by clientID
  params.IndexName = "clientID-createdAt-index";
  params.KeyConditionExpression = "clientID = :clientID";
  params.ExpressionAttributeValues = {
    ":clientID": CLIENT_ID
  };
  params.ScanIndexForward = false; // Sort by createdAt descending

  if (lastEvaluatedKey) {
    params.ExclusiveStartKey = JSON.parse(decodeURIComponent(lastEvaluatedKey));
  }

  const result = await docClient.send(new QueryCommand(params));

  return formatResponse(result.Items || [], {
    count: result.Items?.length || 0,
    total: result.Items?.length || 0,
    lastEvaluatedKey: result.LastEvaluatedKey ? encodeURIComponent(JSON.stringify(result.LastEvaluatedKey)) : null
  });
}

/**
 * POST /api/campaigns - Create new campaign
 */
async function createCampaign(bodyString) {
  const body = JSON.parse(bodyString || '{}');
  const { name, subject, content, segment = 'All', type = 'email' } = body;

  // Validation
  if (!name || !subject || !content) {
    return formatResponse(null, {
      error: "Missing required fields: name, subject, content",
      statusCode: 400
    });
  }

  const campaignID = randomUUID();
  const now = new Date().toISOString();

  const campaign = {
    campaignID,
    clientID: CLIENT_ID,
    name,
    subject,
    content,
    segment, // VIP, Active, New, Dormant, All
    type,
    status: 'draft',
    createdAt: now,
    updatedAt: now,
    stats: {
      sent: 0,
      delivered: 0,
      opened: 0,
      clicked: 0,
      converted: 0,
      revenue: 0
    }
  };

  await docClient.send(new PutCommand({
    TableName: CAMPAIGNS_TABLE,
    Item: campaign
  }));

  console.log(`Created campaign: ${campaignID}`);

  return formatResponse(campaign, {
    message: "Campaign created successfully"
  });
}

/**
 * GET /api/campaigns/{id} - Get single campaign
 */
async function getCampaign(campaignId) {
  const result = await docClient.send(new GetCommand({
    TableName: CAMPAIGNS_TABLE,
    Key: { campaignID: campaignId }
  }));

  if (!result.Item) {
    return formatResponse(null, {
      error: `Campaign not found: ${campaignId}`,
      statusCode: 404
    });
  }

  return formatResponse(result.Item);
}

/**
 * PUT /api/campaigns/{id} - Update campaign
 */
async function updateCampaign(campaignId, bodyString) {
  const body = JSON.parse(bodyString || '{}');
  const { name, subject, content, segment, status } = body;

  // Build update expression dynamically
  const updateParts = [];
  const expressionAttributeNames = {};
  const expressionAttributeValues = {
    ":updatedAt": new Date().toISOString()
  };

  if (name) {
    updateParts.push("#name = :name");
    expressionAttributeNames["#name"] = "name";
    expressionAttributeValues[":name"] = name;
  }

  if (subject) {
    updateParts.push("subject = :subject");
    expressionAttributeValues[":subject"] = subject;
  }

  if (content) {
    updateParts.push("content = :content");
    expressionAttributeValues[":content"] = content;
  }

  if (segment) {
    updateParts.push("segment = :segment");
    expressionAttributeValues[":segment"] = segment;
  }

  if (status) {
    updateParts.push("#status = :status");
    expressionAttributeNames["#status"] = "status";
    expressionAttributeValues[":status"] = status;
  }

  updateParts.push("updatedAt = :updatedAt");

  if (updateParts.length === 0) {
    return formatResponse(null, {
      error: "No fields to update",
      statusCode: 400
    });
  }

  const params = {
    TableName: CAMPAIGNS_TABLE,
    Key: { campaignID: campaignId },
    UpdateExpression: `SET ${updateParts.join(", ")}`,
    ExpressionAttributeValues: expressionAttributeValues,
    ReturnValues: "ALL_NEW"
  };

  if (Object.keys(expressionAttributeNames).length > 0) {
    params.ExpressionAttributeNames = expressionAttributeNames;
  }

  const result = await docClient.send(new UpdateCommand(params));

  return formatResponse(result.Attributes, {
    message: "Campaign updated successfully"
  });
}

/**
 * DELETE /api/campaigns/{id} - Delete campaign
 */
async function deleteCampaign(campaignId) {
  await docClient.send(new DeleteCommand({
    TableName: CAMPAIGNS_TABLE,
    Key: { campaignID: campaignId }
  }));

  return formatResponse({ campaignID: campaignId }, {
    message: "Campaign deleted successfully"
  });
}

/**
 * POST /api/campaigns/{id}/send - Send campaign to targeted customers
 */
async function sendCampaign(campaignId) {
  // Get campaign details
  const campaignResult = await docClient.send(new GetCommand({
    TableName: CAMPAIGNS_TABLE,
    Key: { campaignID: campaignId }
  }));

  if (!campaignResult.Item) {
    return formatResponse(null, {
      error: `Campaign not found: ${campaignId}`,
      statusCode: 404
    });
  }

  const campaign = campaignResult.Item;

  // Get customers based on segment
  const customers = await getCustomersBySegment(campaign.segment);

  console.log(`Sending campaign ${campaignId} to ${customers.length} customers (segment: ${campaign.segment})`);

  // Send emails
  let sent = 0;
  let delivered = 0;
  let errors = 0;

  for (const customer of customers) {
    try {
      await sendEmail(customer, campaign);
      sent++;
      delivered++; // Assume delivery success for now
      console.log(`Sent campaign email to: ${customer.email}`);
    } catch (error) {
      console.error(`Failed to send email to ${customer.email}:`, error.message);
      errors++;
    }
  }

  // Update campaign stats
  await docClient.send(new UpdateCommand({
    TableName: CAMPAIGNS_TABLE,
    Key: { campaignID: campaignId },
    UpdateExpression: "SET #status = :status, sentAt = :sentAt, stats.sent = :sent, stats.delivered = :delivered, updatedAt = :updatedAt",
    ExpressionAttributeNames: {
      "#status": "status"
    },
    ExpressionAttributeValues: {
      ":status": "completed",
      ":sentAt": new Date().toISOString(),
      ":sent": sent,
      ":delivered": delivered,
      ":updatedAt": new Date().toISOString()
    }
  }));

  return formatResponse({
    campaignId,
    sent,
    delivered,
    errors,
    segment: campaign.segment,
    totalCustomers: customers.length
  }, {
    message: `Campaign sent to ${sent} customers`
  });
}

/**
 * Get customers by segment from cache
 */
async function getCustomersBySegment(segment) {
  if (segment === 'All') {
    // Get all customers from cache
    const result = await docClient.send(new ScanCommand({
      TableName: CACHE_TABLE
    }));
    return result.Items || [];
  }

  // Scan cache and filter by segment
  const result = await docClient.send(new ScanCommand({
    TableName: CACHE_TABLE,
    FilterExpression: "segment = :segment",
    ExpressionAttributeValues: {
      ":segment": segment
    }
  }));

  return result.Items || [];
}

/**
 * Send email to a customer using SES
 */
async function sendEmail(customer, campaign) {
  // Personalize content
  const personalizedContent = campaign.content
    .replace(/\{firstName\}/g, customer.firstName || customer.name || 'Valued Customer')
    .replace(/\{lastName\}/g, customer.lastName || '')
    .replace(/\{name\}/g, customer.name || 'Valued Customer')
    .replace(/\{company\}/g, customer.company || '');

  const emailParams = {
    Source: FROM_EMAIL,
    Destination: {
      ToAddresses: [customer.email]
    },
    Message: {
      Subject: {
        Data: campaign.subject,
        Charset: 'UTF-8'
      },
      Body: {
        Html: {
          Data: personalizedContent,
          Charset: 'UTF-8'
        }
      }
    }
  };

  await sesClient.send(new SendEmailCommand(emailParams));
}

/**
 * GET /api/campaigns/{id}/analytics - Get campaign analytics
 */
async function getCampaignAnalytics(campaignId) {
  const campaignResult = await docClient.send(new GetCommand({
    TableName: CAMPAIGNS_TABLE,
    Key: { campaignID: campaignId }
  }));

  if (!campaignResult.Item) {
    return formatResponse(null, {
      error: `Campaign not found: ${campaignId}`,
      statusCode: 404
    });
  }

  const campaign = campaignResult.Item;
  const stats = campaign.stats || {
    sent: 0,
    delivered: 0,
    opened: 0,
    clicked: 0,
    converted: 0,
    revenue: 0
  };

  // Calculate rates
  const deliveryRate = stats.sent > 0 ? ((stats.delivered / stats.sent) * 100).toFixed(2) : "0.00";
  const openRate = stats.delivered > 0 ? ((stats.opened / stats.delivered) * 100).toFixed(2) : "0.00";
  const clickRate = stats.opened > 0 ? ((stats.clicked / stats.opened) * 100).toFixed(2) : "0.00";
  const conversionRate = stats.sent > 0 ? ((stats.converted / stats.sent) * 100).toFixed(2) : "0.00";

  const analytics = {
    campaignId: campaignId,
    campaignName: campaign.name,
    segment: campaign.segment,
    status: campaign.status,
    createdAt: campaign.createdAt,
    sentAt: campaign.sentAt || null,
    performance: {
      sent: stats.sent,
      delivered: stats.delivered,
      opened: stats.opened,
      clicked: stats.clicked,
      converted: stats.converted,
      revenue: typeof stats.revenue === 'number' ? stats.revenue.toFixed(2) : "0.00"
    },
    rates: {
      deliveryRate: deliveryRate + "%",
      openRate: openRate + "%",
      clickRate: clickRate + "%",
      conversionRate: conversionRate + "%"
    },
    timeline: [],
    topLinks: [],
    customerSegments: []
  };

  return formatResponse(analytics, {
    count: 1
  });
}
