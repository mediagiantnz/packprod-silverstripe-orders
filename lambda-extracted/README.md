# Packaging Products Contact Import Lambda

This Lambda function imports customer contacts from Packaging Products into RocketReview for review collection.

## Features

- **Duplicate Detection**: Checks for existing contacts by email + clientID
- **Bulk Import**: Supports up to 25 contacts per batch
- **Field Mapping**: Maps Packaging Products fields to RocketReview format
- **Name Parsing**: Automatically splits `contact_name` into first/last names
- **PPL Account Tracking**: Preserves PPL account and account number

## Deployment

1. Deploy the Lambda function:
```bash
cd backend/lambda/importPackagingProductsContacts
./deploy.sh
```

2. Update API Gateway manually (see deploy.sh output for instructions)

## API Endpoint

Once deployed, the endpoint will be available at:
```
POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products
```

## Request Format

### Single Contact Import
```json
{
  "clientID": "7b0d485f-8ef9-45b0-881a-9d8f4447ced2",
  "contact": {
    "email": "customer@example.com",
    "contact_name": "John Smith",
    "company": "ABC Company Ltd",
    "phone": "0212345678",
    "ppl_account": "PPL Web Sales",
    "ppl_account_number": 100014,
    "ContactID": "9b6d1b10-8e7f-485a-abe3-506168567a61"
  }
}
```

### Bulk Import
```json
{
  "clientID": "7b0d485f-8ef9-45b0-881a-9d8f4447ced2",
  "contacts": [
    {
      "email": "contact1@example.com",
      "contact_name": "Jane Doe",
      "company": "XYZ Corp",
      "phone": "0211234567",
      "ppl_account": "PPL Direct",
      "ppl_account_number": 100015
    },
    {
      "email": "contact2@example.com",
      "contact_name": "Bob Johnson",
      "company": "123 Industries",
      "phone": "0219876543",
      "ppl_account": "PPL Web Sales",
      "ppl_account_number": 100016
    }
  ]
}
```

## Response Format

```json
{
  "message": "Packaging Products contact import completed",
  "clientID": "7b0d485f-8ef9-45b0-881a-9d8f4447ced2",
  "statistics": {
    "total": 2,
    "successful": 2,
    "duplicates": 0,
    "errors": 0,
    "errorDetails": []
  },
  "timestamp": "2025-01-15T10:30:00.000Z",
  "importBatchId": "ppl_import_2025-01-15T10:30:00.000Z"
}
```

## Field Mapping

| Packaging Products Field | RocketReview Field | Notes |
|-------------------------|-------------------|-------|
| email | email | Converted to lowercase |
| contact_name | name, firstName, lastName | Auto-parsed into components |
| company | company | Direct mapping |
| phone | phone | Converted to string |
| ppl_account | ppl_account | PPL-specific field |
| ppl_account_number | ppl_account_number | PPL-specific field |
| ContactID | contactID | Uses existing or generates UUID |
| created_at | createdAt | Original creation time |
| status | status | Default: "pending" |

## Testing

Use the provided test file:
```bash
curl -X POST https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/admin/contacts/import/packaging-products \
  -H "Content-Type: application/json" \
  -d @test-import.json
```

## Notes

- Source is marked as `"packaging_products_import"`
- Original data is preserved in `metadata.originalData`
- Duplicates are skipped and counted in statistics
- Client ID for Packaging Products: `7b0d485f-8ef9-45b0-881a-9d8f4447ced2`