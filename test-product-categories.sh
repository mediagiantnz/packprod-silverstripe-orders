#!/bin/bash

# Test Product Categories Endpoints
# This script tests all new category-related functionality

BASE_URL="https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod"

echo "=========================================="
echo "Testing Product Categories Functionality"
echo "=========================================="
echo ""

# Test 1: Get all categories
echo "Test 1: GET /api/products/categories"
echo "--------------------------------------"
echo "Description: Retrieve all product categories with metadata"
echo ""
echo "Request:"
echo "curl \"$BASE_URL/api/products/categories\""
echo ""
echo "Response:"
curl -s "$BASE_URL/api/products/categories" | jq '.'
echo ""
echo ""

# Test 2: Get products with categories (no filter)
echo "Test 2: GET /api/reports/products (with category info)"
echo "--------------------------------------"
echo "Description: Retrieve all products with category field included"
echo ""
echo "Request:"
echo "curl \"$BASE_URL/api/reports/products?limit=5\""
echo ""
echo "Response:"
curl -s "$BASE_URL/api/reports/products?limit=5" | jq '.data.products[] | {product_code, description, category, total_revenue, total_quantity}'
echo ""
echo ""

# Test 3: Filter by Cardboard Boxes category
echo "Test 3: GET /api/reports/products?category=Cardboard Boxes"
echo "--------------------------------------"
echo "Description: Filter products by 'Cardboard Boxes' category"
echo ""
echo "Request:"
echo "curl \"$BASE_URL/api/reports/products?category=Cardboard%20Boxes\""
echo ""
echo "Response:"
curl -s "$BASE_URL/api/reports/products?category=Cardboard%20Boxes" | jq '{
  summary: .data.summary,
  products: .data.products | map({product_code, category, total_revenue})
}'
echo ""
echo ""

# Test 4: Filter by Tape & Adhesives category
echo "Test 4: GET /api/reports/products?category=Tape & Adhesives"
echo "--------------------------------------"
echo "Description: Filter products by 'Tape & Adhesives' category"
echo ""
echo "Request:"
echo "curl \"$BASE_URL/api/reports/products?category=Tape%20%26%20Adhesives\""
echo ""
echo "Response:"
curl -s "$BASE_URL/api/reports/products?category=Tape%20%26%20Adhesives" | jq '{
  summary: .data.summary,
  products: .data.products | map({product_code, category, total_revenue})
}'
echo ""
echo ""

# Test 5: Filter by Labels & Markers category
echo "Test 5: GET /api/reports/products?category=Labels & Markers"
echo "--------------------------------------"
echo "Description: Filter products by 'Labels & Markers' category"
echo ""
echo "Request:"
echo "curl \"$BASE_URL/api/reports/products?category=Labels%20%26%20Markers\""
echo ""
echo "Response:"
curl -s "$BASE_URL/api/reports/products?category=Labels%20%26%20Markers" | jq '{
  summary: .data.summary,
  products: .data.products | map({product_code, category, total_revenue})
}'
echo ""
echo ""

# Test 6: Get category report
echo "Test 6: GET /api/reports/categories"
echo "--------------------------------------"
echo "Description: Get comprehensive category sales breakdown"
echo ""
echo "Request:"
echo "curl \"$BASE_URL/api/reports/categories\""
echo ""
echo "Response:"
curl -s "$BASE_URL/api/reports/categories" | jq '.data.summary'
echo ""
echo ""

# Summary of all categories
echo "=========================================="
echo "Category Summary"
echo "=========================================="
echo ""
curl -s "$BASE_URL/api/products/categories" | jq -r '.data.categories[] | "\(.name): \(.product_count) products - \(.description)"'
echo ""

echo "=========================================="
echo "All Tests Complete!"
echo "=========================================="
echo ""
echo "Available Categories:"
curl -s "$BASE_URL/api/products/categories" | jq -r '.data.categories[].name' | nl
echo ""
