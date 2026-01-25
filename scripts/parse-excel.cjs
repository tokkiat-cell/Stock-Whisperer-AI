const XLSX = require('xlsx');

const workbook = XLSX.readFile('attached_assets/Adam_Growth_stock_list_-_26_Jan_2026_1769358113423.xlsx');
console.log("Sheet names:", workbook.SheetNames);
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const data = XLSX.utils.sheet_to_csv(sheet);
console.log("\n--- CSV DATA ---\n");
console.log(data);
