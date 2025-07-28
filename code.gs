function doGet(e) {
  // Create a template from the main index.html file
  const template = HtmlService.createTemplateFromFile('index');
// Evaluate the template to process the <?!= ... ?> tags
  return template.evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// *** IMPORTANT: REPLACE 'YOUR_VAT_NO_SPREADSHEET_ID_HERE' WITH THE ACTUAL ID OF YOUR "VAT NO" GOOGLE SHEET FILE ***
// You can find the Spreadsheet ID in the URL of your Google Sheet.
const VAT_NO_SPREADSHEET_ID = 'YOUR_VAT_NO_SPREADSHEET_ID_HERE';
function saveSalesData(entry) {
  // This function is commented out or not used in the client-side submit.
// The primary save is handled by submitSalesEntry.
  Logger.log("saveSalesData function is deprecated and not the primary save mechanism.");
return {
    success: false,
    error: "This function is deprecated. Use submitSalesEntry instead."
  };
}

function getNextSN() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('salesbook');
  if (!sheet) {
    Logger.log("Error: 'salesbook' sheet not found for SN generation.");
throw new Error("The 'salesbook' sheet was not found. Please ensure it exists and is correctly named.");
}
  const lastRow = sheet.getLastRow();
  // If only headers exist (lastRow is 1), the next SN is 1. Otherwise, increment the last SN.
if (lastRow < 2) return 1;
  const lastSN = sheet.getRange(lastRow, 1).getValue();
  return (Number(lastSN) || 0) + 1;
}

/**
 * Submits sales entry data to the "salesbook" sheet in the specified format.
* @param {Object} data - The sales data object from the client-side.
 */
function submitSalesEntry(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
const sheet = ss.getSheetByName("salesbook");

  if (!sheet) {
    Logger.log("Error: 'salesbook' sheet not found.");
throw new Error("The 'salesbook' sheet was not found. Please ensure it exists and is correctly named.");
}

  // Ensure numeric values are parsed correctly and commas are removed
  const salesAmount = Number(String(data.amount).replace(/,/g, ""));
const vatAmount = Number(String(data.vatAmount).replace(/,/g, ""));
  const totalAmount = Number(String(data.total).replace(/,/g, ""));
sheet.appendRow([
    Number(data.sn),        // SN (Column A)
    Number(data.billNumber), // Bill no (Column B)
    data.dateAD,             // English Date (Column C)
    data.dateBS,             // Nepali Date (Column D)
    data.clientName,         // Name (Column E)
    data.panNumber,          // Pan no (Column f)
    salesAmount,             // Sales (Column G)
    vatAmount,               // Vat (Column H)
    totalAmount              // Total (Column I)
  ]);
return { success: true, message: "Sales entry saved!" };
}

/**
 * Updates an existing sales entry in the "salesbook" sheet.
* Finds the record by SN and updates all relevant fields.
* @param {Object} data - The sales data object from the client-side, including the SN for lookup.
*/
function updateSalesEntry(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("salesbook");
if (!sheet) {
    Logger.log("Error: 'salesbook' sheet not found for update.");
throw new Error("The 'salesbook' sheet was not found. Please ensure it exists and is correctly named.");
}

  const snToUpdate = Number(data.sn);
  const range = sheet.getDataRange();
  const values = range.getValues();

  let rowFound = -1;
for (let i = 1; i < values.length; i++) { // Start from row 1 to skip headers (index 0)
    if (Number(values[i][0]) === snToUpdate) { // Assuming SN is in the first column (index 0)
      rowFound = i;
break;
    }
  }

  if (rowFound === -1) {
    throw new Error(`Sales record with SN ${snToUpdate} not found for update.`);
}

  // Ensure numeric values are parsed correctly and commas are removed
  const salesAmount = Number(String(data.amount).replace(/,/g, ""));
const vatAmount = Number(String(data.vatAmount).replace(/,/g, ""));
  const totalAmount = Number(String(data.total).replace(/,/g, ""));
// Update the row with new data
  sheet.getRange(rowFound + 1, 1, 1, 9).setValues([[ // rowFound + 1 because sheet rows are 1-indexed
    Number(data.sn),        // SN (Column A)
    Number(data.billNumber), // Bill no (Column B)
    data.dateAD,             // English Date (Column C)
    data.dateBS,             // Nepali Date (Column D)
    data.clientName,        
 // Name (Column E)
    data.panNumber,          // Pan no (Column F)
    salesAmount,             // Sales (Column G)
    vatAmount,               // Vat (Column H)
    totalAmount              // Total (Column I)
  ]]);
return { success: true, message: "Sales entry updated successfully!" };
}


/**
 * Fetches client/supplier names and their PAN numbers from the "Clients" sheet.
* Assumes "Clients" sheet has PAN in Column B and Name in Column C.
 * Returns an array of arrays, where each inner array is [Name, PAN].
*/
function getClientList() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const clientsSheet = ss.getSheetByName("Clients");
if (!clientsSheet) {
    throw new Error("Clients sheet not found.");
  }

  const lastRow = clientsSheet.getLastRow();
if (lastRow < 2) {
    return [];
// No data rows
  }

  // Get data from Column C (Name) and Column B (PAN) starting from row 2
  // Range is (startRow, startColumn, numRows, numColumns)
  const clientNames = clientsSheet.getRange(2, 3, lastRow - 1, 1).getValues();
// Column C for Name
  const clientPans = clientsSheet.getRange(2, 2, lastRow - 1, 1).getValues();
// Column B for PAN

  const clientData = [];
for (let i = 0; i < clientNames.length; i++) {
    clientData.push([
      clientNames[i][0] ? clientNames[i][0].toString() : '',
      clientPans[i][0] ? clientPans[i][0].toString() : ''
    ]);
}
  return clientData;
}

/**
 * Converts an English date (AD) to a Nepali date (BS) using the ADTOBS sheet.
* Ensures all dates are handled as 'YYYY-MM-DD' strings.
 * @param {string} adDateString - The English date in 'YYYY-MM-DD' format.
* @return {string|null} The Nepali date in 'YYYY-MM-DD' format, or null if not found.
*/
function convertADtoBS(adDateString) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const adToBsSheet = ss.getSheetByName("ADTOBS");
  const timezone = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
if (!adToBsSheet) {
    Logger.log("ADTOBS sheet not found.");
throw new Error("The 'ADTOBS' sheet was not found. Please ensure it exists and is correctly named.");
}

  const lastRow = adToBsSheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("ADTOBS sheet is empty.");
    return null;
}

  const adDatesRaw = adToBsSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const bsDatesRaw = adToBsSheet.getRange(2, 2, lastRow - 1, 1).getValues();
for (let i = 0; i < adDatesRaw.length; i++) {
    const adDateValue = adDatesRaw[i][0];
let sheetAdDateFormatted = null;

    if (adDateValue instanceof Date) {
      sheetAdDateFormatted = Utilities.formatDate(adDateValue, timezone, 'yyyy-MM-dd');
} else {
      sheetAdDateFormatted = String(adDateValue).trim();
}

    if (sheetAdDateFormatted === adDateString) {
      const bsDateValue = bsDatesRaw[i][0];
if (bsDateValue instanceof Date) {
        return Utilities.formatDate(bsDateValue, timezone, 'yyyy-MM-dd');
} else {
        return String(bsDateValue).trim();
}
    }
  }

  Logger.log("AD date not found in ADTOBS sheet: " + adDateString);
  return null;
}

/**
 * Converts a Nepali date (BS) to an English date (AD) using the ADTOBS sheet.
* Ensures all dates are handled as 'YYYY-MM-DD' strings.
 * @param {string} bsDateString - The Nepali date in 'YYYY-MM-DD' format.
* @return {string|null} The English date in 'YYYY-MM-DD' format, or null if not found.
*/
function convertBStoAD(bsDateString) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const adToBsSheet = ss.getSheetByName("ADTOBS");
  const timezone = SpreadsheetApp.getActive().getSpreadsheetTimeZone();
if (!adToBsSheet) {
    Logger.log("ADTOBS sheet not found.");
throw new Error("The 'ADTOBS' sheet was not found. Please ensure it exists and is correctly named.");
}

  const lastRow = adToBsSheet.getLastRow();
  if (lastRow < 2) {
    Logger.log("ADTOBS sheet is empty.");
    return null;
}

  const adDatesRaw = adToBsSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const bsDatesRaw = adToBsSheet.getRange(2, 2, lastRow - 1, 1).getValues();
for (let i = 0; i < bsDatesRaw.length; i++) {
    const bsDateValue = bsDatesRaw[i][0];
let sheetBsDateFormatted = null;

    if (bsDateValue instanceof Date) {
      sheetBsDateFormatted = Utilities.formatDate(bsDateValue, timezone, 'yyyy-MM-dd');
} else {
      sheetBsDateFormatted = String(bsDateValue).trim();
}

    if (sheetBsDateFormatted === bsDateString) {
      const adDateValue = adDatesRaw[i][0];
if (adDateValue instanceof Date) {
        return Utilities.formatDate(adDateValue, timezone, 'yyyy-MM-dd');
} else {
        return String(adDateValue).trim();
}
    }
  }

  Logger.log("BS date not found in ADTOBS sheet: " + bsDateString);
  return null;
}

/**
 * Gets the next serial number for the 'purchaseentry' sheet.
 * @return {number} The next serial number.
*/
function getNextPurchaseSN() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('purchaseentry');
  if (!sheet) {
    Logger.log("Error: 'purchaseentry' sheet not found for SN.");
throw new Error("The 'purchaseentry' sheet was not found. Cannot generate SN.");
  }
  const lastRow = sheet.getLastRow();
if (lastRow < 2) return 1;
  const lastSN = sheet.getRange(lastRow, 1).getValue();
  return (Number(lastSN) || 0) + 1;
}

/**
 * Submits purchase entry data to the "purchaseentry" sheet in the specified format.
* Headers: SN, Bill no, English Date, Nepali Date, Name, Pan no, Non vat, Expenses, Fixed assets, Purchase, PurchaseType, Total taxable, Vat, Total
 * @param {Object} data - The purchase data object from the client-side.
*/
function submitPurchaseEntry(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("purchaseentry");
if (!sheet) {
    Logger.log("Error: 'purchaseentry' sheet not found.");
throw new Error("The 'purchaseentry' sheet was not found. Please ensure it exists and is correctly named.");
}

  const purchaseAmount = Number(String(data.purchaseAmount).replace(/,/g, ""));
  const vatAmount = Number(String(data.vatAmount).replace(/,/g, ""));
  const totalAmount = Number(String(data.total).replace(/,/g, ""));
let nonVat = '';
  let expenses = '';
  let fixedAssets = '';
  let purchase = '';
  let totalTaxable = '';
switch (data.purchaseType) {
    case 'Non vat':
      nonVat = purchaseAmount;
      totalTaxable = 0;
expenses = '-';
      fixedAssets = '-';
      purchase = '-';
      break;
    case 'Expenses':
      expenses = purchaseAmount;
totalTaxable = purchaseAmount;
      nonVat = '-';
      fixedAssets = '-';
      purchase = '-';
      break;
case 'Fixed assets':
      fixedAssets = purchaseAmount;
      totalTaxable = purchaseAmount;
      nonVat = '-';
      expenses = '-';
fixedAssets = '-';
      break;
    case 'Purchase':
      purchase = purchaseAmount;
      totalTaxable = purchaseAmount;
      nonVat = '-';
expenses = '-';
      fixedAssets = '-';
      break;
    default:
      Logger.log("Warning: Unknown or empty purchaseType: " + data.purchaseType);
purchase = purchaseAmount;
      totalTaxable = purchaseAmount;
      nonVat = '-';
      expenses = '-';
      fixedAssets = '-';
      break;
}

  sheet.appendRow([
    Number(data.sn),           // SN
    Number(data.billNumber),   // Bill no
    data.dateAD,               // English Date
    data.dateBS,               // Nepali Date
    data.supplierName,         // Name
    data.supplierPanNumber,    // Pan no
    nonVat,   
                 // Non vat
    expenses,                  // Expenses
    fixedAssets,               // Fixed assets
    purchase,                  // Purchase
    data.purchaseType,         
    totalTaxable,              // Total taxable
    vatAmount,                 // Vat
    totalAmount                // Total
  ]);
return { success: true, message: "Purchase entry saved!" };
}

// --- NEW FUNCTIONS FOR VAT NO ENTRY ---

/**
 * Gets the next serial number for the 'database' sheet in the external 'VAT NO' spreadsheet.
* @return {number} The next serial number.
 */
function getNextVatSN() {
  if (VAT_NO_SPREADSHEET_ID === 'YOUR_VAT_NO_SPREADSHEET_ID_HERE' || !VAT_NO_SPREADSHEET_ID) {
    throw new Error("VAT_NO_SPREADSHEET_ID is not configured. Please update code.gs with your VAT NO Spreadsheet ID.");
}
  const externalSs = SpreadsheetApp.openById(VAT_NO_SPREADSHEET_ID);
  const sheet = externalSs.getSheetByName('database');
// Assuming a sheet named "database" within "VAT NO" spreadsheet

  if (!sheet) {
    Logger.log("Error: 'database' sheet not found in external 'VAT NO' spreadsheet for SN generation.");
throw new Error("The 'database' sheet was not found in the external 'VAT NO' spreadsheet. Cannot generate SN.");
}

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1;

  const lastSN = sheet.getRange(lastRow, 1).getValue();
return (Number(lastSN) || 0) + 1;
}

/**
 * Looks up a client's name by their PAN number in the "Clients" sheet (in the active spreadsheet).
* @param {string} pan - The PAN number to search for.
* @return {string|null} The client's name if found, otherwise null.
 */
function getClientNameByPan(pan) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
const clientsSheet = ss.getSheetByName("Clients");

  if (!clientsSheet) {
    Logger.log("Error: Clients sheet not found for PAN lookup.");
throw new Error("Clients sheet not found. Cannot lookup PAN.");
  }

  const lastRow = clientsSheet.getLastRow();
if (lastRow < 2) {
    return null;
}

  const panNumbers = clientsSheet.getRange(2, 2, lastClientRow - 1, 1).getValues();
// Column B for PAN
  const clientNames = clientsSheet.getRange(2, 3, lastClientRow - 1, 1).getValues();
// Column C for Name

  for (let i = 0; i < panNumbers.length; i++) {
    if (String(panNumbers[i][0]).trim() === String(pan).trim()) {
      return clientNames[i][0] ?
String(clientNames[i][0]).trim() : null;
    }
  }
  return null;
}

/**
 * Submits VAT entry data.
Saves to "database" sheet in external "VAT NO" spreadsheet
 * and updates "Clients" sheet in the active spreadsheet if necessary.
* @param {Object} data - The VAT entry data object from the client-side.
* - data.sn: Serial number
 * - data.panNumber: PAN number
 * - data.name: Client/Supplier Name
 */
function submitVatEntry(data) {
  if (VAT_NO_SPREADSHEET_ID === 'YOUR_VAT_NO_SPREADSHEET_ID_HERE' || !VAT_NO_SPREADSHEET_ID) {
    throw new Error("VAT_NO_SPREADSHEET_ID is not configured. Please update code.gs with your VAT NO Spreadsheet ID.");
}

  const activeSs = SpreadsheetApp.getActiveSpreadsheet();
  const clientsSheet = activeSs.getSheetByName("Clients");

  const externalSs = SpreadsheetApp.openById(VAT_NO_SPREADSHEET_ID);
  const vatNoSheet = externalSs.getSheetByName("database");
if (!vatNoSheet) {
    Logger.log("Error: 'database' sheet not found in external 'VAT NO' spreadsheet for saving.");
throw new Error("The 'database' sheet was not found in the external 'VAT NO' spreadsheet. Please ensure it exists and is correctly named.");
}
  if (!clientsSheet) {
    Logger.log("Error: 'Clients' sheet not found for updating.");
throw new Error("The 'Clients' sheet was not found. Cannot update client data.");
}

  // 1. Save to "database" sheet in the external "VAT NO" spreadsheet
  vatNoSheet.appendRow([
    Number(data.sn),
    String(data.panNumber).trim(),
    String(data.name).trim()
  ]);
Logger.log(`Saved VAT entry to external 'VAT NO' spreadsheet, sheet 'database'. SN: ${data.sn}, PAN: ${data.panNumber}, Name: ${data.name}`);
// 2. Update/Add to "Clients" sheet in the active spreadsheet
  const lastClientRow = clientsSheet.getLastRow();
const clientPans = (lastClientRow > 1) ? clientsSheet.getRange(2, 2, lastClientRow - 1, 1).getValues() : [];
// Column B for PAN
  let foundRow = -1;
for (let i = 0; i < clientPans.length; i++) {
    if (String(clientPans[i][0]).trim() === String(data.panNumber).trim()) {
      foundRow = i + 2;
break;
    }
  }

  if (foundRow !== -1) {
    const existingName = String(clientsSheet.getRange(foundRow, 3).getValue()).trim();
// Column C
    if (existingName !== String(data.name).trim()) {
      clientsSheet.getRange(foundRow, 3).setValue(String(data.name).trim());
Logger.log(`Updated name for PAN ${data.panNumber} in Clients sheet (active spreadsheet).`);
}
  } else {
    clientsSheet.appendRow(['', String(data.panNumber).trim(), String(data.name).trim()]);
Logger.log(`Added new client/supplier for PAN ${data.panNumber} to Clients sheet (active spreadsheet).`);
}

  return { success: true, message: "VAT entry saved and client data updated!" };
}

/**
 * Fetches the last 'count' sales records from the 'salesbook' sheet.
* @param {number} count The number of recent records to fetch.
* @return {Array<Array<any>>} An array of arrays, where each inner array represents a row of sales data.
* The order of columns in the returned array will match the order in the 'salesbook' sheet (A to I).
*/
function getRecentSalesRecords(count) { // Added 'count' parameter
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("salesbook");
// Changed to salesbook (lowercase)
  if (!sheet) {
    throw new Error("Sheet 'salesbook' not found");
}

  const data = sheet.getDataRange().getValues();
  console.info("Total rows: " + data.length);

  if (data.length <= 1) return [];
// No data (only headers)

  const rows = data.slice(1).reverse();
// Skip header and reverse for recent
  const recordsToReturn = rows.slice(0, count).map(row => [ // Use 'count' here
    row[0], // SN
    row[1], // Bill No
    formatDate(row[2]), // Date (AD)
    formatDate(row[3]), // Date (BS)
    row[4], // Name (Corrected column index based on typical spreadsheet structure)
    row[5], // Pan No (Corrected column index)
    row[6], // Sales Amount
    row[7], // VAT
    row[8]  // Total
  ]);
console.info("Records fetched: " + recordsToReturn.length);
  return recordsToReturn;
}

function formatDate(date) {
  if (Object.prototype.toString.call(date) === '[object Date]' && !isNaN(date)) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "yyyy-MM-dd");
}
  return date;
}


// Helper functions (already present, keeping for completeness)
function extractMonth(dateString) {
  if (!dateString) return null;
const parts = dateString.split('-');
  return parseInt(parts[1], 10);
}

function extractDay(dateString) {
  if (!dateString) return null;
  const parts = dateString.split('-');
return parseInt(parts[2], 10);
}

/**
 * Fetches the last 'count' purchase records from the 'purchaseentry' sheet.
 * @param {number} count The number of recent records to fetch.
 * @return {Array<Array<any>>} An array of arrays, where each inner array represents a row of purchase data.
 */
function getRecentPurchaseRecords(count) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("purchaseentry");
  if (!sheet) {
    throw new Error("Sheet 'purchaseentry' not found");
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return []; // No data (only headers)

  const rows = data.slice(1).reverse(); // Skip header and reverse for recent
  
  // Return the most recent records up to the specified count, formatting dates along the way.
  const recordsToReturn = rows.slice(0, count).map(row => {
    // Ensure all columns are present, even if empty, to avoid client-side errors
    const fullRow = [...row];
    while(fullRow.length < 14) {
      fullRow.push('');
    }
    // Format date columns just like in getRecentSalesRecords
    fullRow[2] = formatDate(fullRow[2]); // English Date
    fullRow[3] = formatDate(fullRow[3]); // Nepali Date
    return fullRow;
  });

  return recordsToReturn;
}


/**
 * Updates an existing purchase entry in the "purchaseentry" sheet.
* @param {Object} data - The purchase data object from the client-side, including the SN for lookup.
*/
function updatePurchaseEntry(data) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName("purchaseentry");
if (!sheet) {
    throw new Error("The 'purchaseentry' sheet was not found for update.");
}

  const snToUpdate = Number(data.sn);
  const range = sheet.getDataRange();
  const values = range.getValues();

  let rowFound = -1;
for (let i = 1; i < values.length; i++) { // Start from row 1 to skip headers
    if (Number(values[i][0]) === snToUpdate) { // SN is in the first column (index 0)
      rowFound = i;
break;
    }
  }

  if (rowFound === -1) {
    throw new Error(`Purchase record with SN ${snToUpdate} not found for update.`);
}

  // Recalculate amounts based on purchase type, same as in submitPurchaseEntry
  const purchaseAmount = Number(String(data.purchaseAmount).replace(/,/g, ""));
const vatAmount = Number(String(data.vatAmount).replace(/,/g, ""));
  const totalAmount = Number(String(data.total).replace(/,/g, ""));

  let nonVat = '';
  let expenses = '';
let fixedAssets = '';
  let purchase = '';
  let totalTaxable = '';
switch (data.purchaseType) {
    case 'Non vat':
      nonVat = purchaseAmount;
      totalTaxable = 0;
expenses = '-'; fixedAssets = '-'; purchase = '-';
      break;
    case 'Expenses':
      expenses = purchaseAmount;
totalTaxable = purchaseAmount;
      nonVat = '-'; fixedAssets = '-'; purchase = '-';
      break;
case 'Fixed assets':
      fixedAssets = purchaseAmount;
      totalTaxable = purchaseAmount;
      nonVat = '-'; expenses = '-';
purchase = '-';
      break;
    case 'Purchase': // This case was 'Purchase (Goods)' in the form
    default:
      purchase = purchaseAmount;
totalTaxable = purchaseAmount;
      nonVat = '-'; expenses = '-'; fixedAssets = '-';
      break;
}
   if (data.purchaseType === 'Fixed assets') { // A small correction from your original code
      fixedAssets = purchaseAmount;
}

  // Update the row with new data (14 columns total)
  sheet.getRange(rowFound + 1, 1, 1, 14).setValues([[
    Number(data.sn),           // SN
    Number(data.billNumber),   // Bill no
    data.dateAD,               // English Date
    data.dateBS,               // Nepali Date
    data.supplierName,         // Name
 
   data.supplierPanNumber,    // Pan no
    nonVat,                    // Non vat (Col G)
    expenses,                  // Expenses (Col H)
    fixedAssets,               // Fixed assets (Col I)
    purchase,           
       // Purchase (Col J)
    data.purchaseType,         // PurchaseType (Col K)
    totalTaxable,              // Total taxable (Col L)
    vatAmount,                 // Vat (Col M)
    totalAmount                // Total (Col N)
  ]]);
return { success: true, message: "Purchase entry updated successfully!" };
}