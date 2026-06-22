/*************************************************************
 * Form.gs — Export รายเดือนตามฟอร์ม PPM (Excel/Sheets) เป็น PDF
 *
 * ฟอร์ม "FormTemplate" จะถูกสร้างอัตโนมัติในสเปรดชีตเดียวกับฐานข้อมูล
 * (โดย buildFormTemplate() ใน FormTemplate.gs — เรียกจาก setup() หรือเมื่อ Export ครั้งแรก)
 * ไม่ต้องนำเข้าไฟล์ .xlsx เอง
 *
 * การแมปช่อง (ตามที่กำหนด):
 *  - หัวข้อตรวจเช็ค  -> B17:B30  (ลำดับใน A17:A30)
 *  - วันที่ (1..31)  -> มีอยู่แล้วในแถว 16 (G16:AK16)
 *  - ค่าตรวจรายวัน  -> G17:AK30  (✔=Normal/Yes, ✘=Abnormal/No, ตัวเลข=ค่าวัด)
 *  - ผู้ตรวจเช็ค     -> G31:AK31
 *  - เวลา           -> G32:AK32
 *************************************************************/

const FORM_TEMPLATE = 'FormTemplate';
const FORM_ITEM_ROW0 = 17;   // แถวแรกของรายการ
const FORM_ITEM_ROWN = 30;   // แถวสุดท้าย (รวม 14 แถว)
const FORM_DAY_COL0  = 7;    // คอลัมน์ G = วันที่ 1

function monthName_(mm) {
  return ['', 'January','February','March','April','May','June',
          'July','August','September','October','November','December'][parseInt(mm, 10)] || String(mm);
}

// สร้าง PDF ฟอร์มรายเดือนของเครื่องเดียว แล้วคืนค่าเป็น base64
function apiExportMonthlyForm(employeeId, machineId, month) {
  requireUser_(employeeId);
  const ss = getSS_();
  if (!ss.getSheetByName(FORM_TEMPLATE)) buildFormTemplate();  // สร้างฟอร์มในชีตเดียวกันอัตโนมัติ
  const tpl = ss.getSheetByName(FORM_TEMPLATE);

  const sh = tpl.copyTo(ss);
  sh.setName('TMP_' + Date.now());
  try {
    const items = getActiveItems_();                 // เรียงตาม Order
    const rowOf = {};
    items.forEach(function(it, i) {
      const r = FORM_ITEM_ROW0 + i;
      if (r > FORM_ITEM_ROWN) return;
      rowOf[it.id] = r;
      sh.getRange(r, 1).setValue(i + 1);             // A = ลำดับ
      sh.getRange(r, 2).setValue(it.label);          // B (merged B:D) = ชื่อหัวข้อ
    });

    const machine = getActiveMachines_().find(function(m){return m.id === String(machineId);})
                    || { id: machineId, name: machineId, location: '' };
    const parts = String(month).split('-');          // yyyy-mm
    sh.getRange('G15').setValue('MONTH : ' + monthName_(parts[1]));
    sh.getRange('V15').setValue('YEAR : ' + parts[0]);
    sh.getRange('K1').setValue('    MACHINE NO : ' + machine.id);
    sh.getRange('K2').setValue('    LOCATION : ' + (machine.location || ''));

    const td = fmt_(now_(), 'yyyy-MM-dd');
    const recs = readTable_(SHEETS.RECORDS).map(recordToObj_)
      .filter(function(r){ return r.machineId === String(machineId)
        && String(r.date).slice(0,7) === String(month) && r.date <= td; });

    recs.forEach(function(r){
      const day = parseInt(String(r.date).split('-')[2], 10);
      const col = FORM_DAY_COL0 + (day - 1);
      if (col < FORM_DAY_COL0 || col > FORM_DAY_COL0 + 30) return;
      (r.data || []).forEach(function(d){
        const row = rowOf[d.itemId];
        if (!row) return;
        let v = '';
        if (d.type === 'number') {
          v = (d.value === '' || d.value == null) ? '' : d.value;
        } else { // status / yesno / boolean
          v = (d.value === true || d.value === 'true') ? '✔'
            : ((d.value === false || d.value === 'false') ? '✘' : '');
        }
        sh.getRange(row, col).setValue(v);
      });
      sh.getRange(31, col).setValue(r.operatorName || '');
      sh.getRange(32, col).setValue((r.operatorSignedAt || '').slice(11, 16)); // HH:mm
    });

    SpreadsheetApp.flush();
    const blob = sheetToPdf_(ss.getId(), sh.getSheetId());
    audit_(requireUser_(employeeId), 'FORM_EXPORT', '', machine.id + ' / ' + month);
    return { ok: true, filename: 'PPM_' + machine.id + '_' + month + '.pdf',
             base64: Utilities.base64Encode(blob.getBytes()) };
  } finally {
    ss.deleteSheet(sh);
  }
}

function sheetToPdf_(ssId, gid) {
  const url = 'https://docs.google.com/spreadsheets/d/' + ssId + '/export?' + [
    'format=pdf', 'gid=' + gid, 'size=A4', 'portrait=false', 'fitw=true',
    'gridlines=false', 'sheetnames=false', 'printtitle=false',
    'top_margin=0.3', 'bottom_margin=0.3', 'left_margin=0.3', 'right_margin=0.3'
  ].join('&');
  const resp = UrlFetchApp.fetch(url, { headers: { Authorization: 'Bearer ' + ScriptApp.getOAuthToken() } });
  return resp.getBlob().setName('form.pdf');
}
