// ============================================================
// Dashboard + Approvals + shared detail modal
// ============================================================

async function fetchChecks(filter = {}) {
  let q = sb.from("daily_checks")
    .select("*, machines(code,name)")
    .order("check_date", { ascending: false })
    .order("created_at", { ascending: false });
  if (filter.status) q = q.eq("status", filter.status);
  if (filter.machine) q = q.eq("machine_id", filter.machine);
  if (filter.from) q = q.gte("check_date", filter.from);
  if (filter.to) q = q.lte("check_date", filter.to);
  const { data } = await q.limit(300);
  return data || [];
}

async function countPending() {
  const { count } = await sb.from("daily_checks")
    .select("id", { count: "exact", head: true }).eq("status", "submitted");
  return count || 0;
}

const Dashboard = (() => {
  async function render() {
    const el = document.getElementById("view-dashboard");
    const machines = await loadMachines(false);
    const all = await fetchChecks();
    const c = { draft:0, submitted:0, approved:0, rejected:0 };
    all.forEach(r => c[r.status]++);

    el.innerHTML = `
      <h1 class="page-title">Production Overview</h1>
      <p class="page-sub">ภาพรวมการตรวจเช็คเครื่องอัดอากาศ • ${new Date().toLocaleDateString("th-TH",{dateStyle:"full"})}</p>

      <div class="stat-grid">
        <div class="stat acc-blue"><span class="ic">📋</span>
          <div class="l">รายการทั้งหมด</div><div class="n">${all.length}</div><div class="f">ทุกสถานะ</div></div>
        <div class="stat acc-amber"><span class="ic">⏳</span>
          <div class="l">รออนุมัติ</div><div class="n">${c.submitted}</div><div class="f">ต้องดำเนินการ</div></div>
        <div class="stat acc-green"><span class="ic">✅</span>
          <div class="l">อนุมัติแล้ว</div><div class="n">${c.approved}</div><div class="f">เสร็จสมบูรณ์</div></div>
        <div class="stat acc-red"><span class="ic">↩️</span>
          <div class="l">ตีกลับ</div><div class="n">${c.rejected}</div><div class="f">ต้องแก้ไข</div></div>
      </div>

      <div class="section-title">สถานะเครื่องจักรวันนี้ (${todayStr()})</div>
      <div class="line-grid" id="lineGrid" style="margin-bottom:24px"></div>

      <div class="card">
        <div class="row" style="margin-bottom:12px">
          <div><label class="fld">สถานะ</label>
            <select id="fStatus"><option value="">ทั้งหมด</option>
              ${Object.entries(STATUS_LABEL).map(([k,v])=>`<option value="${k}">${v}</option>`).join("")}
            </select></div>
          <div><label class="fld">เครื่องจักร</label>
            <select id="fMachine"><option value="">ทั้งหมด</option>
              ${machines.map(m=>`<option value="${m.id}">${m.code}</option>`).join("")}
            </select></div>
          <div><label class="fld">ตั้งแต่</label><input type="date" id="fFrom" /></div>
          <div><label class="fld">ถึง</label><input type="date" id="fTo" /></div>
          <div style="display:flex;align-items:flex-end"><button class="btn btn-primary btn-block" id="fApply">กรอง</button></div>
        </div>
        <div id="dashTable"></div>
      </div>`;

    document.getElementById("fApply").onclick = applyFilter;
    drawTable(all);
    drawLineCards(machines.filter(m => m.is_active), all);
  }

  function drawLineCards(machines, all) {
    const today = todayStr();
    const grid = document.getElementById("lineGrid");
    if (!grid) return;
    if (!machines.length) { grid.innerHTML = `<div class="empty">ยังไม่มีเครื่องจักร</div>`; return; }

    grid.innerHTML = machines.map(m => {
      const todays = all.filter(r => r.machine_id === m.id && r.check_date === today);
      const has = todays.length > 0;
      const approved = todays.some(r => r.status === "approved");
      const submitted = todays.some(r => r.status === "submitted");
      let led = "off", lf = "off", ftxt = "ยังไม่ตรวจวันนี้", pct = 0;
      if (approved) { led = "on"; lf = "ok"; ftxt = "✓ อนุมัติแล้ว"; pct = 100; }
      else if (submitted) { led = "wait"; lf = "wait"; ftxt = "⏳ รออนุมัติ"; pct = 66; }
      else if (has) { led = "wait"; lf = "wait"; ftxt = "📝 แบบร่าง"; pct = 33; }
      return `<div class="line-card">
        <div class="lh">
          <div><div class="code">${m.code}</div><div class="loc">${m.name}</div></div>
          <span class="led ${led}"></span>
        </div>
        <div class="big">${todays.length}<span style="font-size:14px;color:var(--muted);font-weight:600"> รายการ</span></div>
        <div class="bar"><i style="width:${pct}%"></i></div>
        <div class="lf ${lf}">${ftxt}</div>
      </div>`;
    }).join("");
  }

  async function applyFilter() {
    const data = await fetchChecks({
      status: document.getElementById("fStatus").value,
      machine: document.getElementById("fMachine").value,
      from: document.getElementById("fFrom").value || null,
      to: document.getElementById("fTo").value || null
    });
    drawTable(data);
  }

  function drawTable(rows) {
    const box = document.getElementById("dashTable");
    if (!rows.length) { box.innerHTML = `<div class="empty">ไม่มีข้อมูล</div>`; return; }
    box.innerHTML = `<table><thead><tr>
      <th>วันที่</th><th>เครื่องจักร</th><th>กะ</th><th>สถานะ</th><th>ผู้ตรวจ</th><th>ผู้อนุมัติ</th><th></th>
      </tr></thead><tbody>
      ${rows.map(r=>`<tr>
        <td>${r.check_date}</td>
        <td>${r.machines?.code||"-"} ${r.machines?.name||""}</td>
        <td class="t-center">${r.shift}</td>
        <td>${statusPill(r.status)}</td>
        <td>${r.created_by_name||"-"}</td>
        <td>${r.approved_by_name||"-"}</td>
        <td class="t-right"><button class="btn btn-sm" data-id="${r.id}">เปิด</button></td>
      </tr>`).join("")}
      </tbody></table>`;
    box.querySelectorAll("button[data-id]").forEach(b => b.onclick = () => Detail.open(b.dataset.id));
  }

  return { render };
})();

const Approvals = (() => {
  async function render() {
    const el = document.getElementById("view-approvals");
    const rows = await fetchChecks({ status: "submitted" });
    const canApprove = ["approver","admin"].includes(window.AppState.profile.role);

    el.innerHTML = `
      <h1 class="page-title">รออนุมัติ ${rows.length ? `(${rows.length})` : ""}</h1>
      ${!canApprove ? `<div class="card"><p class="muted">บัญชีของคุณเป็น Operator — ดูได้แต่ไม่สามารถอนุมัติได้ (ต้องเป็น Approver/Admin)</p></div>` : ""}
      <div class="card">
        ${rows.length ? `<table><thead><tr>
          <th>วันที่</th><th>เครื่องจักร</th><th>กะ</th><th>ผู้ตรวจ</th><th>ส่งเมื่อ</th><th></th>
        </tr></thead><tbody>
        ${rows.map(r=>`<tr>
          <td>${r.check_date}</td>
          <td>${r.machines?.code||"-"}</td>
          <td class="t-center">${r.shift}</td>
          <td>${r.created_by_name||"-"}</td>
          <td>${fmtDateTime(r.submitted_at)}</td>
          <td class="t-right"><button class="btn btn-sm btn-primary" data-id="${r.id}">ตรวจสอบ</button></td>
        </tr>`).join("")}
        </tbody></table>` : `<div class="empty">ไม่มีรายการรออนุมัติ 🎉</div>`}
      </div>`;
    el.querySelectorAll("button[data-id]").forEach(b => b.onclick = () => Detail.open(b.dataset.id));
  }
  return { render };
})();

// ---------- Shared detail / approval modal ----------
const Detail = (() => {
  let apprSig = null;

  async function open(id) {
    const { data: dc } = await sb.from("daily_checks")
      .select("*, machines(code,name,location)").eq("id", id).single();
    const { data: vals } = await sb.from("daily_check_values").select("*").eq("daily_check_id", id);
    const { data: sigs } = await sb.from("signatures").select("*").eq("daily_check_id", id);
    const opS = (sigs||[]).find(s=>s.role==="operator");
    const apS = (sigs||[]).find(s=>s.role==="approver");

    const prof = window.AppState.profile;
    const canApprove = ["approver","admin"].includes(prof.role) && dc.status === "submitted";

    const root = document.getElementById("modalRoot");
    root.innerHTML = `
      <div class="modal-bg" id="mbg">
        <div class="modal">
          <button class="close" id="mClose">×</button>
          <h2>${dc.machines?.code} — ${dc.machines?.name}</h2>
          <p class="muted small">วันที่ ${dc.check_date} • กะ ${dc.shift} • ${statusPill(dc.status)}</p>
          ${dc.status==="rejected"&&dc.reject_reason?`<p class="small" style="color:var(--bad)">⚠️ ${dc.reject_reason}</p>`:""}

          <table style="margin-top:10px"><thead><tr><th>รายการ</th><th>ค่า</th><th>สถานะ</th><th>หมายเหตุ</th></tr></thead>
          <tbody>${(vals||[]).map(v=>`<tr>
            <td>${v.label}</td>
            <td>${displayVal(v)}</td>
            <td>${v.is_normal?'<span class="tag-normal">ปกติ</span>':'<span class="tag-abnormal">ผิดปกติ</span>'}</td>
            <td class="small">${v.note||""}</td>
          </tr>`).join("")}</tbody></table>

          <div class="sig-grid" style="margin-top:16px">
            <div class="sig-box">
              <strong>ผู้ตรวจ (Operator)</strong>
              ${sigView(opS)}
            </div>
            <div class="sig-box">
              <strong>ผู้อนุมัติ (Approver)</strong>
              ${apS ? sigView(apS) : '<p class="small muted">ยังไม่ลงนาม</p>'}
            </div>
          </div>

          ${canApprove ? `
            <hr style="margin:18px 0;border:none;border-top:1px solid var(--line)">
            <h3 style="margin:0 0 8px">ลงนามอนุมัติ</h3>
            <div id="apprSig"></div>
            <label class="fld" style="margin-top:12px">เหตุผล (กรณีตีกลับ)</label>
            <input type="text" id="rejReason" placeholder="ระบุเหตุผลหากต้องตีกลับ" />
            <div class="flex" style="margin-top:14px">
              <button class="btn btn-ok" id="btnApprove">✅ อนุมัติ</button>
              <button class="btn btn-bad" id="btnReject">↩️ ตีกลับ</button>
              <button class="btn" id="btnPdf">📄 PDF</button>
            </div>` : `
            <div class="flex" style="margin-top:16px">
              <button class="btn btn-primary" id="btnPdf">📄 ออก PDF</button>
            </div>`}
        </div>
      </div>`;

    document.getElementById("mClose").onclick = close;
    document.getElementById("mbg").onclick = (e)=>{ if(e.target.id==="mbg") close(); };
    document.getElementById("btnPdf").onclick = () => PDF.exportCheck(id);

    if (canApprove) {
      apprSig = new SignatureWidget(document.getElementById("apprSig"), { defaultName: prof.full_name, title:"Approver" });
      document.getElementById("btnApprove").onclick = () => decide(dc, "approved");
      document.getElementById("btnReject").onclick = () => decide(dc, "rejected");
    }
  }

  async function decide(dc, status) {
    const prof = window.AppState.profile;
    const reason = (document.getElementById("rejReason")||{}).value?.trim() || "";
    if (status === "rejected" && !reason) return toast("กรุณาระบุเหตุผลการตีกลับ", "err");

    if (status === "approved") {
      const sig = apprSig.getData();
      if (!sig) return toast("กรุณาลงลายเซ็นผู้อนุมัติก่อน", "err");
      await sb.from("signatures").upsert({
        daily_check_id: dc.id, role: "approver", method: sig.method,
        signer_id: prof.id, signer_name: sig.signer_name || prof.full_name,
        signature_data: sig.signature_data, signed_at: new Date().toISOString()
      }, { onConflict: "daily_check_id,role" });
    }

    const { error } = await sb.from("daily_checks").update({
      status,
      approved_by: prof.id, approved_by_name: prof.full_name,
      approved_at: new Date().toISOString(),
      reject_reason: status === "rejected" ? reason : ""
    }).eq("id", dc.id);
    if (error) return toast("ไม่สำเร็จ: " + error.message, "err");

    await logAudit("daily_checks", dc.id, status, { reason });
    toast(status === "approved" ? "อนุมัติเรียบร้อย" : "ตีกลับเรียบร้อย", "ok");
    close();
    App.refreshBadge();
    App.reloadCurrent();
  }

  function close(){ document.getElementById("modalRoot").innerHTML = ""; }
  return { open };
})();

function displayVal(v){
  if (v.data_type==="boolean") return v.value_bool ? "ปกติ/เปิดแล้ว" : "ผิดปกติ/ยังไม่";
  if (v.data_type==="text") return v.value_text || "-";
  return (v.value_number!=null ? v.value_number : "-") + (v.unit ? " "+v.unit : "");
}
function sigView(s){
  if (!s) return '<p class="small muted">ยังไม่ลงนาม</p>';
  const who = `<div class="small">${s.signer_name}<br><span class="muted">${fmtDateTime(s.signed_at)}</span></div>`;
  if (s.method==="draw" && s.signature_data)
    return `<div class="sig-saved"><img src="${s.signature_data}" alt="signature">${who}</div>`;
  return `<div class="sig-saved"><div style="font-family:cursive;font-size:20px">${s.signer_name}</div>${who}</div>`;
}
