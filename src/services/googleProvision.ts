const CODE_GS = `function doGet(e){const action=e.parameter.action;const type=e.parameter.type;const ss=SpreadsheetApp.getActiveSpreadsheet();if(action==='getMaster'||type){if(type==='product')return jsonResponse(getSheetData(ss,'master_products'));if(type==='partner')return jsonResponse(getSheetData(ss,'master_partners'));if(type==='employee')return jsonResponse(getSheetData(ss,'master_employees'));if(type==='settings')return jsonResponse(getSettings(ss));return jsonResponse({products:getSheetData(ss,'master_products'),partners:getSheetData(ss,'master_partners'),employees:getSheetData(ss,'master_employees'),settings:getSettings(ss)});}return jsonResponse({status:'ok',msg:'Service Active v2'});}function doPost(e){const lock=LockService.getScriptLock();try{lock.waitLock(10000);}catch(e){return jsonResponse({status:'error',error:'Server Busy'});}try{const data=JSON.parse(e.postData.contents);const ss=SpreadsheetApp.getActiveSpreadsheet();if(data&&data.action==='bootstrap'){bootstrapSheets(ss);return jsonResponse({status:'success',message:'Bootstrap complete'});}if(Array.isArray(data)){data.forEach(function(entry){if(entry.action==='create'||entry.action==='update'){handleWrite(ss,entry);}});}else{if(data.action==='create'||data.action==='update'){handleWrite(ss,data);}}return jsonResponse({status:'success'});}catch(err){return jsonResponse({status:'error',error:err.toString()});}finally{lock.releaseLock();}}function handleWrite(ss,data){const type=data.type;const payload=data.payload;let sheetName='';if(type==='transaction'){var t=payload.type;if(t==='PURCHASE'||t==='PAYMENT_OUT'){sheetName='trx_purchases';}else if(t==='SALE'||t==='PAYMENT_IN'){sheetName='trx_sales';}else{sheetName='trx_sales';}}else if(type==='expense'){sheetName='trx_expenses';}else if(type==='session'){sheetName='trx_sessions';}else if(type==='partner'){sheetName='master_partners';}else if(type==='product'){sheetName='master_products';}else if(type==='employee'){sheetName='master_employees';}else if(type==='settings'){handleSettingsWrite(ss,payload);return;}if(!sheetName)throw new Error('Unknown Type: '+type);let sheet=ss.getSheetByName(sheetName);if(!sheet){sheet=ss.insertSheet(sheetName);if(sheetName==='trx_sales'||sheetName==='trx_purchases'){sheet.appendRow(['id','date','type','partner_id','partner_name','items_json','total_amount','paid_amount','change_amount','currency','reference_id','cash_session_id','sync_status','created_by','notes','raw_json']);}else if(sheetName==='trx_expenses'){sheet.appendRow(['id','date','category','amount','currency','description','created_by','session_id','raw_json']);}else if(sheetName==='trx_sessions'){sheet.appendRow(['id','date','status','start_amount','end_amount','created_by','closed_by','raw_json']);}else if(sheetName.startsWith('master_')){const keys=Object.keys(payload);sheet.appendRow(keys);}}else{var existingHeaders=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];var required=[];if(sheetName==='trx_sales'||sheetName==='trx_purchases'){required=['id','date','type','partner_id','partner_name','items_json','total_amount','paid_amount','change_amount','currency','reference_id','cash_session_id','sync_status','created_by','notes','raw_json'];}else if(sheetName==='trx_expenses'){required=['id','date','category','amount','currency','description','created_by','session_id','raw_json'];}else if(sheetName==='trx_sessions'){required=['id','date','status','start_amount','end_amount','created_by','closed_by','raw_json'];}var missing=required.filter(function(h){return existingHeaders.indexOf(h)===-1;});if(missing.length>0){var newHeaders=existingHeaders.concat(missing);sheet.getRange(1,1,1,newHeaders.length).setValues([newHeaders]);}}const headers=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];const row=headers.map(function(h){if(h==='items_json')return JSON.stringify(payload.items||[]);if(h==='raw_json')return JSON.stringify(payload||{});return payload[h]!==undefined?payload[h]:'';});sheet.appendRow(row);}function getSettings(ss){const sheet=ss.getSheetByName('app_settings');if(!sheet)return{};const data=sheet.getDataRange().getValues();const settings={};data.forEach(row=>{if(row[0])settings[row[0]]=row[1];});return settings;}function handleSettingsWrite(ss,payload){let sheet=ss.getSheetByName('app_settings');if(!sheet){sheet=ss.insertSheet('app_settings');sheet.appendRow(['key','value']);}sheet.clear();sheet.appendRow(['key','value']);const rows=Object.keys(payload).map(k=>[k,payload[k]]);if(rows.length>0){sheet.getRange(2,1,rows.length,2).setValues(rows);}}function getSheetData(ss,sheetName){const sheet=ss.getSheetByName(sheetName);if(!sheet)return[];const rows=sheet.getDataRange().getValues();const headers=rows.shift();return rows.map(row=>{let obj={};headers.forEach((h,i)=>obj[h]=row[i]);return obj;});}function jsonResponse(data){return ContentService.createTextOutput(JSON.stringify(data)).setMimeType(ContentService.MimeType.JSON);}function bootstrapSheets(ss){ensureSheetWithHeaders(ss,'master_products',['id','name','unit','category','price_buy','price_sell','updated_at']);ensureSheetWithHeaders(ss,'master_partners',['id','name','type','is_supplier','is_customer','sub_type','phone','address','updated_at']);ensureSheetWithHeaders(ss,'master_employees',['id','name','pin','role','salary_frequency','base_salary','updated_at']);ensureSheetWithHeaders(ss,'trx_sales',['id','date','type','partner_id','partner_name','items_json','total_amount','paid_amount','change_amount','currency','reference_id','cash_session_id','sync_status','created_by','notes','raw_json','payment_method']);ensureSheetWithHeaders(ss,'trx_purchases',['id','date','type','partner_id','partner_name','items_json','total_amount','paid_amount','change_amount','currency','reference_id','cash_session_id','sync_status','created_by','notes','raw_json','payment_method']);ensureSheetWithHeaders(ss,'trx_expenses',['id','date','category','amount','currency','description','created_by','session_id','raw_json']);ensureSheetWithHeaders(ss,'trx_sessions',['id','date','status','start_amount','end_amount','created_by','closed_by','raw_json','transactions_count','expenses_count']);ensureSheetWithHeaders(ss,'hris_attendance',['id','employee_id','timestamp','type','sync_status']);ensureSheetWithHeaders(ss,'app_settings',['key','value']);}function ensureSheetWithHeaders(ss,name,headers){let sheet=ss.getSheetByName(name);if(!sheet){sheet=ss.insertSheet(name);}const lastRow=sheet.getLastRow();if(lastRow===0){sheet.appendRow(headers);}else{const existingHeaders=sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];const needUpdate=headers.some(function(h){return existingHeaders.indexOf(h)===-1;});if(needUpdate){const newHeaders=existingHeaders.concat(headers.filter(function(h){return existingHeaders.indexOf(h)===-1;}));sheet.getRange(1,1,1,newHeaders.length).setValues([newHeaders]);}}}`;

const APPSCRIPT_JSON = `{
  "timeZone": "Etc/UTC",
  "exceptionLogging": "STACKDRIVER",
  "oauthScopes": [
    "https://www.googleapis.com/auth/script.projects",
    "https://www.googleapis.com/auth/script.deployments",
    "https://www.googleapis.com/auth/script.container.ui",
    "https://www.googleapis.com/auth/drive",
    "https://www.googleapis.com/auth/spreadsheets"
  ]
}`;

declare global {
  interface Window {
    gapi: any;
    google: any;
  }
}

async function loadGapi() {
  if (window.gapi) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://apis.google.com/js/api.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load gapi'));
    document.head.appendChild(s);
  });
  await new Promise<void>((resolve) => {
    window.gapi.load('client', () => resolve());
  });
  await window.gapi.client.init({
    discoveryDocs: [
      'https://script.googleapis.com/$discovery/rest?version=v1',
      'https://www.googleapis.com/discovery/v1/apis/drive/v3/rest'
    ]
  });
}

async function loadGis() {
  if (window.google && window.google.accounts && window.google.accounts.oauth2) return;
  await new Promise<void>((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://accounts.google.com/gsi/client';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load GIS'));
    document.head.appendChild(s);
  });
}

async function getAccessToken(clientId: string, scope: string) {
  await loadGis();
  return new Promise<string>((resolve, reject) => {
    const tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: clientId,
      scope,
      callback: (resp: any) => {
        if (resp.error) {
          reject(new Error(resp.error));
        } else {
          resolve(resp.access_token);
        }
      }
    });
    tokenClient.requestAccessToken();
  });
}

export const GoogleProvision = {
  async provision(clientId: string, companyName: string) {
    await loadGapi();
    const scope = [
      'https://www.googleapis.com/auth/script.projects',
      'https://www.googleapis.com/auth/script.deployments',
      'https://www.googleapis.com/auth/drive',
      'https://www.googleapis.com/auth/spreadsheets'
    ].join(' ');
    const token = await getAccessToken(clientId, scope);
    window.gapi.client.setToken({ access_token: token });

    const driveRes = await window.gapi.client.drive.files.create({
      resource: {
        name: companyName || 'Commodity Trader Data',
        mimeType: 'application/vnd.google-apps.spreadsheet'
      }
    });
    const spreadsheetId = driveRes.result.id;

    const createRes = await window.gapi.client.script.projects.create({
      resource: {
        title: 'Commodity Trader Backend',
        parentId: spreadsheetId
      }
    });
    const scriptId = createRes.result.scriptId;

    await window.gapi.client.script.projects.updateContent({
      scriptId,
      resource: {
        files: [
          { name: 'Code', type: 'SERVER_JS', source: CODE_GS },
          { name: 'appsscript', type: 'JSON', source: APPSCRIPT_JSON }
        ]
      }
    });

    const versionRes = await window.gapi.client.script.projects.versions.create({
      scriptId,
      resource: { description: 'v1' }
    });
    const versionNumber = versionRes.result.versionNumber;

    const deployRes = await window.gapi.client.script.projects.deployments.create({
      scriptId,
      resource: {
        deploymentConfig: {
          versionNumber,
          manifestFileName: 'appsscript',
          entryPoints: [
            {
              entryPointType: 'WEB_APP',
              webApp: {
                access: 'ANYONE',
                executeAs: 'ME'
              }
            }
          ]
        }
      }
    });

    const entry = (deployRes.result.entryPoints || []).find((e: any) => e.entryPointType === 'WEB_APP');
    const url = entry && entry.webApp && entry.webApp.url;
    if (!url) throw new Error('Web App URL not available');
    return { url, spreadsheetId, scriptId };
  }
};

