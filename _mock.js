/* ===== DEMO MOCK BACKEND (in-browser, no server) ===== */
var MOCK=(function(){
  function pad(n){return (n<10?'0':'')+n;}
  function dstr(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate());}
  function nowStr(){var d=new Date();return dstr(d)+' '+pad(d.getHours())+':'+pad(d.getMinutes());}
  function uid(p){return p+'-'+Date.now().toString().slice(-6)+'-'+Math.floor(Math.random()*900+100);}
  function today(){return dstr(new Date());}

  var users=[
    {employeeId:'1001',name:'Operator A',role:'operator',active:true},
    {employeeId:'1002',name:'Operator B',role:'operator',active:true},
    {employeeId:'2001',name:'Engineer Som',role:'engineer',active:true},
    {employeeId:'9001',name:'Admin Boss',role:'admin',active:true},
    {employeeId:'3001',name:'Manager View',role:'viewer',active:true}
  ];
  var machines=[
    {id:'AC-01',name:'Air Compressor #1',location:'Utility Room A',active:true},
    {id:'AC-02',name:'Air Compressor #2',location:'Utility Room A',active:true},
    {id:'AC-03',name:'Air Compressor #3',location:'Utility Room B',active:true}
  ];
  var items=[
    {id:'I1',label:'Pressure Load',type:'status',unit:'bar',min:6,max:8,order:1,active:true},
    {id:'I2',label:'Pressure Unload',type:'status',unit:'bar',min:7,max:10,order:2,active:true},
    {id:'I3',label:'อุณหภูมิการทำงาน',type:'status',unit:'°C',min:60,max:95,order:3,active:true},
    {id:'I4',label:'Pressure Oil Separator',type:'status',unit:'bar',min:0,max:2,order:4,active:true},
    {id:'I5',label:'กระแส Motor Main',type:'number',unit:'A',min:0,max:200,order:5,active:true},
    {id:'I6',label:'กระแส Cooling Fan',type:'number',unit:'A',min:0,max:50,order:6,active:true},
    {id:'I7',label:'ระดับน้ำมัน',type:'status',unit:'',min:null,max:null,order:7,active:true},
    {id:'I8',label:'เปิด Manual Drain',type:'yesno',unit:'',min:null,max:null,order:8,active:true},
    {id:'I9',label:'ทำความสะอาดเครื่องและพื้นที่รอบข้าง',type:'yesno',unit:'',min:null,max:null,order:9,active:true},
    {id:'I10',label:'ชั่วโมงการทำงาน (Running Hour)',type:'number',unit:'hr',min:null,max:null,order:10,active:true}
  ];
  var records=[], notifs=[], audit=[];

  function evalItem(it,value){
    if(it.type==='number'){
      if(value===''||value==null||isNaN(Number(value))) return 'na';
      var v=Number(value);
      if(it.min!=null&&v<it.min) return 'fail';
      if(it.max!=null&&v>it.max) return 'fail';
      return 'pass';
    }
    if(it.type==='text') return 'na';
    if(value===true||value==='true') return 'pass';
    if(value===false||value==='false') return 'fail';
    return 'na';
  }
  function activeMachines(){return machines.filter(function(m){return m.active;}).map(function(m){return {id:m.id,name:m.name,location:m.location};});}
  function activeItems(){return items.filter(function(i){return i.active;}).sort(function(a,b){return a.order-b.order;})
    .map(function(i){return {id:i.id,label:i.label,type:i.type,unit:i.unit,min:i.min,max:i.max,order:i.order};});}
  function findUser(id){return users.find(function(u){return String(u.employeeId)===String(id).trim();});}
  function audit_(u,a,r,d){audit.unshift({time:nowStr(),employeeId:u?u.employeeId:'',name:u?u.name:'',action:a,recordId:r||'',detail:d||''});}
  function notify(target,type,msg,rid){notifs.unshift({id:uid('NTF'),target:target,type:type,message:msg,recordId:rid||'',createdAt:nowStr(),read:false});}
  function buildDetail(values){
    var map={}; items.forEach(function(i){map[i.id]=i;});
    return values.map(function(v){var it=map[v.itemId]||{label:v.label,type:'text',unit:''};
      return {itemId:v.itemId,label:it.label,type:it.type,unit:it.unit,value:v.value,result:evalItem(it,v.value)};});
  }

  // ---- seed two records for today ----
  (function seed(){
    var d=today();
    var good=buildDetail([
      {itemId:'I1',value:true},{itemId:'I2',value:true},{itemId:'I3',value:true},{itemId:'I4',value:true},
      {itemId:'I5',value:120},{itemId:'I6',value:22},{itemId:'I7',value:true},{itemId:'I8',value:true},
      {itemId:'I9',value:true},{itemId:'I10',value:14230}
    ]);
    records.push({recordId:'REC-DEMO-001',date:d,shift:'',machineId:'AC-01',machineName:'Air Compressor #1',
      operatorId:'1001',operatorName:'Operator A',status:'Approved',overall:'OK',data:good,
      operatorSig:'',operatorSignedAt:d+' 08:05',engineerId:'2001',engineerName:'Engineer Som',
      engineerSig:'',reviewedAt:d+' 09:10',engineerComment:'ค่าปกติทั้งหมด'});
    var bad=buildDetail([
      {itemId:'I1',value:true},{itemId:'I2',value:true},{itemId:'I3',value:false},{itemId:'I4',value:true},
      {itemId:'I5',value:118},{itemId:'I6',value:20},{itemId:'I7',value:true},{itemId:'I8',value:false},
      {itemId:'I9',value:true},{itemId:'I10',value:9870}
    ]);
    records.push({recordId:'REC-DEMO-002',date:d,shift:'',machineId:'AC-02',machineName:'Air Compressor #2',
      operatorId:'1002',operatorName:'Operator B',status:'Submitted',overall:'NG',data:bad,
      operatorSig:'',operatorSignedAt:d+' 21:40',engineerId:'',engineerName:'',engineerSig:'',
      reviewedAt:'',engineerComment:''});
    notify('engineer','alert','รออนุมัติ: Air Compressor #2 ('+d+') ผล NG','REC-DEMO-002');
    notify('engineer','review','รออนุมัติ: Air Compressor #1 ('+d+') ผล OK','REC-DEMO-001');
    audit_({employeeId:'1001',name:'Operator A'},'CHECK_SUBMIT','REC-DEMO-001','Air Compressor #1');
    audit_({employeeId:'2001',name:'Engineer Som'},'APPROVE','REC-DEMO-001','ค่าปกติทั้งหมด');
    audit_({employeeId:'1002',name:'Operator B'},'CHECK_SUBMIT','REC-DEMO-002','Air Compressor #2 (NG)');
  })();

  function notifsFor(user){
    var t=[user.employeeId]; if(user.role==='engineer'||user.role==='admin')t.push('engineer'); if(user.role==='admin')t.push('admin');
    return notifs.filter(function(n){return t.indexOf(String(n.target))!==-1;}).slice(0,50)
      .map(function(n){return {id:n.id,type:n.type,message:n.message,recordId:n.recordId,createdAt:n.createdAt,read:n.read};});
  }
  function listSub(r){return {recordId:r.recordId,date:r.date,shift:r.shift,machineId:r.machineId,machineName:r.machineName,
    operatorName:r.operatorName,status:r.status,overall:r.overall,engineerName:r.engineerName,reviewedAt:r.reviewedAt};}

  return {
    apiLogin:function(id){var u=findUser(id);if(!u)return {ok:false,error:'ไม่พบรหัสพนักงานนี้ในระบบ'};
      if(!u.active)return {ok:false,error:'บัญชีนี้ถูกปิดการใช้งาน'};
      audit_(u,'LOGIN','','เข้าสู่ระบบ');return {ok:true,user:{employeeId:u.employeeId,name:u.name,role:u.role}};},
    apiBootstrap:function(id){var u=findUser(id);return {user:{employeeId:u.employeeId,name:u.name,role:u.role},
      machines:activeMachines(),items:activeItems(),notifications:notifsFor(u),today:today()};},
    apiDashboard:function(id,date,shift){var ms=activeMachines();
      var recs=records.filter(function(r){return r.date===date;});
      var checked=new Set(recs.map(function(r){return r.machineId;})).size;
      return {totalMachines:ms.length,checkedMachines:checked,submitted:recs.length,
        approved:recs.filter(function(r){return r.status==='Approved';}).length,
        pending:recs.filter(function(r){return r.status==='Submitted';}).length,
        ng:recs.filter(function(r){return r.overall==='NG';}).length,
        completionPct:ms.length?Math.round(checked/ms.length*100):0};},
    apiTodayStatus:function(id,date,shift){var ms=activeMachines();
      var recs=records.filter(function(r){return r.date===date;});
      return ms.map(function(m){var rec=recs.filter(function(r){return r.machineId===m.id;})[0];
        return {machineId:m.id,machineName:m.name,location:m.location,status:rec?rec.status:'None',overall:rec?rec.overall:'',recordId:rec?rec.recordId:''};});},
    apiListRecords:function(id,f){f=f||{};var u=findUser(id);var rows=records.slice();
      if(f.date)rows=rows.filter(function(r){return r.date===f.date;});
      if(f.machineId)rows=rows.filter(function(r){return r.machineId===f.machineId;});
      if(f.status)rows=rows.filter(function(r){return r.status===f.status;});
      if(u.role==='operator')rows=rows.filter(function(r){return r.operatorId===u.employeeId;});
      rows.sort(function(a,b){return a.date<b.date?1:a.date>b.date?-1:0;});return rows.map(listSub);},
    apiGetRecord:function(id,rid){var r=records.find(function(x){return x.recordId===rid;});return r?JSON.parse(JSON.stringify(r)):null;},
    apiSubmitCheck:function(id,p){var u=findUser(id);var detail=buildDetail(p.values);
      var overall=detail.some(function(d){return d.result==='fail';})?'NG':'OK';
      var m=machines.find(function(x){return x.id===p.machineId;})||{id:p.machineId,name:p.machineId};
      var ex=records.find(function(r){return r.machineId===p.machineId&&r.date===p.date&&(r.status==='Draft'||r.status==='Rejected');});
      var rid;
      if(ex){rid=ex.recordId;Object.assign(ex,{status:'Submitted',data:detail,overall:overall,operatorSig:p.signature||'',operatorSignedAt:nowStr(),engineerId:'',engineerName:'',engineerSig:'',reviewedAt:'',engineerComment:''});}
      else{rid=uid('REC');records.push({recordId:rid,date:p.date,shift:'',machineId:m.id,machineName:m.name,operatorId:u.employeeId,operatorName:u.name,status:'Submitted',data:detail,overall:overall,operatorSig:p.signature||'',operatorSignedAt:nowStr(),engineerId:'',engineerName:'',engineerSig:'',reviewedAt:'',engineerComment:''});}
      notify('engineer',overall==='NG'?'alert':'review','รออนุมัติ: '+m.name+' ('+p.date+') ผล '+overall,rid);
      audit_(u,'CHECK_SUBMIT',rid,m.name+' / '+p.date);
      return {ok:true,recordId:rid,overall:overall};},
    apiApprove:function(id,rid,sig,comment){var u=findUser(id);var r=records.find(function(x){return x.recordId===rid;});
      Object.assign(r,{status:'Approved',engineerId:u.employeeId,engineerName:u.name,engineerSig:sig||'',reviewedAt:nowStr(),engineerComment:comment||''});
      audit_(u,'APPROVE',rid,comment||'');notify(r.operatorId,'approved','อนุมัติแล้ว: '+r.machineName+' ('+r.date+')',rid);return {ok:true};},
    apiReject:function(id,rid,comment){var u=findUser(id);var r=records.find(function(x){return x.recordId===rid;});
      Object.assign(r,{status:'Rejected',engineerId:u.employeeId,engineerName:u.name,reviewedAt:nowStr(),engineerComment:comment||''});
      audit_(u,'REJECT',rid,comment||'');notify(r.operatorId,'rejected','ตีกลับ: '+r.machineName+' ('+r.date+') — '+(comment||''),rid);return {ok:true};},
    apiEditRecord:function(id,rid,values,comment){var u=findUser(id);var r=records.find(function(x){return x.recordId===rid;});
      var detail=buildDetail(values);var overall=detail.some(function(d){return d.result==='fail';})?'NG':'OK';
      r.data=detail;r.overall=overall;r.engineerComment=(r.engineerComment?r.engineerComment+' | ':'')+'แก้ไขโดยวิศวกร: '+(comment||'');
      audit_(u,'EDIT_VALUES',rid,'ผลใหม่ '+overall);return {ok:true,overall:overall};},
    apiGetNotifications:function(id){return notifsFor(findUser(id));},
    apiMarkNotifRead:function(id,nid){var n=notifs.find(function(x){return x.id===nid;});if(n)n.read=true;return {ok:true};},
    apiMarkAllRead:function(id){var u=findUser(id);var t=[u.employeeId];if(u.role==='engineer'||u.role==='admin')t.push('engineer');if(u.role==='admin')t.push('admin');
      notifs.forEach(function(n){if(t.indexOf(String(n.target))!==-1)n.read=true;});return {ok:true};},
    apiListMachines:function(){return machines.map(function(m){return {id:m.id,name:m.name,location:m.location,active:m.active};});},
    apiSaveMachine:function(id,m){var u=findUser(id);if(m.id){var x=machines.find(function(y){return y.id===m.id;});Object.assign(x,{name:m.name,location:m.location,active:m.active!==false});audit_(u,'MACHINE_EDIT','',m.name);}
      else{machines.push({id:(m.code&&m.code.trim())?m.code.trim():uid('MC'),name:m.name,location:m.location,active:true});audit_(u,'MACHINE_ADD','',m.name);}return {ok:true};},
    apiDeleteMachine:function(id,mid){var u=findUser(id);var x=machines.find(function(y){return y.id===mid;});if(x)x.active=false;audit_(u,'MACHINE_DISABLE','',mid);return {ok:true};},
    apiListItems:function(){return items.slice().sort(function(a,b){return a.order-b.order;}).map(function(i){return {id:i.id,label:i.label,type:i.type,unit:i.unit,min:i.min,max:i.max,order:i.order,active:i.active};});},
    apiSaveItem:function(id,it){var u=findUser(id);if(it.id){var x=items.find(function(y){return y.id===it.id;});Object.assign(x,{label:it.label,type:it.type,unit:it.unit,min:it.min,max:it.max,order:it.order,active:it.active!==false});audit_(u,'ITEM_EDIT','',it.label);}
      else{items.push({id:uid('ITM'),label:it.label,type:it.type||'number',unit:it.unit||'',min:it.min,max:it.max,order:it.order||items.length+1,active:true});audit_(u,'ITEM_ADD','',it.label);}return {ok:true};},
    apiDeleteItem:function(id,iid){var u=findUser(id);var x=items.find(function(y){return y.id===iid;});if(x)x.active=false;audit_(u,'ITEM_DISABLE','',iid);return {ok:true};},
    apiListUsers:function(){return users.map(function(u){return {employeeId:u.employeeId,name:u.name,role:u.role,active:u.active};});},
    apiSaveUser:function(id,nu){var u=findUser(id);var x=findUser(nu.employeeId);if(x){Object.assign(x,{name:nu.name,role:nu.role,active:nu.active!==false});audit_(u,'USER_EDIT','',nu.employeeId);}
      else{users.push({employeeId:String(nu.employeeId).trim(),name:nu.name,role:nu.role,active:true});audit_(u,'USER_ADD','',nu.employeeId);}return {ok:true};},
    apiDeleteUser:function(id,tid){var u=findUser(id);var x=findUser(tid);if(x)x.active=false;audit_(u,'USER_DISABLE','',tid);return {ok:true};},
    apiAuditLog:function(id,limit){return audit.slice(0,limit||300);},
    _recordHtml:function(rid){var r=records.find(function(x){return x.recordId===rid;});return r;}
  };
})();

/* override gs() to use the in-browser mock (last declaration wins) */
function gs(fn){var args=Array.prototype.slice.call(arguments,1);
  return new Promise(function(res,rej){
    setTimeout(function(){try{if(typeof MOCK[fn]!=='function')throw new Error('ไม่มีฟังก์ชัน '+fn);res(MOCK[fn].apply(null,args));}catch(e){rej(e);}},120);
  });
}

/* PDF: build a printable report window (browser "Save as PDF") */
function _pdfReportHtml(rec){
  var rows=rec.data.map(function(d,i){
    var v=d.type==='status'?(d.value===true||d.value==='true'?'Normal':(d.value===false||d.value==='false'?'Abnormal':'-'))
         :(d.type==='yesno'||d.type==='boolean')?(d.value===true||d.value==='true'?'Yes':(d.value===false||d.value==='false'?'No':'-'))
         :(d.value===''||d.value==null?'-':d.value+(d.unit?' '+d.unit:''));
    var col=d.result==='fail'?'#c0392b':(d.result==='pass'?'#1e7e4f':'#777');
    var rt=d.result==='fail'?'NG':(d.result==='pass'?'OK':'-');
    return '<tr><td style="text-align:center">'+(i+1)+'</td><td>'+esc(d.label)+'</td><td style="text-align:center">'+esc(v)+'</td><td style="text-align:center;color:'+col+';font-weight:bold">'+rt+'</td></tr>';
  }).join('');
  var oc=rec.overall==='NG'?'#c0392b':'#1e7e4f';
  return '<html><head><meta charset="utf-8"><title>PPM '+esc(rec.machineId)+'</title><style>'+
    'body{font-family:Arial,sans-serif;color:#222;padding:24px}h1{color:#1e7e4f;font-size:20px;margin:0}'+
    '.sub{color:#666;font-size:12px;margin-bottom:14px}table{width:100%;border-collapse:collapse;font-size:12px}'+
    '.meta td{border:1px solid #ddd;padding:5px 8px}.meta .k{background:#f1f5f1;font-weight:bold;width:130px}'+
    '.it th{background:#1e7e4f;color:#fff;padding:6px;border:1px solid #1e7e4f}.it td{border:1px solid #ccc;padding:5px}'+
    '.badge{background:'+oc+';color:#fff;padding:3px 12px;border-radius:12px;font-weight:bold}'+
    '.sig{display:inline-block;width:46%;border:1px solid #ddd;border-radius:6px;padding:10px;margin-top:14px;vertical-align:top}'+
    '.foot{margin-top:18px;font-size:10px;color:#999;border-top:1px dashed #ccc;padding-top:8px}</style></head><body>'+
    '<h1>THAI SUMMIT · Maintenance</h1><div class="sub">Daily PPM Report — Air Compressor (DEMO)</div>'+
    '<table class="meta"><tr><td class="k">เครื่องจักร</td><td>'+esc(rec.machineName)+' ('+esc(rec.machineId)+')</td><td class="k">วันที่</td><td>'+esc(rec.date)+'</td></tr>'+
    '<tr><td class="k">ผู้ตรวจ</td><td>'+esc(rec.operatorName)+'</td><td class="k">สถานะ</td><td>'+esc(rec.status)+'</td></tr>'+
    '<tr><td class="k">ผลรวม</td><td colspan="3"><span class="badge">'+rec.overall+'</span></td></tr></table>'+
    '<table class="it"><thead><tr><th>#</th><th>หัวข้อตรวจ</th><th>ค่า</th><th>ผล</th></tr></thead><tbody>'+rows+'</tbody></table>'+
    (rec.engineerComment?'<p style="font-size:12px"><b>หมายเหตุวิศวกร:</b> '+esc(rec.engineerComment)+'</p>':'')+
    '<div><div class="sig">ผู้ตรวจ / Operator<br>'+(rec.operatorSig?'<img src="'+rec.operatorSig+'" style="height:54px">':'(ลายเซ็น)')+'<br>'+esc(rec.operatorName)+' · '+esc(rec.operatorSignedAt)+'</div>'+
    '<div class="sig" style="margin-left:2%">วิศวกร / Engineer<br>'+(rec.engineerSig?'<img src="'+rec.engineerSig+'" style="height:54px">':'(รออนุมัติ)')+'<br>'+esc(rec.engineerName||'-')+' · '+esc(rec.reviewedAt||'-')+'</div></div>'+
    '<div class="foot">เอกสารสาธิตจากระบบ Maintenance Daily PPM · '+esc(rec.recordId)+'</div></body></html>';
}
function exportPdf(recordId){
  var rec=MOCK._recordHtml(recordId);if(!rec){toast('ไม่พบบันทึก','err');return;}
  var w=window.open('','_blank');w.document.write(_pdfReportHtml(rec));w.document.close();
  setTimeout(function(){w.focus();w.print();},400);
  toast('เปิดหน้าพิมพ์ PDF (เลือก Save as PDF)','ok');
}
function savePdfDrive(recordId){exportPdf(recordId);}
