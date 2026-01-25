const XLSX = require('xlsx');

const workbook = XLSX.readFile('attached_assets/Adam_Growth_stock_list_-_26_Jan_2026_1769358113423.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

// Clean ticker symbol - remove -US, -HK suffixes and convert to clean symbol
function cleanSymbol(ticker) {
  if (!ticker) return null;
  let symbol = ticker.trim();
  // Remove exchange suffixes
  symbol = symbol.replace(/-US$/i, '').replace(/-HK$/i, '');
  // Handle HK stocks with numeric tickers (add .HK suffix for Yahoo Finance)
  if (/^\d{4}$/.test(symbol)) {
    symbol = symbol + '.HK';
  }
  return symbol.toUpperCase();
}

// Parse number from string (remove %, $, etc)
function parseNum(val) {
  if (!val || val === 'N/A' || val === 'NA' || val === '#VALUE!') return null;
  const num = String(val).replace(/[^0-9.\-]/g, '');
  return num && !isNaN(parseFloat(num)) ? num : null;
}

const items = [];

for (const row of rows) {
  const symbol = cleanSymbol(row['Ticker']);
  if (!symbol) continue;
  
  items.push({
    symbol,
    companyName: row['Company'] || null,
    currency: row['Currency'] || 'USD',
    supportLevel1: parseNum(row['Support Level 1']),
    supportLevel2: parseNum(row['Support Level 2']),
    supportLevel3: parseNum(row['Support Level 3']),
    supportLevel4: parseNum(row['Support Level 4']),
    supportLevel5: parseNum(row['Support Level 5']),
    averageIV: parseNum(row['Average IV']),
    discountPremium: row['Avg. Discount / Premium'] || null,
    moat: row['Moat'] || null,
    investmentType: row['Investment Type'] || null,
    intrinsicValue: parseNum(row['Average IV']) || '0'
  });
}

// Output as JSON for import
console.log(JSON.stringify(items, null, 2));
