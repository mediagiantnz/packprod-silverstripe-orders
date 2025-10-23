import {
  CognitoIdentityProviderClient,
  InitiateAuthCommand,
  GetUserCommand,
  GlobalSignOutCommand,
  AdminGetUserCommand
} from "@aws-sdk/client-cognito-identity-provider";
import crypto from "crypto";

const client = new CognitoIdentityProviderClient({ region: process.env.AWS_REGION || "ap-southeast-2" });

const USER_POOL_ID = process.env.USER_POOL_ID;
const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

// Helper function to calculate SECRET_HASH for Cognito
function calculateSecretHash(username, clientId, clientSecret) {
  return crypto
    .createHmac("SHA256", clientSecret)
    .update(username + clientId)
    .digest("base64");
}

// Helper function to format responses with CORS
function formatResponse(statusCode, body) {
  return {
    statusCode,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Content-Type,Authorization",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  };
}

// POST /auth/login - Authenticate user and return tokens
async function handleLogin(body) {
  try {
    const { email, password } = JSON.parse(body);

    if (!email || !password) {
      return formatResponse(400, {
        success: false,
        error: "Email and password are required"
      });
    }

    const secretHash = calculateSecretHash(email, CLIENT_ID, CLIENT_SECRET);

    const command = new InitiateAuthCommand({
      AuthFlow: "USER_PASSWORD_AUTH",
      ClientId: CLIENT_ID,
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password,
        SECRET_HASH: secretHash
      }
    });

    const response = await client.send(command);

    return formatResponse(200, {
      success: true,
      data: {
        accessToken: response.AuthenticationResult.AccessToken,
        idToken: response.AuthenticationResult.IdToken,
        refreshToken: response.AuthenticationResult.RefreshToken,
        expiresIn: response.AuthenticationResult.ExpiresIn,
        tokenType: response.AuthenticationResult.TokenType
      }
    });
  } catch (error) {
    console.error("Login error:", error);

    if (error.name === "NotAuthorizedException") {
      return formatResponse(401, {
        success: false,
        error: "Invalid email or password"
      });
    }

    if (error.name === "UserNotFoundException") {
      return formatResponse(401, {
        success: false,
        error: "Invalid email or password"
      });
    }

    return formatResponse(500, {
      success: false,
      error: "Authentication failed"
    });
  }
}

// POST /auth/logout - Sign out user globally
async function handleLogout(accessToken) {
  try {
    const command = new GlobalSignOutCommand({
      AccessToken: accessToken
    });

    await client.send(command);

    return formatResponse(200, {
      success: true,
      message: "Logged out successfully"
    });
  } catch (error) {
    console.error("Logout error:", error);
    return formatResponse(500, {
      success: false,
      error: "Logout failed"
    });
  }
}

// GET /auth/me - Get current user information
async function handleGetUser(accessToken) {
  try {
    const command = new GetUserCommand({
      AccessToken: accessToken
    });

    const response = await client.send(command);

    // Transform attributes array to object
    const attributes = {};
    response.UserAttributes.forEach(attr => {
      attributes[attr.Name] = attr.Value;
    });

    return formatResponse(200, {
      success: true,
      data: {
        username: response.Username,
        email: attributes.email,
        emailVerified: attributes.email_verified === "true",
        sub: attributes.sub,
        attributes
      }
    });
  } catch (error) {
    console.error("Get user error:", error);

    if (error.name === "NotAuthorizedException") {
      return formatResponse(401, {
        success: false,
        error: "Invalid or expired token"
      });
    }

    return formatResponse(500, {
      success: false,
      error: "Failed to get user information"
    });
  }
}

export const handler = async (event) => {
  console.log("Event:", JSON.stringify(event, null, 2));

  const { httpMethod, path, body, headers } = event;

  // Handle OPTIONS for CORS preflight
  if (httpMethod === "OPTIONS") {
    return formatResponse(200, { message: "OK" });
  }

  try {
    // POST /auth/login
    if (httpMethod === "POST" && path === "/auth/login") {
      return await handleLogin(body);
    }

    // POST /auth/logout
    if (httpMethod === "POST" && path === "/auth/logout") {
      const accessToken = headers.Authorization || headers.authorization;
      if (!accessToken) {
        return formatResponse(401, {
          success: false,
          error: "Authorization header required"
        });
      }
      return await handleLogout(accessToken.replace("Bearer ", ""));
    }

    // GET /auth/me
    if (httpMethod === "GET" && path === "/auth/me") {
      const accessToken = headers.Authorization || headers.authorization;
      if (!accessToken) {
        return formatResponse(401, {
          success: false,
          error: "Authorization header required"
        });
      }
      return await handleGetUser(accessToken.replace("Bearer ", ""));
    }

    // Unknown endpoint
    return formatResponse(404, {
      success: false,
      error: "Endpoint not found"
    });
  } catch (error) {
    console.error("Unexpected error:", error);
    return formatResponse(500, {
      success: false,
      error: "Internal server error"
    });
  }
};
