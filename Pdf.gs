/*************************************************************
 * Pdf.gs — Signed PDF export with e-signatures + audit footer
 *************************************************************/

function apiExportPdf(employeeId, recordId) {
  const user = requireUser_(employeeId);
  const r = readTable_(SHEETS.RECORDS).find(x => String(x.RecordID) === String(recordId));
  if (!r) throw new Error('Record not found');
  const rec = recordToObj_(r);

  const html = buildRecordHtml_(rec);
  const blob = Utilities.newBlob(html, 'text/html', 'tmp.html').getAs('application/pdf');
  const filename = 'PPM_' + rec.machineId + '_' + rec.date + '_' + (rec.shift || '') + '.pdf';
  blob.setName(filename);

  audit_(user, 'PDF_EXPORT', recordId, filename);
  return {
    ok: true,
    filename: filename,
    base64: Utilities.base64Encode(blob.getBytes())
  };
}

// Optionally persist a copy to Drive and return a shareable link
function apiSavePdfToDrive(employeeId, recordId) {
  const user = requireUser_(employeeId);
  const r = readTable_(SHEETS.RECORDS).find(x => String(x.RecordID) === String(recordId));
  if (!r) throw new Error('Record not found');
  const rec = recordToObj_(r);
  const html = buildRecordHtml_(rec);
  const blob = Utilities.newBlob(html, 'text/html', 'tmp.html').getAs('application/pdf');
  const filename = 'PPM_' + rec.machineId + '_' + rec.date + '_' + (rec.shift || '') + '.pdf';
  blob.setName(filename);

  const folder = getPdfFolder_();
  const file = folder.createFile(blob);
  audit_(user, 'PDF_SAVE_DRIVE', recordId, file.getUrl());
  return { ok: true, url: file.getUrl(), filename: filename };
}

function getPdfFolder_() {
  const name = 'Daily PPM AirCompressor PDFs';
  const it = DriveApp.getFoldersByName(name);
  return it.hasNext() ? it.next() : DriveApp.createFolder(name);
}

function rowResultColor_(result) {
  return result === 'fail' ? '#c0392b' : (result === 'pass' ? '#1e7e4f' : '#7a7a7a');
}
function resultText_(result) {
  return result === 'fail' ? 'NG' : (result === 'pass' ? 'OK' : '-');
}
function valueText_(d) {
  if (d.type === 'status') return (d.value === true || d.value === 'true') ? 'Normal' : ((d.value === false || d.value === 'false') ? 'Abnormal' : '-');
  if (d.type === 'yesno' || d.type === 'boolean') return (d.value === true || d.value === 'true') ? 'Yes' : ((d.value === false || d.value === 'false') ? 'No' : '-');
  if (d.value === '' || d.value === null || d.value === undefined) return '-';
  return d.value + (d.unit ? ' ' + d.unit : '');
}

function buildRecordHtml_(rec) {
  const rows = rec.data.map((d, i) => (
    '<tr>' +
      '<td style="text-align:center;">' + (i + 1) + '</td>' +
      '<td>' + escapeHtml_(d.label) + '</td>' +
      '<td style="text-align:center;">' + escapeHtml_(valueText_(d)) + '</td>' +
      '<td style="text-align:center;color:' + rowResultColor_(d.result) + ';font-weight:bold;">' + resultText_(d.result) + '</td>' +
    '</tr>'
  )).join('');

  const opInfo = '<div style="font-weight:bold;">' + escapeHtml_(rec.operatorName) + '</div>' +
                 '<div style="font-size:11px;color:#666;">รหัส ' + escapeHtml_(rec.operatorId) +
                 (rec.operatorRole ? ' · ' + escapeHtml_(rec.operatorRole) : '') + '</div>';
  const engSig = rec.engineerSig ? '<img src="' + rec.engineerSig + '" style="height:60px;"/>' : '<span style="color:#999;">(รออนุมัติ)</span>';
  const overallColor = rec.overall === 'NG' ? '#c0392b' : '#1e7e4f';
  const statusTH = ({ Draft: 'ร่าง', Submitted: 'รออนุมัติ', Approved: 'อนุมัติแล้ว', Rejected: 'ตีกลับ' })[rec.status] || rec.status;

  return '' +
  '<html><head><meta charset="utf-8"><style>' +
  'body{font-family:Arial,"TH Sarabun New",sans-serif;color:#222;padding:24px;}' +
  'h1{font-size:20px;margin:0;color:#1e7e4f;}' +
  '.sub{color:#666;font-size:12px;margin-bottom:14px;}' +
  '.meta{width:100%;border-collapse:collapse;margin-bottom:14px;font-size:12px;}' +
  '.meta td{padding:4px 8px;border:1px solid #ddd;}' +
  '.meta .k{background:#f1f5f1;font-weight:bold;width:130px;}' +
  'table.items{width:100%;border-collapse:collapse;font-size:12px;}' +
  'table.items th{background:#1e7e4f;color:#fff;padding:6px;border:1px solid #1e7e4f;}' +
  'table.items td{padding:5px 6px;border:1px solid #ccc;}' +
  '.badge{display:inline-block;padding:3px 12px;border-radius:12px;color:#fff;font-weight:bold;background:' + overallColor + ';}' +
  '.sigbox{display:inline-block;width:46%;border:1px solid #ddd;border-radius:6px;padding:10px;margin-top:14px;vertical-align:top;}' +
  '.sigbox .lbl{font-size:11px;color:#666;}' +
  '.foot{margin-top:18px;font-size:10px;color:#999;border-top:1px dashed #ccc;padding-top:8px;}' +
  '</style></head><body>' +
  '<h1>THAI SUMMIT · Maintenance</h1>' +
  '<div class="sub">Daily PPM Report — Air Compressor</div>' +
  '<table class="meta">' +
    '<tr><td class="k">เครื่องจักร</td><td>' + escapeHtml_(rec.machineName) + ' (' + escapeHtml_(rec.machineId) + ')</td>' +
        '<td class="k">วันที่</td><td>' + escapeHtml_(rec.date) + '</td></tr>' +
    '<tr><td class="k">สถานะ</td><td>' + statusTH + '</td>' +
        '<td class="k">ผลรวม</td><td><span class="badge">' + rec.overall + '</span></td></tr>' +
    '<tr><td class="k">ผู้ตรวจ (Operator)</td><td>' + escapeHtml_(rec.operatorName) + ' (' + escapeHtml_(rec.operatorId) + ')</td>' +
        '<td class="k">Record ID</td><td>' + escapeHtml_(rec.recordId) + '</td></tr>' +
  '</table>' +
  '<table class="items"><thead><tr>' +
    '<th style="width:36px;">#</th><th>หัวข้อตรวจ</th><th style="width:140px;">ค่า / ผลตรวจ</th><th style="width:60px;">ผล</th>' +
  '</tr></thead><tbody>' + rows + '</tbody></table>' +
  (rec.engineerComment ? '<p style="font-size:12px;margin-top:10px;"><b>หมายเหตุวิศวกร:</b> ' + escapeHtml_(rec.engineerComment) + '</p>' : '') +
  '<div>' +
    '<div class="sigbox"><div class="lbl">ผู้ตรวจ / Operator (จากการ Login)</div>' + opInfo +
      '<div style="font-size:12px;margin-top:6px;">' + escapeHtml_(rec.operatorSignedAt) + '</div></div>' +
    '<div class="sigbox" style="margin-left:2%;"><div class="lbl">วิศวกรผู้อนุมัติ / Engineer</div>' + engSig +
      '<div style="font-size:12px;margin-top:6px;">' + escapeHtml_(rec.engineerName || '-') + '<br>' + escapeHtml_(rec.reviewedAt || '-') + '</div></div>' +
  '</div>' +
  '<div class="foot">เอกสารนี้สร้างโดยระบบ Maintenance Daily PPM — ออกเมื่อ ' + fmt_(now_(), 'yyyy-MM-dd HH:mm:ss') +
    ' · Audit Record ID: ' + escapeHtml_(rec.recordId) + ' · ลายเซ็นอิเล็กทรอนิกส์ (E-Signature)</div>' +
  '</body></html>';
}

function escapeHtml_(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
