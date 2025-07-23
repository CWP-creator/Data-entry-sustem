function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getClientNames() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Clients');
  const names = sheet.getRange('A2:A' + sheet.getLastRow()).getValues().flat();
  return names.filter(name => name); // Remove empty values
}

function submitSalesEntry(data) {
  try {
    const sheet = SpreadsheetApp.getActive().getSheetByName('Sales Entry');
    if (!sheet) throw new Error('Sheet "Sales Entry" not found.');

    sheet.appendRow([
      data.sn,
      data.billNumber,
      data.dateAD,
      data.dateBS,
      data.clientName,
      data.panNumber,
      parseFloat(data.amount),
      parseFloat(data.vatAmount),
      parseFloat(data.total)
    ]);
  } catch (err) {
    throw new Error("Couldn't save data: " + err.message);
  }
}


function getRecentSales() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Sales Entry');
  const lastRow = sheet.getLastRow();
  const numRows = 5;
  const startRow = Math.max(2, lastRow - numRows + 1); // Skip header
  const data = sheet.getRange(startRow, 1, lastRow - startRow + 1, 5).getValues();
  return data.reverse(); // Show latest first
}
function getNextSN() {
  const sheet = SpreadsheetApp.getActive().getSheetByName('Sales Entry');
  const lastRow = sheet.getLastRow();

  if (lastRow < 2) return 1; // No data, start from 1

  const lastSN = sheet.getRange(lastRow, 1).getValue(); // Column A = SN
  return Number(lastSN) + 1;
}

