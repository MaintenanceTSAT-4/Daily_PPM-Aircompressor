/*************************************************************
 * Daily PPM Air Compressor — ESM Shopfloor (Thai Summit style)
 * Platform : Google Apps Script Web App
 * Database : Google Sheet (container-bound)
 * Author   : Generated for NuttChon
 *
 * FILES
 *  - Code.gs        : config, routing (doGet), setup, helpers
 *  - Auth.gs        : login + role validation
 *  - Data.gs        : CRUD for machines / items / users / records
 *  - Pdf.gs         : signed PDF + audit log
 *  - Index.html     : app shell
 *  - Styles.html    : CSS (dark + light)
 *  - App.html       : client-side JS (SPA router + views)
 *
 * SETUP (first run):
 *  1) Run setup() once from the editor to build all sheets + seed data.
 *  2) Deploy > New deployment > Web app.
 *************************************************************/

// ---------- Configuration ----------
const APP_TITLE = 'Daily PPM · Air Compressor';
const TZ = 'Asia/Bangkok';

const SHEETS = {
  USERS:      'Users',
  MACHINES:   'Machines',
  ITEMS:      'ChecklistItems',
  RECORDS:    'Records',
  AUDIT:      'AuditLog',
  NOTIFS:     'Notifications',
  SETTINGS:   'Settings'
};

const HEADERS = {
  Users:          ['EmployeeID', 'Name', 'Role', 'Active'],
  Machines:       ['MachineID', 'Name', 'Location', 'Active', 'PmLastHour', 'PmInterval', 'PmNotifiedCycle'],
  ChecklistItems: ['ItemID', 'Label', 'Type', 'Unit', 'Min', 'Max', 'Order', 'Active'],
  Records:        ['RecordID', 'Date', 'Shift', 'MachineID', 'MachineName',
                   'OperatorID', 'OperatorName', 'OperatorRole', 'Status', 'Data', 'OverallResult',
                   'OperatorSig', 'OperatorSignedAt',
                   'EngineerID', 'EngineerName', 'EngineerSig', 'ReviewedAt', 'EngineerComment',
                   'CreatedAt', 'UpdatedAt'],
  AuditLog:       ['Timestamp', 'EmployeeID', 'Name', 'Action', 'RecordID', 'Detail'],
  Notifications:  ['NotifID', 'Target', 'Type', 'Message', 'RecordID', 'CreatedAt', 'Read'],
  Settings:       ['Key', 'Value']
};

// Roles
const ROLES = ['operator', 'engineer', 'admin', 'viewer'];
const STATUS = { DRAFT: 'Draft', SUBMITTED: 'Submitted', APPROVED: 'Approved', REJECTED: 'Rejected' };

// ---------- Web entry point ----------
function doGet(e) {
  const t = HtmlService.createTemplateFromFile('Index');
  return t.evaluate()
    .setTitle(APP_TITLE)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ---------- Spreadsheet helpers ----------
function getSS_() {
  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (active) return active;
  const id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (id) return SpreadsheetApp.openById(id);
  throw new Error('No spreadsheet bound. Run setup() once or set Script Property SPREADSHEET_ID.');
}

function getSheet_(name) {
  const ss = getSS_();
  let sh = ss.getSheetByName(name);
  if (!sh) {
    sh = ss.insertSheet(name);
    if (HEADERS[name]) sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
  }
  return sh;
}

// Read a sheet into array of objects keyed by header
function readTable_(name) {
  const sh = getSheet_(name);
  const values = sh.getDataRange().getValues();
  if (values.length < 2) return [];
  const head = values[0];
  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const obj = { _row: i + 1 };
    head.forEach((h, c) => { obj[h] = values[i][c]; });
    rows.push(obj);
  }
  return rows;
}

function appendRow_(name, obj) {
  const sh = getSheet_(name);
  const head = HEADERS[name] || sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  const row = head.map(h => (obj[h] !== undefined && obj[h] !== null) ? obj[h] : '');
  sh.appendRow(row);
  return sh.getLastRow();
}

function updateRow_(name, rowNum, obj) {
  const sh = getSheet_(name);
  const head = HEADERS[name] || sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  head.forEach((h, c) => {
    if (obj[h] !== undefined) sh.getRange(rowNum, c + 1).setValue(obj[h]);
  });
}

function genId_(prefix) {
  return prefix + '-' + Utilities.formatDate(new Date(), TZ, 'yyMMddHHmmss') +
         '-' + Math.floor(Math.random() * 900 + 100);
}

function now_() { return new Date(); }
function fmt_(d, p) { return Utilities.formatDate(d instanceof Date ? d : new Date(d), TZ, p); }

function audit_(user, action, recordId, detail) {
  appendRow_(SHEETS.AUDIT, {
    Timestamp: now_(),
    EmployeeID: user ? user.employeeId : '',
    Name: user ? user.name : '',
    Action: action,
    RecordID: recordId || '',
    Detail: detail || ''
  });
}

function notify_(target, type, message, recordId) {
  appendRow_(SHEETS.NOTIFS, {
    NotifID: genId_('NTF'),
    Target: target,        // role name (engineer/admin) OR employeeId
    Type: type,
    Message: message,
    RecordID: recordId || '',
    CreatedAt: now_(),
    Read: false
  });
}

// ---------- One-time setup ----------
function setup() {
  const ss = getSS_();
  PropertiesService.getScriptProperties().setProperty('SPREADSHEET_ID', ss.getId());

  // Create sheets + headers
  Object.keys(HEADERS).forEach(name => {
    let sh = ss.getSheetByName(name);
    if (!sh) sh = ss.insertSheet(name);
    sh.getRange(1, 1, 1, HEADERS[name].length).setValues([HEADERS[name]]);
    sh.setFrozenRows(1);
  });

  // Remove default "Sheet1" if empty
  const def = ss.getSheetByName('Sheet1');
  if (def && ss.getSheets().length > 1) {
    try { ss.deleteSheet(def); } catch (err) {}
  }

  seedIfEmpty_();
  SpreadsheetApp.getActive() && SpreadsheetApp.flush();
  return 'Setup complete. Spreadsheet ID: ' + ss.getId();
}

function seedIfEmpty_() {
  // Users
  if (readTable_(SHEETS.USERS).length === 0) {
    [
      ['1001', 'Operator A',   'operator', true],
      ['1002', 'Operator B',   'operator', true],
      ['2001', 'Engineer Som', 'engineer', true],
      ['9001', 'Admin Boss',   'admin',    true],
      ['3001', 'Manager View', 'viewer',   true]
    ].forEach(r => appendRow_(SHEETS.USERS,
      { EmployeeID: r[0], Name: r[1], Role: r[2], Active: r[3] }));
  }
  // Machines
  if (readTable_(SHEETS.MACHINES).length === 0) {
    [
      ['AC-01', 'Air Compressor #1', 'Utility Room A', true, 6500, 8000],
      ['AC-02', 'Air Compressor #2', 'Utility Room A', true, 4000, 5800],
      ['AC-03', 'Air Compressor #3', 'Utility Room B', true, 20000, 5000]
    ].forEach(r => appendRow_(SHEETS.MACHINES,
      { MachineID: r[0], Name: r[1], Location: r[2], Active: r[3], PmLastHour: r[4], PmInterval: r[5] }));
  }
  // Checklist items (the 10 standard PPM points)
  if (readTable_(SHEETS.ITEMS).length === 0) {
    const items = [
      ['Pressure Load',          'status',  'bar',  6,   8,   true],
      ['Pressure Unload',        'status',  'bar',  7,   10,  true],
      ['อุณหภูมิการทำงาน',         'status',  '°C',   60,  95,  true],
      ['Pressure Oil Separator', 'status',  'bar',  0,   2,   true],
      ['กระแส Motor Main',        'number',  'A',    0,   200, true],
      ['กระแส Cooling Fan',       'number',  'A',    0,   50,  true],
      ['ระดับน้ำมัน',              'status',  '',     '',  '',  true],
      ['เปิด Manual Drain',       'yesno',   '',     '',  '',  true],
      ['ทำความสะอาดเครื่องและพื้นที่รอบข้าง', 'yesno', '', '', '', true],
      ['ชั่วโมงการทำงาน (Running Hour)', 'number', 'hr', '', '', true]
    ];
    items.forEach((r, i) => appendRow_(SHEETS.ITEMS, {
      ItemID: genId_('ITM'), Label: r[0], Type: r[1], Unit: r[2],
      Min: r[3], Max: r[4], Order: i + 1, Active: r[5]
    }));
  }
}
