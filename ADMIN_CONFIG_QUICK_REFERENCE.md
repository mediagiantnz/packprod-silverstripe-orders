# Admin Configuration API - Quick Reference

**Project:** Packaging Products WebOrders

## Base URL
```
https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod
```

## Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/admin/config` | List all configs |
| GET | `/api/admin/config/schemas` | Get config documentation |
| GET | `/api/admin/config/{key}` | Get specific config |
| PUT | `/api/admin/config/{key}` | Create/update config |
| DELETE | `/api/admin/config/{key}` | Delete config |

## Required Test Configs

| Key | Type | Example | Validation |
|-----|------|---------|------------|
| `system_name` | string | `"Packaging Products WebOrders"` | Any string |
| `order_notification_email` | string | `"orders@packagingproducts.co.nz"` | Valid email |
| `max_items_per_order` | number | `100` | 1-1000 |

## Additional Supported Configs

| Key | Type | Example | Validation |
|-----|------|---------|------------|
| `email_alerts_enabled` | boolean | `true` | true/false |
| `daily_report_time` | string | `"09:00"` | HH:MM format |
| `low_stock_threshold` | number | `10` | 0-10000 |
| `default_currency` | string | `"NZD"` | ISO 4217 (3 letters) |
| `tax_rate` | number | `0.15` | 0-1 (decimal) |
| `business_hours` | object | `{"start":"09:00","end":"17:00"}` | Both fields required |
| `api_rate_limit` | number | `1000` | 1-10000 |

## Quick Commands

### List All Configs
```bash
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config"
```

### Get Schemas (Documentation)
```bash
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/schemas"
```

### Get Specific Config
```bash
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/system_name"
```

### Update String Config
```bash
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/system_name" \
  -H "Content-Type: application/json" \
  -H "X-User-Email: admin@packagingproducts.co.nz" \
  -d '{"configValue": "New System Name", "description": "Updated name"}'
```

### Update Email Config
```bash
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/order_notification_email" \
  -H "Content-Type: application/json" \
  -d '{"configValue": "orders@packagingproducts.co.nz"}'
```

### Update Number Config
```bash
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/max_items_per_order" \
  -H "Content-Type: application/json" \
  -d '{"configValue": 150}'
```

### Update Boolean Config
```bash
curl -X PUT "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/email_alerts_enabled" \
  -H "Content-Type: application/json" \
  -d '{"configValue": false}'
```

### Delete Config
```bash
curl -X DELETE "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/admin/config/test_config"
```

## Response Format

### Success Response
```json
{
  "success": true,
  "data": {
    "configKey": "system_name",
    "configValue": "New System Name",
    "description": "Updated name",
    "updatedAt": "2025-10-23T10:35:00.000Z",
    "updatedBy": "admin@packagingproducts.co.nz"
  },
  "meta": {
    "timestamp": "2025-10-23T10:35:00.000Z"
  }
}
```

### Error Response
```json
{
  "success": false,
  "data": null,
  "error": "Invalid format for order_notification_email. Email address for order notifications",
  "meta": {
    "timestamp": "2025-10-23T10:45:00.000Z"
  }
}
```

## JavaScript Example

```javascript
const API_BASE = 'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod';

// Get all configs
const response = await fetch(`${API_BASE}/api/admin/config`);
const result = await response.json();

if (result.success) {
  console.log(result.data); // Array of config objects
}

// Update config
const updateResponse = await fetch(`${API_BASE}/api/admin/config/system_name`, {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'X-User-Email': 'admin@packagingproducts.co.nz'
  },
  body: JSON.stringify({
    configValue: 'New System Name',
    description: 'Updated description'
  })
});
const updateResult = await updateResponse.json();

// Delete config
await fetch(`${API_BASE}/api/admin/config/test_config`, {
  method: 'DELETE'
});
```

## Setup Steps (One-Time)

```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"

# 1. Create DynamoDB table with test data
bash create-admin-config-table.sh

# 2. Deploy Lambda function (creates IAM role, packages, deploys)
bash deploy-admin-config-lambda.sh

# 3. Configure API Gateway endpoints
bash setup-admin-config-endpoints.sh

# 4. Run comprehensive test suite
bash test-admin-config-api.sh
```

## Files

- `admin-config-lambda.mjs` - Lambda function source
- `admin-config-table-schema.json` - DynamoDB table schema
- `create-admin-config-table.sh` - Create table + test data
- `deploy-admin-config-lambda.sh` - Deploy Lambda with IAM
- `setup-admin-config-endpoints.sh` - Configure API Gateway
- `test-admin-config-api.sh` - Comprehensive test suite (13 tests)
- `ADMIN_CONFIG_IMPLEMENTATION_GUIDE.md` - Full documentation

## Common Validation Errors

| Error | Cause | Fix |
|-------|-------|-----|
| Invalid type | Wrong data type | Check type matches schema |
| Invalid format | Pattern mismatch | Use correct format (HH:MM, email, etc.) |
| Value must be at most X | Number too large | Use value within range |
| Value must be at least X | Number too small | Use value within range |
| Unknown setting key | Invalid key | Use supported setting key |
| Missing required field | Object missing field | Include all required fields |
