# Customer Segmentation - Example Outputs

This document shows real-world examples of how the customer segmentation system works with different customer profiles.

## Example Customer Profiles

### Example 1: VIP Customer - High Spender

**Profile:**
- Name: Mediterranean Cafe
- Orders: 15 orders over 12 months
- Total Spend: $6,850.00
- Last Order: 5 days ago
- First Order: 365 days ago

**Calculated Segmentation:**
```json
{
  "segment": "VIP",
  "lastOrderDaysAgo": 5,
  "purchaseFrequency": "Monthly"
}
```

**Reasoning:**
- Total spend ($6,850) exceeds VIP threshold ($5,000) ✓
- Purchase frequency: 365 days / 14 intervals = 26 days average → Monthly
- VIP status takes precedence over Active status

**Marketing Actions:**
- Assign dedicated account manager
- Offer exclusive bulk discounts
- Priority customer service
- Quarterly business review meetings

---

### Example 2: Active Customer - Regular Monthly Orders

**Profile:**
- Name: Ashburton Bakery
- Orders: 6 orders over 5 months
- Total Spend: $1,245.50
- Last Order: 15 days ago
- First Order: 150 days ago

**Calculated Segmentation:**
```json
{
  "segment": "Active",
  "lastOrderDaysAgo": 15,
  "purchaseFrequency": "Monthly"
}
```

**Reasoning:**
- Last order within 90 days → Active ✓
- First order > 30 days ago → Not New
- Total spend < $5,000 → Not VIP
- Purchase frequency: 150 days / 5 intervals = 30 days average → Monthly

**Marketing Actions:**
- Send monthly product updates
- Suggest subscription/auto-reorder
- Upsell complementary products
- Request product reviews

---

### Example 3: New Customer - Just Started Ordering

**Profile:**
- Name: Queenstown Coffee Shop
- Orders: 2 orders
- Total Spend: $245.00
- Last Order: 10 days ago
- First Order: 20 days ago

**Calculated Segmentation:**
```json
{
  "segment": "New",
  "lastOrderDaysAgo": 10,
  "purchaseFrequency": "Weekly"
}
```

**Reasoning:**
- First order within 30 days → New ✓
- Last order within 90 days
- Purchase frequency: 20 days / 1 interval = 20 days average → But wait, actually 20 days between 2 orders = Weekly if we consider the pattern
- Actually: 20 days / 1 = 20 days, which is between 7-30, so Monthly

**Corrected Segmentation:**
```json
{
  "segment": "New",
  "lastOrderDaysAgo": 10,
  "purchaseFrequency": "Monthly"
}
```

**Marketing Actions:**
- Welcome email series
- Onboarding guide (how to order, product catalog)
- First-time buyer discount for next order
- Request feedback on first experience
- Introduce account rep

---

### Example 4: Dormant Customer - At Risk

**Profile:**
- Name: Wellington Restaurant Supply
- Orders: 8 orders over 2 years
- Total Spend: $2,340.00
- Last Order: 125 days ago
- First Order: 730 days ago

**Calculated Segmentation:**
```json
{
  "segment": "Dormant",
  "lastOrderDaysAgo": 125,
  "purchaseFrequency": "Quarterly"
}
```

**Reasoning:**
- Last order > 90 days ago → Dormant ✓
- Total spend < $5,000 → Not VIP
- Purchase frequency: 730 days / 7 intervals = 104 days average → Occasional
- Actually: 104 days is > 90, so Occasional

**Corrected Segmentation:**
```json
{
  "segment": "Dormant",
  "lastOrderDaysAgo": 125,
  "purchaseFrequency": "Occasional"
}
```

**Marketing Actions:**
- Win-back campaign email
- "We miss you" discount (15-20% off)
- Survey: Why did you stop ordering?
- Showcase new products since last order
- Personal phone call from sales rep

---

### Example 5: Weekly Power User

**Profile:**
- Name: Auckland Postal Hub
- Orders: 24 orders over 6 months
- Total Spend: $4,890.00
- Last Order: 3 days ago
- First Order: 168 days ago

**Calculated Segmentation:**
```json
{
  "segment": "Active",
  "lastOrderDaysAgo": 3,
  "purchaseFrequency": "Weekly"
}
```

**Reasoning:**
- Last order within 90 days → Active ✓
- Total spend just below VIP threshold ($4,890 vs $5,000)
- First order > 30 days ago → Not New
- Purchase frequency: 168 days / 23 intervals = 7.3 days average → Weekly

**Marketing Actions:**
- Encourage one more order to reach VIP status
- Offer standing order/subscription
- Bulk pricing discount
- Express delivery option
- Dedicated stock reservation

---

### Example 6: One-Time Customer

**Profile:**
- Name: Christchurch Event Company
- Orders: 1 order
- Total Spend: $180.00
- Last Order: 45 days ago
- First Order: 45 days ago

**Calculated Segmentation:**
```json
{
  "segment": "Active",
  "lastOrderDaysAgo": 45,
  "purchaseFrequency": "One-time"
}
```

**Reasoning:**
- Last order within 90 days → Active ✓
- First order > 30 days ago → Not New
- Only 1 order → One-time frequency

**Marketing Actions:**
- "Come back and save" email campaign
- Showcase broader product range
- Limited-time offer to encourage second purchase
- Ask what products they need regularly

---

### Example 7: VIP but Dormant (High-Value At-Risk)

**Profile:**
- Name: Nelson Manufacturing Ltd
- Orders: 18 orders over 3 years
- Total Spend: $8,200.00
- Last Order: 105 days ago
- First Order: 1095 days ago

**Calculated Segmentation:**
```json
{
  "segment": "VIP",
  "lastOrderDaysAgo": 105,
  "purchaseFrequency": "Quarterly"
}
```

**Reasoning:**
- Total spend > $5,000 → VIP ✓ (takes precedence)
- Last order > 90 days → Would be Dormant, but VIP overrides
- Purchase frequency: 1095 days / 17 intervals = 64 days average → Quarterly

**Marketing Actions:**
- HIGH PRIORITY: Immediate account manager call
- Executive-level outreach
- Special retention offer
- Review: Have needs changed?
- Competitor analysis: Are they switching?
- VIP retention package

---

### Example 8: Quarterly Business Customer

**Profile:**
- Name: Dunedin Office Supplies
- Orders: 4 orders over 12 months
- Total Spend: $1,650.00
- Last Order: 60 days ago
- First Order: 360 days ago

**Calculated Segmentation:**
```json
{
  "segment": "Active",
  "lastOrderDaysAgo": 60,
  "purchaseFrequency": "Quarterly"
}
```

**Reasoning:**
- Last order within 90 days → Active ✓
- First order > 30 days ago → Not New
- Total spend < $5,000 → Not VIP
- Purchase frequency: 360 days / 3 intervals = 120 days average → Occasional
- Actually: 120 days > 90, so Occasional

**Corrected Segmentation:**
```json
{
  "segment": "Active",
  "lastOrderDaysAgo": 60,
  "purchaseFrequency": "Occasional"
}
```

**Marketing Actions:**
- Set quarterly reminder to place order
- Offer quarterly subscription with discount
- Send seasonal product catalogs
- Plan ahead for next quarter's needs

---

## Segment Distribution Example

For a typical customer base of 156 customers:

```
Segment Breakdown:
===========================================
VIP:      12 customers  (7.7%)  - $89,450 revenue
Active:   89 customers  (57.1%) - $156,780 revenue
New:      34 customers  (21.8%) - $18,920 revenue
Dormant:  21 customers  (13.5%) - $24,680 revenue

Purchase Frequency Breakdown:
===========================================
Weekly:      8 customers  (5.1%)
Monthly:     45 customers (28.8%)
Quarterly:   52 customers (33.3%)
Occasional:  38 customers (24.4%)
One-time:    13 customers (8.3%)
```

## API Response Examples

### List Customers with Segmentation

**Request:**
```bash
GET /api/customers?limit=3
```

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "contactID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
      "name": "Mediterranean Cafe",
      "email": "orders@medcafe.co.nz",
      "company": "Mediterranean Cafe",
      "phone": "+64 9 123 4567",
      "accountName": "MED001",
      "metrics": {
        "orderCount": 15,
        "totalSpend": "6850.00",
        "lastOrderDate": "2025-10-18T08:30:00.000Z",
        "lastOrderReference": "ORD-12345-1729845000000",
        "segment": "VIP",
        "lastOrderDaysAgo": 5,
        "purchaseFrequency": "Monthly"
      }
    },
    {
      "contactID": "b2c3d4e5-f6a7-8901-bcde-f12345678901",
      "name": "Ashburton Bakery",
      "email": "bakery@ashburton.co.nz",
      "company": "Ashburton Bakery Ltd",
      "phone": "+64 3 308 9876",
      "accountName": "ASH001",
      "metrics": {
        "orderCount": 6,
        "totalSpend": "1245.50",
        "lastOrderDate": "2025-10-08T14:20:00.000Z",
        "lastOrderReference": "ORD-12340-1728986400000",
        "segment": "Active",
        "lastOrderDaysAgo": 15,
        "purchaseFrequency": "Monthly"
      }
    },
    {
      "contactID": "c3d4e5f6-a7b8-9012-cdef-123456789012",
      "name": "Wellington Restaurant Supply",
      "email": "orders@wrs.co.nz",
      "company": "Wellington Restaurant Supply",
      "phone": "+64 4 385 2222",
      "accountName": "WRS001",
      "metrics": {
        "orderCount": 8,
        "totalSpend": "2340.00",
        "lastOrderDate": "2025-06-20T10:15:00.000Z",
        "lastOrderReference": "ORD-12310-1718874900000",
        "segment": "Dormant",
        "lastOrderDaysAgo": 125,
        "purchaseFrequency": "Occasional"
      }
    }
  ],
  "meta": {
    "count": 3,
    "total": 156
  }
}
```

### Filter VIP Customers

**Request:**
```bash
curl "/api/customers?limit=100" | jq '.data[] | select(.metrics.segment == "VIP")'
```

**Response:**
```json
{
  "contactID": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "Mediterranean Cafe",
  "email": "orders@medcafe.co.nz",
  "company": "Mediterranean Cafe",
  "metrics": {
    "segment": "VIP",
    "totalSpend": "6850.00",
    "orderCount": 15,
    "lastOrderDaysAgo": 5,
    "purchaseFrequency": "Monthly"
  }
}
```

## Marketing Campaign Use Cases

### Campaign 1: VIP Appreciation Program

**Target:** All VIP customers
**Filter:** `segment == "VIP"`
**Message:** "Thank you for being a valued partner. Here's an exclusive 10% discount code for your next order."

### Campaign 2: Win-Back Dormant Customers

**Target:** Dormant customers with historical high value
**Filter:** `segment == "Dormant" AND totalSpend > $1000`
**Message:** "We noticed you haven't ordered in a while. Here's 15% off to welcome you back."

### Campaign 3: New Customer Onboarding

**Target:** New customers within first 2 weeks
**Filter:** `segment == "New" AND lastOrderDaysAgo < 14`
**Message:** "Welcome! Here's a guide to our most popular products and a 5% discount on your next order."

### Campaign 4: Frequency Increase

**Target:** Monthly purchasers who could move to weekly
**Filter:** `purchaseFrequency == "Monthly" AND orderCount > 5`
**Message:** "Save time with weekly auto-delivery. Subscribe and save 5%."

### Campaign 5: At-Risk Active Customers

**Target:** Active customers approaching dormancy
**Filter:** `segment == "Active" AND lastOrderDaysAgo > 60 AND lastOrderDaysAgo < 90`
**Message:** "It's been a while! Need to restock? Here's what's new since your last order."

---

**Document Version:** 1.0
**Last Updated:** October 23, 2025
