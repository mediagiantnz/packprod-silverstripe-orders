# Admin Configuration Integration Guide

## Overview

This guide provides step-by-step instructions for integrating the admin configuration endpoints into the Packaging Products WebOrders system.

## Files Created

1. **admin-config-lambda.mjs** - Lambda function handler for admin configuration
2. **admin-config-table-schema.json** - DynamoDB table schema
3. **create-admin-config-table.sh** - Script to create DynamoDB table with default settings
4. **setup-admin-config-endpoints.sh** - Script to configure API Gateway endpoints
5. **admin-config-api-examples.sh** - API testing examples and documentation

---

## Step 1: Create DynamoDB Table

Create the admin configuration table with default settings:

```bash
chmod +x create-admin-config-table.sh
./create-admin-config-table.sh
```

This will:
- Create the `packprod-admin-config` table
- Set up encryption with KMS
- Insert 8 default settings:
  - email_alerts_enabled: true
  - daily_report_time: "09:00"
  - low_stock_threshold: 10
  - default_currency: "AUD"
  - tax_rate: 0.10
  - business_hours: {start: "09:00", end: "17:00"}
  - notification_email: "admin@packagingproducts.com"
  - api_rate_limit: 1000

---

## Step 2: Deploy Lambda Function

### Option A: Using AWS Console

1. Go to AWS Lambda Console
2. Click "Create function"
3. Choose "Author from scratch"
4. Configure:
   - Function name: `adminConfigLambda`
   - Runtime: Node.js 18.x or later
   - Architecture: x86_64
   - Execution role: Create new role or use existing

5. Upload code:
   - Copy contents of `admin-config-lambda.mjs`
   - Paste into Lambda code editor

6. Configure environment variables:
   ```
   AWS_REGION=ap-southeast-2
   ADMIN_CONFIG_TABLE_NAME=packprod-admin-config
   ```

7. Set timeout: 30 seconds
8. Set memory: 256 MB

9. Add DynamoDB permissions to the execution role:
   ```json
   {
     "Version": "2012-10-17",
     "Statement": [
       {
         "Effect": "Allow",
         "Action": [
           "dynamodb:GetItem",
           "dynamodb:PutItem",
           "dynamodb:UpdateItem",
           "dynamodb:Scan"
         ],
         "Resource": "arn:aws:dynamodb:ap-southeast-2:235494808985:table/packprod-admin-config"
       }
     ]
   }
   ```

### Option B: Using AWS CLI

Create a deployment package:

```bash
# Create deployment directory
mkdir -p lambda-deploy
cd lambda-deploy

# Copy Lambda function
cp ../admin-config-lambda.mjs index.mjs

# Install dependencies
npm init -y
npm install @aws-sdk/client-dynamodb @aws-sdk/lib-dynamodb

# Create ZIP file
zip -r admin-config-lambda.zip .

# Create Lambda function
aws lambda create-function \
  --function-name adminConfigLambda \
  --runtime nodejs18.x \
  --role arn:aws:iam::235494808985:role/lambda-execution-role \
  --handler index.handler \
  --zip-file fileb://admin-config-lambda.zip \
  --environment Variables={AWS_REGION=ap-southeast-2,ADMIN_CONFIG_TABLE_NAME=packprod-admin-config} \
  --timeout 30 \
  --memory-size 256 \
  --region ap-southeast-2 \
  --tags ClientName="Packaging Products",Project=WebOrders
```

---

## Step 3: Configure API Gateway Endpoints

Run the setup script to create all admin endpoints:

```bash
chmod +x setup-admin-config-endpoints.sh
./setup-admin-config-endpoints.sh
```

This creates the following endpoints:

- `GET /api/admin/settings` - Get all settings
- `PUT /api/admin/settings` - Bulk update settings
- `GET /api/admin/settings/schemas` - Get setting schemas
- `GET /api/admin/settings/{key}` - Get specific setting
- `PUT /api/admin/settings/{key}` - Update specific setting

---

## Step 4: Test the API

### Using the Examples Script

View all API examples and test commands:

```bash
chmod +x admin-config-api-examples.sh
./admin-config-api-examples.sh
```

### Quick Tests

1. **Get all settings:**
   ```bash
   curl https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings
   ```

2. **Get schemas:**
   ```bash
   curl https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings/schemas
   ```

3. **Update tax rate:**
   ```bash
   curl -X PUT https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings/tax_rate \
     -H "Content-Type: application/json" \
     -H "X-User-Email: admin@example.com" \
     -d '{"value": 0.15}'
   ```

---

## API Endpoints Reference

### GET /api/admin/settings

Get all system settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "tax_rate": {
      "value": 0.10,
      "updatedAt": "2025-10-21T09:00:00.000Z",
      "updatedBy": "system"
    },
    ...
  },
  "meta": {
    "count": 8,
    "total": 8,
    "timestamp": "2025-10-21T10:30:00.000Z"
  }
}
```

### GET /api/admin/settings/{key}

Get a specific setting.

**Parameters:**
- `key` (path) - Setting key

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "tax_rate",
    "value": 0.10,
    "updatedAt": "2025-10-21T09:00:00.000Z",
    "updatedBy": "system"
  },
  "meta": {
    "timestamp": "2025-10-21T10:30:00.000Z"
  }
}
```

### PUT /api/admin/settings/{key}

Update a specific setting.

**Parameters:**
- `key` (path) - Setting key
- `value` (body) - New value

**Headers:**
- `X-User-Email` (optional) - Email of user making the change

**Request:**
```json
{
  "value": 0.15
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "key": "tax_rate",
    "value": 0.15,
    "updatedAt": "2025-10-21T10:35:00.000Z",
    "updatedBy": "admin@example.com"
  },
  "meta": {
    "timestamp": "2025-10-21T10:35:00.000Z"
  }
}
```

### PUT /api/admin/settings

Bulk update multiple settings.

**Headers:**
- `X-User-Email` (optional) - Email of user making the changes

**Request:**
```json
{
  "settings": {
    "tax_rate": 0.15,
    "low_stock_threshold": 5,
    "daily_report_time": "10:00"
  }
}
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "key": "tax_rate",
      "value": 0.15,
      "updatedAt": "2025-10-21T10:40:00.000Z",
      "updatedBy": "admin@example.com"
    },
    ...
  ],
  "meta": {
    "count": 3,
    "total": 3,
    "timestamp": "2025-10-21T10:40:00.000Z"
  }
}
```

### GET /api/admin/settings/schemas

Get documentation for all available settings and their validation rules.

**Response:**
```json
{
  "success": true,
  "data": {
    "email_alerts_enabled": {
      "type": "boolean",
      "description": "Enable/disable email alert notifications",
      "constraints": {}
    },
    "tax_rate": {
      "type": "number",
      "description": "Tax rate as decimal (e.g., 0.10 for 10%)",
      "constraints": {
        "min": 0,
        "max": 1
      }
    },
    ...
  },
  "meta": {
    "count": 8,
    "timestamp": "2025-10-21T10:30:00.000Z"
  }
}
```

---

## Supported Settings

### email_alerts_enabled
- **Type:** boolean
- **Description:** Enable/disable email alert notifications
- **Example:** `true`, `false`

### daily_report_time
- **Type:** string
- **Format:** HH:MM (24-hour)
- **Description:** Time to send daily reports
- **Example:** `"09:00"`, `"14:30"`

### low_stock_threshold
- **Type:** number
- **Range:** 0-10000
- **Description:** Minimum stock level before low stock alert
- **Example:** `10`, `25`, `100`

### default_currency
- **Type:** string
- **Format:** ISO 4217 currency code (3 uppercase letters)
- **Description:** Default currency for the system
- **Example:** `"USD"`, `"EUR"`, `"AUD"`

### tax_rate
- **Type:** number
- **Range:** 0-1 (decimal)
- **Description:** Tax rate as decimal
- **Example:** `0.10` (10%), `0.15` (15%)

### business_hours
- **Type:** object
- **Required fields:**
  - `start` (string, HH:MM format)
  - `end` (string, HH:MM format)
- **Description:** Business operating hours
- **Example:**
  ```json
  {
    "start": "09:00",
    "end": "17:00"
  }
  ```

### notification_email
- **Type:** string
- **Format:** Valid email address
- **Description:** Email address for system notifications
- **Example:** `"admin@packagingproducts.com"`

### api_rate_limit
- **Type:** number
- **Range:** 1-10000
- **Description:** API requests per minute limit
- **Example:** `1000`, `2000`

---

## Validation

All settings are validated before being saved:

1. **Type checking** - Ensures value matches expected type
2. **Format validation** - Validates patterns (email, time, currency codes)
3. **Range validation** - Ensures numbers are within acceptable ranges
4. **Required fields** - Checks object settings have all required fields

**Validation Error Example:**
```json
{
  "success": false,
  "data": null,
  "error": "Value for tax_rate must be at most 1",
  "meta": {
    "timestamp": "2025-10-21T10:45:00.000Z"
  }
}
```

---

## Frontend Integration

### React/JavaScript Example

```javascript
// Get all settings
async function getAllSettings() {
  const response = await fetch(
    'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings'
  );
  const result = await response.json();

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
}

// Update a setting
async function updateSetting(key, value, userEmail) {
  const response = await fetch(
    `https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings/${key}`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': userEmail
      },
      body: JSON.stringify({ value })
    }
  );

  const result = await response.json();

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
}

// Bulk update settings
async function bulkUpdateSettings(settings, userEmail) {
  const response = await fetch(
    'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/settings',
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'X-User-Email': userEmail
      },
      body: JSON.stringify({ settings })
    }
  );

  const result = await response.json();

  if (result.success) {
    return result.data;
  } else {
    throw new Error(result.error);
  }
}

// Example usage
async function example() {
  try {
    // Get all settings
    const settings = await getAllSettings();
    console.log('Current settings:', settings);

    // Update tax rate
    await updateSetting('tax_rate', 0.15, 'admin@example.com');

    // Bulk update
    await bulkUpdateSettings({
      tax_rate: 0.15,
      low_stock_threshold: 5,
      daily_report_time: '10:00'
    }, 'admin@example.com');

  } catch (error) {
    console.error('Error:', error.message);
  }
}
```

---

## Security Considerations

1. **Authentication:** Currently endpoints have no authentication. Consider adding:
   - API Key authentication
   - AWS Cognito integration
   - IAM authorization

2. **Authorization:** Add role-based access control to restrict who can modify settings

3. **Audit Trail:** All updates are logged with:
   - Timestamp (`updatedAt`)
   - User email (`updatedBy`)
   - Consider adding CloudWatch logging for additional audit trails

4. **Rate Limiting:** Consider implementing API rate limiting to prevent abuse

5. **Validation:** All inputs are validated server-side, but add client-side validation for better UX

---

## Monitoring

### CloudWatch Metrics to Monitor

1. Lambda invocations
2. Lambda errors
3. Lambda duration
4. DynamoDB read/write capacity
5. API Gateway 4xx/5xx errors

### CloudWatch Logs

Lambda logs include:
- Full request event
- Validation errors
- Database operation errors

---

## Troubleshooting

### Common Issues

**1. 404 Not Found**
- Verify API Gateway deployment
- Check endpoint URLs
- Ensure Lambda permissions are set

**2. 500 Internal Server Error**
- Check CloudWatch logs
- Verify DynamoDB table exists
- Check Lambda execution role permissions

**3. Validation Errors**
- Review setting schemas
- Check value types match expected types
- Verify format patterns (email, time, currency)

**4. CORS Errors**
- Ensure OPTIONS method is configured
- Check CORS headers in Lambda response
- Verify Access-Control-Allow-Origin is set

---

## Maintenance

### Adding New Settings

1. Add to `SETTING_SCHEMAS` in `admin-config-lambda.mjs`:
   ```javascript
   new_setting_name: {
     type: 'string',
     pattern: /^regex$/,
     description: 'Description of setting',
     min: 0,  // for numbers
     max: 100  // for numbers
   }
   ```

2. Deploy updated Lambda function

3. Insert default value:
   ```bash
   aws dynamodb put-item \
     --table-name packprod-admin-config \
     --item '{
       "settingKey": {"S": "new_setting_name"},
       "settingValue": {"S": "default_value"},
       "updatedAt": {"S": "'$(date -u +"%Y-%m-%dT%H:%M:%S.000Z")'"},
       "updatedBy": {"S": "system"}
     }' \
     --region ap-southeast-2
   ```

---

## Support

For issues or questions:
1. Check CloudWatch logs
2. Review this integration guide
3. Test with example commands in `admin-config-api-examples.sh`
4. Verify DynamoDB table exists and has correct permissions

---

## Next Steps

1. **Add Authentication:** Implement API key or Cognito authentication
2. **Add Frontend UI:** Create admin panel in React dashboard
3. **Add Notifications:** Set up SNS for setting change notifications
4. **Add Versioning:** Track setting history with DynamoDB Streams
5. **Add Backup:** Enable point-in-time recovery on DynamoDB table
