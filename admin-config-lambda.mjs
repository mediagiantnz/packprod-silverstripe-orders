import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, PutCommand, ScanCommand, DeleteCommand } from "@aws-sdk/lib-dynamodb";

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const ADMIN_CONFIG_TABLE_NAME = process.env.ADMIN_CONFIG_TABLE_NAME || "packprod-admin-config";

// CORS headers for all responses
const headers = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
  "Access-Control-Allow-Methods": "GET,PUT,DELETE,OPTIONS"
};

/**
 * Standardized response format wrapper
 * Frontend expects: { success, data, error, meta }
 */
function formatResponse(data, options = {}) {
  const {
    count = null,
    total = null,
    error = null,
    statusCode = error ? (error.includes("not found") ? 404 : error.includes("Invalid") ? 400 : 500) : 200
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
        total,
        timestamp: new Date().toISOString()
      }
    })
  };
}

/**
 * Validation schemas for each config key type
 */
const CONFIG_SCHEMAS = {
  system_name: {
    type: 'string',
    description: 'System name displayed in the dashboard'
  },
  order_notification_email: {
    type: 'string',
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    description: 'Email address for order notifications'
  },
  max_items_per_order: {
    type: 'number',
    min: 1,
    max: 1000,
    description: 'Maximum number of items allowed per order'
  },
  email_alerts_enabled: {
    type: 'boolean',
    description: 'Enable/disable email alert notifications'
  },
  daily_report_time: {
    type: 'string',
    pattern: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/,
    description: 'Daily report time in HH:MM format (24-hour)'
  },
  low_stock_threshold: {
    type: 'number',
    min: 0,
    max: 10000,
    description: 'Minimum stock level before low stock alert'
  },
  default_currency: {
    type: 'string',
    pattern: /^[A-Z]{3}$/,
    description: 'ISO 4217 currency code (e.g., USD, EUR, AUD, NZD)'
  },
  tax_rate: {
    type: 'number',
    min: 0,
    max: 1,
    description: 'Tax rate as decimal (e.g., 0.15 for 15%)'
  },
  business_hours: {
    type: 'object',
    schema: {
      start: { type: 'string', pattern: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/ },
      end: { type: 'string', pattern: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/ }
    },
    description: 'Business operating hours with start and end times'
  },
  api_rate_limit: {
    type: 'number',
    min: 1,
    max: 10000,
    description: 'API requests per minute limit'
  }
};

/**
 * Validate a config value against its schema
 */
function validateConfig(key, value) {
  const schema = CONFIG_SCHEMAS[key];

  if (!schema) {
    return { valid: false, error: `Unknown config key: ${key}` };
  }

  // Type validation
  const actualType = Array.isArray(value) ? 'array' : typeof value;
  if (actualType !== schema.type) {
    return {
      valid: false,
      error: `Invalid type for ${key}. Expected ${schema.type}, got ${actualType}`
    };
  }

  // String pattern validation
  if (schema.type === 'string' && schema.pattern && !schema.pattern.test(value)) {
    return {
      valid: false,
      error: `Invalid format for ${key}. ${schema.description}`
    };
  }

  // Number range validation
  if (schema.type === 'number') {
    if (schema.min !== undefined && value < schema.min) {
      return {
        valid: false,
        error: `Value for ${key} must be at least ${schema.min}`
      };
    }
    if (schema.max !== undefined && value > schema.max) {
      return {
        valid: false,
        error: `Value for ${key} must be at most ${schema.max}`
      };
    }
  }

  // Object schema validation
  if (schema.type === 'object' && schema.schema) {
    for (const [field, fieldSchema] of Object.entries(schema.schema)) {
      if (!value[field]) {
        return {
          valid: false,
          error: `Missing required field '${field}' in ${key}`
        };
      }

      const fieldType = typeof value[field];
      if (fieldType !== fieldSchema.type) {
        return {
          valid: false,
          error: `Invalid type for ${key}.${field}. Expected ${fieldSchema.type}, got ${fieldType}`
        };
      }

      if (fieldSchema.pattern && !fieldSchema.pattern.test(value[field])) {
        return {
          valid: false,
          error: `Invalid format for ${key}.${field}`
        };
      }
    }
  }

  return { valid: true };
}

/**
 * Get all configs from the database
 */
async function getAllConfigs() {
  const params = {
    TableName: ADMIN_CONFIG_TABLE_NAME
  };

  const result = await docClient.send(new ScanCommand(params));

  return formatResponse(result.Items, {
    count: result.Items.length,
    total: result.Items.length
  });
}

/**
 * Get a specific config by key
 */
async function getConfig(configKey) {
  const params = {
    TableName: ADMIN_CONFIG_TABLE_NAME,
    Key: { configKey }
  };

  const result = await docClient.send(new GetCommand(params));

  if (!result.Item) {
    return formatResponse(null, {
      error: `Config not found: ${configKey}`,
      statusCode: 404
    });
  }

  return formatResponse(result.Item);
}

/**
 * Update a specific config
 */
async function updateConfig(configKey, configValue, description, updatedBy = 'admin') {
  // Validate the config
  const validation = validateConfig(configKey, configValue);
  if (!validation.valid) {
    return formatResponse(null, {
      error: validation.error,
      statusCode: 400
    });
  }

  const timestamp = new Date().toISOString();

  const params = {
    TableName: ADMIN_CONFIG_TABLE_NAME,
    Item: {
      configKey,
      configValue,
      description: description || CONFIG_SCHEMAS[configKey]?.description || '',
      updatedAt: timestamp,
      updatedBy
    }
  };

  await docClient.send(new PutCommand(params));

  return formatResponse(params.Item);
}

/**
 * Delete a specific config
 */
async function deleteConfig(configKey) {
  const params = {
    TableName: ADMIN_CONFIG_TABLE_NAME,
    Key: { configKey }
  };

  // Check if config exists first
  const getResult = await docClient.send(new GetCommand(params));

  if (!getResult.Item) {
    return formatResponse(null, {
      error: `Config not found: ${configKey}`,
      statusCode: 404
    });
  }

  await docClient.send(new DeleteCommand(params));

  return formatResponse({
    configKey,
    message: 'Config deleted successfully'
  });
}

/**
 * Get available config schemas for documentation
 */
function getConfigSchemas() {
  const schemas = {};

  for (const [key, schema] of Object.entries(CONFIG_SCHEMAS)) {
    schemas[key] = {
      type: schema.type,
      description: schema.description,
      constraints: {}
    };

    if (schema.pattern) {
      schemas[key].constraints.pattern = schema.pattern.toString();
    }
    if (schema.min !== undefined) {
      schemas[key].constraints.min = schema.min;
    }
    if (schema.max !== undefined) {
      schemas[key].constraints.max = schema.max;
    }
    if (schema.schema) {
      schemas[key].constraints.requiredFields = Object.keys(schema.schema);
    }
  }

  return formatResponse(schemas, {
    count: Object.keys(schemas).length
  });
}

/**
 * Main Lambda handler
 */
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
    const body = event.body ? JSON.parse(event.body) : {};

    // Extract updatedBy from headers if provided
    const updatedBy = event.headers?.['x-user-email'] || event.headers?.['X-User-Email'] || 'admin';

    // Route: GET /api/admin/config/schemas (documentation)
    if (httpMethod === 'GET' && path.includes('/schemas')) {
      return await getConfigSchemas();
    }

    // Route: GET /api/admin/config/{key}
    if (httpMethod === 'GET' && pathParameters.key) {
      return await getConfig(pathParameters.key);
    }

    // Route: GET /api/admin/config
    if (httpMethod === 'GET') {
      return await getAllConfigs();
    }

    // Route: PUT /api/admin/config/{key}
    if (httpMethod === 'PUT' && pathParameters.key) {
      const { configValue, description } = body;

      if (configValue === undefined) {
        return formatResponse(null, {
          error: 'Missing required field: configValue',
          statusCode: 400
        });
      }

      return await updateConfig(pathParameters.key, configValue, description, updatedBy);
    }

    // Route: DELETE /api/admin/config/{key}
    if (httpMethod === 'DELETE' && pathParameters.key) {
      return await deleteConfig(pathParameters.key);
    }

    return formatResponse(null, {
      error: `Route not found: ${httpMethod} ${path}`,
      statusCode: 404
    });

  } catch (error) {
    console.error("Error processing request: ", error);
    return formatResponse(null, {
      error: error.message,
      statusCode: 500
    });
  }
};
