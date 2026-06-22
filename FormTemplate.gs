/* FormTemplate.gs — สร้างชีตแบบฟอร์ม PPM ในสเปรดชีตเดียวกับฐานข้อมูล (อัตโนมัติ) */
function buildFormTemplate(){
  const ss=getSS_();
  let sh=ss.getSheetByName('FormTemplate');
  if(sh) ss.deleteSheet(sh);
  sh=ss.insertSheet('FormTemplate');
  sh.setHiddenGridlines(true);
  const V=[[1, 11, "    MACHINE NO :"], [1, 27, "เลขที่เอกสาร"], [1, 38, "PAGE"], [2, 11, "    LOCATION :"], [3, 27, "วันที่ออกใช้"], [4, 3, "PPM CHECK SHEET :"], [4, 11, "    DATE PERFORMED :"], [4, 27, "ออกครั้งที่"], [5, 27, "แก้ไขครั้งที่"], [10, 21, "(......................................................................)"], [10, 29, "(......................................................................)"], [11, 22, "พนักงานผู้ดูแลเครื่องจักร"], [11, 29, "วิศวกร Preventive Maintenance"], [12, 12, "ปัญหาของเครื่อง  :"], [15, 1, "ลำดับ"], [15, 2, "รายการตรวจเช็ค"], [15, 5, "อุปกรณ์การตรวจสอบ"], [15, 6, "มาตรฐาน"], [15, 7, "MONTH :"], [15, 22, "YEAR :"], [15, 38, "ความถี่"], [16, 1, "ITEM"], [16, 2, "DESCRIPTION"], [16, 5, "Inspection Equipment"], [16, 6, "STANDARD"], [16, 7, 1], [16, 8, 2], [16, 9, 3], [16, 10, 4], [16, 11, 5], [16, 12, 6], [16, 13, 7], [16, 14, 8], [16, 15, 9], [16, 16, 10], [16, 17, 11], [16, 18, 12], [16, 19, 13], [16, 20, 14], [16, 21, 15], [16, 22, 16], [16, 23, 17], [16, 24, 18], [16, 25, 19], [16, 26, 20], [16, 27, 21], [16, 28, 22], [16, 29, 23], [16, 30, 24], [16, 31, 25], [16, 32, 26], [16, 33, 27], [16, 34, 28], [16, 35, 29], [16, 36, 30], [16, 37, 31], [16, 38, "Maintenance frequency"], [31, 1, "                          ผู้ตรวจเช็ค / CHECKER :"], [32, 1, "                          เวลา / TIME :"], [33, 1, "SYMBOL"], [33, 2, "✔"], [33, 3, "NORMAL :    (Normal condition , Normal range  and   Standard cleaning )"], [33, 7, "ISSUE DATE"], [33, 13, "APPROVED BY"], [33, 23, "REVIEWED BY"], [33, 32, "ISSUED BY"], [34, 2, "✘"], [34, 3, "ABNORMAL :  (Abnormal condition , Abnormal range  and   Non-standard cleaning )"], [35, 2, "➊"], [35, 3, "REVISED :  ( Corrective action has been completed )"]];
  const M=["A6:J14", "M33:V33", "AL31:AL32", "M34:V35", "B23:D23", "AA3:AD3", "AF34:AL35", "B17:D17", "P13:AK13", "AL2:AL5", "B29:D29", "P12:AK12", "X15:Z15", "C4:D4", "AC11:AI11", "AE38:AJ38", "AE5:AK5", "V11:AA11", "G33:L33", "W34:AE35", "B28:D28", "B19:D19", "C34:F34", "AE4:AK4", "A32:F32", "O2:Y3", "AA15:AK15", "B30:D30", "C33:F33", "O1:Y1", "B15:D15", "K2:N3", "K6:AL8", "AF33:AL33", "B24:D24", "AE1:AK2", "O4:Y4", "B20:D20", "V15:W15", "C35:F35", "G34:L35", "G15:Q15", "A31:F31", "B26:D26", "AE3:AK3", "R15:U15", "K1:N1", "B25:D25", "AA5:AD5", "B16:D16", "W33:AE33", "B22:D22", "AA4:AD4", "B27:D27", "B18:D18", "E4:G4", "U10:AB10", "B21:D21", "AC10:AI10", "AA1:AD2"];
  const W=[[1, 63], [2, 92], [4, 341], [5, 133], [6, 126], [7, 45], [38, 154], [39, 63]];
  const H=[[1, 42], [2, 27], [3, 36], [4, 39], [5, 42], [6, 35], [7, 70], [8, 70], [9, 53], [10, 35], [11, 35], [12, 41], [13, 41], [14, 48], [15, 33], [16, 33], [17, 38], [18, 38], [19, 64], [20, 38], [21, 38], [22, 38], [23, 38], [24, 38], [25, 38], [26, 38], [27, 38], [28, 38], [29, 38], [30, 38], [31, 68], [32, 61], [33, 53], [34, 53], [35, 53], [36, 29], [37, 29], [38, 29], [39, 29], [40, 29]];
  W.forEach(function(x){try{sh.setColumnWidth(x[0],x[1]);}catch(e){}});
  for(var c=7;c<=37;c++){try{sh.setColumnWidth(c,34);}catch(e){}}  // คอลัมน์วันที่ G..AK ให้แคบเท่ากัน
  H.forEach(function(x){try{sh.setRowHeight(x[0],x[1]);}catch(e){}});
  V.forEach(function(x){sh.getRange(x[0],x[1]).setValue(x[2]);});
  M.forEach(function(a){try{sh.getRange(a).merge();}catch(e){}});
  // จัดรูปแบบพื้นฐานให้ใกล้ฟอร์มจริง
  sh.getRange('A15:AK32').setBorder(true,true,true,true,true,true);
  sh.getRange('A15:AK16').setFontWeight('bold').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.getRange('G16:AK32').setHorizontalAlignment('center').setVerticalAlignment('middle');
  sh.getRange('A17:A30').setHorizontalAlignment('center');
  sh.getRange('B15:B30').setWrap(true);
  sh.getRange('A1:AK40').setFontSize(9);
  sh.getRange('C4').setFontSize(12).setFontWeight('bold');
  return 'FormTemplate created';
}
