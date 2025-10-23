#!/bin/bash

# Script to verify SES email addresses for Email Alerts system

set -e

REGION="ap-southeast-2"
ADMIN_EMAIL="andy@automateai.co.nz"
FROM_EMAIL="noreply@automateai.co.nz"

echo "=========================================="
echo "SES Email Verification"
echo "=========================================="
echo "Region: $REGION"
echo ""

# Check current verification status
echo "Checking current verified email addresses..."
VERIFIED_EMAILS=$(aws ses list-verified-email-addresses --region $REGION --query 'VerifiedEmailAddresses' --output json)

echo "Currently verified emails:"
echo "$VERIFIED_EMAILS" | jq -r '.[]' | while read email; do
  echo "  ✓ $email"
done
echo ""

# Function to verify an email
verify_email() {
  local email=$1
  echo "Checking $email..."

  if echo "$VERIFIED_EMAILS" | grep -q "\"$email\""; then
    echo "  ✓ $email is already verified"
  else
    echo "  ⚠ $email is NOT verified"
    echo "  Sending verification email to $email..."

    aws ses verify-email-identity \
      --email-address "$email" \
      --region $REGION

    echo "  ✓ Verification email sent!"
    echo "  Please check the inbox for $email and click the verification link."
    echo ""
  fi
}

# Verify required emails
echo "Verifying required email addresses..."
echo ""

verify_email "$FROM_EMAIL"
verify_email "$ADMIN_EMAIL"

# Summary
echo "=========================================="
echo "Verification Summary"
echo "=========================================="
echo ""
echo "If you received verification emails, please:"
echo "1. Check your inbox for emails from Amazon SES"
echo "2. Click the verification link in each email"
echo "3. Wait a few minutes for verification to complete"
echo "4. Re-run this script to confirm verification"
echo ""
echo "To check verification status:"
echo "  aws ses list-verified-email-addresses --region $REGION"
echo ""
echo "Note: In SES Sandbox mode, you can only send emails to verified addresses."
echo "To send to any email address, request production access:"
echo "  https://console.aws.amazon.com/ses/home?region=$REGION#/account"
echo ""
