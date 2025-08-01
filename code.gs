
function submitVatEntry(data) {
  if (!VAT_NO_SPREADSHEET_ID) {
    throw new Error("VAT_NO_SPREADSHEET_ID is not configured. Please update code.gs with your VAT NO Spreadsheet ID.");
  }

  // Validate input data
  if (!data.sn || !data.panNumber || !data.name) {
    throw new Error("Missing required fields: SN, PAN Number, and Name are all required.");
  }

  if (String(data.panNumber).trim().length < 9) {
    throw new Error("PAN Number must be at least 9 characters long.");
  }

  if (String(data.name).trim().length < 2) {
    throw new Error("Name must be at least 2 characters long.");
  }

  try {
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

    // Clean the data
    const cleanSn = Number(data.sn);
    const cleanPan = String(data.panNumber).trim();
    const cleanName = String(data.name).trim();

    // 1. Save to "database" sheet in the external "VAT NO" spreadsheet
    vatNoSheet.appendRow([cleanSn, cleanPan, cleanName]);
    Logger.log(`Saved VAT entry to external 'VAT NO' spreadsheet, sheet 'database'. SN: ${cleanSn}, PAN: ${cleanPan}, Name: ${cleanName}`);
    
    // 2. Update/Add to "Clients" sheet in the active spreadsheet
    const lastClientRow = clientsSheet.getLastRow();
    const clientPans = (lastClientRow > 1) ? clientsSheet.getRange(2, 2, lastClientRow - 1, 1).getValues() : [];
    
    let foundRow = -1;
    for (let i = 0; i < clientPans.length; i++) {
      if (String(clientPans[i][0]).trim() === cleanPan) {
        foundRow = i + 2; // +2 because arrays are 0-indexed but sheets are 1-indexed, and we skip header
        break;
      }
    }

    if (foundRow !== -1) {
      // Update existing client name if different
      const existingName = String(clientsSheet.getRange(foundRow, 3).getValue()).trim();
      if (existingName !== cleanName) {
        clientsSheet.getRange(foundRow, 3).setValue(cleanName);
        Logger.log(`Updated name for PAN ${cleanPan} in Clients sheet (active spreadsheet).`);
      }
    } else {
      // Add new client
      clientsSheet.appendRow([cleanSn, cleanPan, cleanName]);
      Logger.log(`Added new client/supplier for PAN ${cleanPan} to Clients sheet (active spreadsheet).`);
    }

    return {
      success: true,
      message: "VAT entry saved and client data updated successfully!"
    };
    
  } catch (error) {
    Logger.log("Error in submitVatEntry: " + error.message);
    return {
      success: false,
      error: error.message
    };
  }
}