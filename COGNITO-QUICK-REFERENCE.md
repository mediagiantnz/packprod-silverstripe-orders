# Cognito Authentication - Quick Reference
## Packaging Products WebOrders

---

## Key Resource IDs

```
User Pool ID:      ap-southeast-2_0c7Lo2lAa
App Client ID:     2hi3sujs6jv5j0mc5bru6071sa
Client Secret:     mr6gpdi8rtd8691a9ehq3qseu3a7mljvd1pgrh8s8grjqqk3apg
Authorizer ID:     4ld8xq
Lambda Function:   packprodAuthHandler

User Pool ARN:     arn:aws:cognito-idp:ap-southeast-2:235494808985:userpool/ap-southeast-2_0c7Lo2lAa
Lambda ARN:        arn:aws:lambda:ap-southeast-2:235494808985:function:packprodAuthHandler
```

---

## API Endpoints

**Base URL:** `https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod`

- **POST /auth/login** - Authenticate and get tokens
- **GET /auth/me** - Get current user info (requires token)
- **POST /auth/logout** - Sign out (requires token)

---

## Test User

```
Email:     testuser@packprod.com
Password:  TestPass123!
```

---

## Quick Test Commands

**Login:**
```bash
curl -X POST "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@packprod.com","password":"TestPass123!"}'
```

**Get User (replace TOKEN):**
```bash
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/me" \
  -H "Authorization: Bearer TOKEN"
```

**Logout (replace TOKEN):**
```bash
curl -X POST "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/logout" \
  -H "Authorization: Bearer TOKEN"
```

---

## Frontend Integration (JavaScript)

```javascript
// Login
const response = await fetch(
  'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/login',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  }
);
const { data } = await response.json();
localStorage.setItem('accessToken', data.accessToken);

// Make authenticated request
const ordersResponse = await fetch(
  'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders',
  {
    headers: { 'Authorization': `Bearer ${localStorage.getItem('accessToken')}` }
  }
);
```

---

## User Management Commands

**Create User:**
```bash
aws cognito-idp admin-create-user \
  --user-pool-id ap-southeast-2_0c7Lo2lAa \
  --username user@example.com \
  --user-attributes Name=email,Value=user@example.com Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --region ap-southeast-2
```

**Set Permanent Password:**
```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id ap-southeast-2_0c7Lo2lAa \
  --username user@example.com \
  --password "Password123!" \
  --permanent \
  --region ap-southeast-2
```

**List Users:**
```bash
aws cognito-idp list-users \
  --user-pool-id ap-southeast-2_0c7Lo2lAa \
  --region ap-southeast-2
```

**Delete User:**
```bash
aws cognito-idp admin-delete-user \
  --user-pool-id ap-southeast-2_0c7Lo2lAa \
  --username user@example.com \
  --region ap-southeast-2
```

---

## Protect API Endpoint (Optional)

```bash
# Example: Protect /api/orders
aws apigateway update-method \
  --rest-api-id bw4agz6xn4 \
  --resource-id 8mt6si \
  --http-method GET \
  --patch-operations op=replace,path=/authorizationType,value=COGNITO_USER_POOLS \
  --region ap-southeast-2

aws apigateway update-method \
  --rest-api-id bw4agz6xn4 \
  --resource-id 8mt6si \
  --http-method GET \
  --patch-operations op=replace,path=/authorizerId,value=4ld8xq \
  --region ap-southeast-2

# Deploy
aws apigateway create-deployment \
  --rest-api-id bw4agz6xn4 \
  --stage-name prod \
  --region ap-southeast-2
```

---

## Monitor Logs

```bash
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/packprodAuthHandler --follow --region ap-southeast-2
```

---

## Update Lambda Function

```bash
# Edit auth-lambda.mjs
# Package and deploy
powershell Compress-Archive -Path auth-lambda.mjs,node_modules,package.json -DestinationPath lambda-auth-deploy.zip -Force

aws lambda update-function-code \
  --function-name packprodAuthHandler \
  --zip-file fileb://lambda-auth-deploy.zip \
  --region ap-southeast-2
```

---

## Password Requirements

- Minimum 8 characters
- At least one uppercase letter
- At least one lowercase letter
- At least one number
- Symbols optional

---

**Full Documentation:** See `COGNITO-AUTH-SETUP-REPORT.md`
