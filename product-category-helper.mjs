/**
 * Product Category Helper
 *
 * Provides utility functions for mapping product codes to categories
 * and retrieving category information for the Packaging Products order system.
 *
 * @module product-category-helper
 */

import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

// Get the current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load product categories from JSON file
let categoriesData;
try {
  const categoriesPath = join(__dirname, 'product-categories.json');
  const rawData = readFileSync(categoriesPath, 'utf8');
  categoriesData = JSON.parse(rawData);
} catch (error) {
  console.error('Error loading product categories:', error);
  categoriesData = { categories: {}, metadata: {} };
}

/**
 * Get the category name for a given product code
 *
 * @param {string} productCode - The product code to look up
 * @returns {string|null} The category name, or null if not found
 *
 * @example
 * getCategoryForProduct('CCPP2') // Returns: "Cardboard Boxes"
 * getCategoryForProduct('TSPAKPTH') // Returns: "Packaging Tape & Dispensers"
 * getCategoryForProduct('UNKNOWN') // Returns: null
 */
export function getCategoryForProduct(productCode) {
  if (!productCode) return null;

  const categories = categoriesData.categories;

  for (const [categoryName, categoryData] of Object.entries(categories)) {
    if (categoryData.products.includes(productCode)) {
      return categoryName;
    }
  }

  return null;
}

/**
 * Get all categories with their details
 *
 * @returns {Object} All categories with products, descriptions, and keywords
 *
 * @example
 * const categories = getAllCategories();
 * // Returns:
 * // {
 * //   "Cardboard Boxes": {
 * //     "products": ["CCPP2", "CCPP4", ...],
 * //     "description": "...",
 * //     "keywords": [...]
 * //   },
 * //   ...
 * // }
 */
export function getAllCategories() {
  return categoriesData.categories;
}

/**
 * Get all products in a specific category
 *
 * @param {string} categoryName - The name of the category
 * @returns {Array<string>|null} Array of product codes, or null if category not found
 *
 * @example
 * getProductsByCategory('Cardboard Boxes')
 * // Returns: ["CCPP2", "CCPP4", "CCPP10", "CCQ"]
 */
export function getProductsByCategory(categoryName) {
  if (!categoryName) return null;

  const category = categoriesData.categories[categoryName];
  return category ? category.products : null;
}

/**
 * Get detailed information about a specific category
 *
 * @param {string} categoryName - The name of the category
 * @returns {Object|null} Category details including products, description, and keywords
 *
 * @example
 * getCategoryDetails('Cardboard Boxes')
 * // Returns:
 * // {
 * //   "products": ["CCPP2", "CCPP4", "CCPP10", "CCQ"],
 * //   "description": "Cardboard packaging boxes...",
 * //   "keywords": ["box", "cardboard", "PP", "wine bottle"]
 * // }
 */
export function getCategoryDetails(categoryName) {
  if (!categoryName) return null;

  return categoriesData.categories[categoryName] || null;
}

/**
 * Get a list of all category names
 *
 * @returns {Array<string>} Array of category names
 *
 * @example
 * getCategoryNames()
 * // Returns: ["Cardboard Boxes", "Packaging Tape & Dispensers", ...]
 */
export function getCategoryNames() {
  return Object.keys(categoriesData.categories);
}

/**
 * Search for categories by keyword
 *
 * @param {string} keyword - The keyword to search for
 * @returns {Array<Object>} Array of matching categories with their details
 *
 * @example
 * searchCategoriesByKeyword('tape')
 * // Returns categories that have "tape" in their keywords, description, or name
 */
export function searchCategoriesByKeyword(keyword) {
  if (!keyword) return [];

  const searchTerm = keyword.toLowerCase();
  const results = [];

  for (const [categoryName, categoryData] of Object.entries(categoriesData.categories)) {
    const matchesName = categoryName.toLowerCase().includes(searchTerm);
    const matchesDescription = categoryData.description.toLowerCase().includes(searchTerm);
    const matchesKeywords = categoryData.keywords.some(kw => kw.toLowerCase().includes(searchTerm));

    if (matchesName || matchesDescription || matchesKeywords) {
      results.push({
        name: categoryName,
        ...categoryData
      });
    }
  }

  return results;
}

/**
 * Get category statistics
 *
 * @returns {Object} Statistics about categories and products
 *
 * @example
 * getCategoryStats()
 * // Returns:
 * // {
 * //   totalCategories: 8,
 * //   totalProducts: 17,
 * //   averageProductsPerCategory: 2.13,
 * //   categoriesBreakdown: { "Cardboard Boxes": 4, ... }
 * // }
 */
export function getCategoryStats() {
  const categories = categoriesData.categories;
  const categoryNames = Object.keys(categories);
  const totalCategories = categoryNames.length;

  let totalProducts = 0;
  const categoriesBreakdown = {};

  for (const [name, data] of Object.entries(categories)) {
    const productCount = data.products.length;
    totalProducts += productCount;
    categoriesBreakdown[name] = productCount;
  }

  return {
    totalCategories,
    totalProducts,
    averageProductsPerCategory: totalCategories > 0 ? (totalProducts / totalCategories).toFixed(2) : 0,
    categoriesBreakdown,
    metadata: categoriesData.metadata
  };
}

/**
 * Enrich order items with category information
 *
 * @param {Array<Object>} items - Array of order items with product_code
 * @returns {Array<Object>} Items enriched with category information
 *
 * @example
 * const items = [
 *   { product_code: 'CCPP2', description: 'PP2 Box', quantity: 10 },
 *   { product_code: 'TSPAKPTH', description: 'Clear Tape', quantity: 5 }
 * ];
 * const enriched = enrichOrderItemsWithCategories(items);
 * // Returns items with added 'category' field
 */
export function enrichOrderItemsWithCategories(items) {
  if (!Array.isArray(items)) return [];

  return items.map(item => ({
    ...item,
    category: getCategoryForProduct(item.product_code)
  }));
}

/**
 * Group order items by category
 *
 * @param {Array<Object>} items - Array of order items with product_code
 * @returns {Object} Items grouped by category
 *
 * @example
 * const items = [
 *   { product_code: 'CCPP2', quantity: 10, total_price: 100 },
 *   { product_code: 'CCPP4', quantity: 5, total_price: 50 },
 *   { product_code: 'TSPAKPTH', quantity: 20, total_price: 40 }
 * ];
 * const grouped = groupItemsByCategory(items);
 * // Returns:
 * // {
 * //   "Cardboard Boxes": [
 * //     { product_code: 'CCPP2', ... },
 * //     { product_code: 'CCPP4', ... }
 * //   ],
 * //   "Packaging Tape & Dispensers": [
 * //     { product_code: 'TSPAKPTH', ... }
 * //   ]
 * // }
 */
export function groupItemsByCategory(items) {
  if (!Array.isArray(items)) return {};

  const grouped = {};

  for (const item of items) {
    const category = getCategoryForProduct(item.product_code) || 'Uncategorized';

    if (!grouped[category]) {
      grouped[category] = [];
    }

    grouped[category].push(item);
  }

  return grouped;
}

/**
 * Calculate category-wise totals from order items
 *
 * @param {Array<Object>} items - Array of order items with product_code, quantity, and total_price
 * @returns {Object} Category-wise statistics
 *
 * @example
 * const items = [
 *   { product_code: 'CCPP2', quantity: 10, total_price: 100 },
 *   { product_code: 'TSPAKPTH', quantity: 20, total_price: 40 }
 * ];
 * const stats = calculateCategoryTotals(items);
 * // Returns:
 * // {
 * //   "Cardboard Boxes": { quantity: 10, revenue: 100, itemCount: 1 },
 * //   "Packaging Tape & Dispensers": { quantity: 20, revenue: 40, itemCount: 1 }
 * // }
 */
export function calculateCategoryTotals(items) {
  if (!Array.isArray(items)) return {};

  const totals = {};

  for (const item of items) {
    const category = getCategoryForProduct(item.product_code) || 'Uncategorized';

    if (!totals[category]) {
      totals[category] = {
        quantity: 0,
        revenue: 0,
        itemCount: 0
      };
    }

    totals[category].quantity += item.quantity || 0;
    totals[category].revenue += item.total_price || 0;
    totals[category].itemCount += 1;
  }

  return totals;
}

// Export all functions as default object as well
export default {
  getCategoryForProduct,
  getAllCategories,
  getProductsByCategory,
  getCategoryDetails,
  getCategoryNames,
  searchCategoriesByKeyword,
  getCategoryStats,
  enrichOrderItemsWithCategories,
  groupItemsByCategory,
  calculateCategoryTotals
};
