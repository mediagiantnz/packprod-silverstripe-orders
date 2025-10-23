#!/bin/bash

# Test script for Email Alerts Lambda function
# This script tests the email alert system without using DynamoDB Stream

set -e

REGION="ap-southeast-2"
FUNCTION_NAME="emailAlertsPackagingProducts"

echo "=========================================="
echo "Testing Email Alerts Lambda"
echo "=========================================="
echo "Function: $FUNCTION_NAME"
echo "Region: $REGION"
echo ""

# Create a test event that simulates a DynamoDB Stream INSERT event
cat > test-email-event.json <<'EOF'
{
  "Records": [
    {
      "eventID": "1",
      "eventName": "INSERT",
      "eventVersion": "1.1",
      "eventSource": "aws:dynamodb",
      "awsRegion": "ap-southeast-2",
      "dynamodb": {
        "Keys": {
          "orderID": {
            "S": "ORD-TEST-123456"
          }
        },
        "NewImage": {
          "orderID": {
            "S": "ORD-442856-1729479000000"
          },
          "contactID": {
            "S": "9b6d1b10-8e7f-485a-abe3-506168567a61"
          },
          "clientID": {
            "S": "7b0d485f-8ef9-45b0-881a-9d8f4447ced2"
          },
          "order_reference": {
            "S": "442856"
          },
          "order_date": {
            "S": "21/10/2025 11:49 am"
          },
          "greentree_order_reference": {
            "S": "442856"
          },
          "greentree_id": {
            "S": "3493.344774"
          },
          "greentree_status": {
            "S": "Entered"
          },
          "customer": {
            "M": {
              "contact_name": {
                "S": "ash harrington"
              },
              "firstName": {
                "S": "ash"
              },
              "lastName": {
                "S": "harrington"
              },
              "email": {
                "S": "ashleighlouise21@yahoo.co.nz"
              },
              "phone": {
                "S": "0210399366"
              },
              "company": {
                "S": "Ash H C/O Kingfisher Gifts"
              },
              "account_name": {
                "S": "PPL Web Sales"
              },
              "account_code": {
                "S": "100014"
              }
            }
          },
          "delivery": {
            "M": {
              "name": {
                "S": "ash harrington"
              },
              "company": {
                "S": "Ash H C/O Kingfisher Gifts"
              },
              "street": {
                "S": "70 High St"
              },
              "city": {
                "S": "Waipawa"
              },
              "country": {
                "S": "New Zealand"
              },
              "phone": {
                "S": "0210399366"
              }
            }
          },
          "items": {
            "L": [
              {
                "M": {
                  "product_code": {
                    "S": "CCPP2"
                  },
                  "description": {
                    "S": "PP2 Cardboard Box"
                  },
                  "unit_price": {
                    "N": "1.00"
                  },
                  "quantity": {
                    "N": "25"
                  },
                  "total_price": {
                    "N": "25.00"
                  }
                }
              },
              {
                "M": {
                  "product_code": {
                    "S": "CCPP4"
                  },
                  "description": {
                    "S": "PP4 Cardboard Box"
                  },
                  "unit_price": {
                    "N": "1.12"
                  },
                  "quantity": {
                    "N": "25"
                  },
                  "total_price": {
                    "N": "28.00"
                  }
                }
              }
            ]
          },
          "totals": {
            "M": {
              "subtotal": {
                "S": "53.00"
              },
              "freight": {
                "S": "15.56"
              },
              "freight_description": {
                "S": "Hawke's Bay"
              },
              "gst": {
                "S": "10.28"
              },
              "total": {
                "S": "78.84"
              }
            }
          },
          "payment": {
            "M": {
              "payment_type": {
                "S": "PxPay"
              },
              "transaction_id": {
                "S": "0000000a097310ca"
              },
              "amount": {
                "S": "NZ$78.84"
              }
            }
          },
          "status": {
            "S": "pending"
          },
          "createdAt": {
            "S": "2025-10-21T00:49:00.000Z"
          }
        },
        "SequenceNumber": "111",
        "SizeBytes": 26,
        "StreamViewType": "NEW_IMAGE"
      }
    }
  ]
}
EOF

echo "Test event created: test-email-event.json"
echo ""

# Invoke Lambda function with test event
echo "Invoking Lambda function..."
RESPONSE=$(aws lambda invoke \
  --function-name $FUNCTION_NAME \
  --payload file://test-email-event.json \
  --region $REGION \
  response.json 2>&1)

echo "$RESPONSE"
echo ""

# Display the response
echo "Lambda Response:"
cat response.json | jq '.'
echo ""

# Check for errors
if grep -q "errorMessage" response.json; then
  echo "❌ Error detected in response!"
  exit 1
else
  echo "✓ Test completed successfully"
  echo ""
  echo "Next Steps:"
  echo "1. Check your email (both customer and admin addresses)"
  echo "2. Review CloudWatch logs:"
  echo "   aws logs tail /aws/lambda/$FUNCTION_NAME --follow --region $REGION"
  echo "3. If emails didn't arrive, verify SES email addresses are verified"
fi

# Cleanup
rm -f test-email-event.json response.json
