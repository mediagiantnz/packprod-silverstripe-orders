import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand, QueryCommand, BatchWriteCommand } from "@aws-sdk/lib-dynamodb";
import { v4 as uuidv4 } from "uuid";

const dynamoDBClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const docClient = DynamoDBDocumentClient.from(dynamoDBClient);

const CONTACTS_TABLE_NAME = process.env.CONTACTS_TABLE_NAME; // RocketReview_Contacts
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
      // API Gateway request
      if (typeof event.body === 'string') {
        requestBody = JSON.parse(event.body);
      } else {
        requestBody = event.body;
      }
    } else {
      // Direct Lambda invocation
      requestBody = event;
    }

    console.log("Parsed request body: ", JSON.stringify(requestBody, null, 2));

    // Check if n8n is sending data directly without wrapper
    let clientID = requestBody.clientID;
    let contacts = [];
    
    // Handle different data formats
    if (requestBody.contact) {
      // Single contact with wrapper
      contacts = [requestBody.contact];
    } else if (requestBody.contacts) {
      // Check if contacts is a string that needs parsing (n8n issue)
      if (typeof requestBody.contacts === 'string') {
        console.log("Contacts field is a string, attempting to parse it...");
        try {
          // Try to parse the string as JSON
          const parsedContacts = JSON.parse(requestBody.contacts);
          
          // Check if the parsed result contains a contact object
          if (parsedContacts.contact) {
            contacts = [parsedContacts.contact];
            console.log("Successfully parsed single contact from string");
          } else if (parsedContacts.contacts && Array.isArray(parsedContacts.contacts)) {
            contacts = parsedContacts.contacts;
            console.log("Successfully parsed contact array from string");
          } else if (Array.isArray(parsedContacts)) {
            contacts = parsedContacts;
            console.log("Successfully parsed direct array from string");
          } else if (parsedContacts.email || parsedContacts.contact_name) {
            // Direct contact object
            contacts = [parsedContacts];
            console.log("Successfully parsed direct contact object from string");
          } else {
            // If none of the above, treat the whole parsed object as a contact
            contacts = [parsedContacts];
            console.log("Treating parsed object as a single contact");
          }
        } catch (parseError) {
          console.error("Failed to parse contacts string:", parseError);
          return {
            statusCode: 400,
            body: JSON.stringify({ 
              message: "Invalid contacts format: could not parse string as JSON",
              error: parseError.message,
              receivedData: requestBody 
            }),
            headers,
          };
        }
      } else if (Array.isArray(requestBody.contacts)) {
        // Multiple contacts with wrapper
        contacts = requestBody.contacts;
      } else {
        // Unknown format for contacts field
        return {
          statusCode: 400,
          body: JSON.stringify({ 
            message: "Invalid contacts format: expected array or parseable JSON string",
            receivedData: requestBody 
          }),
          headers,
        };
      }
    } else if (!clientID && (requestBody.email || requestBody.contact_name)) {
      // n8n might be sending a single contact directly - use default clientID for Packaging Products
      clientID = "7b0d485f-8ef9-45b0-881a-9d8f4447ced2";
      contacts = [requestBody];
      console.log("Using direct contact format with default Packaging Products clientID");
    } else if (Array.isArray(requestBody)) {
      // n8n might be sending an array directly
      clientID = "7b0d485f-8ef9-45b0-881a-9d8f4447ced2";
      contacts = requestBody;
      console.log("Using direct array format with default Packaging Products clientID");
    } else if (!clientID) {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: "clientID is required, or send contact data directly for Packaging Products import.",
          receivedData: requestBody 
        }),
        headers,
      };
    } else {
      return {
        statusCode: 400,
        body: JSON.stringify({ 
          message: "Either 'contact' or 'contacts' array is required.",
          receivedData: requestBody 
        }),
        headers,
      };
    }

    // clientID is already set above
    const importBatchId = requestBody.ImportBatchId || `ppl_import_${new Date().toISOString()}`;
    const timestamp = new Date().toISOString();
    
    // Statistics tracking
    let stats = {
      total: contacts.length,
      successful: 0,
      duplicates: 0,
      errors: 0,
      errorDetails: []
    };

    // Process contacts in batches (DynamoDB batch write limit is 25)
    const batchSize = 25;
    const contactsToImport = [];

    for (let i = 0; i < contacts.length; i++) {
      const contact = contacts[i];
      
      try {
        // Validate required contact fields - flexible for Packaging Products data
        if (!contact.email && !contact.contact_name) {
          stats.errors++;
          stats.errorDetails.push({
            index: i,
            error: "At least one of email or contact_name is required",
            contact: contact
          });
          continue;
        }

        // Check for duplicates based on email + clientID (if email exists)
        if (contact.email) {
          const duplicateCheckParams = {
            TableName: CONTACTS_TABLE_NAME,
            IndexName: "clientID-status-index",
            KeyConditionExpression: "clientID = :clientID",
            FilterExpression: "email = :email",
            ExpressionAttributeValues: {
              ":clientID": clientID,
              ":email": contact.email.toLowerCase().trim()
            }
          };

          const duplicateResult = await docClient.send(new QueryCommand(duplicateCheckParams));
          
          if (duplicateResult.Items && duplicateResult.Items.length > 0) {
            stats.duplicates++;
            console.log(`Duplicate contact found for email: ${contact.email}`);
            continue;
          }
        }

        // Parse name into first and last name if provided as single field
        let firstName = "";
        let lastName = "";
        let fullName = contact.contact_name || "";
        
        if (fullName) {
          const nameParts = fullName.trim().split(' ');
          firstName = nameParts[0] || "";
          lastName = nameParts.slice(1).join(' ') || "";
        }

        // Prepare contact for import with Packaging Products specific fields
        const contactID = contact.ContactID || contact.contactID || uuidv4();
        
        // Handle phone number - convert to string if it's a number
        let phoneNumber = "";
        if (contact.phone) {
          phoneNumber = typeof contact.phone === 'number' 
            ? contact.phone.toString() 
            : contact.phone.toString();
        }

        const contactItem = {
          contactID: contactID,
          clientID: clientID,
          
          // Standard contact fields
          email: contact.email ? contact.email.toLowerCase().trim() : "",
          firstName: firstName,
          lastName: lastName,
          name: fullName,
          phone: phoneNumber,
          company: contact.company || "",
          
          // Packaging Products specific fields
          ppl_account: contact.ppl_account || "",
          ppl_account_number: contact.ppl_account_number ? 
            (typeof contact.ppl_account_number === 'number' ? 
              contact.ppl_account_number.toString() : 
              contact.ppl_account_number) : "",
          
          // Import tracking
          ImportBatchId: importBatchId,
          
          // System fields
          status: contact.status || "pending",
          source: contact.source || "packaging_products_import",
          metadata: {
            originalData: contact,
            importSource: "packaging_products",
            importedAt: timestamp,
            ...(contact.metadata || {})
          },
          createdAt: contact.created_at || timestamp,
          updatedAt: timestamp
        };

        contactsToImport.push(contactItem);

      } catch (contactError) {
        console.error(`Error processing contact at index ${i}:`, contactError);
        stats.errors++;
        stats.errorDetails.push({
          index: i,
          error: contactError.message,
          contact: contact
        });
      }
    }

    // Import contacts in batches
    for (let i = 0; i < contactsToImport.length; i += batchSize) {
      const batch = contactsToImport.slice(i, i + batchSize);
      
      try {
        // Use individual PutCommand for better error handling
        const putPromises = batch.map(contact => 
          docClient.send(new PutCommand({
            TableName: CONTACTS_TABLE_NAME,
            Item: contact,
            ConditionExpression: "attribute_not_exists(contactID)" // Prevent overwrites
          }))
        );

        await Promise.all(putPromises);
        stats.successful += batch.length;
        console.log(`Successfully imported batch of ${batch.length} contacts`);

      } catch (batchError) {
        console.error(`Error importing batch:`, batchError);
        
        // Try individual imports for this batch to identify specific failures
        for (const contact of batch) {
          try {
            await docClient.send(new PutCommand({
              TableName: CONTACTS_TABLE_NAME,
              Item: contact,
              ConditionExpression: "attribute_not_exists(contactID)"
            }));
            stats.successful++;
          } catch (individualError) {
            console.error(`Error importing individual contact ${contact.contactID}:`, individualError);
            stats.errors++;
            stats.errorDetails.push({
              contactID: contact.contactID,
              email: contact.email,
              error: individualError.message
            });
          }
        }
      }
    }

    console.log(`Import completed. Stats:`, stats);

    // Prepare response
    const response = {
      message: "Packaging Products contact import completed",
      clientID: clientID,
      statistics: stats,
      timestamp: timestamp,
      importBatchId: importBatchId
    };

    // Add first contact details if single import was successful
    if (contacts.length === 1 && stats.successful === 1) {
      response.result = "SUCCESS - New contact imported";
      response.email = contactsToImport[0].email;
      response.name = contactsToImport[0].name;
      response.company = contactsToImport[0].company;
    }

    return {
      statusCode: 200,
      body: JSON.stringify(response),
      headers,
    };

  } catch (error) {
    console.error("Error importing Packaging Products contacts: ", error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        message: "Failed to import Packaging Products contacts", 
        error: error.message,
        stack: error.stack 
      }),
      headers,
    };
  }
};