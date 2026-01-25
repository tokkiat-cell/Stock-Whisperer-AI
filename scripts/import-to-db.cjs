const XLSX = require('xlsx');

const workbook = XLSX.readFile('attached_assets/Adam_Growth_stock_list_-_26_Jan_2026_1769358113423.xlsx');
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet);

// Clean ticker symbol
function cleanSymbol(ticker) {
  if (!ticker) return null;
  let symbol = ticker.trim();
  symbol = symbol.replace(/-US$/i, '').replace(/-HK$/i, '');
  if (/^\d{4}$/.test(symbol)) {
    symbol = symbol + '.HK';
  }
  return symbol.toUpperCase();
}

// Parse number from string
function parseNum(val) {
  if (!val || val === 'N/A' || val === 'NA' || val === '#VALUE!') return null;
  const num = String(val).replace(/[^0-9.\-]/g, '');
  return num && !isNaN(parseFloat(num)) ? num : null;
}

// Format discount/premium as string percentage
function formatDiscount(val) {
  if (!val || val === 'N/A' || val === 'NA' || val === '#VALUE!') return null;
  if (typeof val === 'number') {
    return (val * 100).toFixed(1) + '%';
  }
  if (typeof val === 'string' && val.includes('%')) {
    return val;
  }
  return null;
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
    discountPremium: formatDiscount(row['Avg. Discount / Premium']),
    moat: row['Moat'] || null,
    investmentType: row['Investment Type'] || null,
    intrinsicValue: parseNum(row['Average IV']) || '0',
    source: 'USER_UPLOADED'
  });
}

// Call the API to bulk insert
async function importData() {
  const response = await fetch('http://localhost:5000/api/investor-target-list/bulk', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Cookie': 'connect.sid=s%3Atest' // This won't work without auth
    },
    body: JSON.stringify({ items })
  });
  
  console.log('Response status:', response.status);
  const text = await response.text();
  console.log('Response:', text);
}

// Output SQL instead for direct database insert
console.log("-- SQL to insert growth stocks");
console.log("-- User ID needs to be set");

for (const item of items) {
  const values = [
    "'53422167'", // userId - replace with actual
    `'${item.symbol}'`,
    item.companyName ? `'${item.companyName.replace(/'/g, "''")}'` : 'NULL',
    item.intrinsicValue || '0',
    'NULL', // notes
    "'USER_UPLOADED'",
    'NOW()',
    'NOW()',
    'NULL', // adam_list
    item.currency ? `'${item.currency}'` : 'NULL',
    item.supportLevel1 || 'NULL',
    item.supportLevel2 || 'NULL',
    item.supportLevel3 || 'NULL',
    item.supportLevel4 || 'NULL',
    item.supportLevel5 || 'NULL',
    'NULL', // conservative_iv
    'NULL', // base_iv
    item.averageIV || 'NULL',
    item.discountPremium ? `'${item.discountPremium}'` : 'NULL',
    'NULL', // growth_rates
    item.moat ? `'${item.moat}'` : 'NULL',
    item.investmentType ? `'${item.investmentType.replace(/'/g, "''")}'` : 'NULL'
  ];
  
  console.log(`INSERT INTO investor_target_list (user_id, symbol, company_name, intrinsic_value, notes, source, created_at, updated_at, adam_list, currency, support_level_1, support_level_2, support_level_3, support_level_4, support_level_5, conservative_iv, base_iv, average_iv, discount_premium, growth_rates, moat, investment_type) VALUES (${values.join(', ')});`);
}
