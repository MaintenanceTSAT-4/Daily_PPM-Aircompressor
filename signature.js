// ============================================================
// SignatureWidget — typed e-signature (name + auto timestamp).
// (Image/drawn signatures were removed when moving to Google Sheet.)
// .getData() returns null if empty, else { signer_name }
// ============================================================
class SignatureWidget {
  constructor(container, opts = {}) {
    this.container = container;
    this.defaultName = opts.defaultName || "";
    this.title = opts.title || "ลายเซ็น";
    this.render();
  }

  render() {
    const stamp = new Date().toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
    this.container.innerHTML = `
      <div class="sig-box">
        <strong>${this.title}</strong>
        <label class="fld" style="margin-top:8px">ชื่อ-นามสกุล ผู้ลงนาม</label>
        <input type="text" class="sig-typed-name" value="${this.defaultName}" placeholder="พิมพ์ชื่อเต็ม" />
        <p class="small muted" style="margin:8px 0 0">🖋️ ลงนามอิเล็กทรอนิกส์ • บันทึกชื่อพร้อมวันที่/เวลาเป็นหลักฐาน</p>
        <p class="small muted" style="margin:2px 0 0">เวลาปัจจุบัน: ${stamp}</p>
      </div>`;
  }

  getData() {
    const name = this.container.querySelector(".sig-typed-name").value.trim();
    if (!name) return null;
    return { signer_name: name };
  }
}
