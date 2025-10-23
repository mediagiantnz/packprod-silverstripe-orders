# AWS Cognito Authentication Setup Report
## Packaging Products WebOrders System

**Date:** October 23, 2025
**AWS Region:** ap-southeast-2
**AWS Account:** 235494808985
**Status:** Successfully Deployed and Tested

---

## Executive Summary

AWS Cognito authentication has been successfully configured for the Packaging Products WebOrders system. The implementation includes:

- Cognito User Pool with secure password policies
- App Client for React frontend integration
- API Gateway Cognito Authorizer
- Three authentication endpoints (login, logout, me)
- Complete CORS configuration
- Test user created and all flows verified

---

## 1. Cognito User Pool

### Details
- **Name:** PackagingProductsUsers
- **User Pool ID:** `ap-southeast-2_0c7Lo2lAa`
- **ARN:** `arn:aws:cognito-idp:ap-southeast-2:235494808985:userpool/ap-southeast-2_0c7Lo2lAa`
- **Tags:** `ClientName=Packaging Products`, `Project=WebOrders`

### Configuration
- **Sign-in Method:** Email address (case-insensitive)
- **Auto-Verified Attributes:** Email
- **MFA:** Disabled (can be enabled later)
- **Account Recovery:** Verified email

### Password Policy
- **Minimum Length:** 8 characters
- **Required Characters:**
  - Uppercase letters: Yes
  - Lowercase letters: Yes
  - Numbers: Yes
  - Symbols: No
- **Temporary Password Validity:** 7 days

### User Attributes
Standard Cognito attributes available:
- email (required for sign-in)
- email_verified
- sub (user ID)
- name, given_name, family_name
- phone_number, phone_number_verified
- address, birthdate, gender, locale, zoneinfo
- profile, picture, website
- preferred_username, nickname

---

## 2. App Client

### Details
- **Client Name:** PackagingProductsWebApp
- **Client ID:** `2hi3sujs6jv5j0mc5bru6071sa`
- **Client Secret:** `mr6gpdi8rtd8691a9ehq3qseu3a7mljvd1pgrh8s8grjqqk3apg`
- **Client Type:** Confidential (with secret)

### Authentication Flows Enabled
- `ALLOW_USER_PASSWORD_AUTH` - Username/password authentication
- `ALLOW_USER_SRP_AUTH` - Secure Remote Password (recommended)
- `ALLOW_REFRESH_TOKEN_AUTH` - Token refresh

### OAuth 2.0 Configuration
- **Allowed OAuth Flows:** Authorization Code, Implicit
- **Allowed OAuth Scopes:** openid, profile, email
- **Callback URLs:**
  - `http://localhost:3000/auth/callback` (development)
  - `https://packprod-weborders.example.com/auth/callback` (production)
- **Logout URLs:**
  - `http://localhost:3000/logout` (development)
  - `https://packprod-weborders.example.com/logout` (production)

### Token Validity
- **ID Token:** 60 minutes
- **Access Token:** 60 minutes
- **Refresh Token:** 30 days

---

## 3. API Gateway Cognito Authorizer

### Details
- **Name:** PackagingProductsCognitoAuthorizer
- **Authorizer ID:** `4ld8xq`
- **Type:** COGNITO_USER_POOLS
- **Identity Source:** `method.request.header.Authorization`
- **Token Validation:** Automatic via Cognito

### Usage
To protect an API Gateway endpoint, update the method to use this authorizer:

```bash
aws apigateway update-method \
  --rest-api-id bw4agz6xn4 \
  --resource-id <RESOURCE_ID> \
  --http-method GET \
  --patch-operations op=replace,path=/authorizationType,value=COGNITO_USER_POOLS \
  --region ap-southeast-2

aws apigateway update-method \
  --rest-api-id bw4agz6xn4 \
  --resource-id <RESOURCE_ID> \
  --http-method GET \
  --patch-operations op=replace,path=/authorizerId,value=4ld8xq \
  --region ap-southeast-2
```

---

## 4. Authentication Lambda Function

### Details
- **Function Name:** packprodAuthHandler
- **ARN:** `arn:aws:lambda:ap-southeast-2:235494808985:function:packprodAuthHandler`
- **Runtime:** Node.js 20.x
- **Handler:** auth-lambda.handler
- **Timeout:** 30 seconds
- **Memory:** 256 MB
- **Source File:** `auth-lambda.mjs`
- **Tags:** `ClientName=Packaging Products`, `Project=WebOrders`

### Environment Variables
- `USER_POOL_ID`: ap-southeast-2_0c7Lo2lAa
- `CLIENT_ID`: 2hi3sujs6jv5j0mc5bru6071sa
- `CLIENT_SECRET`: mr6gpdi8rtd8691a9ehq3qseu3a7mljvd1pgrh8s8grjqqk3apg

### IAM Role
- **Role Name:** packprodAuthLambdaRole
- **ARN:** `arn:aws:iam::235494808985:role/packprodAuthLambdaRole`

### Permissions
The Lambda function has permissions to:
- Write logs to CloudWatch (`/aws/lambda/packprodAuthHandler`)
- Call Cognito APIs: `InitiateAuth`, `GetUser`, `GlobalSignOut`, `AdminGetUser`

### CloudWatch Logs
Monitor authentication activity:
```bash
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/packprodAuthHandler --follow --region ap-southeast-2
```

---

## 5. Authentication Endpoints

### Base URL
`https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod`

### 5.1 POST /auth/login

**Purpose:** Authenticate user and receive JWT tokens

**Request:**
```bash
curl -X POST "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "YourPassword123!"
  }'
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "accessToken": "eyJraWQiOiI...",
    "idToken": "eyJraWQiOiI...",
    "refreshToken": "eyJjdHkiOiJ...",
    "expiresIn": 3600,
    "tokenType": "Bearer"
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid email or password"
}
```

### 5.2 GET /auth/me

**Purpose:** Get current authenticated user information

**Request:**
```bash
curl -X GET "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/me" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Success Response (200):**
```json
{
  "success": true,
  "data": {
    "username": "694e44e8-a0f1-7044-e7e2-3c79b1755649",
    "email": "user@example.com",
    "emailVerified": true,
    "sub": "694e44e8-a0f1-7044-e7e2-3c79b1755649",
    "attributes": {
      "email": "user@example.com",
      "email_verified": "true",
      "sub": "694e44e8-a0f1-7044-e7e2-3c79b1755649"
    }
  }
}
```

**Error Response (401):**
```json
{
  "success": false,
  "error": "Invalid or expired token"
}
```

### 5.3 POST /auth/logout

**Purpose:** Sign out user and invalidate all tokens

**Request:**
```bash
curl -X POST "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/logout" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

**Success Response (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

**Error Response (500):**
```json
{
  "success": false,
  "error": "Logout failed"
}
```

---

## 6. CORS Configuration

All authentication endpoints include CORS headers:

```
Access-Control-Allow-Origin: *
Access-Control-Allow-Headers: Content-Type,Authorization
Access-Control-Allow-Methods: GET,POST,OPTIONS
```

OPTIONS preflight requests are handled by mock integrations returning 200.

---

## 7. Test User

A test user has been created for development and testing:

- **Email:** testuser@packprod.com
- **Password:** TestPass123!
- **Status:** Active (email verified)
- **User ID:** 694e44e8-a0f1-7044-e7e2-3c79b1755649

### Test Commands

**Login:**
```bash
curl -X POST "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@packprod.com","password":"TestPass123!"}'
```

**Get User Info (replace TOKEN):**
```bash
curl -X GET "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/me" \
  -H "Authorization: Bearer <TOKEN>"
```

**Logout (replace TOKEN):**
```bash
curl -X POST "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/logout" \
  -H "Authorization: Bearer <TOKEN>"
```

---

## 8. User Management

### Create New User (Admin)

```bash
aws cognito-idp admin-create-user \
  --user-pool-id ap-southeast-2_0c7Lo2lAa \
  --username newuser@example.com \
  --user-attributes Name=email,Value=newuser@example.com Name=email_verified,Value=true \
  --temporary-password "TempPass123!" \
  --message-action SUPPRESS \
  --region ap-southeast-2
```

### Set Permanent Password

```bash
aws cognito-idp admin-set-user-password \
  --user-pool-id ap-southeast-2_0c7Lo2lAa \
  --username newuser@example.com \
  --password "PermanentPass123!" \
  --permanent \
  --region ap-southeast-2
```

### List Users

```bash
aws cognito-idp list-users \
  --user-pool-id ap-southeast-2_0c7Lo2lAa \
  --region ap-southeast-2
```

### Delete User

```bash
aws cognito-idp admin-delete-user \
  --user-pool-id ap-southeast-2_0c7Lo2lAa \
  --username user@example.com \
  --region ap-southeast-2
```

### Disable User

```bash
aws cognito-idp admin-disable-user \
  --user-pool-id ap-southeast-2_0c7Lo2lAa \
  --username user@example.com \
  --region ap-southeast-2
```

### Enable User

```bash
aws cognito-idp admin-enable-user \
  --user-pool-id ap-southeast-2_0c7Lo2lAa \
  --username user@example.com \
  --region ap-southeast-2
```

---

## 9. Protecting Existing Endpoints (Optional)

To require authentication on existing API endpoints, apply the Cognito authorizer:

### Example: Protect /api/orders endpoint

```bash
# Get the resource ID for /api/orders
RESOURCE_ID="8mt6si"  # From API Gateway resources list

# Update GET method to require Cognito auth
aws apigateway update-method \
  --rest-api-id bw4agz6xn4 \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --patch-operations op=replace,path=/authorizationType,value=COGNITO_USER_POOLS \
  --region ap-southeast-2

aws apigateway update-method \
  --rest-api-id bw4agz6xn4 \
  --resource-id $RESOURCE_ID \
  --http-method GET \
  --patch-operations op=replace,path=/authorizerId,value=4ld8xq \
  --region ap-southeast-2

# Deploy changes
aws apigateway create-deployment \
  --rest-api-id bw4agz6xn4 \
  --stage-name prod \
  --description "Add auth to orders endpoint" \
  --region ap-southeast-2
```

### Testing Protected Endpoint

Once protected, requests must include the Authorization header:

```bash
# This will fail with 401 Unauthorized
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders"

# This will succeed
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders" \
  -H "Authorization: Bearer <ACCESS_TOKEN>"
```

---

## 10. Frontend Integration Guide

### Installation

```bash
npm install amazon-cognito-identity-js
# or
npm install @aws-amplify/auth
```

### React Example with AWS Amplify

```javascript
import { Amplify } from 'aws-amplify';
import { signIn, signOut, getCurrentUser } from '@aws-amplify/auth';

// Configure Amplify
Amplify.configure({
  Auth: {
    Cognito: {
      userPoolId: 'ap-southeast-2_0c7Lo2lAa',
      userPoolClientId: '2hi3sujs6jv5j0mc5bru6071sa',
      loginWith: {
        email: true
      }
    }
  }
});

// Login
async function login(email, password) {
  try {
    const user = await signIn({ username: email, password });
    console.log('Login success:', user);
    return user;
  } catch (error) {
    console.error('Login error:', error);
    throw error;
  }
}

// Get current user
async function getUser() {
  try {
    const user = await getCurrentUser();
    console.log('Current user:', user);
    return user;
  } catch (error) {
    console.error('Not authenticated');
    return null;
  }
}

// Logout
async function logout() {
  try {
    await signOut();
    console.log('Logged out successfully');
  } catch (error) {
    console.error('Logout error:', error);
  }
}
```

### Using Custom Auth Endpoints

```javascript
// Login
async function login(email, password) {
  const response = await fetch(
    'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/login',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    }
  );

  const data = await response.json();

  if (data.success) {
    // Store tokens
    localStorage.setItem('accessToken', data.data.accessToken);
    localStorage.setItem('idToken', data.data.idToken);
    localStorage.setItem('refreshToken', data.data.refreshToken);
    return data.data;
  } else {
    throw new Error(data.error);
  }
}

// Get current user
async function getCurrentUser() {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(
    'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/me',
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  const data = await response.json();

  if (data.success) {
    return data.data;
  } else {
    throw new Error(data.error);
  }
}

// Logout
async function logout() {
  const accessToken = localStorage.getItem('accessToken');

  await fetch(
    'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/logout',
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  // Clear tokens
  localStorage.removeItem('accessToken');
  localStorage.removeItem('idToken');
  localStorage.removeItem('refreshToken');
}

// Make authenticated API request
async function fetchOrders() {
  const accessToken = localStorage.getItem('accessToken');

  const response = await fetch(
    'https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/orders',
    {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    }
  );

  return response.json();
}
```

---

## 11. Security Considerations

### Best Practices Implemented
1. Password policy requires strong passwords (8+ chars, mixed case, numbers)
2. Email verification required
3. Client secret used for added security
4. Token expiration set to 1 hour (can be adjusted)
5. Refresh tokens valid for 30 days
6. User existence errors prevented (security feature)

### Additional Security Recommendations
1. **Enable MFA:** Consider enabling multi-factor authentication for production
2. **IP Whitelisting:** Use API Gateway resource policies to restrict access by IP
3. **Rate Limiting:** Implement API Gateway throttling to prevent brute force attacks
4. **Token Storage:** Use httpOnly cookies instead of localStorage for token storage
5. **HTTPS Only:** Ensure all frontend deployments use HTTPS
6. **Monitoring:** Set up CloudWatch alarms for failed login attempts

### Enabling MFA (Optional)

```bash
aws cognito-idp set-user-pool-mfa-config \
  --user-pool-id ap-southeast-2_0c7Lo2lAa \
  --mfa-configuration OPTIONAL \
  --software-token-mfa-configuration Enabled=true \
  --region ap-southeast-2
```

---

## 12. Monitoring and Troubleshooting

### CloudWatch Logs

**Auth Lambda Logs:**
```bash
MSYS_NO_PATHCONV=1 aws logs tail /aws/lambda/packprodAuthHandler \
  --follow \
  --region ap-southeast-2
```

**API Gateway Logs:**
Enable access logging in API Gateway settings.

### Common Issues

**Issue: "Invalid email or password"**
- Verify user exists: `aws cognito-idp list-users --user-pool-id ap-southeast-2_0c7Lo2lAa`
- Check password meets requirements
- Ensure user is not disabled

**Issue: "Invalid or expired token"**
- Tokens expire after 1 hour
- Use refresh token to get new access token
- Verify token is being sent in Authorization header

**Issue: CORS errors in browser**
- Verify OPTIONS method is configured on endpoint
- Check CORS headers in response
- Ensure preflight requests return 200

**Issue: "NotAuthorizedException"**
- User account may be disabled
- Password may have expired
- Check CloudWatch logs for details

### Testing from CLI

```bash
# Test login
curl -X POST "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/login" \
  -H "Content-Type: application/json" \
  -d '{"email":"testuser@packprod.com","password":"TestPass123!"}'

# Extract access token and test /auth/me
ACCESS_TOKEN="<paste token here>"
curl -X GET "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/auth/me" \
  -H "Authorization: Bearer $ACCESS_TOKEN"
```

---

## 13. Cost Estimation

### Cognito Pricing (as of 2025)
- **MAU (Monthly Active Users) 1-50,000:** Free
- **MAU 50,001+:** $0.0055 per MAU

### Lambda Pricing
- **Requests:** $0.20 per 1M requests
- **Duration:** $0.0000166667 per GB-second
- **Estimated cost for 10,000 auth operations/month:** ~$0.50

### API Gateway Pricing
- **REST API calls:** $3.50 per million
- **Estimated cost for 10,000 auth calls/month:** ~$0.04

**Total Estimated Cost (10,000 users/month):** < $1/month

---

## 14. Deployment Checklist

- [x] Cognito User Pool created
- [x] App Client created with proper OAuth settings
- [x] Cognito Authorizer configured in API Gateway
- [x] Auth Lambda function deployed
- [x] API Gateway endpoints created (/auth/login, /auth/logout, /auth/me)
- [x] CORS configured on all endpoints
- [x] Lambda permissions granted to API Gateway
- [x] Test user created
- [x] All endpoints tested successfully
- [x] CloudWatch logging enabled
- [x] Resources tagged with ClientName and Project
- [ ] MFA enabled (optional, recommended for production)
- [ ] Existing query endpoints protected (optional, as needed)
- [ ] Production callback URLs updated
- [ ] Frontend integration completed
- [ ] User documentation provided

---

## 15. Next Steps

### Immediate (Optional)
1. **Protect Query Endpoints:** Apply Cognito authorizer to `/api/orders`, `/api/customers`, etc.
2. **Update Frontend:** Integrate authentication into React dashboard
3. **User Groups:** Create user groups for role-based access control
4. **Custom Attributes:** Add custom user attributes if needed (e.g., company, role)

### Short-term
1. **Enable MFA:** Add multi-factor authentication for enhanced security
2. **Custom Domain:** Configure custom domain for Cognito hosted UI
3. **Email Templates:** Customize verification and password reset emails
4. **Advanced Security:** Enable advanced security features (risk-based authentication)

### Long-term
1. **SSO Integration:** Connect with corporate identity providers (SAML, OIDC)
2. **User Analytics:** Implement user activity tracking
3. **Automated User Provisioning:** Create users automatically from order imports
4. **Role-Based Access:** Implement granular permissions based on user groups

---

## 16. Resources and Documentation

### AWS Documentation
- [Cognito User Pools](https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools.html)
- [API Gateway Cognito Authorizers](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html)
- [Lambda Functions](https://docs.aws.amazon.com/lambda/latest/dg/welcome.html)

### Frontend Libraries
- [AWS Amplify](https://docs.amplify.aws/javascript/build-a-backend/auth/)
- [amazon-cognito-identity-js](https://github.com/aws-amplify/amplify-js/tree/main/packages/amazon-cognito-identity-js)

### Project Files
- `auth-lambda.mjs` - Authentication Lambda function
- `setup-auth-endpoints.sh` - API Gateway setup script (reference only)
- `auth-lambda-policy.json` - IAM policy for Lambda
- `auth-lambda-trust-policy.json` - IAM trust policy for Lambda

---

## 17. Support and Maintenance

### Updating Lambda Code

```bash
# Make changes to auth-lambda.mjs
# Create deployment package
powershell Compress-Archive -Path auth-lambda.mjs,node_modules,package.json -DestinationPath lambda-auth-deploy.zip -Force

# Deploy
aws lambda update-function-code \
  --function-name packprodAuthHandler \
  --zip-file fileb://lambda-auth-deploy.zip \
  --region ap-southeast-2
```

### Rotating Client Secret

```bash
# Create new app client
# Update Lambda environment variables
# Update frontend configuration
# Deprecate old client
```

### Backup and Recovery

**User Pool Settings:**
```bash
aws cognito-idp describe-user-pool \
  --user-pool-id ap-southeast-2_0c7Lo2lAa \
  --region ap-southeast-2 > user-pool-backup.json
```

**Export Users:** Use AWS Console > Cognito > Export to CSV

---

## Summary

AWS Cognito authentication has been successfully deployed for the Packaging Products WebOrders system. All components are operational and tested:

**Deployed Resources:**
- Cognito User Pool: `ap-southeast-2_0c7Lo2lAa`
- App Client: `2hi3sujs6jv5j0mc5bru6071sa`
- Authorizer: `4ld8xq`
- Lambda: `packprodAuthHandler`
- Endpoints: `/auth/login`, `/auth/logout`, `/auth/me`

**Test Results:**
- Login: ✅ Success
- Get User Info: ✅ Success
- Logout: ✅ Success
- CORS: ✅ Configured

**Status:** Ready for frontend integration and production use.

---

**Report Generated:** October 23, 2025
**Author:** AWS Cognito Setup Automation
**Project:** Packaging Products WebOrders
**Contact:** support@packagingproducts.com
