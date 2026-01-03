function doGet(e) {
  const action = e.parameter.action;
  const type = e.parameter.type;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  // Handle Master Data Fetching
  if (action === 'getMaster' || type) { // Fallback for old calls
    if (type === 'product') return jsonResponse(getSheetData(ss, 'master_products'));
    if (type === 'partner') return jsonResponse(getSheetData(ss, 'master_partners'));
    if (type === 'employee') return jsonResponse(getSheetData(ss, 'master_employees'));
    if (type === 'settings') return jsonResponse(getSettings(ss));
    
    // Return all if no specific type? Or just basic ones.
    return jsonResponse({
      products: getSheetData(ss, 'master_products'),
      partners: getSheetData(ss, 'master_partners'),
      employees: getSheetData(ss, 'master_employees'),
      settings: getSettings(ss)
    });
  }
  
  return jsonResponse({status: 'ok', msg: 'Service Active v2'});
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
  } catch (e) {
    return jsonResponse({status: 'error', error: 'Server Busy'});
  }

  try {
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    
    if (data.action === 'create' || data.action === 'update') {
       handleWrite(ss, data);
    } // sync queue might send array?
    
    return jsonResponse({status: 'success'});
  } catch (err) {
    return jsonResponse({status: 'error', error: err.toString()});
  } finally {
    lock.releaseLock();
  }
}

function handleWrite(ss, data) {
  const type = data.type;
  const payload = data.payload;
  let sheetName = '';
  
  // Map types to sheet names
  if (type === 'transaction') {
    sheetName = payload.type === 'PURCHASE' ? 'trx_purchases' : 'trx_sales';
  } else if (type === 'expense') {
    sheetName = 'trx_expenses';
  } else if (type === 'session') {
    sheetName = 'trx_sessions';
  } else if (type === 'partner') {
    sheetName = 'master_partners';
  } else if (type === 'product') {
    sheetName = 'master_products';
  } else if (type === 'employee') {
    sheetName = 'master_employees';
  } else if (type === 'settings') {
    handleSettingsWrite(ss, payload);
    return;
  }

  if (!sheetName) throw new Error('Unknown Type: ' + type);

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    // Initialize headers based on type
    if (sheetName === 'trx_sales' || sheetName === 'trx_purchases') {
       sheet.appendRow(['id', 'date', 'type', 'partner_id', 'partner_name', 'items_json', 'total', 'created_by']);
    } else if (sheetName === 'trx_expenses') {
       sheet.appendRow(['id', 'date', 'category', 'amount', 'description', 'created_by', 'session_id']);
    } else if (sheetName === 'trx_sessions') {
       sheet.appendRow(['id', 'date', 'status', 'start_amount', 'end_amount', 'created_by', 'closed_by']);
    } else if (sheetName.startsWith('master_')) {
       // Generic master headers - could be dynamic but better to be checking
       const keys = Object.keys(payload);
       sheet.appendRow(keys);
    }
  }
  
  // For masters, check if ID exists to update, else append
  // For transactions, usually just append.
  
  // Simple Append Implementation for MVP
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(h => {
    if (h === 'items_json') return JSON.stringify(payload.items);
    return payload[h] || '';
  });
  
  sheet.appendRow(row);
}

function getSettings(ss) {
  const sheet = ss.getSheetByName('app_settings');
  if (!sheet) return {};
  const data = sheet.getDataRange().getValues();
  const settings = {};
  // Assuming Key-Value pairs in columns A and B
  data.forEach(row => {
    if (row[0]) settings[row[0]] = row[1];
  });
  return settings;
}

function handleSettingsWrite(ss, payload) {
  let sheet = ss.getSheetByName('app_settings');
  if (!sheet) {
    sheet = ss.insertSheet('app_settings');
    sheet.appendRow(['key', 'value']);
  }
  
  // Clear existing settings or update? Clear and rewrite is simpler for full sync
  sheet.clear();
  sheet.appendRow(['key', 'value']);
  
  const rows = Object.keys(payload).map(k => [k, payload[k]]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, 2).setValues(rows);
  }
}

function getSheetData(ss, sheetName) {
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];
  const rows = sheet.getDataRange().getValues();
  const headers = rows.shift();
  return rows.map(row => {
    let obj = {};
    headers.forEach((h, i) => obj[h] = row[i]);
    return obj;
  });
}

function jsonResponse(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}
