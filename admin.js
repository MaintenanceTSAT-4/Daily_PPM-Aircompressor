// ============================================================
// Admin module — manage machines, check items, user roles
// (visible only to role = 'admin')
// ============================================================
const Admin = (() => {
  let tab = "machines";

  async function render() {
    const el = document.getElementById("view-admin");
    el.innerHTML = `
      <h1 class="page-title">Admin</h1>
      <div class="sig-tabs" style="max-width:480px;margin-bottom:16px">
        <button data-t="machines" class="${tab==='machines'?'active':''}">เครื่องจักร</button>
        <button data-t="items" class="${tab==='items'?'active':''}">หัวข้อตรวจเช็ค</button>
        <button data-t="users" class="${tab==='users'?'active':''}">ผู้ใช้งาน</button>
      </div>
      <div id="adminBody"></div>`;
    el.querySelectorAll(".sig-tabs button").forEach(b => b.onclick = () => { tab = b.dataset.t; render(); });
    if (tab==="machines") await renderMachines();
    else if (tab==="items") await renderItems();
    else await renderUsers();
  }

  // ---------- Machines ----------
  async function renderMachines() {
    const machines = await loadMachines(false);
    document.getElementById("adminBody").innerHTML = `
      <div class="card">
        <h2 style="margin:0 0 12px;font-size:18px">เพิ่มเครื่องจักร</h2>
        <div class="row">
          <div><label class="fld">รหัส</label><input id="mCode" placeholder="AC-03"></div>
          <div><label class="fld">ชื่อ</label><input id="mName" placeholder="Air Compressor #3"></div>
          <div><label class="fld">ตำแหน่ง</label><input id="mLoc" placeholder="Utility Room"></div>
          <div style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-block" id="mAdd">+ เพิ่ม</button></div>
        </div>
      </div>
      <div class="card">
        <table><thead><tr><th>รหัส</th><th>ชื่อ</th><th>ตำแหน่ง</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>${machines.map(m=>`<tr>
          <td>${m.code}</td><td>${m.name}</td><td>${m.location||"-"}</td>
          <td>${m.is_active?'<span class="tag-normal">ใช้งาน</span>':'<span class="muted">ปิด</span>'}</td>
          <td class="t-right">
            <button class="btn btn-sm" data-toggle="${m.id}" data-active="${m.is_active}">${m.is_active?"ปิดใช้":"เปิดใช้"}</button>
            <button class="btn btn-sm btn-bad" data-del="${m.id}">ลบ</button>
          </td></tr>`).join("") || `<tr><td colspan="5" class="empty">ยังไม่มีเครื่องจักร</td></tr>`}
        </tbody></table>
      </div>`;

    document.getElementById("mAdd").onclick = async () => {
      const code = val("mCode"), name = val("mName"), location = val("mLoc");
      if (!code || !name) return toast("กรอกรหัสและชื่อ", "err");
      const { data, error } = await sb.from("machines").insert({ code, name, location }).select().single();
      if (error) return toast(error.message, "err");
      await logAudit("machines", data.id, "created", { code, name });
      toast("เพิ่มเครื่องจักรแล้ว", "ok"); renderMachines();
    };
    document.querySelectorAll("[data-toggle]").forEach(b => b.onclick = async () => {
      const active = b.dataset.active === "true";
      await sb.from("machines").update({ is_active: !active }).eq("id", b.dataset.toggle);
      await logAudit("machines", b.dataset.toggle, active?"deactivated":"activated", {});
      renderMachines();
    });
    document.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
      if (!confirm("ลบเครื่องจักรนี้? (ถ้ามีบันทึกตรวจเช็คอยู่จะลบไม่ได้)")) return;
      const { error } = await sb.from("machines").delete().eq("id", b.dataset.del);
      if (error) return toast("ลบไม่ได้: มีข้อมูลตรวจเช็คอ้างอิงอยู่ — ใช้ 'ปิดใช้' แทน", "err");
      await logAudit("machines", b.dataset.del, "deleted", {});
      toast("ลบแล้ว", "ok"); renderMachines();
    });
  }

  // ---------- Check items ----------
  async function renderItems() {
    const machines = await loadMachines(false);
    const { data: items } = await sb.from("check_items").select("*, machines(code)").order("sort_order");
    document.getElementById("adminBody").innerHTML = `
      <div class="card">
        <h2 style="margin:0 0 12px;font-size:18px">เพิ่มหัวข้อตรวจเช็ค</h2>
        <div class="row">
          <div><label class="fld">ชื่อหัวข้อ</label><input id="iLabel" placeholder="เช่น แรงดันลม"></div>
          <div><label class="fld">หน่วย</label><input id="iUnit" placeholder="bar"></div>
          <div><label class="fld">ชนิดข้อมูล</label>
            <select id="iType"><option value="number">ตัวเลข</option><option value="boolean">ปกติ/ผิดปกติ</option><option value="text">ข้อความ</option></select></div>
        </div>
        <div class="row" style="margin-top:10px">
          <div><label class="fld">ค่าต่ำสุด</label><input id="iMin" type="number" step="any"></div>
          <div><label class="fld">ค่าสูงสุด</label><input id="iMax" type="number" step="any"></div>
          <div><label class="fld">ใช้กับเครื่อง</label>
            <select id="iMachine"><option value="">ทุกเครื่อง (Global)</option>
              ${machines.map(m=>`<option value="${m.id}">${m.code}</option>`).join("")}</select></div>
          <div><label class="fld">ลำดับ</label><input id="iSort" type="number" value="100"></div>
          <div style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-block" id="iAdd">+ เพิ่ม</button></div>
        </div>
      </div>
      <div class="card">
        <table><thead><tr><th>ลำดับ</th><th>หัวข้อ</th><th>หน่วย</th><th>ชนิด</th><th>ช่วง</th><th>เครื่อง</th><th>สถานะ</th><th></th></tr></thead>
        <tbody>${(items||[]).map(it=>`<tr>
          <td>${it.sort_order}</td><td>${it.label}</td><td>${it.unit||"-"}</td>
          <td>${typeLabel(it.data_type)}</td>
          <td>${it.data_type==="number"?`${it.min_value??"-"}–${it.max_value??"-"}`:"-"}</td>
          <td>${it.machines?.code || "ทุกเครื่อง"}</td>
          <td>${it.is_active?'<span class="tag-normal">ใช้งาน</span>':'<span class="muted">ปิด</span>'}</td>
          <td class="t-right">
            <button class="btn btn-sm" data-toggle="${it.id}" data-active="${it.is_active}">${it.is_active?"ปิด":"เปิด"}</button>
            <button class="btn btn-sm btn-bad" data-del="${it.id}">ลบ</button>
          </td></tr>`).join("")}
        </tbody></table>
      </div>`;

    document.getElementById("iAdd").onclick = async () => {
      const label = val("iLabel");
      if (!label) return toast("กรอกชื่อหัวข้อ", "err");
      const rec = {
        item_key: label.toLowerCase().replace(/[^a-z0-9ก-๙]+/g,"_").slice(0,40) + "_" + Date.now().toString().slice(-4),
        label, unit: val("iUnit"), data_type: val("iType"),
        min_value: val("iMin")!==""?parseFloat(val("iMin")):null,
        max_value: val("iMax")!==""?parseFloat(val("iMax")):null,
        machine_id: val("iMachine") || null,
        sort_order: parseInt(val("iSort")||"100")
      };
      const { data, error } = await sb.from("check_items").insert(rec).select().single();
      if (error) return toast(error.message, "err");
      await logAudit("check_items", data.id, "created", { label });
      toast("เพิ่มหัวข้อแล้ว", "ok"); renderItems();
    };
    document.querySelectorAll("[data-toggle]").forEach(b => b.onclick = async () => {
      const active = b.dataset.active === "true";
      await sb.from("check_items").update({ is_active: !active }).eq("id", b.dataset.toggle);
      renderItems();
    });
    document.querySelectorAll("[data-del]").forEach(b => b.onclick = async () => {
      if (!confirm("ลบหัวข้อนี้? (ถ้ามีบันทึกอ้างอิงให้ใช้ 'ปิด' แทน)")) return;
      const { error } = await sb.from("check_items").delete().eq("id", b.dataset.del);
      if (error) return toast("ลบไม่ได้: มีข้อมูลอ้างอิง — ใช้ 'ปิด' แทน", "err");
      await logAudit("check_items", b.dataset.del, "deleted", {});
      toast("ลบแล้ว", "ok"); renderItems();
    });
  }

  // ---------- Users / employees ----------
  async function renderUsers() {
    const { data: users } = await sb.from("profiles").select("*").order("employee_code");
    document.getElementById("adminBody").innerHTML = `
      <div class="card">
        <h2 style="margin:0 0 4px;font-size:18px">เพิ่มพนักงาน (ผู้ตรวจเช็ค)</h2>
        <p class="small muted" style="margin:0 0 12px">พนักงานจะเข้าสู่ระบบด้วย "รหัสพนักงาน" อย่างเดียว ไม่ต้องใช้รหัสผ่าน</p>
        <div class="row">
          <div><label class="fld">รหัสพนักงาน *</label><input id="eCode" placeholder="เช่น 12345"></div>
          <div><label class="fld">ชื่อ-นามสกุล</label><input id="eName" placeholder="ชื่อผู้ตรวจ"></div>
          <div><label class="fld">สิทธิ์</label>
            <select id="eRole"><option value="operator">operator (บันทึก)</option>
              <option value="approver">approver (อนุมัติ)</option>
              <option value="admin">admin (จัดการระบบ)</option></select></div>
          <div style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-block" id="eAdd">+ เพิ่มพนักงาน</button></div>
        </div>
      </div>
      <div class="card">
        <table><thead><tr><th>รหัสพนักงาน</th><th>ชื่อ</th><th>สิทธิ์</th><th></th></tr></thead>
        <tbody>${(users||[]).map(u=>`<tr>
          <td><strong>${u.employee_code||"—"}</strong></td>
          <td>${u.full_name||"(ไม่ระบุ)"}</td>
          <td><select data-uid="${u.id}">
            ${["operator","approver","admin"].map(r=>`<option value="${r}" ${u.role===r?"selected":""}>${r}</option>`).join("")}
          </select></td>
          <td class="t-right"><button class="btn btn-sm btn-primary" data-save="${u.id}">บันทึกสิทธิ์</button></td>
        </tr>`).join("") || `<tr><td colspan="4" class="empty">ยังไม่มีพนักงาน</td></tr>`}</tbody></table>
      </div>`;

    document.getElementById("eAdd").onclick = addEmployee;
    document.querySelectorAll("[data-save]").forEach(b => b.onclick = async () => {
      const uid = b.dataset.save;
      const role = document.querySelector(`select[data-uid="${uid}"]`).value;
      const { error } = await sb.from("profiles").update({ role }).eq("id", uid);
      if (error) return toast(error.message, "err");
      await logAudit("profiles", uid, "role_changed", { role });
      toast("อัปเดตสิทธิ์แล้ว", "ok");
    });
  }

  async function addEmployee() {
    const code = val("eCode"), name = val("eName"), role = val("eRole");
    if (!code) return toast("กรุณากรอกรหัสพนักงาน", "err");

    // duplicate check
    const { data: dup } = await sb.from("profiles").select("id").eq("employee_code", normCode(code)).maybeSingle();
    if (dup) return toast("มีรหัสพนักงานนี้อยู่แล้ว", "err");

    const btn = document.getElementById("eAdd");
    btn.disabled = true; btn.textContent = "กำลังเพิ่ม...";

    // Use a throw-away client so creating the account does NOT replace the admin's session
    const tmp = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY,
      { auth: { persistSession: false, autoRefreshToken: false } });
    const { error } = await tmp.auth.signUp({
      email: codeEmail(code), password: codePassword(code),
      options: { data: { full_name: name || code, role, employee_code: normCode(code) } }
    });
    try { await tmp.auth.signOut(); } catch (e) {}

    btn.disabled = false; btn.textContent = "+ เพิ่มพนักงาน";
    if (error) {
      if (/registered|already/i.test(error.message)) return toast("มีรหัสพนักงานนี้อยู่แล้ว", "err");
      return toast("เพิ่มไม่สำเร็จ: " + error.message + " (ตรวจสอบว่าปิด Confirm email ใน Supabase แล้ว)", "err");
    }
    await logAudit("profiles", null, "employee_created", { employee_code: normCode(code), role });
    toast(`เพิ่มพนักงานรหัส ${normCode(code)} แล้ว`, "ok");
    renderUsers();
  }

  return { render };
})();

function val(id){ return document.getElementById(id).value.trim(); }
function typeLabel(t){ return {number:"ตัวเลข",boolean:"ปกติ/ผิดปกติ",text:"ข้อความ"}[t]||t; }
