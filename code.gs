function doGet(e) {
  // Create a template from the main index.html file
  const template = HtmlService.createTemplateFromFile('index');

  // Evaluate the template to process the <?!= ... ?> tags
  return template.evaluate()
      .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// *** IMPORTANT: REPLACE 'YOUR_VAT_NO_SPREADSHEET_ID_HERE' WITH THE ACTUAL ID OF YOUR "VAT NO" GOOGLE SHEET FILE ***
// You can find the Spreadsheet ID in the URL of your Google Sheet. It's the long string of characters between /d/ and /edit.
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
  const salesAmount = Number(data.amount.replace(/,/g, ""));
  const vatAmount = Number(data.vatAmount.replace(/,/g, ""));
  const totalAmount = Number(data.total.replace(/,/g, ""));

  sheet.appendRow([
    Number(data.sn),           // SN
    Number(data.billNumber),   // Bill no
    data.dateAD,               // English Date
    data.dateBS,               // Nepali Date
    data.clientName,           // Name
    data.panNumber,            // Pan no
    salesAmount,               // Sales
    vatAmount,                 // Vat
    totalAmount                // Total
  ]);
  return { success: true, message: "Sales entry saved!" };
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
    return []; // No data rows
  }

  // Get data from Column C (Name) and Column B (PAN) starting from row 2
  // Range is (startRow, startColumn, numRows, numColumns)
  const clientNames = clientsSheet.getRange(2, 3, lastRow - 1, 1).getValues(); // Column C for Name
  const clientPans = clientsSheet.getRange(2, 2, lastRow - 1, 1).getValues();  // Column B for PAN

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

  // Get all AD dates from Column A and BS dates from Column B
  const adDatesRaw = adToBsSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const bsDatesRaw = adToBsSheet.getRange(2, 2, lastRow - 1, 1).getValues();

  for (let i = 0; i < adDatesRaw.length; i++) {
    const adDateValue = adDatesRaw[i][0];
    const bsDateValue = bsDatesRaw[i][0];

    // Format the AD date from the sheet for comparison
    let sheetAdDateFormatted = null;
    if (adDateValue instanceof Date) {
      sheetAdDateFormatted = Utilities.formatDate(adDateValue, timezone, 'yyyy-MM-dd');
    } else {
      sheetAdDateFormatted = String(adDateValue).trim(); // Treat as string if not a Date object
    }
    
    // Compare the formatted AD date string with the input adDateString
    if (sheetAdDateFormatted === adDateString) {
      // Format the corresponding BS date to YYYY-MM-DD string before returning
      if (bsDateValue instanceof Date) {
        return Utilities.formatDate(bsDateValue, timezone, 'yyyy-MM-dd');
      } else {
        return String(bsDateValue).trim(); // Treat as string if not a Date object
      }
    }
  }

  Logger.log("AD date not found in ADTOBS sheet: " + adDateString);
  return null; // Date not found
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

  // Get all AD dates from Column A and BS dates from Column B
  const adDatesRaw = adToBsSheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const bsDatesRaw = adToBsSheet.getRange(2, 2, lastRow - 1, 1).getValues();

  for (let i = 0; i < bsDatesRaw.length; i++) {
    const adDateValue = adDatesRaw[i][0];
    const bsDateValue = bsDatesRaw[i][0];

    // Format the BS date from the sheet for comparison
    let sheetBsDateFormatted = null;
    if (bsDateValue instanceof Date) {
        sheetBsDateFormatted = Utilities.formatDate(bsDateValue, timezone, 'yyyy-MM-dd');
    } else {
        sheetBsDateFormatted = String(bsDateValue).trim(); // Treat as string if not a Date object
    }

    // Compare the formatted BS date string with the input bsDateString
    if (sheetBsDateFormatted === bsDateString) {
      // Format the corresponding AD date to YYYY-MM-DD string before returning
      if (adDateValue instanceof Date) {
        return Utilities.formatDate(adDateValue, timezone, 'yyyy-MM-dd');
      } else {
        return String(adDateValue).trim(); // Treat as string if not a Date object
      }
    }
  }

  Logger.log("BS date not found in ADTOBS sheet: " + bsDateString);
  return null; // Date not found
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
  if (lastRow < 2) return 1; // No entries yet, start at 1
  const lastSN = sheet.getRange(lastRow, 1).getValue(); // Assuming SN is in Column 1
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

  // Ensure numeric values are parsed correctly and commas are removed
  const purchaseAmount = Number(data.purchaseAmount.replace(/,/g, ""));
  const vatAmount = Number(data.vatAmount.replace(/,/g, ""));
  const totalAmount = Number(data.total.replace(/,/g, ""));

  let nonVat = '';
  let expenses = '';
  let fixedAssets = '';
  let purchase = '';
  let totalTaxable = ''; // This will hold the base amount for VAT calculation

  // Conditional logic based on PurchaseType
  switch (data.purchaseType) {
    case 'Non vat':
      nonVat = purchaseAmount;
      totalTaxable = 0; // For 'Non vat', totalTaxable is 0
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
    case 'Purchase':
      purchase = purchaseAmount;
      totalTaxable = purchaseAmount;
      nonVat = '-';
      expenses = '-';
      fixedAssets = '-';
      break;
    default:
      Logger.log("Warning: Unknown or empty purchaseType: " + data.purchaseType);
      // If purchaseType is not explicitly matched, assume it's a regular purchase
      purchase = purchaseAmount;
      totalTaxable = purchaseAmount;
      nonVat = '-';
      expenses = '-';
      fixedAssets = '-';
      break;
  }

  sheet.appendRow([
    Number(data.sn),             // SN
    Number(data.billNumber),     // Bill no
    data.dateAD,                 // English Date
    data.dateBS,                 // Nepali Date
    data.supplierName,           // Name
    data.supplierPanNumber,      // Pan no
    nonVat,                      // Non vat
    expenses,                    // Expenses
    fixedAssets,                 // Fixed assets
    purchase,                    // Purchase
    data.purchaseType,           // PurchaseType
    totalTaxable,                // Total taxable (this is the base amount for VAT)
    vatAmount,                   // Vat
    totalAmount                  // Total
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
  const sheet = externalSs.getSheetByName('database'); // Assuming a sheet named "database" within "VAT NO" spreadsheet
  
  if (!sheet) {
    Logger.log("Error: 'database' sheet not found in external 'VAT NO' spreadsheet for SN generation.");
    throw new Error("The 'database' sheet was not found in the external 'VAT NO' spreadsheet. Cannot generate SN.");
  }

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 1; // No entries yet, start at 1
  
  // Assuming SN is in Column 1 (A)
  const lastSN = sheet.getRange(lastRow, 1).getValue();
  return (Number(lastSN) || 0) + 1;
}

/**
 * Looks up a client's name by their PAN number in the "Clients" sheet (in the active spreadsheet).
 * @param {string} pan - The PAN number to search for.
 * @return {string|null} The client's name if found, otherwise null.
 */
function getClientNameByPan(pan) {
  const ss = SpreadsheetApp.getActiveSpreadsheet(); // This looks in the active spreadsheet
  const clientsSheet = ss.getSheetByName("Clients");

  if (!clientsSheet) {
    Logger.log("Error: Clients sheet not found for PAN lookup.");
    throw new Error("Clients sheet not found. Cannot lookup PAN.");
  }

  const lastRow = clientsSheet.getLastRow();
  if (lastRow < 2) {
    return null; // No data rows to search
  }

  // Get all PANs from Column B and Names from Column C
  const panNumbers = clientsSheet.getRange(2, 2, lastRow - 1, 1).getValues(); // Column B for PAN
  const clientNames = clientsSheet.getRange(2, 3, lastRow - 1, 1).getValues(); // Column C for Name

  for (let i = 0; i < panNumbers.length; i++) {
    // Ensure both PAN from sheet and input PAN are treated as strings for accurate comparison
    if (String(panNumbers[i][0]).trim() === String(pan).trim()) {
      return clientNames[i][0] ? String(clientNames[i][0]).trim() : null;
    }
  }
  return null; // PAN not found
}

/**
 * Submits VAT entry data. Saves to "database" sheet in external "VAT NO" spreadsheet
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
  
  const activeSs = SpreadsheetApp.getActiveSpreadsheet(); // For Clients sheet
  const clientsSheet = activeSs.getSheetByName("Clients");

  const externalSs = SpreadsheetApp.openById(VAT_NO_SPREADSHEET_ID); // Open external VAT NO spreadsheet
  const vatNoSheet = externalSs.getSheetByName("database"); // Get 'database' sheet from it

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
    String(data.panNumber).trim(), // Ensure PAN is stored as string
    String(data.name).trim() // Ensure Name is stored as string
  ]);
  Logger.log(`Saved VAT entry to external 'VAT NO' spreadsheet, sheet 'database'. SN: ${data.sn}, PAN: ${data.panNumber}, Name: ${data.name}`);


  // 2. Update/Add to "Clients" sheet in the active spreadsheet
  const clientPans = clientsSheet.getRange(2, 2, clientsSheet.getLastRow() - 1, 1).getValues(); // Column B
  let foundRow = -1;
  for (let i = 0; i < clientPans.length; i++) {
    // Compare PAN numbers as strings
    if (String(clientPans[i][0]).trim() === String(data.panNumber).trim()) {
      foundRow = i + 2; // +2 because getRange is 0-indexed relative to start, and data starts from row 2
      break;
    }
  }

  if (foundRow !== -1) {
    // PAN found, update existing name if different
    const existingName = String(clientsSheet.getRange(foundRow, 3).getValue()).trim(); // Column C
    if (existingName !== String(data.name).trim()) {
      clientsSheet.getRange(foundRow, 3).setValue(String(data.name).trim()); // Update name
      Logger.log(`Updated name for PAN ${data.panNumber} in Clients sheet (active spreadsheet).`);
    }
  } else {
    // PAN not found, add new entry to Clients sheet
    // Assumes new entries go to the end, and columns are B for PAN, C for Name
    // Assuming Column A is not used or can be left empty for new client entries.
    clientsSheet.appendRow(['', String(data.panNumber).trim(), String(data.name).trim()]);
    Logger.log(`Added new client/supplier for PAN ${data.panNumber} to Clients sheet (active spreadsheet).`);
  }

  return { success: true, message: "VAT entry saved and client data updated!" };
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