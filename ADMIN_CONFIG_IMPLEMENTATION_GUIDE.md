# Admin Configuration System - Implementation Guide

**Project:** Packaging Products WebOrders
**System:** Admin Configuration Management
**Created:** 2025-10-23
**AWS Region:** ap-southeast-2
**AWS Account:** 235494808985

---

## Overview

This document provides complete instructions for deploying and using the admin configuration system for Packaging Products WebOrders. The system provides a REST API for managing system configuration settings with validation, CRUD operations, and full API Gateway integration.

## Architecture

### Components

1. **DynamoDB Table:** `packprod-admin-config`
   - Partition Key: `configKey` (String)
   - Attributes: `configValue`, `description`, `updatedBy`, `updatedAt`
   - Billing: On-Demand (Pay-per-request)

2. **Lambda Function:** `adminConfigHandler`
   - Runtime: Node.js 20.x
   - Handler: `admin-config-lambda.handler`
   - Memory: 256 MB
   - Timeout: 30 seconds
   - Source: `admin-config-lambda.mjs`

3. **IAM Role:** `adminConfigHandlerRole`
   - Policies: AWSLambdaBasicExecutionRole, DynamoDB access

4. **API Gateway Endpoints:**
   - `GET /api/admin/config` - List all configs
   - `GET /api/admin/config/schemas` - Get validation schemas
   - `GET /api/admin/config/{key}` - Get specific config
   - `PUT /api/admin/config/{key}` - Create/update config
   - `DELETE /api/admin/config/{key}` - Delete config

### Data Model

```javascript
{
  "configKey": "system_name",              // Partition key (unique)
  "configValue": "WebOrders System",       // Any JSON type (string, number, boolean, object)
  "description": "System display name",    // Optional description
  "updatedBy": "admin@example.com",        // User who made the change
  "updatedAt": "2025-10-23T10:30:00.000Z"  // ISO timestamp
}
```

---

## Deployment Instructions

### Prerequisites

- AWS CLI configured with valid credentials
- Node.js and npm installed
- Bash shell (Git Bash on Windows, native on Linux/Mac)
- `jq` (optional, for pretty-printing JSON responses)

### Step 1: Create DynamoDB Table

Run the table creation script:

```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"
bash create-admin-config-table.sh
```

This will:
- Create the `packprod-admin-config` table
- Add AWS tags (ClientName, Project, Environment)
- Insert 6 initial test configurations
- Display table status and contents

**Expected Output:**
```
Creating packprod-admin-config table...
Waiting for table to become active...
Table created successfully!
Inserting initial test configurations...
Test configurations inserted successfully!
```

**Verify Table Creation:**
```bash
aws dynamodb describe-table \
  --table-name packprod-admin-config \
  --region ap-southeast-2 \
  --query 'Table.[TableName,TableStatus,ItemCount]'
```

### Step 2: Deploy Lambda Function

Run the Lambda deployment script:

```bash
bash deploy-admin-config-lambda.sh
```

This will:
- Create IAM role `adminConfigHandlerRole`
- Attach necessary policies (Lambda execution, DynamoDB access)
- Install npm dependencies (if needed)
- Package Lambda function code
- Create or update Lambda function
- Configure environment variables

**Expected Output:**
```
=== Admin Config Lambda Deployment ===
Step 1: Creating IAM role...
Step 2: Attaching IAM policies...
Step 3: Checking dependencies...
Step 4: Creating deployment package...
Step 5: Deploying Lambda function...
=== Deployment Complete ===
```

**Verify Lambda Deployment:**
```bash
aws lambda get-function \
  --function-name adminConfigHandler \
  --region ap-southeast-2 \
  --query 'Configuration.[FunctionName,State,LastUpdateStatus]'
```

### Step 3: Configure API Gateway

Run the API Gateway setup script:

```bash
bash setup-admin-config-endpoints.sh
```

This will:
- Create resource hierarchy: `/api/admin/config`
- Add GET, PUT, DELETE methods with Lambda integration
- Enable CORS for all endpoints
- Grant Lambda invocation permissions
- Deploy to `prod` stage

**Expected Output:**
```
=== API Gateway Setup for Admin Configuration ===
Creating /api/admin resource...
Creating /api/admin/config resource...
Creating methods...
API Gateway setup complete!
```

**Verify API Gateway:**
```bash
aws apigateway get-resources \
  --rest-api-id bw4agz6xn4 \
  --region ap-southeast-2 \
  --query 'items[?path==`/api/admin/config`].[path,id]'
```

### Step 4: Test the API

Run the comprehensive test suite:

```bash
bash test-admin-config-api.sh
```

This will execute 13 test cases covering:
- GET all configs
- GET schemas
- GET specific config
- PUT (create/update) configs
- DELETE configs
- Validation error handling
- Error cases (404s)

**Quick Manual Tests:**

```bash
# 1. List all configs
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config"

# 2. Get specific config
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/system_name"

# 3. Update config
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/system_name" \
  -H "Content-Type: application/json" \
  -d '{"configValue": "New System Name"}'

# 4. Delete config
curl -X DELETE "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/test_config"
```

---

## API Reference

### Base URL

```
https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod
```

### Endpoints

#### 1. List All Configs

**GET** `/api/admin/config`

Returns all configuration entries.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "configKey": "system_name",
      "configValue": "Packaging Products WebOrders",
      "description": "System name displayed in the dashboard",
      "updatedAt": "2025-10-23T10:00:00.000Z",
      "updatedBy": "system"
    }
  ],
  "meta": {
    "count": 6,
    "total": 6,
    "timestamp": "2025-10-23T10:30:00.000Z"
  }
}
```

#### 2. Get Config Schemas

**GET** `/api/admin/config/schemas`

Returns validation schemas for all supported config keys.

**Response:**
```json
{
  "success": true,
  "data": {
    "system_name": {
      "type": "string",
      "description": "System name displayed in the dashboard",
      "constraints": {}
    },
    "order_notification_email": {
      "type": "string",
      "description": "Email address for order notifications",
      "constraints": {
        "pattern": "/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/"
      }
    },
    "max_items_per_order": {
      "type": "number",
      "description": "Maximum number of items allowed per order",
      "constraints": {
        "min": 1,
        "max": 1000
      }
    }
  },
  "meta": {
    "count": 10,
    "timestamp": "2025-10-23T10:30:00.000Z"
  }
}
```

#### 3. Get Specific Config

**GET** `/api/admin/config/{key}`

**Parameters:**
- `key` (path) - Config key name

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "configKey": "system_name",
    "configValue": "Packaging Products WebOrders",
    "description": "System name displayed in the dashboard",
    "updatedAt": "2025-10-23T10:00:00.000Z",
    "updatedBy": "system"
  },
  "meta": {
    "timestamp": "2025-10-23T10:30:00.000Z"
  }
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "data": null,
  "error": "Config not found: invalid_key",
  "meta": {
    "timestamp": "2025-10-23T10:30:00.000Z"
  }
}
```

#### 4. Create/Update Config

**PUT** `/api/admin/config/{key}`

**Parameters:**
- `key` (path) - Config key name

**Headers:**
- `Content-Type: application/json`
- `X-User-Email: user@example.com` (optional, for audit trail)

**Request Body:**
```json
{
  "configValue": "New Value",
  "description": "Optional description"
}
```

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "configKey": "system_name",
    "configValue": "New Value",
    "description": "Optional description",
    "updatedAt": "2025-10-23T10:35:00.000Z",
    "updatedBy": "user@example.com"
  },
  "meta": {
    "timestamp": "2025-10-23T10:35:00.000Z"
  }
}
```

**Response (Validation Error):**
```json
{
  "success": false,
  "data": null,
  "error": "Invalid format for order_notification_email. Email address for order notifications",
  "meta": {
    "timestamp": "2025-10-23T10:35:00.000Z"
  }
}
```

#### 5. Delete Config

**DELETE** `/api/admin/config/{key}`

**Parameters:**
- `key` (path) - Config key name

**Response (Success):**
```json
{
  "success": true,
  "data": {
    "configKey": "test_config",
    "message": "Config deleted successfully"
  },
  "meta": {
    "timestamp": "2025-10-23T10:40:00.000Z"
  }
}
```

**Response (Not Found):**
```json
{
  "success": false,
  "data": null,
  "error": "Config not found: test_config",
  "meta": {
    "timestamp": "2025-10-23T10:40:00.000Z"
  }
}
```

---

## Supported Configuration Keys

### Required Test Configurations

1. **system_name** (string)
   - System name displayed in the dashboard
   - Example: `"Packaging Products WebOrders"`

2. **order_notification_email** (string, email format)
   - Email address for order notifications
   - Validation: Must be valid email format
   - Example: `"orders@packagingproducts.co.nz"`

3. **max_items_per_order** (number, 1-1000)
   - Maximum number of items allowed per order
   - Validation: Must be between 1 and 1000
   - Example: `100`

### Additional Supported Configurations

4. **email_alerts_enabled** (boolean)
   - Enable/disable email alert notifications
   - Example: `true`

5. **daily_report_time** (string, HH:MM format)
   - Daily report time in 24-hour format
   - Validation: Must match pattern `HH:MM` (00:00 to 23:59)
   - Example: `"09:00"`

6. **low_stock_threshold** (number, 0-10000)
   - Minimum stock level before low stock alert
   - Example: `10`

7. **default_currency** (string, ISO 4217 code)
   - ISO 4217 currency code
   - Validation: Must be 3 uppercase letters
   - Example: `"NZD"`

8. **tax_rate** (number, 0-1)
   - Tax rate as decimal
   - Validation: Must be between 0 and 1
   - Example: `0.15` (for 15% GST)

9. **business_hours** (object)
   - Business operating hours with start and end times
   - Validation: Both start and end must be in HH:MM format
   - Example: `{"start": "09:00", "end": "17:00"}`

10. **api_rate_limit** (number, 1-10000)
    - API requests per minute limit
    - Example: `1000`

---

## Usage Examples

### JavaScript/TypeScript (Frontend)

```javascript
// API Client
const API_BASE = 'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod';

// Get all configs
async function getAllConfigs() {
  const response = await fetch(`${API_BASE}/api/admin/config`);
  const data = await response.json();
  return data.data; // Array of config objects
}

// Get specific config
async function getConfig(key) {
  const response = await fetch(`${API_BASE}/api/admin/config/${key}`);
  const data = await response.json();
  return data.data; // Single config object
}

// Update config
async function updateConfig(key, value, description, userEmail) {
  const response = await fetch(`${API_BASE}/api/admin/config/${key}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-User-Email': userEmail
    },
    body: JSON.stringify({
      configValue: value,
      description: description
    })
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

// Delete config
async function deleteConfig(key) {
  const response = await fetch(`${API_BASE}/api/admin/config/${key}`, {
    method: 'DELETE'
  });
  const data = await response.json();

  if (!data.success) {
    throw new Error(data.error);
  }

  return data.data;
}

// Example usage
(async () => {
  // Update system name
  await updateConfig(
    'system_name',
    'Packaging Products WebOrders v2',
    'Updated system name',
    'admin@packagingproducts.co.nz'
  );

  // Update tax rate
  await updateConfig(
    'tax_rate',
    0.15,
    'NZ GST rate',
    'admin@packagingproducts.co.nz'
  );

  // Get current configs
  const configs = await getAllConfigs();
  console.log('Current configs:', configs);
})();
```

### Python

```python
import requests
import json

API_BASE = 'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod'

def get_all_configs():
    response = requests.get(f'{API_BASE}/api/admin/config')
    data = response.json()
    return data['data']

def get_config(key):
    response = requests.get(f'{API_BASE}/api/admin/config/{key}')
    data = response.json()
    return data['data']

def update_config(key, value, description=None, user_email='admin'):
    payload = {
        'configValue': value
    }
    if description:
        payload['description'] = description

    headers = {
        'Content-Type': 'application/json',
        'X-User-Email': user_email
    }

    response = requests.put(
        f'{API_BASE}/api/admin/config/{key}',
        json=payload,
        headers=headers
    )
    data = response.json()

    if not data['success']:
        raise Exception(data['error'])

    return data['data']

def delete_config(key):
    response = requests.delete(f'{API_BASE}/api/admin/config/{key}')
    data = response.json()

    if not data['success']:
        raise Exception(data['error'])

    return data['data']

# Example usage
if __name__ == '__main__':
    # Update config
    result = update_config(
        'system_name',
        'Packaging Products WebOrders',
        'System display name',
        'admin@packagingproducts.co.nz'
    )
    print(f'Updated: {result}')

    # Get all configs
    configs = get_all_configs()
    for config in configs:
        print(f"{config['configKey']}: {config['configValue']}")
```

---

## Monitoring and Debugging

### CloudWatch Logs

View Lambda execution logs:

```bash
# Tail logs in real-time
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/adminConfigHandler --follow --region ap-southeast-2

# Get recent errors
MSYS_NO_PATHCONV=1 aws logs filter-log-events \
  --log-group-name /aws/lambda/adminConfigHandler \
  --filter-pattern "ERROR" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --region ap-southeast-2
```

### Lambda Function Metrics

View Lambda metrics:

```bash
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Invocations \
  --dimensions Name=FunctionName,Value=adminConfigHandler \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum \
  --region ap-southeast-2
```

### DynamoDB Table Status

Check table metrics:

```bash
aws dynamodb describe-table \
  --table-name packprod-admin-config \
  --region ap-southeast-2 \
  --query 'Table.[TableStatus,ItemCount,TableSizeBytes,CreationDateTime]'
```

---

## Troubleshooting

### Issue: Lambda returns 500 error

**Check:**
1. Lambda logs: `aws logs tail /aws/lambda/adminConfigHandler --region ap-southeast-2`
2. IAM permissions: Ensure role has DynamoDB access
3. Environment variables: Verify `ADMIN_CONFIG_TABLE_NAME` is set

**Solution:**
```bash
# Verify environment variables
aws lambda get-function-configuration \
  --function-name adminConfigHandler \
  --region ap-southeast-2 \
  --query 'Environment.Variables'
```

### Issue: API returns CORS error

**Check:**
1. OPTIONS method is configured on API Gateway
2. Lambda returns proper CORS headers

**Solution:**
```bash
# Re-run API Gateway setup
bash setup-admin-config-endpoints.sh
```

### Issue: Validation error for valid input

**Check:**
1. Config schema in Lambda code (`CONFIG_SCHEMAS` object)
2. Data type being sent (string vs number vs boolean)

**Solution:**
- Review schemas: `curl "${API_BASE}/api/admin/config/schemas"`
- Ensure correct JSON types (numbers without quotes, booleans as `true`/`false`)

### Issue: Table not found error

**Check:**
1. Table exists: `aws dynamodb list-tables --region ap-southeast-2`
2. Table name matches environment variable

**Solution:**
```bash
# Verify table exists
aws dynamodb describe-table \
  --table-name packprod-admin-config \
  --region ap-southeast-2

# If missing, create table
bash create-admin-config-table.sh
```

---

## Maintenance

### Adding New Config Type

To add a new validated config type:

1. Edit `admin-config-lambda.mjs`
2. Add entry to `CONFIG_SCHEMAS` object:

```javascript
const CONFIG_SCHEMAS = {
  // ... existing schemas
  new_config_key: {
    type: 'string',  // or 'number', 'boolean', 'object'
    description: 'Description of this config',
    pattern: /^regex-pattern$/,  // Optional for strings
    min: 0,  // Optional for numbers
    max: 100,  // Optional for numbers
    schema: {  // Optional for objects
      field1: { type: 'string', pattern: /^pattern$/ }
    }
  }
};
```

3. Redeploy Lambda:

```bash
bash deploy-admin-config-lambda.sh
```

### Updating Lambda Code

```bash
# Make changes to admin-config-lambda.mjs
# Then redeploy
bash deploy-admin-config-lambda.sh
```

### Backup and Restore

**Backup configs to JSON:**
```bash
aws dynamodb scan \
  --table-name packprod-admin-config \
  --region ap-southeast-2 > configs-backup.json
```

**Restore from backup:**
```bash
# Parse backup file and insert items
# (Manual process, use AWS console or custom script)
```

---

## Security Considerations

### Current State (No Authentication)

- All endpoints are publicly accessible
- No API key required
- No user authentication
- Audit trail via `X-User-Email` header (honor system)

### Recommended Enhancements

1. **Add API Key:**
   - Configure API Gateway to require API key
   - Distribute keys to authorized users only

2. **Add AWS Cognito:**
   - Integrate Cognito User Pool
   - Require JWT tokens for all requests
   - Use Cognito user email for audit trail

3. **Add IAM Authorization:**
   - Use AWS IAM for API Gateway authorization
   - Restrict to specific AWS roles/users

---

## File Reference

### Source Files

- `admin-config-lambda.mjs` - Lambda function source code
- `admin-config-table-schema.json` - DynamoDB table schema
- `package.json` - npm dependencies

### Deployment Scripts

- `create-admin-config-table.sh` - Create DynamoDB table and test data
- `deploy-admin-config-lambda.sh` - Deploy Lambda function with IAM role
- `setup-admin-config-endpoints.sh` - Configure API Gateway resources

### Testing Scripts

- `test-admin-config-api.sh` - Comprehensive test suite (13 tests)
- `admin-config-api-examples.sh` - Interactive examples (legacy)

### Documentation

- `ADMIN_CONFIG_IMPLEMENTATION_GUIDE.md` - This file
- `ADMIN_CONFIG_QUICK_REFERENCE.md` - Quick reference guide
- `CLAUDE.md` - Project overview and context

---

## Support

For issues or questions:

1. Check CloudWatch Logs: `/aws/lambda/adminConfigHandler`
2. Review this guide's Troubleshooting section
3. Test endpoints using `test-admin-config-api.sh`
4. Verify AWS resources are properly tagged with `ClientName` and `Project`

---

**Last Updated:** 2025-10-23
**Version:** 1.0
**Status:** Production Ready
