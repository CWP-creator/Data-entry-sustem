function doGet(e) {
  const page = e.parameter.page;

  switch (page) {
    case 'purchase':
      return HtmlService.createHtmlOutputFromFile('PurchaseEntry')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    case 'sales':
      return HtmlService.createHtmlOutputFromFile('salespage')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    case 'pan':
      return HtmlService.createHtmlOutputFromFile('PanEntry')
        .addMetaTag('viewport', 'width=device-width, initial-scale=1');
    default:
      // Assuming 'Index' is your default or home page
      return HtmlService.createHtmlOutputFromFile('Index');
  }
}




// *** IMPORTANT: REPLACE 'YOUR_VAT_NO_SPREADSHEET_ID_HERE' WITH THE ACTUAL ID OF YOUR "VAT NO" GOOGLE SHEET FILE ***
// You can find the Spreadsheet ID in the URL of your Google Sheet.
const VAT_NO_SPREADSHEET_ID = '1OCntdIyDYrCh8oKSGjIyKg86aOFLDZdb2ITIb9UJn4Q'; // User updated this line

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
    Number(data.sn), // SN (Column A)
    Number(data.billNumber), // Bill no (Column B)
    data.dateAD, // English Date (Column C)
    data.dateBS, // Nepali Date (Column D)
    data.clientName, // Name (Column E)
    data.panNumber, // Pan no (Column f)
    salesAmount, // Sales (Column G)
    vatAmount, // Vat (Column H)
    totalAmount // Total (Column I)
  ]);
  return {
    success: true,
    message: "Sales entry saved!"
  };
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
  sheet.getRange(rowFound + 1, 1, 1, 9).setValues([
    [ // rowFound + 1 because sheet rows are 1-indexed
      Number(data.sn), // SN (Column A)
      Number(data.billNumber), // Bill no (Column B)
      data.dateAD, // English Date (Column C)
      data.dateBS, // Nepali Date (Column D)
      data.clientName,
      // Name (Column E)
      data.panNumber, // Pan no (Column F)
      salesAmount, // Sales (Column G)
      vatAmount, // Vat (Column H)
      totalAmount // Total (Column I)
    ]
  ]);
  return {
    success: true,
    message: "Sales entry updated successfully!"
  };
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
  // Correctly defined here
  if (lastRow < 2) {
    return null;
  }

  // CORRECTED LINES: Use lastRow instead of lastClientRow
  const panNumbers = clientsSheet.getRange(2, 2, lastRow - 1, 1).getValues();
  // Column B for PAN
  const clientNames = clientsSheet.getRange(2, 3, lastRow - 1, 1).getValues();
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
    Number(data.sn), // SN
    Number(data.billNumber), // Bill no
    data.dateAD, // English Date
    data.dateBS, // Nepali Date
    data.supplierName, // Name
    data.supplierPanNumber, // Pan no
    nonVat,
    // Non vat
    expenses, // Expenses
    fixedAssets, // Fixed assets
    purchase, // Purchase
    data.purchaseType, //PurchaseType
    totalTaxable, // Total taxable
    vatAmount, // Vat
    totalAmount // Total
  ]);
  return {
    success: true,
    message: "Purchase entry saved!"
  };
}

// --- NEW FUNCTIONS FOR VAT NO ENTRY ---

/**
 * Gets the next serial number for the 'database' sheet in the external 'VAT NO' spreadsheet.
 * @return {number} The next serial number.
 */
function getNextVatSN() {
  // Removed the explicit check for the placeholder string
  if (!VAT_NO_SPREADSHEET_ID) {
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

function getClientNameByPan(pan) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const clientsSheet = ss.getSheetByName("Clients");
  if (!clientsSheet) {
    Logger.log("Error: Clients sheet not found for PAN lookup.");
    throw new Error("Clients sheet not found. Cannot lookup PAN.");
  }

  const lastRow = clientsSheet.getLastRow();
  // Correctly defined here
  if (lastRow < 2) {
    return null;
  }

  // CORRECTED LINES: Use lastRow instead of lastClientRow
  const panNumbers = clientsSheet.getRange(2, 2, lastRow - 1, 1).getValues();
  // Column B for PAN
  const clientNames = clientsSheet.getRange(2, 3, lastRow - 1, 1).getValues();
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
 * Saves to "database" sheet in external "VAT NO" spreadsheet
 * and updates "Clients" sheet in the active spreadsheet if necessary.
 * @param {Object} data - The VAT entry data object from the client-side.
 * - data.sn: Serial number
 * - data.panNumber: PAN number
 * - data.name: Client/Supplier Name
 */
function submitVatEntry(data) {
  // Removed the explicit check for the placeholder string
  if (!VAT_NO_SPREADSHEET_ID) {
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
    // This is the line that needs modification to include data.sn
    clientsSheet.appendRow([Number(data.sn), String(data.panNumber).trim(), String(data.name).trim()]);
    Logger.log(`Added new client/supplier for PAN ${data.panNumber} to Clients sheet (active spreadsheet).`);
  }

  return {
    success: true,
    message: "VAT entry saved and client data updated!"
  };
}

/**
 * Gets a unique list of client names from the 'salesbook' sheet.
 * @returns {Array<string>} An array of unique client names.
 */
function getSalesbookClientList() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("salesbook");
  if (!sheet) {
    throw new Error("Sheet 'salesbook' not found");
  }
  const data = sheet.getRange("E2:E" + sheet.getLastRow()).getValues();
  const clientNames = new Set();
  data.forEach(row => {
    if (row[0]) { // Check if the cell is not empty
      clientNames.add(row[0].toString().trim());
    }
  });
  return Array.from(clientNames).sort(); // Return a sorted array of unique names
}

/**
 * Fetches sales records from the 'salesbook' sheet with filtering and pagination.
 * @param {Object} filters - An object containing filter criteria. e.g., { clientName: 'Client A', nepaliMonth: 4 }
 * @param {number} page - The page number to fetch (1-based).
 * @param {number} pageSize - The number of records per page.
 * @return {Object} An object containing 'records', 'totals', and 'pagination' info.
 */
function getSalesRecords(filters, page, pageSize) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("salesbook");
  if (!sheet) {
    throw new Error("Sheet 'salesbook' not found");
  }

  page = Number(page) || 1;
  pageSize = Number(pageSize) || 5; // Changed from 10 to 5

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    return {
      records: [],
      totals: {
        totalSales: 0,
        totalVat: 0,
        grandTotal: 0
      },
      pagination: {
        currentPage: 1,
        pageSize: pageSize,
        totalRecords: 0,
        totalPages: 0
      }
    };
  }

  const clientNameFilter = filters ? filters.clientName : null;
  const nepaliMonthFilter = filters ? filters.nepaliMonth : null;

  let allRows = data.slice(1); // Skip header
  let filteredRows = allRows;

  // 1. Apply client name filter
  if (clientNameFilter && clientNameFilter !== 'All Clients') {
    filteredRows = filteredRows.filter(row => {
      const clientName = row[4] ? String(row[4]).trim() : ''; // Client Name is in Column E
      return clientName === clientNameFilter;
    });
  }

  // 2. Apply Nepali month filter
  if (nepaliMonthFilter && nepaliMonthFilter !== 'All') {
    const monthToFilter = parseInt(nepaliMonthFilter, 10);
    filteredRows = filteredRows.filter(row => {
      const dateValue = row[3]; // Nepali Date column (Column D)
      if (!dateValue) return false;
      let dateString;
      if (Object.prototype.toString.call(dateValue) === '[object Date]' && !isNaN(dateValue)) {
        dateString = Utilities.formatDate(dateValue, Session.getScriptTimeZone(), "yyyy-MM-dd");
      } else {
        dateString = String(dateValue);
      }
      const month = extractMonth(dateString);
      return month === monthToFilter;
    });
  }

  // 3. Calculate Totals on the final filtered data (before pagination)
  let totalSales = 0;
  let totalVat = 0;
  let grandTotal = 0;
  filteredRows.forEach(row => {
    totalSales += Number(row[6]) || 0; // Sales Amount (Column G)
    totalVat += Number(row[7]) || 0; // VAT (Column H)
    grandTotal += Number(row[8]) || 0; // Total (Column I)
  });

  const totals = {
    totalSales: totalSales,
    totalVat: totalVat,
    grandTotal: grandTotal
  };

  // 4. Paginate the results
  const totalRecords = filteredRows.length;
  const recentFirstRows = filteredRows.reverse(); // Show most recent first

  const startIndex = (page - 1) * pageSize;
  const paginatedRows = recentFirstRows.slice(startIndex, startIndex + pageSize);

  const recordsToReturn = paginatedRows.map(row => [
    row[0], // SN
    row[1], // Bill No
    formatDate(row[2]), // Date (AD)
    formatDate(row[3]), // Date (BS)
    row[4], // Name
    row[5], // Pan No
    row[6], // Sales Amount
    row[7], // VAT
    row[8] // Total
  ]);

  const pagination = {
    currentPage: page,
    pageSize: pageSize,
    totalRecords: totalRecords,
    totalPages: Math.ceil(totalRecords / pageSize)
  };

  return {
    records: recordsToReturn,
    totals: totals,
    pagination: pagination
  };
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
  if (data.length <= 1) return [];
  // No data (only headers)

  const rows = data.slice(1).reverse();
  // Skip header and reverse for recent

  // Return the most recent records up to the specified count, formatting dates along the way.
  const recordsToReturn = rows.slice(0, count).map(row => {
    // Ensure all columns are present, even if empty, to avoid client-side errors
    const fullRow = [...row];
    while (fullRow.length < 14) {
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
      purchase = '-';
      break;
    case 'Purchase': // This case was 'Purchase (Goods)' in the form
    default:
      purchase = purchaseAmount;
      totalTaxable = purchaseAmount;
      nonVat = '-';
      expenses = '-';
      fixedAssets = '-';
      break;
  }
  if (data.purchaseType === 'Fixed assets') { // A small correction from your original code
    fixedAssets = purchaseAmount;
  }

  // Update the row with new data (14 columns total)
  sheet.getRange(rowFound + 1, 1, 1, 14).setValues([
    [
      Number(data.sn), // SN
      Number(data.billNumber), // Bill no
      data.dateAD, // English Date
      data.dateBS, // Nepali Date
      data.supplierName, // Name

      data.supplierPanNumber, // Pan no
      nonVat, // Non vat (Col G)
      expenses, // Expenses (Col H)
      fixedAssets, // Fixed assets (Col I)
      purchase,
      // Purchase (Col J)
      data.purchaseType, // PurchaseType (Col K)
      totalTaxable, // Total taxable (Col L)
      vatAmount, // Vat (Col M)
      totalAmount // Total (Col N)
    ]
  ]);
  return {
    success: true,
    message: "Purchase entry updated successfully!"
  };
}

/**
 * Fetches the last 'count' VAT records from the 'database' sheet in the external 'VAT NO' spreadsheet.
 * @param {number} count The number of recent records to fetch.
 * @return {Array<Array<any>>} An array of arrays, where each inner array represents a row of VAT data.
 */
function getRecentVatRecords(count) {
  if (!VAT_NO_SPREADSHEET_ID) {
    throw new Error("VAT_NO_SPREADSHEET_ID is not configured. Please update code.gs with your VAT NO Spreadsheet ID.");
  }
  const externalSs = SpreadsheetApp.openById(VAT_NO_SPREADSHEET_ID);
  const sheet = externalSs.getSheetByName('database');
  if (!sheet) {
    Logger.log("Error: 'database' sheet not found in external 'VAT NO' spreadsheet for fetching.");
    throw new Error("The 'database' sheet was not found in the external 'VAT NO' spreadsheet. Cannot fetch VAT records.");
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];
  // No data (only headers)

  const rows = data.slice(1).reverse();
  // Skip header and reverse for recent

  // Return the most recent records up to the specified count
  const recordsToReturn = rows.slice(0, count).map(row => {
    // Ensure all columns are present, even if empty
    const fullRow = [...row];
    while (fullRow.length < 3) { // Assuming SN, PAN, Name for VAT entries
      fullRow.push('');
    }
    return fullRow;
  });
  return recordsToReturn;
}

/**
 * Updates an existing VAT entry in the 'database' sheet of the external 'VAT NO' spreadsheet.
 * @param {Object} data - The VAT data object from the client-side, including the SN for lookup.
 */
function updateVatEntry(data) {
  if (!VAT_NO_SPREADSHEET_ID) {
    throw new Error("VAT_NO_SPREADSHEET_ID is not configured. Please update code.gs with your VAT NO Spreadsheet ID.");
  }

  const externalSs = SpreadsheetApp.openById(VAT_NO_SPREADSHEET_ID);
  const sheet = externalSs.getSheetByName('database');
  if (!sheet) {
    Logger.log("Error: 'database' sheet not found in external 'VAT NO' spreadsheet for update.");
    throw new Error("The 'database' sheet was not found in the external 'VAT NO' spreadsheet. Cannot update VAT entry.");
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
    throw new Error(`VAT record with SN ${snToUpdate} not found for update.`);
  }

  // Update the row with new data (assuming SN, PAN, Name)
  sheet.getRange(rowFound + 1, 1, 1, 3).setValues([
    [ // rowFound + 1 because sheet rows are 1-indexed
      Number(data.sn), // SN
      String(data.panNumber).trim(), // PAN Number
      String(data.name).trim() // Name
    ]
  ]);
  return {
    success: true,
    message: "VAT entry updated successfully!"
  };
}
function getSalesDataForChart() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("salesbook");
  if (!sheet) {
    throw new Error("Sheet 'salesbook' not found");
  }

  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) return [];

  const salesByMonth = {}; // This will store aggregated sales
  const timezone = SpreadsheetApp.getActive().getSpreadsheetTimeZone();

  // Define Nepali month mappings and their approximate English month equivalents
  // Note: Nepali months span across two English months. This mapping uses the start month for simplicity.
  const nepaliMonthsMapping = [
    "Baisakh", "Jestha", "Ashadh", "Shrawan", "Bhadra", "Ashwin",
    "Kartik", "Mangsir", "Poush", "Magh", "Falgun", "Chaitra"
  ];

  // For the chart, we want to show the last 12 Nepali months.
  // This approach is simplified by associating each Nepali month with the English month in which it primarily falls or starts.
  // A more precise approach would involve using the ADTOBS sheet for each specific date, but for aggregation over months,
  // we'll rely on the approximate mapping based on the provided date ranges.

  // Aggregate sales by English Month (as dates in sheet are English)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    try {
      const saleDateAD = new Date(row[2]); // English Date is in Column C 
      const saleAmount = parseFloat(row[6]); // Sales Amount is in Column G [cite: 232]

      // Check for valid date and amount before processing
      if (saleAmount && !isNaN(saleAmount) && saleDateAD instanceof Date && !isNaN(saleDateAD.getTime())) {
        const year = saleDateAD.getFullYear();
        const month = saleDateAD.getMonth(); // 0-indexed English month (0 for Jan, 1 for Feb, etc.)
        const key = `${year}-${month}`; // Key based on English month

        if (!salesByMonth[key]) {
          salesByMonth[key] = 0;
        }
        salesByMonth[key] += saleAmount;
      }
    } catch (e) {
      // Safely skip any rows with unparseable dates
      Logger.log(`Skipping row due to invalid date: ${row[2]} - ${e.message}`);
    }
  }

  const result = [];
  const today = new Date();

  // Iterate for the last 12 months in reverse chronological order
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const year = d.getFullYear();
    const month = d.getMonth(); // English month index

    const key = `${year}-${month}`; // Key for aggregated sales

    // Determine the corresponding Nepali month name for display
    let nepaliMonthName = "";

    // Mapping English month to Nepali month for display purposes
    // This is an approximation. For exact mapping, ADTOBS lookup for each date is needed,
    // but for chart labels, a general mapping based on the provided ranges is sufficient.
    // The provided ranges (e.g., Shrawan July 17-Aug 16) mean that a sale in August
    // might fall into Shrawan or Bhadra. For the chart labels, we'll try to represent
    // the "primary" Nepali month for the English month.

    // Using the provided table to approximate which Nepali month corresponds to the English month.
    // For simplicity, let's map the English month to the Nepali month that it mostly contains.
    // This part requires careful consideration as Nepali months span two English months.
    // For a 12-month chart, we'll just cycle through the 12 Nepali month names.
    // Let's assume the chart displays the current Nepali year's months,
    // starting from a recent month and going back 12 months.

    // A more direct way: Get the Nepali date for the 1st of the English month
    // and extract the Nepali month. This leverages convertADtoBS.
    const firstDayOfEnglishMonth = Utilities.formatDate(d, timezone, 'yyyy-MM-dd');
    const nepaliDateString = convertADtoBS(firstDayOfEnglishMonth); // Use your existing function 
    let currentNepaliMonth = '';
    if (nepaliDateString) {
      // Example: '2081-04-10' -> extract '04' (Shrawan)
      const nepaliMonthNumber = parseInt(nepaliDateString.split('-')[1], 10);
      // Adjust to 0-indexed if necessary for array lookup, or use a 1-indexed array
      if (nepaliMonthNumber >= 1 && nepaliMonthNumber <= 12) {
        currentNepaliMonth = nepaliMonthsMapping[nepaliMonthNumber - 1]; // Assuming nepaliMonthsMapping is 0-indexed Baisakh = 0
      }
    } else {
      // Fallback if conversion fails, use English month name or a placeholder
      currentNepaliMonth = "Month " + (month + 1); // e.g., "Month 7" for July
    }

    result.push({
      month: currentNepaliMonth,
      sales: salesByMonth[key] || 0 // Use the aggregated sales, or 0 if no sales for that month
    });
  }

  // Reverse the result array to show oldest to newest if desired for chart
  // Or keep as is for newest to oldest depending on chart library's preferred order.
  // The current logic in salespage.html for Chart.js usually expects oldest on left, newest on right,
  // so reversing the loop and `push`ing will naturally give that order.

  return result.reverse(); // Reverse to show from oldest month to newest
}
/**
 * Calculates total sales, VAT, and grand total from the entire salesbook.
 * @returns {Object} An object containing totalSales, totalVat, and grandTotal.
 */
function getTotalSalesSummary() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName("salesbook");
  if (!sheet) {
    throw new Error("Sheet 'salesbook' not found");
  }
  const data = sheet.getRange("G2:I" + sheet.getLastRow()).getValues();
  let totalSales = 0;
  let totalVat = 0;
  let grandTotal = 0;
  data.forEach(row => {
    totalSales += Number(row[0]) || 0; // Sales
    totalVat += Number(row[1]) || 0; // VAT
    grandTotal += Number(row[2]) || 0; // Total
  });
  return {
    totalSales: totalSales,
    totalVat: totalVat,
    grandTotal: grandTotal
  };
}
