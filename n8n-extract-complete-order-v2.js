// Enhanced extraction code v2 - extracts complete order data
// Get the HTML content from the previous node
const html = $input.first().json.html || $input.first().json.body || $input.first().json.content || "";

// --- Helpers ---
function generateGUID() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0, v = (c === 'x') ? r : ((r & 0x3) | 0x8);
    return v.toString(16);
  });
}

// Convert basic HTML to plain text with line breaks
function htmlToText(s = "") {
  return s
    .replace(/<\s*br\s*\/?>/gi, "\n")
    .replace(/<\/\s*(p|div|li|tr|td|h\d)\s*>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\r/g, "")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

function extractBetween(text, startLabel, maxLen = 1200) {
  const i = text.indexOf(startLabel);
  if (i === -1) return "";
  return text.slice(i + startLabel.length, i + startLabel.length + maxLen);
}

function tidyPhone(raw) {
  if (!raw) return "";
  raw = raw.trim();
  const plus = raw.startsWith("+") ? "+" : "";
  const digits = raw.replace(/[^\d]/g, "");
  return plus + digits;
}

function extractValue(text, pattern) {
  const match = text.match(pattern);
  return match ? match[1].trim() : "";
}

// Extract items from HTML table structure
function extractItemsFromHTML(htmlContent) {
  const items = [];

  // Look for the orderTable with items
  const tableMatch = htmlContent.match(/<table[^>]*class="orderTable"[^>]*>[\s\S]*?<thead>[\s\S]*?<\/thead>[\s\S]*?<tbody>([\s\S]*?)<\/tbody>/);

  if (!tableMatch) return items;

  const tbody = tableMatch[1];

  // Extract each row
  const rowPattern = /<tr[^>]*>([\s\S]*?)<\/tr>/g;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(tbody)) !== null) {
    const row = rowMatch[1];

    // Skip rows without product data (they won't have orderImage class)
    if (!row.includes('orderImage')) continue;

    // Extract product code and description from the link
    const linkMatch = row.match(/>([A-Z0-9]+)\s*-\s*([^<]+)<\/a>/);
    if (!linkMatch) continue;

    const productCode = linkMatch[1].trim();
    const description = linkMatch[2].trim();

    // Extract all td cells
    const cells = [];
    const cellPattern = /<td[^>]*>([\s\S]*?)<\/td>/g;
    let cellMatch;

    while ((cellMatch = cellPattern.exec(row)) !== null) {
      const cellContent = htmlToText(cellMatch[1]);
      cells.push(cellContent);
    }

    // Parse unit price (should be in cells[2])
    let unitPrice = 0;
    if (cells[2]) {
      const priceMatch = cells[2].match(/\$?([\d.]+)/);
      if (priceMatch) unitPrice = parseFloat(priceMatch[1]);
    }

    // Parse quantity (should be in cells[3])
    let quantity = 0;
    if (cells[3]) {
      const qtyMatch = cells[3].match(/(\d+)/);
      if (qtyMatch) quantity = parseInt(qtyMatch[1]);
    }

    // Parse total price (should be in cells[4])
    let totalPrice = 0;
    if (cells[4]) {
      const totalMatch = cells[4].match(/\$?([\d.]+)/);
      if (totalMatch) totalPrice = parseFloat(totalMatch[1]);
    }

    items.push({
      product_code: productCode,
      description: description,
      unit_price: unitPrice,
      quantity: quantity,
      total_price: totalPrice
    });
  }

  return items;
}

// --- Extraction ---
const text = htmlToText(html);

// Order Header Information
const order = {
  order_reference: extractValue(text, /Order reference:\s*(\d+)/i),
  order_date: extractValue(text, /Order date:\s*([^\n]+)/i),
  greentree_order_reference: extractValue(text, /Greentree order reference:\s*(\d+)/i),
  greentree_id: extractValue(text, /Greentree ID:\s*([\d.]+)/i),
  greentree_status: extractValue(text, /Greentree st[au]tus:\s*([^\n]+)/i),
  cms_shop_reference: extractValue(text, /CMS Shop reference:\s*(\d+)/i),
  cms_shop_id: extractValue(text, /CMS Shop ID:\s*(\d+)/i)
};

// Customer/Contact Information
const customer = {
  contact_id: generateGUID(),
  account_name: "",
  account_code: "",
  contact_name: "",
  company: "",
  email: "",
  phone: "",
  created_at: new Date().toISOString()
};

// 1) Account (e.g. "PPL Web Sales (100014)")
{
  const m = text.match(/([^\n(]+?)\s*\((\d{5,7})\)/);
  if (m) {
    customer.account_name = m[1].trim();
    customer.account_code = m[2].trim();
  }
}

// 2) Email and Phone from Order details block
{
  const orderDetailsBlock = extractBetween(text, "Order details", 1500);
  const emailLabelMatch = orderDetailsBlock.match(/Email:\s*([^\s<>\n]+@[^\s<>\n]+)/i);
  if (emailLabelMatch) customer.email = emailLabelMatch[1].trim();

  const phoneLabelMatch = orderDetailsBlock.match(/Phone:\s*([+()0-9 \-]+)/i);
  if (phoneLabelMatch) customer.phone = tidyPhone(phoneLabelMatch[1]);
}

// 3) Contact name and Company from Order details block
{
  const orderDetailsBlock = extractBetween(text, "Order details", 1500);
  const lines = orderDetailsBlock
    .split("\n")
    .map(l => l.trim())
    .filter(l => l.length > 0 && !l.includes("Email:") && !l.includes("Phone:") && !l.includes("("));

  // First line is contact name
  if (lines.length >= 1) {
    customer.contact_name = lines[0];
  }

  // Second line is company name (if it exists and isn't just the contact name repeated)
  if (lines.length >= 2 && lines[1] !== lines[0]) {
    customer.company = lines[1];
  }
}

// Delivery Address (detailed)
const delivery = {
  name: "",
  company: "",
  street: "",
  city: "",
  country: "",
  phone: ""
};

{
  const deliveryBlock = extractBetween(text, "Delivery address", 1500);
  if (deliveryBlock) {
    const lines = deliveryBlock
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0 && !l.match(/^\d{8,}/)); // filter out phone-only lines

    if (lines.length >= 1) delivery.name = lines[0];
    if (lines.length >= 2) delivery.company = lines[1];
    if (lines.length >= 3) delivery.street = lines[2];
    if (lines.length >= 4) delivery.city = lines[3];
    if (lines.length >= 5) delivery.country = lines[4];

    const phoneMatch = deliveryBlock.match(/(\d{8,})/);
    if (phoneMatch) delivery.phone = tidyPhone(phoneMatch[1]);
  }
}

// Order Items - Extract from HTML table structure
const items = extractItemsFromHTML(html);

// Order Totals
const totals = {
  subtotal: extractValue(text, /Sub-total\s+\$?([\d.]+)/i),
  freight: extractValue(text, /Freight[^\n$]*?\$?([\d.]+)/i),
  freight_description: extractValue(text, /Freight\s*\(([^)]+)\)/i),
  gst: extractValue(text, /GST\s+\$?([\d.]+)/i),
  total: extractValue(text, /^Total\s+\$?([\d.]+)/im)
};

// Payment Details
const payment = {
  payment_type: extractValue(text, /Payment type:\s*([^\n]+)/i),
  transaction_id: extractValue(text, /PxPay Transaction ID:\s*([^\n]+)/i),
  amount: extractValue(text, /PxPay Amount:\s*([^\n]+)/i)
};

// --- Return complete order data ---
return {
  json: {
    clientID: "7b0d485f-8ef9-45b0-881a-9d8f4447ced2",
    order: order,
    customer: customer,
    delivery: delivery,
    items: items,
    totals: totals,
    payment: payment
  }
};
