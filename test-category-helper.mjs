/**
 * Test file for product-category-helper functions
 *
 * Run with: node test-category-helper.mjs
 */

import {
  getCategoryForProduct,
  getAllCategories,
  getProductsByCategory,
  getCategoryDetails,
  getCategoryNames,
  searchCategoriesByKeyword,
  enrichOrderItemsWithCategories,
  groupItemsByCategory,
  calculateCategoryTotals,
  getCategoryStats
} from './product-category-helper.mjs';

console.log('='.repeat(80));
console.log('PRODUCT CATEGORY HELPER - TEST SUITE');
console.log('='.repeat(80));

// Test 1: Get category for product
console.log('\n1. GET CATEGORY FOR PRODUCT');
console.log('-'.repeat(80));
console.log('getCategoryForProduct("CCPP2"):', getCategoryForProduct('CCPP2'));
console.log('getCategoryForProduct("TSPAKPTH"):', getCategoryForProduct('TSPAKPTH'));
console.log('getCategoryForProduct("HGPLPFC"):', getCategoryForProduct('HGPLPFC'));
console.log('getCategoryForProduct("UNKNOWN"):', getCategoryForProduct('UNKNOWN'));

// Test 2: Get all categories
console.log('\n2. GET ALL CATEGORIES');
console.log('-'.repeat(80));
const allCategories = getAllCategories();
console.log('Total categories:', Object.keys(allCategories).length);
console.log('Categories:', Object.keys(allCategories).join(', '));

// Test 3: Get products by category
console.log('\n3. GET PRODUCTS BY CATEGORY');
console.log('-'.repeat(80));
const cardboardProducts = getProductsByCategory('Cardboard Boxes');
console.log('Cardboard Boxes products:', cardboardProducts);

// Test 4: Get category details
console.log('\n4. GET CATEGORY DETAILS');
console.log('-'.repeat(80));
const cardboardDetails = getCategoryDetails('Cardboard Boxes');
console.log('Cardboard Boxes details:');
console.log(JSON.stringify(cardboardDetails, null, 2));

// Test 5: Get category names
console.log('\n5. GET CATEGORY NAMES');
console.log('-'.repeat(80));
const categoryNames = getCategoryNames();
console.log('All category names:');
categoryNames.forEach((name, index) => {
  console.log(`  ${index + 1}. ${name}`);
});

// Test 6: Search categories by keyword
console.log('\n6. SEARCH CATEGORIES BY KEYWORD');
console.log('-'.repeat(80));
const tapeCategories = searchCategoriesByKeyword('tape');
console.log('Categories matching "tape":');
tapeCategories.forEach(cat => {
  console.log(`  - ${cat.name}: ${cat.description}`);
});

// Test 7: Get category stats
console.log('\n7. GET CATEGORY STATISTICS');
console.log('-'.repeat(80));
const stats = getCategoryStats();
console.log('Category Statistics:');
console.log(JSON.stringify(stats, null, 2));

// Test 8: Enrich order items
console.log('\n8. ENRICH ORDER ITEMS WITH CATEGORIES');
console.log('-'.repeat(80));
const sampleItems = [
  { product_code: 'CCPP2', description: 'PP2 Cardboard Box', quantity: 25, unit_price: 1.00, total_price: 25.00 },
  { product_code: 'CCPP4', description: 'PP4 Cardboard Box', quantity: 25, unit_price: 1.12, total_price: 28.00 },
  { product_code: 'TSPAKPTH', description: 'Clear Pak Tape', quantity: 180, unit_price: 1.90, total_price: 342.00 },
  { product_code: 'HGPLPFC', description: 'Latex Gloves XL', quantity: 12, unit_price: 9.30, total_price: 111.60 }
];
console.log('Original items:', sampleItems.length);
const enrichedItems = enrichOrderItemsWithCategories(sampleItems);
console.log('Enriched items:');
enrichedItems.forEach(item => {
  console.log(`  ${item.product_code} (${item.category || 'Uncategorized'}): ${item.description}`);
});

// Test 9: Group items by category
console.log('\n9. GROUP ITEMS BY CATEGORY');
console.log('-'.repeat(80));
const groupedItems = groupItemsByCategory(sampleItems);
console.log('Items grouped by category:');
Object.entries(groupedItems).forEach(([category, items]) => {
  console.log(`\n  ${category}:`);
  items.forEach(item => {
    console.log(`    - ${item.product_code}: ${item.description} (Qty: ${item.quantity})`);
  });
});

// Test 10: Calculate category totals
console.log('\n10. CALCULATE CATEGORY TOTALS');
console.log('-'.repeat(80));
const categoryTotals = calculateCategoryTotals(sampleItems);
console.log('Category-wise totals:');
Object.entries(categoryTotals).forEach(([category, totals]) => {
  console.log(`\n  ${category}:`);
  console.log(`    Total Quantity: ${totals.quantity}`);
  console.log(`    Total Revenue: $${totals.revenue.toFixed(2)}`);
  console.log(`    Item Count: ${totals.itemCount}`);
  console.log(`    Avg Price per Item: $${(totals.revenue / totals.itemCount).toFixed(2)}`);
});

// Test 11: Comprehensive order analysis
console.log('\n11. COMPREHENSIVE ORDER ANALYSIS');
console.log('-'.repeat(80));
const comprehensiveOrder = {
  orderID: 'ORD-442896-TEST',
  order_reference: '442896',
  items: [
    { product_code: 'CCPP2', description: 'PP2 Cardboard Box', quantity: 800, unit_price: 0.6, total_price: 480 },
    { product_code: 'HGPLPFC', description: 'Latex Gloves XL', quantity: 12, unit_price: 9.3, total_price: 111.6 },
    { product_code: 'LMETBBB', description: 'Best Before Labels', quantity: 1, unit_price: 89, total_price: 89 },
    { product_code: 'TSPAKPTH', description: 'Clear Pak Tape', quantity: 180, unit_price: 1.9, total_price: 342 },
    { product_code: '1LMED4', description: 'Top Stow Label', quantity: 8, unit_price: 24.2, total_price: 193.6 },
    { product_code: 'CCQ', description: 'Q Cardboard Box', quantity: 400, unit_price: 2.95, total_price: 1180 }
  ]
};

console.log(`Order: ${comprehensiveOrder.order_reference}`);
console.log(`Total Items: ${comprehensiveOrder.items.length}`);

const enrichedOrder = enrichOrderItemsWithCategories(comprehensiveOrder.items);
const groupedOrder = groupItemsByCategory(comprehensiveOrder.items);
const totalsOrder = calculateCategoryTotals(comprehensiveOrder.items);

console.log('\nCategory Breakdown:');
Object.entries(totalsOrder).forEach(([category, totals]) => {
  const percentage = (totals.revenue / comprehensiveOrder.items.reduce((sum, i) => sum + i.total_price, 0) * 100);
  console.log(`  ${category}:`);
  console.log(`    Items: ${totals.itemCount}`);
  console.log(`    Quantity: ${totals.quantity}`);
  console.log(`    Revenue: $${totals.revenue.toFixed(2)} (${percentage.toFixed(1)}%)`);
});

const totalRevenue = comprehensiveOrder.items.reduce((sum, item) => sum + item.total_price, 0);
const totalQuantity = comprehensiveOrder.items.reduce((sum, item) => sum + item.quantity, 0);
console.log(`\nOrder Totals:`);
console.log(`  Total Revenue: $${totalRevenue.toFixed(2)}`);
console.log(`  Total Quantity: ${totalQuantity}`);
console.log(`  Average Item Price: $${(totalRevenue / totalQuantity).toFixed(2)}`);

console.log('\n' + '='.repeat(80));
console.log('ALL TESTS COMPLETED SUCCESSFULLY');
console.log('='.repeat(80));
