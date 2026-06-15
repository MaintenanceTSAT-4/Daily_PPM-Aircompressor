// ============================================================
// Daily Check view — create / edit a daily inspection record
// ============================================================
const DailyCheck = (() => {
  let machines = [];
  let items = [];          // applicable check items for selected machine
  let current = null;      // loaded daily_check header (or null for new)
  let opSig = null;        // SignatureWidget instance

  async function render() {
    const el = document.getElementById("view-check");
    machines = await loadMachines();

    el.innerHTML = `
      <h1 class="page-title">บันทึกตรวจเช็คประจำวัน</h1>
      <div class="card">
        <div class="row">
          <div>
            <label class="fld">เครื่องจักร</label>
            <select id="dcMachine">
              ${machines.length ? machines.map(m => `<option value="${m.id}">${m.code} — ${m.name}</option>`).join("")
                                : `<option value="">(ยังไม่มีเครื่องจักร — เพิ่มในเมนู Admin)</option>`}
            </select>
          </div>
          <div>
            <label class="fld">วันที่</label>
            <input type="date" id="dcDate" value="${todayStr()}" />
          </div>
          <div>
            <label class="fld">กะ (Shift)</label>
            <select id="dcShift">${SHIFTS.map(s => `<option>${s}</option>`).join("")}</select>
          </div>
          <div style="display:flex;align-items:flex-end">
            <button class="btn btn-primary btn-block" id="dcLoad">เปิดแบบฟอร์ม</button>
          </div>
        </div>
      </div>
      <div id="dcForm"></div>`;

    document.getElementById("dcLoad").onclick = openForm;
    if (machines.length) openForm();
  }

  async function openForm() {
    const machineId = document.getElementById("dcMachine").value;
    const date = document.getElementById("dcDate").value;
    const shift = document.getElementById("dcShift").value;
    if (!machineId) return toast("กรุณาเพิ่มเครื่องจักรก่อน", "err");

    items = await loadItems(machineId);

    // existing record?
    const { data: existing } = await sb.from("daily_checks").select("*")
      .eq("machine_id", machineId).eq("check_date", date).eq("shift", shift).maybeSingle();

    current = existing || null;
    let savedValues = {};
    if (current) {
      const { data: vals } = await sb.from("daily_check_values").select("*").eq("daily_check_id", current.id);
      (vals || []).forEach(v => savedValues[v.item_key] = v);
    }

    const locked = current && ["submitted", "approved"].includes(current.status);
    const box = document.getElementById("dcForm");

    box.innerHTML = `
      <div class="card">
        <div class="flex-between">
          <h2 style="margin:0;font-size:18px">รายการตรวจเช็ค</h2>
          <span>${current ? statusPill(current.status) : `<span class="pill draft">ใหม่</span>`}</span>
        </div>
        ${current && current.status === "rejected" && current.reject_reason
            ? `<p class="small" style="color:var(--bad);margin:8px 0 0">⚠️ ถูกตีกลับ: ${current.reject_reason}</p>` : ""}
        <div id="dcItems" style="margin-top:12px">
          ${items.map(it => itemRow(it, savedValues[it.item_key])).join("")}
        </div>
      </div>

      <div class="card">
        <h2 style="margin:0 0 10px;font-size:18px">ลายเซ็นผู้ตรวจ (Operator)</h2>
        <div id="opSig"></div>
      </div>

      <div class="flex" style="margin-bottom:30px">
        <button class="btn" id="dcDraft" ${locked ? "disabled" : ""}>💾 บันทึกแบบร่าง</button>
        <button class="btn btn-primary" id="dcSubmit" ${locked ? "disabled" : ""}>📤 ส่งขออนุมัติ</button>
        ${current ? `<button class="btn" id="dcPdf">📄 ออก PDF</button>` : ""}
        ${locked ? `<span class="small muted">รายการนี้ถูกส่งแล้ว ไม่สามารถแก้ไขได้</span>` : ""}
      </div>`;

    // wire boolean toggles + range checks
    box.querySelectorAll(".toggle button").forEach(b => b.onclick = () => {
      const grp = b.parentElement;
      grp.querySelectorAll("button").forEach(x => x.classList.remove("sel-ok", "sel-bad"));
      b.classList.add(b.dataset.v === "1" ? "sel-ok" : "sel-bad");
      grp.dataset.val = b.dataset.v;
    });
    box.querySelectorAll("input[data-type=number]").forEach(inp => inp.oninput = () => checkRange(inp));

    const prof = window.AppState.profile;
    opSig = new SignatureWidget(document.getElementById("opSig"), {
      defaultName: prof.full_name, title: "Operator"
    });

    if (!locked) {
      document.getElementById("dcDraft").onclick = () => save("draft");
      document.getElementById("dcSubmit").onclick = () => save("submitted");
    }
    if (current) document.getElementById("dcPdf").onclick = () => PDF.exportCheck(current.id);
  }

  function itemRow(it, saved) {
    const noteVal = saved ? (saved.note || "") : "";
    if (it.data_type === "boolean") {
      const v = saved ? (saved.value_bool ? "1" : "0") : "";
      return `<div class="item" data-key="${it.item_key}" data-item="${it.id}" data-type="boolean">
        <div class="lbl">${it.label}</div>
        <div class="toggle" data-val="${v}">
          <button type="button" data-v="1" class="${v==="1"?"sel-ok":""}">ปกติ / เปิดแล้ว</button>
          <button type="button" data-v="0" class="${v==="0"?"sel-bad":""}">ผิดปกติ / ยังไม่</button>
        </div>
        <div></div>
        <input class="note" type="text" placeholder="หมายเหตุ" value="${noteVal}" />
      </div>`;
    }
    if (it.data_type === "text") {
      return `<div class="item" data-key="${it.item_key}" data-item="${it.id}" data-type="text">
        <div class="lbl">${it.label}</div>
        <input type="text" data-type="text" value="${saved ? (saved.value_text||"") : ""}" placeholder="ค่า" />
        <div></div>
        <input class="note" type="text" placeholder="หมายเหตุ" value="${noteVal}" />
      </div>`;
    }
    // number
    const range = (it.min_value!=null||it.max_value!=null)
      ? `<span class="range-hint">ช่วง ${it.min_value ?? "-"}–${it.max_value ?? "-"}</span>` : "";
    return `<div class="item" data-key="${it.item_key}" data-item="${it.id}" data-type="number"
              data-min="${it.min_value ?? ""}" data-max="${it.max_value ?? ""}">
        <div class="lbl">${it.label}<span class="unit">${it.unit||""}</span><br>${range}</div>
        <input type="number" step="any" data-type="number" value="${saved && saved.value_number!=null ? saved.value_number : ""}" placeholder="0" />
        <div></div>
        <input class="note" type="text" placeholder="หมายเหตุ" value="${noteVal}" />
      </div>`;
  }

  function checkRange(inp) {
    const item = inp.closest(".item");
    const min = item.dataset.min !== "" ? parseFloat(item.dataset.min) : null;
    const max = item.dataset.max !== "" ? parseFloat(item.dataset.max) : null;
    const val = parseFloat(inp.value);
    let bad = false;
    if (!isNaN(val)) { if (min!=null && val<min) bad=true; if (max!=null && val>max) bad=true; }
    inp.classList.toggle("out-of-range", bad);
  }

  function collectValues() {
    const rows = document.querySelectorAll("#dcItems .item");
    const out = [];
    for (const r of rows) {
      const type = r.dataset.type;
      const note = r.querySelector(".note").value.trim();
      const it = items.find(i => i.id === r.dataset.item);
      let value_number=null, value_bool=null, value_text=null, is_normal=true;
      if (type === "number") {
        const raw = r.querySelector("input[data-type=number]").value;
        value_number = raw === "" ? null : parseFloat(raw);
        const min = r.dataset.min!=="" ? parseFloat(r.dataset.min):null;
        const max = r.dataset.max!=="" ? parseFloat(r.dataset.max):null;
        if (value_number!=null){ if(min!=null&&value_number<min) is_normal=false; if(max!=null&&value_number>max) is_normal=false; }
      } else if (type === "boolean") {
        const v = r.querySelector(".toggle").dataset.val;
        value_bool = v === "1" ? true : (v === "0" ? false : null);
        is_normal = value_bool === true;
      } else {
        value_text = r.querySelector("input[data-type=text]").value.trim() || null;
      }
      out.push({ check_item_id: it.id, item_key: it.item_key, label: it.label, unit: it.unit,
                 data_type: type, value_number, value_bool, value_text, is_normal, note });
    }
    return out;
  }

  async function save(targetStatus) {
    const prof = window.AppState.profile;
    const machineId = document.getElementById("dcMachine").value;
    const date = document.getElementById("dcDate").value;
    const shift = document.getElementById("dcShift").value;

    const sig = opSig.getData();
    if (targetStatus === "submitted" && !sig)
      return toast("กรุณาลงลายเซ็นผู้ตรวจก่อนส่งขออนุมัติ", "err");

    const values = collectValues();

    // upsert header
    let header = current;
    if (!header) {
      const { data, error } = await sb.from("daily_checks").insert({
        machine_id: machineId, check_date: date, shift,
        status: targetStatus, created_by: prof.id, created_by_name: prof.full_name,
        submitted_at: targetStatus === "submitted" ? new Date().toISOString() : null
      }).select().single();
      if (error) return toast("บันทึกไม่สำเร็จ: " + error.message, "err");
      header = data;
      await logAudit("daily_checks", header.id, "created", { machine: machineId, date, shift });
    } else {
      const { error } = await sb.from("daily_checks").update({
        status: targetStatus,
        submitted_at: targetStatus === "submitted" ? new Date().toISOString() : header.submitted_at,
        reject_reason: targetStatus === "submitted" ? "" : header.reject_reason
      }).eq("id", header.id);
      if (error) return toast("อัปเดตไม่สำเร็จ: " + error.message, "err");
    }

    // replace values
    await sb.from("daily_check_values").delete().eq("daily_check_id", header.id);
    await sb.from("daily_check_values").insert(values.map(v => ({ daily_check_id: header.id, ...v })));

    // operator signature
    if (sig) {
      await sb.from("signatures").upsert({
        daily_check_id: header.id, role: "operator", method: sig.method,
        signer_id: prof.id, signer_name: sig.signer_name || prof.full_name,
        signature_data: sig.signature_data, signed_at: new Date().toISOString()
      }, { onConflict: "daily_check_id,role" });
    }

    await logAudit("daily_checks", header.id,
      targetStatus === "submitted" ? "submitted" : "saved_draft",
      { values_count: values.length });

    current = header;
    toast(targetStatus === "submitted" ? "ส่งขออนุมัติเรียบร้อย" : "บันทึกแบบร่างแล้ว", "ok");
    openForm();
  }

  return { render };
})();

// ---- shared data loaders (used by several views) ----
async function loadMachines(activeOnly = true) {
  let q = sb.from("machines").select("*").order("sort_order").order("code");
  if (activeOnly) q = q.eq("is_active", true);
  const { data } = await q;
  return data || [];
}
async function loadItems(machineId) {
  // global items (machine_id null) + machine-specific
  const { data } = await sb.from("check_items").select("*")
    .eq("is_active", true)
    .or(`machine_id.is.null,machine_id.eq.${machineId}`)
    .order("sort_order");
  return data || [];
}
function todayStr(){ return new Date().toISOString().slice(0,10); }
function statusPill(s){ return `<span class="pill ${s}">${STATUS_LABEL[s]||s}</span>`; }
