// ============================================================
// PDF export — renders a styled report (Thai-safe via html2canvas)
// with embedded e-signatures and an audit-log trail, then saves
// a multi-page A4 PDF. Logs a 'pdf_exported' audit entry.
// ============================================================
const PDF = (() => {

  async function exportCheck(id) {
    toast("กำลังสร้าง PDF...", "ok");

    const { data: dc } = await sb.from("daily_checks")
      .select("*, machines(code,name,location)").eq("id", id).single();
    const { data: vals } = await sb.from("daily_check_values").select("*").eq("daily_check_id", id);
    const { data: sigs } = await sb.from("signatures").select("*").eq("daily_check_id", id);
    const { data: audit } = await sb.from("audit_logs").select("*")
      .eq("table_name","daily_checks").eq("record_id", id).order("created_at");

    const opS = (sigs||[]).find(s=>s.role==="operator");
    const apS = (sigs||[]).find(s=>s.role==="approver");

    const node = buildReport(dc, vals||[], opS, apS, audit||[]);
    document.body.appendChild(node);

    const canvas = await html2canvas(node, { scale: 2, backgroundColor: "#ffffff", useCORS: true });
    document.body.removeChild(node);

    const { jsPDF } = window.jspdf;
    const pdf = new jsPDF("p", "mm", "a4");
    const pageW = 210, pageH = 297, margin = 10;
    const imgW = pageW - margin*2;
    const imgH = canvas.height * imgW / canvas.width;

    let heightLeft = imgH, position = margin;
    const imgData = canvas.toDataURL("image/png");
    pdf.addImage(imgData, "PNG", margin, position, imgW, imgH);
    heightLeft -= (pageH - margin*2);
    while (heightLeft > 0) {
      position = margin - (imgH - heightLeft);
      pdf.addPage();
      pdf.addImage(imgData, "PNG", margin, position, imgW, imgH);
      heightLeft -= (pageH - margin*2);
    }

    const fname = `PPM_${dc.machines?.code||"machine"}_${dc.check_date}_${dc.shift}.pdf`;
    pdf.save(fname);

    await logAudit("daily_checks", id, "pdf_exported", { file: fname });
  }

  function buildReport(dc, vals, opS, apS, audit) {
    const div = document.createElement("div");
    div.style.cssText = "position:fixed;left:-9999px;top:0;width:780px;background:#fff;color:#111;"+
      "font-family:'Segoe UI',Tahoma,'Sarabun',sans-serif;padding:28px;font-size:13px;line-height:1.55";

    const sig = (s, role) => {
      if (!s) return `<div style="text-align:center;color:#999">ยังไม่ลงนาม</div>`;
      const img = (s.method==="draw" && s.signature_data)
        ? `<img src="${s.signature_data}" style="height:60px">`
        : `<div style="font-family:cursive;font-size:22px;margin:14px 0">${s.signer_name}</div>`;
      return `<div style="text-align:center">
        ${img}
        <div style="border-top:1px solid #333;margin-top:6px;padding-top:4px">
          ${s.signer_name}<br>
          <span style="color:#666;font-size:11px">${role} • ${s.method==="draw"?"ลายเซ็นวาด":"ลงชื่อแบบพิมพ์"}</span><br>
          <span style="color:#666;font-size:11px">${fmtDateTime(s.signed_at)}</span>
        </div></div>`;
    };

    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;border-bottom:3px solid #2563eb;padding-bottom:10px">
        <div>
          <div style="font-size:20px;font-weight:800">รายงานตรวจเช็คประจำวัน — Daily PPM</div>
          <div style="color:#555">Air Compressor Preventive Maintenance</div>
        </div>
        <div style="text-align:right;font-size:12px;color:#555">
          เลขที่: ${dc.id.slice(0,8).toUpperCase()}<br>พิมพ์: ${fmtDateTime(new Date().toISOString())}
        </div>
      </div>

      <table style="width:100%;margin:14px 0;font-size:13px">
        <tr><td style="width:25%;color:#555">เครื่องจักร</td><td style="font-weight:700">${dc.machines?.code} — ${dc.machines?.name}</td>
            <td style="width:18%;color:#555">วันที่</td><td style="font-weight:700">${dc.check_date}</td></tr>
        <tr><td style="color:#555">ตำแหน่ง</td><td>${dc.machines?.location||"-"}</td>
            <td style="color:#555">กะ / สถานะ</td><td>${dc.shift} / ${STATUS_LABEL[dc.status]||dc.status}</td></tr>
      </table>

      <table style="width:100%;border-collapse:collapse;font-size:12.5px">
        <thead><tr style="background:#1e293b;color:#fff">
          <th style="padding:7px;text-align:left">รายการตรวจเช็ค</th>
          <th style="padding:7px;text-align:left;width:120px">ค่าที่วัดได้</th>
          <th style="padding:7px;width:90px">สถานะ</th>
          <th style="padding:7px;text-align:left;width:160px">หมายเหตุ</th>
        </tr></thead>
        <tbody>${vals.map((v,i)=>`<tr style="background:${i%2?'#f8fafc':'#fff'}">
          <td style="padding:6px;border-bottom:1px solid #e5e7eb">${v.label}</td>
          <td style="padding:6px;border-bottom:1px solid #e5e7eb">${pdfVal(v)}</td>
          <td style="padding:6px;border-bottom:1px solid #e5e7eb;text-align:center;color:${v.is_normal?'#16a34a':'#dc2626'};font-weight:700">
            ${v.is_normal?'ปกติ':'ผิดปกติ'}</td>
          <td style="padding:6px;border-bottom:1px solid #e5e7eb">${v.note||""}</td>
        </tr>`).join("")}</tbody>
      </table>

      <div style="display:flex;gap:30px;margin-top:26px">
        <div style="flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:14px">
          <div style="font-weight:700;margin-bottom:6px">ผู้ตรวจ (Operator)</div>${sig(opS,"Operator")}
        </div>
        <div style="flex:1;border:1px solid #e5e7eb;border-radius:8px;padding:14px">
          <div style="font-weight:700;margin-bottom:6px">ผู้อนุมัติ (Approver)</div>${sig(apS,"Approver")}
        </div>
      </div>

      <div style="margin-top:24px">
        <div style="font-weight:700;border-bottom:1px solid #e5e7eb;padding-bottom:4px;margin-bottom:6px">
          Audit Log — ประวัติการดำเนินการ</div>
        <table style="width:100%;border-collapse:collapse;font-size:11.5px;color:#333">
          <thead><tr style="color:#666;text-align:left">
            <th style="padding:4px">เวลา</th><th style="padding:4px">ผู้ดำเนินการ</th><th style="padding:4px">การกระทำ</th><th style="padding:4px">รายละเอียด</th>
          </tr></thead>
          <tbody>${audit.length ? audit.map(a=>`<tr>
            <td style="padding:4px;border-top:1px solid #eee">${fmtDateTime(a.created_at)}</td>
            <td style="padding:4px;border-top:1px solid #eee">${a.actor_name||"-"}</td>
            <td style="padding:4px;border-top:1px solid #eee">${auditLabel(a.action)}</td>
            <td style="padding:4px;border-top:1px solid #eee;color:#666">${a.details&&a.details.reason?a.details.reason:""}</td>
          </tr>`).join("") : `<tr><td colspan="4" style="padding:6px;color:#999">ไม่มีประวัติ</td></tr>`}</tbody>
        </table>
      </div>

      <div style="margin-top:18px;text-align:center;color:#999;font-size:10.5px;border-top:1px solid #e5e7eb;padding-top:6px">
        เอกสารนี้สร้างจากระบบ Daily PPM Air Compressor — ลายเซ็นอิเล็กทรอนิกส์มีผลตามที่บันทึกในระบบ
      </div>`;
    return div;
  }

  function pdfVal(v){
    if (v.data_type==="boolean") return v.value_bool ? "ปกติ / เปิดแล้ว" : "ผิดปกติ / ยังไม่";
    if (v.data_type==="text") return v.value_text || "-";
    return (v.value_number!=null ? v.value_number : "-") + (v.unit ? " "+v.unit : "");
  }
  function auditLabel(a){
    return { created:"สร้างรายการ", saved_draft:"บันทึกแบบร่าง", submitted:"ส่งขออนุมัติ",
      approved:"อนุมัติ", rejected:"ตีกลับ", pdf_exported:"ออก PDF" }[a] || a;
  }

  return { exportCheck };
})();
