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

  // Handle Transaction Pull (Multi-Device Sync)
  if (action === 'pull_transactions') {
    const since = e.parameter.since; // Optional timestamp filter
    return jsonResponse({
      sales: getSheetData(ss, 'trx_sales', since),
      purchases: getSheetData(ss, 'trx_purchases', since),
      expenses: getSheetData(ss, 'trx_expenses', since),
      sessions: getSheetData(ss, 'trx_sessions', since)
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
    const actionParam = e && e.parameter && e.parameter.action ? e.parameter.action : '';
    const data = JSON.parse(e.postData.contents);
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (actionParam === 'verify_license') {
      const key = data && data.key ? String(data.key) : '';
      return jsonResponse(handleVerifyLicense(ss, key));
    }
    if (actionParam === 'license_status') {
      const key = data && data.key ? String(data.key) : '';
      return jsonResponse(handleLicenseStatus(ss, key));
    }
    if (actionParam === 'register_device') {
      const key = data && data.key ? String(data.key) : '';
      const deviceId = data && data.device_id ? String(data.device_id) : '';
      const info = data && data.info ? data.info : {};
      return jsonResponse(handleRegisterDevice(ss, key, deviceId, info));
    }
    if (actionParam === 'heartbeat') {
      const key = data && data.key ? String(data.key) : '';
      const deviceId = data && data.device_id ? String(data.device_id) : '';
      return jsonResponse(handleHeartbeat(ss, key, deviceId));
    }
    if (actionParam === 'revoke_device') {
      const key = data && data.key ? String(data.key) : '';
      const deviceId = data && data.device_id ? String(data.device_id) : '';
      return jsonResponse(handleRevokeDevice(ss, key, deviceId));
    }
    if (actionParam === 'list_license') {
      const key = data && data.key ? String(data.key) : '';
      return jsonResponse(handleListLicense(ss, key));
    }

    if (actionParam === 'add_license') {
       const key = data && data.key ? String(data.key) : '';
       const plan = data && data.plan ? String(data.plan) : 'standard';
       const expiry = data && data.expiry ? String(data.expiry) : '';
       
       if (!key) return jsonResponse({ status: 'error', message: 'Missing key' });
       
       const rec = {
         key: key,
         status: computeStatus(expiry),
         plan: plan,
         expiry: expiry,
         created_at: new Date().toISOString(),
         last_checked: new Date().toISOString()
       };
       return jsonResponse(upsertLicense(ss, rec));
    }
    
    // One-Click Bootstrap: initialize all required sheets with headers
    if (data && data.action === 'bootstrap') {
      bootstrapSheets(ss);
      return jsonResponse({ status: 'success', message: 'Bootstrap complete' });
    }
    
    if (Array.isArray(data)) {
      data.forEach(function(entry) {
        if (entry.action === 'create' || entry.action === 'update') {
          handleWrite(ss, entry);
        }
      });
    } else {
      if (data.action === 'create' || data.action === 'update') {
         handleWrite(ss, data);
      }
    }
    
    return jsonResponse({status: 'success'});
  } catch (err) {
    return jsonResponse({status: 'error', error: err.toString()});
  } finally {
    lock.releaseLock();
  }
}

const LICENSE_SHEET = 'licenses';
const LICENSE_DEFAULT_PLAN = 'standard';
const LICENSE_VALID_PREFIX = 'CT-';
const LICENSE_DEFAULT_EXPIRY_DAYS = 365;
const LICENSE_DEVICE_SHEET = 'license_devices';
const LICENSE_LOG_SHEET = 'license_logs';
const LICENSE_MAX_DEVICES_DEFAULT = 3;

function ensureLicenseSheet(ss) {
  let sheet = ss.getSheetByName(LICENSE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LICENSE_SHEET);
    sheet.appendRow(['key','status','plan','expiry','created_at','last_checked']);
  } else {
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const required = ['key','status','plan','expiry','created_at','last_checked'];
    const missing = required.filter(function(h){ return headers.indexOf(h) === -1; });
    if (missing.length > 0) {
      const newHeaders = headers.concat(missing);
      sheet.getRange(1,1,1,newHeaders.length).setValues([newHeaders]);
    }
  }
}

function findLicenseRow(ss, key) {
  const sheet = ss.getSheetByName(LICENSE_SHEET);
  if (!sheet) return { row: -1, record: null };
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const idxKey = headers.indexOf('key');
  const idxStatus = headers.indexOf('status');
  const idxPlan = headers.indexOf('plan');
  const idxExpiry = headers.indexOf('expiry');
  const idxCreated = headers.indexOf('created_at');
  const idxChecked = headers.indexOf('last_checked');
  for (var i = 0; i < data.length; i++) {
    var row = data[i];
    if (String(row[idxKey]) === key) {
      return {
        row: i + 2,
        record: {
          key: String(row[idxKey]),
          status: String(row[idxStatus] || ''),
          plan: String(row[idxPlan] || ''),
          expiry: String(row[idxExpiry] || ''),
          created_at: String(row[idxCreated] || ''),
          last_checked: String(row[idxChecked] || '')
        }
      };
    }
  }
  return { row: -1, record: null };
}

function computeStatus(expiry) {
  if (!expiry) return 'invalid';
  var d = new Date(expiry);
  if (isNaN(d.getTime())) return 'invalid';
  var now = new Date();
  if (d.getTime() >= now.getTime()) return 'active';
  return 'expired';
}

function upsertLicense(ss, rec) {
  ensureLicenseSheet(ss);
  const sheet = ss.getSheetByName(LICENSE_SHEET);
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idxKey = headers.indexOf('key');
  const idxStatus = headers.indexOf('status');
  const idxPlan = headers.indexOf('plan');
  const idxExpiry = headers.indexOf('expiry');
  const idxCreated = headers.indexOf('created_at');
  const idxChecked = headers.indexOf('last_checked');
  const found = findLicenseRow(ss, rec.key);
  if (found.row > 1) {
    sheet.getRange(found.row, idxStatus + 1).setValue(rec.status);
    sheet.getRange(found.row, idxPlan + 1).setValue(rec.plan);
    sheet.getRange(found.row, idxExpiry + 1).setValue(rec.expiry);
    sheet.getRange(found.row, idxChecked + 1).setValue(rec.last_checked);
    return rec;
  } else {
    var nowIso = new Date().toISOString();
    sheet.appendRow([rec.key, rec.status, rec.plan, rec.expiry, nowIso, rec.last_checked]);
    return rec;
  }
}

function handleVerifyLicense(ss, key) {
  const clean = String(key || '').trim();
  if (!clean || clean.length < 5) {
    return { status: 'invalid', plan: LICENSE_DEFAULT_PLAN, message: 'Invalid license key format' };
  }
  ensureLicenseSheet(ss);
  const existing = findLicenseRow(ss, clean);
  if (existing.record) {
    var status = computeStatus(existing.record.expiry);
    var rec = {
      key: existing.record.key,
      status: status,
      plan: existing.record.plan || LICENSE_DEFAULT_PLAN,
      expiry: existing.record.expiry,
      last_checked: new Date().toISOString()
    };
    upsertLicense(ss, rec);
    return rec;
  }
  if (clean.indexOf(LICENSE_VALID_PREFIX) === 0 || clean.length >= 8) {
    var exp = new Date();
    exp.setDate(exp.getDate() + LICENSE_DEFAULT_EXPIRY_DAYS);
    var rec2 = {
      key: clean,
      status: 'active',
      plan: clean.indexOf('PRO') !== -1 ? 'premium' : LICENSE_DEFAULT_PLAN,
      expiry: exp.toISOString(),
      last_checked: new Date().toISOString()
    };
    upsertLicense(ss, rec2);
    return rec2;
  }
  return { status: 'invalid', plan: LICENSE_DEFAULT_PLAN, message: 'License key not recognized' };
}

function handleLicenseStatus(ss, key) {
  const clean = String(key || '').trim();
  if (!clean) return { status: 'none', plan: LICENSE_DEFAULT_PLAN };
  ensureLicenseSheet(ss);
  const existing = findLicenseRow(ss, clean);
  if (!existing.record) return { status: 'invalid', plan: LICENSE_DEFAULT_PLAN, message: 'Not found' };
  var status = computeStatus(existing.record.expiry);
  var rec = {
    key: existing.record.key,
    status: status,
    plan: existing.record.plan || LICENSE_DEFAULT_PLAN,
    expiry: existing.record.expiry,
    last_checked: new Date().toISOString()
  };
  upsertLicense(ss, rec);
  return rec;
}

function ensureDeviceSheet(ss) {
  let sheet = ss.getSheetByName(LICENSE_DEVICE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LICENSE_DEVICE_SHEET);
    sheet.appendRow(['key','device_id','status','registered_at','last_seen','user_agent','platform','ip']);
  }
}

function ensureLogSheet(ss) {
  let sheet = ss.getSheetByName(LICENSE_LOG_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(LICENSE_LOG_SHEET);
    sheet.appendRow(['timestamp','key','device_id','event','details']);
  }
}

function handleRegisterDevice(ss, key, deviceId, info) {
  const cleanKey = String(key || '').trim();
  const cleanDev = String(deviceId || '').trim();
  if (!cleanKey || !cleanDev) return { status: 'error', message: 'Missing key or device_id' };
  const lic = findLicenseRow(ss, cleanKey);
  if (!lic.record) return { status: 'error', message: 'License not found' };
  if (computeStatus(lic.record.expiry) !== 'active') return { status: 'error', message: 'License inactive' };
  ensureDeviceSheet(ss);
  const sheet = ss.getSheetByName(LICENSE_DEVICE_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const idxKey = headers.indexOf('key');
  const idxDev = headers.indexOf('device_id');
  const idxStatus = headers.indexOf('status');
  const idxReg = headers.indexOf('registered_at');
  const idxSeen = headers.indexOf('last_seen');
  const idxUA = headers.indexOf('user_agent');
  const idxPlat = headers.indexOf('platform');
  const idxIp = headers.indexOf('ip');
  var countActive = 0;
  var foundRow = -1;
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (String(r[idxKey]) === cleanKey && String(r[idxStatus]) === 'active') countActive++;
    if (String(r[idxKey]) === cleanKey && String(r[idxDev]) === cleanDev) foundRow = i + 2;
  }
  var limit = lic.record.plan === 'premium' ? 5 : LICENSE_MAX_DEVICES_DEFAULT;
  if (foundRow === -1 && countActive >= limit) return { status: 'error', message: 'Device limit reached', limit: limit };
  var nowIso = new Date().toISOString();
  var ua = info && info.userAgent ? String(info.userAgent) : '';
  var plat = info && info.platform ? String(info.platform) : '';
  var ip = info && info.ip ? String(info.ip) : '';
  if (foundRow > 1) {
    sheet.getRange(foundRow, idxStatus + 1).setValue('active');
    sheet.getRange(foundRow, idxSeen + 1).setValue(nowIso);
    sheet.getRange(foundRow, idxUA + 1).setValue(ua);
    sheet.getRange(foundRow, idxPlat + 1).setValue(plat);
    sheet.getRange(foundRow, idxIp + 1).setValue(ip);
  } else {
    sheet.appendRow([cleanKey, cleanDev, 'active', nowIso, nowIso, ua, plat, ip]);
  }
  ensureLogSheet(ss);
  var logSheet = ss.getSheetByName(LICENSE_LOG_SHEET);
  logSheet.appendRow([nowIso, cleanKey, cleanDev, 'register_device', JSON.stringify(info || {})]);
  return { status: 'success', limit: limit };
}

function handleHeartbeat(ss, key, deviceId) {
  const cleanKey = String(key || '').trim();
  const cleanDev = String(deviceId || '').trim();
  if (!cleanKey || !cleanDev) return { status: 'error', message: 'Missing key or device_id' };
  ensureDeviceSheet(ss);
  const sheet = ss.getSheetByName(LICENSE_DEVICE_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const idxKey = headers.indexOf('key');
  const idxDev = headers.indexOf('device_id');
  const idxSeen = headers.indexOf('last_seen');
  var foundRow = -1;
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (String(r[idxKey]) === cleanKey && String(r[idxDev]) === cleanDev) {
      foundRow = i + 2;
      break;
    }
  }
  var nowIso = new Date().toISOString();
  if (foundRow > 1) {
    sheet.getRange(foundRow, idxSeen + 1).setValue(nowIso);
  }
  ensureLogSheet(ss);
  var logSheet = ss.getSheetByName(LICENSE_LOG_SHEET);
  logSheet.appendRow([nowIso, cleanKey, cleanDev, 'heartbeat', '']);
  return { status: 'success' };
}

function handleRevokeDevice(ss, key, deviceId) {
  const cleanKey = String(key || '').trim();
  const cleanDev = String(deviceId || '').trim();
  if (!cleanKey || !cleanDev) return { status: 'error', message: 'Missing key or device_id' };
  ensureDeviceSheet(ss);
  const sheet = ss.getSheetByName(LICENSE_DEVICE_SHEET);
  const data = sheet.getDataRange().getValues();
  const headers = data.shift();
  const idxKey = headers.indexOf('key');
  const idxDev = headers.indexOf('device_id');
  const idxStatus = headers.indexOf('status');
  var foundRow = -1;
  for (var i = 0; i < data.length; i++) {
    var r = data[i];
    if (String(r[idxKey]) === cleanKey && String(r[idxDev]) === cleanDev) {
      foundRow = i + 2;
      break;
    }
  }
  if (foundRow === -1) return { status: 'error', message: 'Device not found' };
  sheet.getRange(foundRow, idxStatus + 1).setValue('revoked');
  ensureLogSheet(ss);
  var logSheet = ss.getSheetByName(LICENSE_LOG_SHEET);
  logSheet.appendRow([new Date().toISOString(), cleanKey, cleanDev, 'revoke_device', '']);
  return { status: 'success' };
}

function handleListLicense(ss, key) {
  const cleanKey = String(key || '').trim();
  ensureLicenseSheet(ss);
  ensureDeviceSheet(ss);
  const lic = findLicenseRow(ss, cleanKey).record;
  const deviceSheet = ss.getSheetByName(LICENSE_DEVICE_SHEET);
  var devices = [];
  if (deviceSheet) {
    const data = deviceSheet.getDataRange().getValues();
    const headers = data.shift();
    const idxKey = headers.indexOf('key');
    for (var i = 0; i < data.length; i++) {
      var r = data[i];
      if (String(r[idxKey]) === cleanKey) {
        var obj = {};
        headers.forEach(function(h, j){ obj[h] = r[j]; });
        devices.push(obj);
      }
    }
  }
  return { license: lic || null, devices: devices };
}
function bootstrapSheets(ss) {
  // Masters
  ensureSheetWithHeaders(ss, 'master_products', ['id','name','unit','category','price_buy','price_sell','updated_at']);
  ensureSheetWithHeaders(ss, 'master_partners', ['id','name','type','is_supplier','is_customer','sub_type','phone','address','updated_at']);
  ensureSheetWithHeaders(ss, 'master_employees', ['id','name','pin','role','salary_frequency','base_salary','updated_at']);
  
  // Transactions
  ensureSheetWithHeaders(ss, 'trx_sales', [
    'id','date','type',
    'partner_id','partner_name',
    'total_amount','paid_amount','change_amount',
    'currency','reference_id','cash_session_id',
    'sync_status','created_by','notes','raw_json','payment_method'
  ]);
  ensureSheetWithHeaders(ss, 'trx_purchases', [
    'id','date','type',
    'partner_id','partner_name',
    'total_amount','paid_amount','change_amount',
    'currency','reference_id','cash_session_id',
    'sync_status','created_by','notes','raw_json','payment_method'
  ]);
  ensureSheetWithHeaders(ss, 'trx_lines', [
    'transaction_id','item_id','item_name','qty','unit','unit_price','subtotal'
  ]);
  ensureSheetWithHeaders(ss, 'trx_expenses', ['id','date','category','amount','currency','description','created_by','session_id','raw_json']);
  ensureSheetWithHeaders(ss, 'trx_sessions', ['id','date','status','start_amount','end_amount','created_by','closed_by','raw_json','transactions_count','expenses_count']);
  
  // HRIS
  ensureSheetWithHeaders(ss, 'hris_attendance', ['id','employee_id','timestamp','type','sync_status']);
  
  // Settings
  ensureSheetWithHeaders(ss, 'app_settings', ['key','value']);
}

function ensureSheetWithHeaders(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  // Write headers only if empty or first row different
  const lastRow = sheet.getLastRow();
  if (lastRow === 0) {
    sheet.appendRow(headers);
  } else {
    const existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const needUpdate = headers.some(function(h){ return existingHeaders.indexOf(h) === -1; });
    if (needUpdate) {
      const newHeaders = existingHeaders.concat(headers.filter(function(h){ return existingHeaders.indexOf(h) === -1; }));
      sheet.getRange(1,1,1,newHeaders.length).setValues([newHeaders]);
    }
  }
}

function handleWrite(ss, data) {
  const type = data.type;
  const payload = data.payload;
  let sheetName = '';
  
  // Map types to sheet names
  if (type === 'transaction') {
    var t = payload.type;
    if (t === 'PURCHASE' || t === 'PAYMENT_OUT') {
      sheetName = 'trx_purchases';
    } else if (t === 'SALE' || t === 'PAYMENT_IN') {
      sheetName = 'trx_sales';
    } else {
      sheetName = 'trx_sales';
    }
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
       sheet.appendRow([
         'id','date','type',
         'partner_id','partner_name',
         'total_amount','paid_amount','change_amount',
         'currency','reference_id','cash_session_id',
         'sync_status','created_by','notes','raw_json'
       ]);
    } else if (sheetName === 'trx_expenses') {
       sheet.appendRow(['id', 'date', 'category', 'amount', 'currency', 'description', 'created_by', 'session_id', 'raw_json']);
    } else if (sheetName === 'trx_sessions') {
       sheet.appendRow(['id', 'date', 'status', 'start_amount', 'end_amount', 'created_by', 'closed_by', 'raw_json']);
    } else if (sheetName.startsWith('master_')) {
       // Generic master headers - could be dynamic but better to be checking
       const keys = Object.keys(payload);
       sheet.appendRow(keys);
    }
  } else {
    // Ensure required headers exist; append missing to end of header row
    var existingHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    var required = [];
    if (sheetName === 'trx_sales' || sheetName === 'trx_purchases') {
      required = [
        'id','date','type',
        'partner_id','partner_name',
        'total_amount','paid_amount','change_amount',
        'currency','reference_id','cash_session_id',
        'sync_status','created_by','notes','raw_json'
      ];
    } else if (sheetName === 'trx_expenses') {
      required = ['id','date','category','amount','currency','description','created_by','session_id','raw_json'];
    } else if (sheetName === 'trx_sessions') {
      required = ['id','date','status','start_amount','end_amount','created_by','closed_by','raw_json'];
    }
    var missing = required.filter(function(h){ return existingHeaders.indexOf(h) === -1; });
    if (missing.length > 0) {
      var newHeaders = existingHeaders.concat(missing);
      sheet.getRange(1,1,1,newHeaders.length).setValues([newHeaders]);
    }
  }
  
  // For masters, check if ID exists to update, else append
  // For transactions, usually just append.
  
  // Simple Append Implementation for MVP
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const row = headers.map(function(h) {
    if (h === 'raw_json') return JSON.stringify(payload || {});
    return payload[h] !== undefined ? payload[h] : '';
  });
  
  sheet.appendRow(row);
  
  if ((sheetName === 'trx_sales' || sheetName === 'trx_purchases') && Array.isArray(payload.items)) {
    appendTransactionLines(ss, payload.id, payload.items);
  }
}

function appendTransactionLines(ss, transactionId, items) {
  var sheet = ss.getSheetByName('trx_lines');
  if (!sheet) {
    sheet = ss.insertSheet('trx_lines');
    sheet.appendRow(['transaction_id','item_id','item_name','qty','unit','unit_price','subtotal']);
  }
  var rows = items.map(function(it) {
    var qty = Number(it.qty || it.quantity || 0);
    var price = Number(it.unit_price || it.price || 0);
    var subtotal = it.subtotal !== undefined ? Number(it.subtotal) : qty * price;
    return [
      transactionId,
      it.item_id || it.product_id || it.id || '',
      it.item_name || it.product_name || it.name || '',
      qty,
      it.unit || '',
      price,
      subtotal
    ];
  });
  if (rows.length > 0) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
  }
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
