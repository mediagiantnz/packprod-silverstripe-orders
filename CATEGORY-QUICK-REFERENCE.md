# Product Categories - Quick Reference

## Available Categories (9 total)

### 1. Cardboard Boxes (15 products)
```
CCPP2, CCPP4, CCPP6, CCPP8, CCPP10, CCPP12, CCQ, CC1WB, CC2WB, CC6WB,
CCWINEBOX, CCSMALL, CCMEDIUM, CCLARGE, CCXLARGE
```

### 2. Tape & Adhesives (11 products)
```
TSPAKPTH, TSCLEAR, TSBROWN, TSWHITE, TSFRAGILE, TSMASK, TSDOUBLE,
MTDD2, MTDD3, DISPENSER, TAPEGUN
```

### 3. Bags & Packaging (9 products)
```
BAGPLASTIC, BAGPAPER, BAGZIP, BAGDEGRADABLE, BAGHDPE, BAGLDPE,
BAGPRODUCE, BAGGARMENT, BAGVACUUM
```

### 4. Labels & Markers (12 products)
```
LMETBBB, LMETPB, LSHIP12, 1LMED4, LFRAGILE, LTHISUP, LGLASSCARE,
LBLANK, LBARCODE, OMVIVCT, MARKER, SHARPIE
```

### 5. Gift Packaging (11 products)
```
PWR0900B, PWRGOLD, PWRSILVER, PWRRED, RIBBONRED, RIBBONSILVER,
RIBBONGOLD, BOW, TISSUEWHITE, TISSUERED, TISSUEGREEN
```

### 6. Protective Materials (9 products)
```
YSFHCA20, STRETCHFILM, BUBBLEWRAP, BUBBLEROLL, FOAMSHEET, CORNERPRO,
EDGEPRO, PAPERPACKING, AIRPILLOW
```

### 7. Mailers & Envelopes (9 products)
```
BMST5, MAILERWHITE, MAILERKRAFT, MAILERPADDED, ENVDL, ENVC4, ENVC5,
ENVB4, ENVWINDOW
```

### 8. Cleaning Supplies (6 products)
```
CLOTHMICRO, WIPEANTI, WIPEDUST, CLEANER, SPRAY, DUSTER
```

### 9. Safety Equipment (7 products)
```
HGPLPFC, GLOVENITRILE, GLOVEVINYL, GLOVELATEX, CUTTERKNIFE, SCISSORS,
APRON
```

---

## API Endpoints

### Get All Categories
```bash
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/products/categories"
```

### Get Products (All)
```bash
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products"
```

### Filter by Category
```bash
# Cardboard Boxes
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products?category=Cardboard%20Boxes"

# Tape & Adhesives
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products?category=Tape%20%26%20Adhesives"

# Bags & Packaging
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products?category=Bags%20%26%20Packaging"

# Labels & Markers
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products?category=Labels%20%26%20Markers"

# Gift Packaging
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products?category=Gift%20Packaging"

# Protective Materials
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products?category=Protective%20Materials"

# Mailers & Envelopes
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products?category=Mailers%20%26%20Envelopes"

# Cleaning Supplies
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products?category=Cleaning%20Supplies"

# Safety Equipment
curl "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products?category=Safety%20Equipment"
```

---

## Deployment

### Quick Deploy
```bash
cd "C:\Users\Andy\source\Packaging Products\packprod-silverstripe-orders"
bash deploy-categories-update.sh
```

### Manual Deploy
```bash
# Create package
powershell Compress-Archive -Path query-orders-lambda.mjs,product-categories.json,node_modules,package.json -DestinationPath lambda-query-deploy.zip -Force

# Deploy to AWS
aws lambda update-function-code \
  --function-name queryPackagingProductsOrders \
  --zip-file fileb://lambda-query-deploy.zip \
  --region ap-southeast-2
```

---

## Testing

### Run All Tests
```bash
bash test-product-categories.sh
```

### Manual Tests
```bash
# Test categories endpoint
curl -s "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/products/categories" | jq '.data.metadata'

# Test category filtering
curl -s "https://bw4agz6xn4.execute-api.ap-southeast-2.amazonaws.com/prod/api/reports/products?category=Cardboard%20Boxes" | jq '.data.summary'
```

---

## Category Management

### View All Categories
```bash
node product-category-helper.mjs list
```

### Find Product Category
```bash
node product-category-helper.mjs find CCPP2
# Output: Category: Cardboard Boxes
```

### Add Product to Category
```bash
node product-category-helper.mjs add "NEWPROD" "Cardboard Boxes"
```

### View Statistics
```bash
node product-category-helper.mjs stats
```

---

## URL Encoding Reference

When filtering by category in URLs, use these encoded values:

| Category Name | URL Encoded |
|--------------|-------------|
| Cardboard Boxes | `Cardboard%20Boxes` |
| Tape & Adhesives | `Tape%20%26%20Adhesives` |
| Bags & Packaging | `Bags%20%26%20Packaging` |
| Labels & Markers | `Labels%20%26%20Markers` |
| Gift Packaging | `Gift%20Packaging` |
| Protective Materials | `Protective%20Materials` |
| Mailers & Envelopes | `Mailers%20%26%20Envelopes` |
| Cleaning Supplies | `Cleaning%20Supplies` |
| Safety Equipment | `Safety%20Equipment` |

---

## Files Reference

| File | Purpose |
|------|---------|
| `product-categories.json` | Category definitions (95 products, 9 categories) |
| `query-orders-lambda.mjs` | Lambda function with category support |
| `product-category-helper.mjs` | Utility functions for category management |
| `deploy-categories-update.sh` | Automated deployment script |
| `test-product-categories.sh` | Comprehensive testing script |
| `PRODUCT-CATEGORY-IMPLEMENTATION-REPORT.md` | Full implementation documentation |
| `CATEGORY-QUICK-REFERENCE.md` | This quick reference guide |

---

**Last Updated:** October 23, 2025
**Version:** 2.0.0
