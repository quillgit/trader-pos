function doGet(e) {
  const type = e.parameter.type;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  if (type === 'masters') {
    return ContentService.createTextOutput(JSON.stringify({
      products: getSheetData(ss, 'masters_products'),
      partners: getSheetData(ss, 'masters_partners'),
      employees: getSheetData(ss, 'employees')
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  return ContentService.createTextOutput(JSON.stringify({status: 'ok', msg: 'Service Active'}));
}

function doPost(e) {
  // Lock to prevent concurrency
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', error: 'Server Busy'}));
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data.action === 'create' && data.type === 'transaction') {
       writeTransaction(ss, data.payload);
    } else if (data.action === 'create' && data.type === 'master') {
       // Logic to append to masters
    }
    
    return ContentService.createTextOutput(JSON.stringify({status: 'success', id: data.payload.id}));
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({status: 'error', error: err.toString()}));
  } finally {
    lock.releaseLock();
  }
}

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift(); // Remove headers
  
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function writeTransaction(ss, trx) {
  // Determine if Purchase or Sale
  const sheetName = trx.type === 'PURCHASE' ? 'trx_purchases' : 'trx_sales';
  let sheet = ss.getSheetByName(sheetName);
  
  // If sheet doesn't exist, create it
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(['id', 'date', 'type', 'partner_id', 'partner_name', 'items_json', 'total', 'created_by']);
  }
  
  sheet.appendRow([
    trx.id,
    trx.date,
    trx.type,
    trx.partner_id,
    trx.partner_name,
    JSON.stringify(trx.items),
    trx.total_amount,
    trx.created_by
  ]);
}
