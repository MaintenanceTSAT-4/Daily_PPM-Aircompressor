/*************************************************************
 * Data.gs — Core API (machines, items, users, records, dashboard)
 * All functions are called from the client via google.script.run.
 *************************************************************/

// ---------- Bootstrap (one call after login) ----------
function apiBootstrap(employeeId) {
  const user = requireUser_(employeeId);
  checkPmDue_();
  return {
    user: user,
    machines: getActiveMachines_(),
    items: getActiveItems_(),
    notifications: getNotifications_(user),
    today: fmt_(now_(), 'yyyy-MM-dd')
  };
}

// ---------- Machines ----------
function getActiveMachines_() {
  return readTable_(SHEETS.MACHINES)
    .filter(m => m.Active !== false && String(m.Active).toLowerCase() !== 'false')
    .map(m => ({ id: String(m.MachineID), name: m.Name, location: m.Location,
                 pmLastHour: m.PmLastHour === '' ? null : Number(m.PmLastHour),
                 pmInterval: m.PmInterval === '' ? null : Number(m.PmInterval) }));
}
function apiListMachines(employeeId) {
  requireRole_(employeeId, ['admin']);
  return readTable_(SHEETS.MACHINES).map(m => ({
    id: String(m.MachineID), name: m.Name, location: m.Location, active: m.Active !== false,
    pmLastHour: m.PmLastHour === '' ? '' : Number(m.PmLastHour),
    pmInterval: m.PmInterval === '' ? '' : Number(m.PmInterval)
  }));
}
function apiSaveMachine(employeeId, m) {
  const user = requireRole_(employeeId, ['admin']);
  const rows = readTable_(SHEETS.MACHINES);
  const pmLast = (m.pmLastHour === '' || m.pmLastHour === null || m.pmLastHour === undefined) ? '' : Number(m.pmLastHour);
  const pmInt  = (m.pmInterval === '' || m.pmInterval === null || m.pmInterval === undefined) ? '' : Number(m.pmInterval);
  if (m.id) {
    const r = rows.find(x => String(x.MachineID) === String(m.id));
    if (!r) throw new Error('Machine not found');
    updateRow_(SHEETS.MACHINES, r._row, { Name: m.name, Location: m.location, Active: m.active !== false, PmLastHour: pmLast, PmInterval: pmInt });
    audit_(user, 'MACHINE_EDIT', '', m.id + ' / ' + m.name);
  } else {
    const id = m.code && m.code.trim() ? m.code.trim() : genId_('MC');
    appendRow_(SHEETS.MACHINES, { MachineID: id, Name: m.name, Location: m.location, Active: true, PmLastHour: pmLast, PmInterval: pmInt });
    audit_(user, 'MACHINE_ADD', '', id + ' / ' + m.name);
  }
  return { ok: true };
}
function apiDeleteMachine(employeeId, id) {
  const user = requireRole_(employeeId, ['admin']);
  const r = readTable_(SHEETS.MACHINES).find(x => String(x.MachineID) === String(id));
  if (r) { updateRow_(SHEETS.MACHINES, r._row, { Active: false });
           audit_(user, 'MACHINE_DISABLE', '', String(id)); }
  return { ok: true };
}

// ---------- Checklist items ----------
function getActiveItems_() {
  return readTable_(SHEETS.ITEMS)
    .filter(i => i.Active !== false && String(i.Active).toLowerCase() !== 'false')
    .sort((a, b) => (Number(a.Order) || 0) - (Number(b.Order) || 0))
    .map(i => ({
      id: String(i.ItemID), label: i.Label, type: String(i.Type || 'number'),
      unit: i.Unit, min: i.Min === '' ? null : Number(i.Min),
      max: i.Max === '' ? null : Number(i.Max), order: Number(i.Order) || 0
    }));
}
function apiListItems(employeeId) {
  requireRole_(employeeId, ['admin']);
  return readTable_(SHEETS.ITEMS)
    .sort((a, b) => (Number(a.Order) || 0) - (Number(b.Order) || 0))
    .map(i => ({
      id: String(i.ItemID), label: i.Label, type: String(i.Type || 'number'),
      unit: i.Unit, min: i.Min, max: i.Max, order: Number(i.Order) || 0,
      active: i.Active !== false
    }));
}
function apiSaveItem(employeeId, it) {
  const user = requireRole_(employeeId, ['admin']);
  const rows = readTable_(SHEETS.ITEMS);
  if (it.id) {
    const r = rows.find(x => String(x.ItemID) === String(it.id));
    if (!r) throw new Error('Item not found');
    updateRow_(SHEETS.ITEMS, r._row, {
      Label: it.label, Type: it.type, Unit: it.unit,
      Min: it.min === null ? '' : it.min, Max: it.max === null ? '' : it.max,
      Order: it.order, Active: it.active !== false
    });
    audit_(user, 'ITEM_EDIT', '', it.label);
  } else {
    const order = it.order || (rows.length + 1);
    appendRow_(SHEETS.ITEMS, {
      ItemID: genId_('ITM'), Label: it.label, Type: it.type || 'number', Unit: it.unit || '',
      Min: it.min === null || it.min === undefined ? '' : it.min,
      Max: it.max === null || it.max === undefined ? '' : it.max,
      Order: order, Active: true
    });
    audit_(user, 'ITEM_ADD', '', it.label);
  }
  return { ok: true };
}
function apiDeleteItem(employeeId, id) {
  const user = requireRole_(employeeId, ['admin']);
  const r = readTable_(SHEETS.ITEMS).find(x => String(x.ItemID) === String(id));
  if (r) { updateRow_(SHEETS.ITEMS, r._row, { Active: false });
           audit_(user, 'ITEM_DISABLE', '', r.Label); }
  return { ok: true };
}

// ---------- Users (admin) ----------
function apiListUsers(employeeId) {
  requireRole_(employeeId, ['admin']);
  return readTable_(SHEETS.USERS).map(u => ({
    employeeId: String(u.EmployeeID), name: u.Name,
    role: String(u.Role).toLowerCase(), active: u.Active !== false
  }));
}
function apiSaveUser(employeeId, u) {
  const admin = requireRole_(employeeId, ['admin']);
  if (ROLES.indexOf(String(u.role).toLowerCase()) === -1) throw new Error('Invalid role');
  const rows = readTable_(SHEETS.USERS);
  const existing = rows.find(x => String(x.EmployeeID).trim() === String(u.employeeId).trim());
  if (existing) {
    updateRow_(SHEETS.USERS, existing._row,
      { Name: u.name, Role: String(u.role).toLowerCase(), Active: u.active !== false });
    audit_(admin, 'USER_EDIT', '', u.employeeId + ' / ' + u.role);
  } else {
    appendRow_(SHEETS.USERS,
      { EmployeeID: String(u.employeeId).trim(), Name: u.name, Role: String(u.role).toLowerCase(), Active: true });
    audit_(admin, 'USER_ADD', '', u.employeeId + ' / ' + u.role);
  }
  return { ok: true };
}
function apiDeleteUser(employeeId, targetId) {
  const admin = requireRole_(employeeId, ['admin']);
  const r = readTable_(SHEETS.USERS).find(x => String(x.EmployeeID).trim() === String(targetId).trim());
  if (r) { updateRow_(SHEETS.USERS, r._row, { Active: false });
           audit_(admin, 'USER_DISABLE', '', String(targetId)); }
  return { ok: true };
}

// ---------- Daily check evaluation ----------
function evalItem_(item, value) {
  if (item.type === 'number') {
    const v = Number(value);
    if (value === '' || value === null || value === undefined || isNaN(v)) return 'na';
    if (item.min !== null && item.min !== '' && v < Number(item.min)) return 'fail';
    if (item.max !== null && item.max !== '' && v > Number(item.max)) return 'fail';
    return 'pass';
  }
  if (item.type === 'text') return 'na';
  // status (Normal/Abnormal) / yesno (Yes/No) / legacy boolean -> tri-state
  if (value === true  || value === 'true')  return 'pass';
  if (value === false || value === 'false') return 'fail';
  return 'na';
}

// ---------- Submit a daily check ----------
function apiSubmitCheck(employeeId, payload) {
  const user = requireUser_(employeeId);
  const items = getActiveItems_();
  const itemMap = {}; items.forEach(i => itemMap[i.id] = i);

  const detail = (payload.values || []).map(v => {
    const it = itemMap[v.itemId] || { label: v.label, type: 'text', unit: '' };
    const result = evalItem_(it, v.value);
    return { itemId: v.itemId, label: it.label, type: it.type, unit: it.unit, value: v.value, result: result };
  });
  const overall = detail.some(d => d.result === 'fail') ? 'NG' : 'OK';

  const machine = getActiveMachines_().find(m => m.id === String(payload.machineId)) ||
                  { id: payload.machineId, name: payload.machineId };

  const rows = readTable_(SHEETS.RECORDS);
  // One record per machine/date/shift — update if exists and still editable
  const existing = rows.find(r =>
    String(r.MachineID) === String(payload.machineId) &&
    fmt_(r.Date, 'yyyy-MM-dd') === payload.date &&
    String(r.Shift) === String(payload.shift) &&
    (r.Status === STATUS.DRAFT || r.Status === STATUS.REJECTED));

  const base = {
    Date: payload.date, Shift: payload.shift,
    MachineID: machine.id, MachineName: machine.name,
    OperatorID: user.employeeId, OperatorName: user.name, OperatorRole: user.role,
    Status: STATUS.SUBMITTED,
    Data: JSON.stringify(detail), OverallResult: overall,
    OperatorSig: '', OperatorSignedAt: now_(),
    UpdatedAt: now_()
  };

  let recordId;
  if (existing) {
    recordId = existing.RecordID;
    updateRow_(SHEETS.RECORDS, existing._row, Object.assign(base, {
      EngineerID: '', EngineerName: '', EngineerSig: '', ReviewedAt: '', EngineerComment: ''
    }));
    audit_(user, 'CHECK_RESUBMIT', recordId, machine.name + ' / ' + payload.date + ' / ' + payload.shift);
  } else {
    recordId = genId_('REC');
    appendRow_(SHEETS.RECORDS, Object.assign({ RecordID: recordId, CreatedAt: now_() }, base));
    audit_(user, 'CHECK_SUBMIT', recordId, machine.name + ' / ' + payload.date + ' / ' + payload.shift);
  }

  notify_('engineer', overall === 'NG' ? 'alert' : 'review',
    'รออนุมัติ: ' + machine.name + ' (' + payload.date + ') ผล ' + overall, recordId);

  return { ok: true, recordId: recordId, overall: overall };
}

// ---------- Records: read / list ----------
function recordToObj_(r) {
  let data = [];
  try { data = JSON.parse(r.Data || '[]'); } catch (e) {}
  return {
    recordId: r.RecordID, date: fmt_(r.Date, 'yyyy-MM-dd'), shift: r.Shift,
    machineId: String(r.MachineID), machineName: r.MachineName,
    operatorId: String(r.OperatorID), operatorName: r.OperatorName, operatorRole: r.OperatorRole || '',
    status: r.Status, overall: r.OverallResult, data: data,
    operatorSig: r.OperatorSig, operatorSignedAt: r.OperatorSignedAt ? fmt_(r.OperatorSignedAt, 'yyyy-MM-dd HH:mm') : '',
    engineerId: String(r.EngineerID || ''), engineerName: r.EngineerName || '',
    engineerSig: r.EngineerSig || '',
    reviewedAt: r.ReviewedAt ? fmt_(r.ReviewedAt, 'yyyy-MM-dd HH:mm') : '',
    engineerComment: r.EngineerComment || ''
  };
}

function apiGetRecord(employeeId, recordId) {
  requireUser_(employeeId);
  const r = readTable_(SHEETS.RECORDS).find(x => String(x.RecordID) === String(recordId));
  return r ? recordToObj_(r) : null;
}

function apiListRecords(employeeId, filters) {
  const user = requireUser_(employeeId);
  filters = filters || {};
  let rows = readTable_(SHEETS.RECORDS).map(recordToObj_);
  if (filters.date)    rows = rows.filter(r => r.date === filters.date);
  if (filters.shift && filters.shift !== 'all') rows = rows.filter(r => String(r.shift) === String(filters.shift));
  if (filters.machineId) rows = rows.filter(r => r.machineId === String(filters.machineId));
  if (filters.status)  rows = rows.filter(r => r.status === filters.status);
  // operators see their own only
  if (user.role === 'operator') rows = rows.filter(r => r.operatorId === user.employeeId);
  rows.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  // strip heavy signature payloads from list view
  return rows.map(r => ({ recordId: r.recordId, date: r.date, shift: r.shift,
    machineId: r.machineId, machineName: r.machineName, operatorName: r.operatorName,
    status: r.status, overall: r.overall, engineerName: r.engineerName, reviewedAt: r.reviewedAt }));
}

// PM (major) countdown helpers
function runHourOf_(rec) {
  if (rec && rec.data) {
    const f = rec.data.find(d => d.unit === 'hr' || /running hour/i.test(d.label || ''));
    if (f) return f.value;
  }
  return '';
}
function latestRunHour_(allRecs, machineId) {
  const recs = allRecs.filter(r => r.machineId === machineId).sort((a, b) => a.date < b.date ? 1 : -1);
  for (let i = 0; i < recs.length; i++) { const v = runHourOf_(recs[i]); if (v !== '' && v != null) return v; }
  return '';
}
function pmCalc_(m, rh) {
  const pmInterval = (m.pmInterval == null || m.pmInterval === '') ? 0 : Number(m.pmInterval);
  const pmLastHour = (m.pmLastHour == null || m.pmLastHour === '') ? 0 : Number(m.pmLastHour);
  let cur = (rh !== '' && rh != null && !isNaN(Number(rh))) ? Number(rh)
            : ((m.pmLastHour != null && m.pmLastHour !== '') ? pmLastHour : null);
  let pmRemaining = null;
  if (pmInterval > 0 && cur != null) pmRemaining = Math.round(pmLastHour + pmInterval - cur);
  return { pmInterval: pmInterval, pmLastHour: pmLastHour, pmRemaining: pmRemaining };
}

// Auto-create a bell notification when a machine reaches its major-PM due point.
// De-duplicated: one notification per PM cycle (keyed by PmLastHour) per machine.
function checkPmDue_() {
  const rows = readTable_(SHEETS.MACHINES)
    .filter(m => m.Active !== false && String(m.Active).toLowerCase() !== 'false');
  if (!rows.length) return;
  const allRecs = readTable_(SHEETS.RECORDS).map(recordToObj_);
  rows.forEach(row => {
    const m = { pmInterval: row.PmInterval, pmLastHour: row.PmLastHour };
    const pm = pmCalc_(m, latestRunHour_(allRecs, String(row.MachineID)));
    if (pm.pmInterval > 0 && pm.pmRemaining != null && pm.pmRemaining <= 0) {
      const cycle = String(pm.pmLastHour);
      if (String(row.PmNotifiedCycle || '') !== cycle) {
        notify_('engineer', 'alert',
          '🛠 ถึงกำหนด PM ใหญ่: ' + row.Name + ' (' + row.MachineID + ') — เกินกำหนด ' + Math.abs(pm.pmRemaining) + ' ชม.', '');
        updateRow_(SHEETS.MACHINES, row._row, { PmNotifiedCycle: cycle });
      }
    }
  });
}

// Today's status per machine (for dashboard tiles)
function apiTodayStatus(employeeId, date, shift) {
  requireUser_(employeeId);
  const machines = getActiveMachines_();
  const allRecs = readTable_(SHEETS.RECORDS).map(recordToObj_);
  const rows = allRecs.filter(r => r.date === date && (shift === 'all' || String(r.shift) === String(shift)));
  return machines.map(m => {
    const rec = rows.filter(r => r.machineId === m.id)
                    .sort((a, b) => a.shift < b.shift ? 1 : -1)[0];
    let runHour = runHourOf_(rec);
    if (runHour === '' || runHour == null) runHour = latestRunHour_(allRecs, m.id);
    const pm = pmCalc_(m, runHour);
    return {
      machineId: m.id, machineName: m.name, location: m.location,
      status: rec ? rec.status : 'None',
      overall: rec ? rec.overall : '',
      recordId: rec ? rec.recordId : '',
      runHour: runHour,
      pmInterval: pm.pmInterval, pmLastHour: pm.pmLastHour, pmRemaining: pm.pmRemaining
    };
  });
}

// ---------- Engineer approval / reject / edit ----------
function apiApprove(employeeId, recordId, signature, comment) {
  const eng = requireRole_(employeeId, ['engineer', 'admin']);
  const r = readTable_(SHEETS.RECORDS).find(x => String(x.RecordID) === String(recordId));
  if (!r) throw new Error('Record not found');
  updateRow_(SHEETS.RECORDS, r._row, {
    Status: STATUS.APPROVED, EngineerID: eng.employeeId, EngineerName: eng.name,
    EngineerSig: signature || '', ReviewedAt: now_(),
    EngineerComment: comment || '', UpdatedAt: now_()
  });
  audit_(eng, 'APPROVE', recordId, comment || '');
  notify_(String(r.OperatorID), 'approved', 'อนุมัติแล้ว: ' + r.MachineName + ' (' + fmt_(r.Date, 'yyyy-MM-dd') + ')', recordId);
  return { ok: true };
}

function apiReject(employeeId, recordId, comment) {
  const eng = requireRole_(employeeId, ['engineer', 'admin']);
  const r = readTable_(SHEETS.RECORDS).find(x => String(x.RecordID) === String(recordId));
  if (!r) throw new Error('Record not found');
  updateRow_(SHEETS.RECORDS, r._row, {
    Status: STATUS.REJECTED, EngineerID: eng.employeeId, EngineerName: eng.name,
    ReviewedAt: now_(), EngineerComment: comment || '', UpdatedAt: now_()
  });
  audit_(eng, 'REJECT', recordId, comment || '');
  notify_(String(r.OperatorID), 'rejected', 'ตีกลับ: ' + r.MachineName + ' (' + fmt_(r.Date, 'yyyy-MM-dd') + ') — ' + (comment || ''), recordId);
  return { ok: true };
}

// Engineer/admin edits the recorded values
function apiEditRecord(employeeId, recordId, values, comment) {
  const eng = requireRole_(employeeId, ['engineer', 'admin']);
  const r = readTable_(SHEETS.RECORDS).find(x => String(x.RecordID) === String(recordId));
  if (!r) throw new Error('Record not found');
  const items = getActiveItems_(); const map = {}; items.forEach(i => map[i.id] = i);
  let old = []; try { old = JSON.parse(r.Data || '[]'); } catch (e) {}
  const oldMap = {}; old.forEach(d => oldMap[d.itemId] = d);

  const detail = values.map(v => {
    const it = map[v.itemId] || oldMap[v.itemId] || { label: v.label, type: 'text', unit: '' };
    return { itemId: v.itemId, label: it.label, type: it.type, unit: it.unit,
             value: v.value, result: evalItem_(it, v.value) };
  });
  const overall = detail.some(d => d.result === 'fail') ? 'NG' : 'OK';
  updateRow_(SHEETS.RECORDS, r._row, {
    Data: JSON.stringify(detail), OverallResult: overall,
    EngineerComment: (r.EngineerComment ? r.EngineerComment + ' | ' : '') + 'แก้ไขโดยวิศวกร: ' + (comment || ''),
    UpdatedAt: now_()
  });
  audit_(eng, 'EDIT_VALUES', recordId, 'ผลใหม่ ' + overall + ' ' + (comment || ''));
  return { ok: true, overall: overall };
}

// ---------- Notifications ----------
function getNotifications_(user) {
  const targets = [user.employeeId];
  if (user.role === 'engineer' || user.role === 'admin') targets.push('engineer');
  if (user.role === 'admin') targets.push('admin');
  return readTable_(SHEETS.NOTIFS)
    .filter(n => targets.indexOf(String(n.Target)) !== -1)
    .sort((a, b) => new Date(b.CreatedAt) - new Date(a.CreatedAt))
    .slice(0, 50)
    .map(n => ({ id: n.NotifID, type: n.Type, message: n.Message, recordId: n.RecordID,
                 createdAt: fmt_(n.CreatedAt, 'yyyy-MM-dd HH:mm'), read: n.Read === true || String(n.Read).toLowerCase() === 'true' }));
}
function apiGetNotifications(employeeId) {
  const user = requireUser_(employeeId);
  checkPmDue_();
  return getNotifications_(user);
}
function apiMarkNotifRead(employeeId, notifId) {
  requireUser_(employeeId);
  const r = readTable_(SHEETS.NOTIFS).find(n => String(n.NotifID) === String(notifId));
  if (r) updateRow_(SHEETS.NOTIFS, r._row, { Read: true });
  return { ok: true };
}
function apiMarkAllRead(employeeId) {
  const user = requireUser_(employeeId);
  const targets = [user.employeeId];
  if (user.role === 'engineer' || user.role === 'admin') targets.push('engineer');
  if (user.role === 'admin') targets.push('admin');
  readTable_(SHEETS.NOTIFS)
    .filter(n => targets.indexOf(String(n.Target)) !== -1 && n.Read !== true)
    .forEach(n => updateRow_(SHEETS.NOTIFS, n._row, { Read: true }));
  return { ok: true };
}

// ---------- Dashboard stats ----------
function apiDashboard(employeeId, date, shift) {
  requireUser_(employeeId);
  checkPmDue_();
  const machines = getActiveMachines_();
  const recs = readTable_(SHEETS.RECORDS).map(recordToObj_)
    .filter(r => r.date === date && (shift === 'all' || String(r.shift) === String(shift)));
  const submitted = recs.length;
  const approved = recs.filter(r => r.status === STATUS.APPROVED).length;
  const pending = recs.filter(r => r.status === STATUS.SUBMITTED).length;
  const ng = recs.filter(r => r.overall === 'NG').length;
  const checkedMachines = new Set(recs.map(r => r.machineId)).size;
  const allRecs = readTable_(SHEETS.RECORDS).map(recordToObj_);
  let pmDue = 0;
  machines.forEach(m => {
    const pm = pmCalc_(m, latestRunHour_(allRecs, m.id));
    if (pm.pmRemaining != null && pm.pmRemaining <= 0) pmDue++;
  });
  return {
    totalMachines: machines.length,
    checkedMachines: checkedMachines,
    submitted: submitted, approved: approved, pending: pending, ng: ng,
    completionPct: machines.length ? Math.round(checkedMachines / machines.length * 100) : 0,
    pmDue: pmDue
  };
}

// ---------- Audit log (admin/engineer) ----------
function apiAuditLog(employeeId, limit) {
  requireRole_(employeeId, ['admin', 'engineer']);
  limit = limit || 200;
  return readTable_(SHEETS.AUDIT)
    .sort((a, b) => new Date(b.Timestamp) - new Date(a.Timestamp))
    .slice(0, limit)
    .map(a => ({ time: fmt_(a.Timestamp, 'yyyy-MM-dd HH:mm:ss'), employeeId: String(a.EmployeeID),
                 name: a.Name, action: a.Action, recordId: a.RecordID, detail: a.Detail }));
}
