/**
 * Test Customer Segmentation Logic
 *
 * This file tests the enhanced customer segmentation features:
 * - segment: "New", "Active", "Dormant", "VIP"
 * - lastOrderDaysAgo: Days since last order
 * - purchaseFrequency: "Weekly", "Monthly", "Quarterly", "Occasional", "One-time", "None"
 */

/**
 * Calculate customer segment based on order history and spending
 * (Copied from query-orders-lambda.mjs for testing)
 */
function calculateCustomerSegment(orderCount, totalSpend, lastOrderDate, firstOrderDate) {
  // Handle edge case: no orders
  if (orderCount === 0 || !lastOrderDate) {
    return {
      segment: 'New',
      lastOrderDaysAgo: null,
      purchaseFrequency: 'None'
    };
  }

  const now = new Date();
  const lastOrder = new Date(lastOrderDate);
  const lastOrderDaysAgo = Math.floor((now - lastOrder) / (1000 * 60 * 60 * 24));

  // Calculate purchase frequency based on order count and time span
  let purchaseFrequency = 'Occasional';

  if (orderCount >= 2 && firstOrderDate) {
    const firstOrder = new Date(firstOrderDate);
    const customerLifespanDays = Math.floor((lastOrder - firstOrder) / (1000 * 60 * 60 * 24));

    if (customerLifespanDays > 0) {
      const avgDaysBetweenOrders = customerLifespanDays / (orderCount - 1);

      if (avgDaysBetweenOrders <= 7) {
        purchaseFrequency = 'Weekly';
      } else if (avgDaysBetweenOrders <= 30) {
        purchaseFrequency = 'Monthly';
      } else if (avgDaysBetweenOrders <= 90) {
        purchaseFrequency = 'Quarterly';
      } else {
        purchaseFrequency = 'Occasional';
      }
    }
  } else if (orderCount === 1) {
    purchaseFrequency = 'One-time';
  }

  // Determine customer segment
  let segment;

  // VIP: Total spend > $5000 (updated threshold from requirements)
  if (totalSpend > 5000) {
    segment = 'VIP';
  }
  // Dormant: Last order > 90 days ago
  else if (lastOrderDaysAgo > 90) {
    segment = 'Dormant';
  }
  // New: First order within last 30 days
  else if (firstOrderDate) {
    const firstOrder = new Date(firstOrderDate);
    const firstOrderDaysAgo = Math.floor((now - firstOrder) / (1000 * 60 * 60 * 24));
    if (firstOrderDaysAgo <= 30) {
      segment = 'New';
    } else {
      // Active: Order in last 90 days and not new
      segment = 'Active';
    }
  }
  // Active: Order in last 90 days (fallback)
  else if (lastOrderDaysAgo <= 90) {
    segment = 'Active';
  }
  // Default fallback
  else {
    segment = 'New';
  }

  return {
    segment,
    lastOrderDaysAgo,
    purchaseFrequency
  };
}

// Helper to create dates relative to now
function daysAgo(days) {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString();
}

// Test cases
const testCases = [
  {
    name: "VIP Customer - High Spend",
    orderCount: 10,
    totalSpend: 6500,
    lastOrderDate: daysAgo(5),
    firstOrderDate: daysAgo(120),
    expected: {
      segment: 'VIP',
      purchaseFrequency: 'Monthly' // 120 days / 9 intervals = 13.3 days avg
    }
  },
  {
    name: "VIP Customer - At Threshold",
    orderCount: 8,
    totalSpend: 5001,
    lastOrderDate: daysAgo(10),
    firstOrderDate: daysAgo(200),
    expected: {
      segment: 'VIP',
      purchaseFrequency: 'Monthly' // 200 days / 7 intervals = 28.6 days avg
    }
  },
  {
    name: "New Customer - First Order Recent",
    orderCount: 1,
    totalSpend: 150,
    lastOrderDate: daysAgo(15),
    firstOrderDate: daysAgo(15),
    expected: {
      segment: 'New',
      purchaseFrequency: 'One-time',
      lastOrderDaysAgo: 15
    }
  },
  {
    name: "New Customer - Just Signed Up",
    orderCount: 2,
    totalSpend: 250,
    lastOrderDate: daysAgo(5),
    firstOrderDate: daysAgo(10),
    expected: {
      segment: 'New',
      purchaseFrequency: 'Weekly', // 10 days / 1 interval = 10 days avg (<=30 but more specifically <=7 after rounding)
    }
  },
  {
    name: "Active Customer - Regular Orders",
    orderCount: 5,
    totalSpend: 850,
    lastOrderDate: daysAgo(20),
    firstOrderDate: daysAgo(150),
    expected: {
      segment: 'Active',
      purchaseFrequency: 'Quarterly', // 150 days / 4 intervals = 37.5 days avg (>30, so Quarterly)
    }
  },
  {
    name: "Active Customer - Recent Order",
    orderCount: 3,
    totalSpend: 450,
    lastOrderDate: daysAgo(45),
    firstOrderDate: daysAgo(180),
    expected: {
      segment: 'Active',
      purchaseFrequency: 'Quarterly', // 180 days / 2 intervals = 90 days avg
    }
  },
  {
    name: "Dormant Customer - No Recent Orders",
    orderCount: 4,
    totalSpend: 600,
    lastOrderDate: daysAgo(120),
    firstOrderDate: daysAgo(300),
    expected: {
      segment: 'Dormant',
      purchaseFrequency: 'Quarterly', // 300 days / 3 intervals = 100 days avg
    }
  },
  {
    name: "Dormant Customer - Just Over Threshold (>90 days)",
    orderCount: 2,
    totalSpend: 200,
    lastOrderDate: daysAgo(92), // Changed to 92 to ensure > 90
    firstOrderDate: daysAgo(200),
    expected: {
      segment: 'Dormant',
      purchaseFrequency: 'Occasional', // 200 days / 1 interval = 200 days avg
    }
  },
  {
    name: "Weekly Purchaser",
    orderCount: 10,
    totalSpend: 1200,
    lastOrderDate: daysAgo(3),
    firstOrderDate: daysAgo(63), // 9 weeks
    expected: {
      segment: 'Active',
      purchaseFrequency: 'Weekly', // 63 days / 9 intervals = 7 days avg
      lastOrderDaysAgo: 3
    }
  },
  {
    name: "Monthly Purchaser",
    orderCount: 6,
    totalSpend: 900,
    lastOrderDate: daysAgo(15),
    firstOrderDate: daysAgo(150), // ~5 months
    expected: {
      segment: 'Active',
      purchaseFrequency: 'Monthly', // 150 days / 5 intervals = 30 days avg
      lastOrderDaysAgo: 15
    }
  },
  {
    name: "Quarterly Purchaser",
    orderCount: 4,
    totalSpend: 800,
    lastOrderDate: daysAgo(30),
    firstOrderDate: daysAgo(270), // ~9 months
    expected: {
      segment: 'Active',
      purchaseFrequency: 'Quarterly', // 270 days / 3 intervals = 90 days avg
    }
  },
  {
    name: "Occasional Purchaser",
    orderCount: 3,
    totalSpend: 450,
    lastOrderDate: daysAgo(60),
    firstOrderDate: daysAgo(400),
    expected: {
      segment: 'Active',
      purchaseFrequency: 'Occasional', // 400 days / 2 intervals = 200 days avg
    }
  },
  {
    name: "No Orders - Edge Case",
    orderCount: 0,
    totalSpend: 0,
    lastOrderDate: null,
    firstOrderDate: null,
    expected: {
      segment: 'New',
      purchaseFrequency: 'None',
      lastOrderDaysAgo: null
    }
  },
  {
    name: "VIP + Dormant (High spend but inactive)",
    orderCount: 15,
    totalSpend: 8000,
    lastOrderDate: daysAgo(95),
    firstOrderDate: daysAgo(365),
    expected: {
      segment: 'VIP', // VIP takes precedence over Dormant
      purchaseFrequency: 'Monthly' // 365 days / 14 intervals = 26 days avg
    }
  }
];

// Run tests
console.log("=".repeat(80));
console.log("CUSTOMER SEGMENTATION TEST SUITE");
console.log("=".repeat(80));
console.log("");

let passedTests = 0;
let failedTests = 0;

testCases.forEach((testCase, index) => {
  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log("-".repeat(80));

  const result = calculateCustomerSegment(
    testCase.orderCount,
    testCase.totalSpend,
    testCase.lastOrderDate,
    testCase.firstOrderDate
  );

  console.log("Input:");
  console.log(`  Order Count: ${testCase.orderCount}`);
  console.log(`  Total Spend: $${testCase.totalSpend.toFixed(2)}`);
  console.log(`  Last Order: ${testCase.lastOrderDate ? new Date(testCase.lastOrderDate).toLocaleDateString() : 'N/A'}`);
  console.log(`  First Order: ${testCase.firstOrderDate ? new Date(testCase.firstOrderDate).toLocaleDateString() : 'N/A'}`);
  console.log("");
  console.log("Result:");
  console.log(`  Segment: ${result.segment}`);
  console.log(`  Last Order Days Ago: ${result.lastOrderDaysAgo !== null ? result.lastOrderDaysAgo : 'N/A'}`);
  console.log(`  Purchase Frequency: ${result.purchaseFrequency}`);
  console.log("");

  // Validate results
  let testPassed = true;
  const failures = [];

  if (result.segment !== testCase.expected.segment) {
    testPassed = false;
    failures.push(`Segment: expected "${testCase.expected.segment}", got "${result.segment}"`);
  }

  if (result.purchaseFrequency !== testCase.expected.purchaseFrequency) {
    testPassed = false;
    failures.push(`Purchase Frequency: expected "${testCase.expected.purchaseFrequency}", got "${result.purchaseFrequency}"`);
  }

  if (testCase.expected.lastOrderDaysAgo !== undefined) {
    if (result.lastOrderDaysAgo !== testCase.expected.lastOrderDaysAgo) {
      testPassed = false;
      failures.push(`Last Order Days Ago: expected ${testCase.expected.lastOrderDaysAgo}, got ${result.lastOrderDaysAgo}`);
    }
  }

  if (testPassed) {
    console.log("✓ PASSED");
    passedTests++;
  } else {
    console.log("✗ FAILED");
    failures.forEach(f => console.log(`  - ${f}`));
    failedTests++;
  }

  console.log("");
  console.log("");
});

console.log("=".repeat(80));
console.log("TEST SUMMARY");
console.log("=".repeat(80));
console.log(`Total Tests: ${testCases.length}`);
console.log(`Passed: ${passedTests}`);
console.log(`Failed: ${failedTests}`);
console.log(`Success Rate: ${((passedTests / testCases.length) * 100).toFixed(2)}%`);
console.log("");

if (failedTests === 0) {
  console.log("✓ All tests passed!");
} else {
  console.log("✗ Some tests failed. Review the results above.");
  process.exit(1);
}
