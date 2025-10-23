/**
 * Test script for Order Statistics Endpoint
 *
 * This script demonstrates how to test the getOrderStatistics function
 * both locally and via API Gateway.
 */

import { handler } from './query-orders-lambda.mjs';

// Test events simulating API Gateway requests

// Test 1: Get all-time statistics with customer data
const testAllTimeStats = {
  httpMethod: 'GET',
  path: '/api/reports/statistics',
  resource: '/api/reports/statistics',
  pathParameters: {},
  queryStringParameters: {
    includeCustomerStats: 'true'
  },
  headers: {
    'Content-Type': 'application/json'
  }
};

// Test 2: Get statistics for specific date range
const testDateRangeStats = {
  httpMethod: 'GET',
  path: '/api/reports/statistics',
  resource: '/api/reports/statistics',
  pathParameters: {},
  queryStringParameters: {
    startDate: '2025-01-01T00:00:00.000Z',
    endDate: '2025-12-31T23:59:59.999Z',
    includeCustomerStats: 'true'
  },
  headers: {
    'Content-Type': 'application/json'
  }
};

// Test 3: Get statistics without customer details
const testBasicStats = {
  httpMethod: 'GET',
  path: '/api/reports/statistics',
  resource: '/api/reports/statistics',
  pathParameters: {},
  queryStringParameters: {
    includeCustomerStats: 'false'
  },
  headers: {
    'Content-Type': 'application/json'
  }
};

// Test 4: Get last 30 days statistics
const getLast30DaysDate = () => {
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 30);

  return {
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString()
  };
};

const testLast30DaysStats = {
  httpMethod: 'GET',
  path: '/api/reports/statistics',
  resource: '/api/reports/statistics',
  pathParameters: {},
  queryStringParameters: {
    ...getLast30DaysDate(),
    includeCustomerStats: 'true'
  },
  headers: {
    'Content-Type': 'application/json'
  }
};

// Run tests
async function runTests() {
  console.log('\n=== Order Statistics Endpoint Tests ===\n');

  try {
    // Test 1: All-time statistics
    console.log('Test 1: All-Time Statistics with Customer Data');
    console.log('Request:', JSON.stringify(testAllTimeStats.queryStringParameters, null, 2));
    const result1 = await handler(testAllTimeStats);
    const data1 = JSON.parse(result1.body);
    console.log('Status:', result1.statusCode);
    console.log('Success:', data1.success);
    if (data1.success) {
      console.log('Total Orders:', data1.data.overall.totalOrders);
      console.log('Total Revenue:', data1.data.overall.totalRevenue);
      console.log('Average Order Value:', data1.data.overall.averageOrderValue);
      console.log('Payment Types:', Object.keys(data1.data.byPaymentType));
      console.log('Top Customer (Revenue):', data1.data.topCustomers?.byRevenue[0]?.name || 'N/A');
      console.log('Peak Order Day:', data1.data.insights.peakOrderDay);
    } else {
      console.log('Error:', data1.error);
    }
    console.log('\n---\n');

    // Test 2: Date range statistics
    console.log('Test 2: Date Range Statistics (2025)');
    console.log('Request:', JSON.stringify(testDateRangeStats.queryStringParameters, null, 2));
    const result2 = await handler(testDateRangeStats);
    const data2 = JSON.parse(result2.body);
    console.log('Status:', result2.statusCode);
    console.log('Success:', data2.success);
    if (data2.success) {
      console.log('Total Orders:', data2.data.overall.totalOrders);
      console.log('Date Range Applied:', data2.meta.dateRange);
      console.log('Last 7 Days Orders:', data2.data.trends.last7Days.orders);
      console.log('Last 30 Days Revenue:', data2.data.trends.last30Days.revenue);
    } else {
      console.log('Error:', data2.error);
    }
    console.log('\n---\n');

    // Test 3: Basic statistics without customer data
    console.log('Test 3: Basic Statistics (No Customer Details)');
    console.log('Request:', JSON.stringify(testBasicStats.queryStringParameters, null, 2));
    const result3 = await handler(testBasicStats);
    const data3 = JSON.parse(result3.body);
    console.log('Status:', result3.statusCode);
    console.log('Success:', data3.success);
    if (data3.success) {
      console.log('Has Customer Stats:', !!data3.data.topCustomers);
      console.log('Has Insights:', !!data3.data.insights);
      console.log('Common Cities:', data3.data.insights.commonCities.slice(0, 3));
    } else {
      console.log('Error:', data3.error);
    }
    console.log('\n---\n');

    // Test 4: Last 30 days
    console.log('Test 4: Last 30 Days Statistics');
    console.log('Request:', JSON.stringify(testLast30DaysStats.queryStringParameters, null, 2));
    const result4 = await handler(testLast30DaysStats);
    const data4 = JSON.parse(result4.body);
    console.log('Status:', result4.statusCode);
    console.log('Success:', data4.success);
    if (data4.success) {
      console.log('Total Orders:', data4.data.overall.totalOrders);
      console.log('Avg Items Per Order:', data4.data.insights.avgItemsPerOrder);
      console.log('Peak Order Hour:', data4.data.insights.peakOrderHour);
    } else {
      console.log('Error:', data4.error);
    }
    console.log('\n---\n');

    console.log('All tests completed!');

  } catch (error) {
    console.error('Test Error:', error.message);
    console.error(error.stack);
  }
}

// Utility function to display sample response structure
function displaySampleResponse() {
  console.log('\n=== Sample Response Structure ===\n');
  const sample = {
    success: true,
    data: {
      overall: {
        totalRevenue: "12345.67",
        totalOrders: 150,
        averageOrderValue: "82.30"
      },
      byPaymentType: {
        PxPay: { count: 120, revenue: "10000.00" },
        Account: { count: 30, revenue: "2345.67" }
      },
      byStatus: {
        pending: { count: 10, revenue: "850.00" },
        completed: { count: 140, revenue: "11495.67" }
      },
      trends: {
        last7Days: { orders: 25, revenue: "2100.00" },
        last30Days: { orders: 80, revenue: "6800.00" },
        last90Days: { orders: 140, revenue: "11500.00" }
      },
      topCustomers: {
        byRevenue: [
          {
            contactID: "abc-123",
            name: "John Smith",
            email: "john@example.com",
            company: "Acme Corp",
            totalRevenue: "5000.00",
            orderCount: 15
          }
        ],
        byOrderCount: [
          {
            contactID: "xyz-789",
            name: "Jane Doe",
            email: "jane@example.com",
            company: "Tech Inc",
            orderCount: 25,
            totalRevenue: "3500.00"
          }
        ]
      },
      insights: {
        peakOrderHour: "14:00",
        peakOrderDay: "Monday",
        commonCities: [
          { city: "Auckland", orderCount: 45 },
          { city: "Wellington", orderCount: 30 }
        ],
        avgItemsPerOrder: "2.4"
      }
    },
    error: null,
    meta: {
      count: 150,
      limit: null,
      total: 150,
      lastEvaluatedKey: null,
      dateRange: {
        startDate: null,
        endDate: null
      },
      generatedAt: "2025-10-21T12:00:00.000Z",
      includeCustomerStats: true
    }
  };

  console.log(JSON.stringify(sample, null, 2));
}

// API client example
class OrderStatisticsClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
  }

  async getStatistics(options = {}) {
    const {
      startDate = null,
      endDate = null,
      includeCustomerStats = true
    } = options;

    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    params.append('includeCustomerStats', includeCustomerStats);

    const url = `${this.baseUrl}/api/reports/statistics?${params.toString()}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();

    if (!result.success) {
      throw new Error(result.error || 'Unknown error');
    }

    return result.data;
  }

  async getAllTimeStats() {
    return this.getStatistics();
  }

  async getYearStats(year) {
    return this.getStatistics({
      startDate: `${year}-01-01T00:00:00.000Z`,
      endDate: `${year}-12-31T23:59:59.999Z`
    });
  }

  async getLastNDaysStats(days) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    return this.getStatistics({
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });
  }

  async getQuarterStats(year, quarter) {
    const quarters = {
      1: { start: `${year}-01-01`, end: `${year}-03-31` },
      2: { start: `${year}-04-01`, end: `${year}-06-30` },
      3: { start: `${year}-07-01`, end: `${year}-09-30` },
      4: { start: `${year}-10-01`, end: `${year}-12-31` }
    };

    const q = quarters[quarter];
    if (!q) throw new Error('Invalid quarter. Use 1-4.');

    return this.getStatistics({
      startDate: `${q.start}T00:00:00.000Z`,
      endDate: `${q.end}T23:59:59.999Z`
    });
  }

  async getBasicStats() {
    return this.getStatistics({ includeCustomerStats: false });
  }
}

// Example usage
function exampleUsage() {
  console.log('\n=== Client Usage Examples ===\n');

  const client = new OrderStatisticsClient('https://your-api-url.com');

  console.log('// Get all-time statistics');
  console.log('const allTime = await client.getAllTimeStats();\n');

  console.log('// Get 2025 statistics');
  console.log('const year2025 = await client.getYearStats(2025);\n');

  console.log('// Get last 30 days');
  console.log('const last30Days = await client.getLastNDaysStats(30);\n');

  console.log('// Get Q1 2025 statistics');
  console.log('const q1Stats = await client.getQuarterStats(2025, 1);\n');

  console.log('// Get basic stats (no customer details)');
  console.log('const basic = await client.getBasicStats();\n');
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  console.log('Choose an option:');
  console.log('1. Run tests (requires AWS credentials and DynamoDB access)');
  console.log('2. Display sample response structure');
  console.log('3. Show usage examples');

  const arg = process.argv[2];

  if (arg === 'test' || arg === '1') {
    runTests();
  } else if (arg === 'sample' || arg === '2') {
    displaySampleResponse();
  } else if (arg === 'examples' || arg === '3') {
    exampleUsage();
  } else {
    console.log('\nUsage:');
    console.log('  node test-statistics-endpoint.mjs test      # Run tests');
    console.log('  node test-statistics-endpoint.mjs sample    # Show sample response');
    console.log('  node test-statistics-endpoint.mjs examples  # Show usage examples');
  }
}

export { OrderStatisticsClient, runTests, displaySampleResponse, exampleUsage };
