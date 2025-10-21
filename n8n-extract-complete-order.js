// Enhanced extraction code for n8n - extracts complete order data
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

// 3) Delivery address for name & company
{
  const deliveryBlock = extractBetween(text, "Delivery address", 1500);
  if (deliveryBlock) {
    const lines = deliveryBlock
      .split("\n")
      .map(l => l.trim())
      .filter(l => l.length > 0);

    if (lines.length >= 2) {
      customer.contact_name = customer.contact_name || lines[0];
      customer.company = customer.company || lines[1];
    }
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

// Order Items
const items = [];
{
  // Look for line items pattern: "CODE - Description" followed by pricing info
  // Example: "CCPP2 - PP2 Cardboard Box"
  const itemPattern = /([A-Z0-9]+)\s*-\s*([^\n]+?)(?=\s*•|\n)/gi;
  let match;

  while ((match = itemPattern.exec(text)) !== null) {
    const productCode = match[1].trim();
    const description = match[2].trim();

    // Find quantity and price info for this item
    // Pattern: "$X.XX each + GST    Quantity    $Total + GST"
    const afterItem = text.substring(match.index);
    const priceMatch = afterItem.match(/\$(\d+\.?\d*)\s*each\s*\+\s*GST\s+(\d+)\s+\$(\d+\.?\d*)\s*\+\s*GST/i);

    if (priceMatch) {
      items.push({
        product_code: productCode,
        description: description,
        unit_price: parseFloat(priceMatch[1]),
        quantity: parseInt(priceMatch[2]),
        total_price: parseFloat(priceMatch[3])
      });
    }
  }
}

// Order Totals
const totals = {
  subtotal: extractValue(text, /Sub-total\s+\$?([\d.]+)/i),
  freight: extractValue(text, /Freight[^\n]*?\$?([\d.]+)/i),
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
    order: order,
    customer: customer,
    delivery: delivery,
    items: items,
    totals: totals,
    payment: payment
  }
};
