/*************************************************************
 * Auth.gs — Login by Employee ID only + server-side role checks
 *************************************************************/

// Login: employee ID only (no password), as specified.
function apiLogin(employeeId) {
  employeeId = String(employeeId || '').trim();
  if (!employeeId) return { ok: false, error: 'กรุณากรอกรหัสพนักงาน' };
  const u = findUser_(employeeId);
  if (!u) return { ok: false, error: 'ไม่พบรหัสพนักงานนี้ในระบบ' };
  if (String(u.Active).toLowerCase() === 'false' || u.Active === false)
    return { ok: false, error: 'บัญชีนี้ถูกปิดการใช้งาน' };

  const user = { employeeId: String(u.EmployeeID), name: u.Name, role: String(u.Role).toLowerCase() };
  audit_(user, 'LOGIN', '', 'เข้าสู่ระบบ');
  return { ok: true, user: user };
}

function findUser_(employeeId) {
  employeeId = String(employeeId).trim();
  return readTable_(SHEETS.USERS)
    .find(r => String(r.EmployeeID).trim() === employeeId) || null;
}

// Re-validate identity + role on every sensitive server call.
function requireUser_(employeeId) {
  const u = findUser_(employeeId);
  if (!u) throw new Error('Unauthorized: unknown employee.');
  if (u.Active === false || String(u.Active).toLowerCase() === 'false')
    throw new Error('Unauthorized: inactive account.');
  return { employeeId: String(u.EmployeeID), name: u.Name, role: String(u.Role).toLowerCase() };
}

function requireRole_(employeeId, roles) {
  const user = requireUser_(employeeId);
  if (roles.indexOf(user.role) === -1)
    throw new Error('Forbidden: requires ' + roles.join('/') + '.');
  return user;
}
