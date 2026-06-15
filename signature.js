// ============================================================
// SignatureWidget — supports BOTH e-signature styles:
//   • "draw"  : freehand canvas (signature_pad)
//   • "typed" : typed full name + auto timestamp
// Renders a small UI inside a container element.
// .getData() returns null if nothing captured, else:
//   { method, signer_name, signature_data }   (signature_data = PNG dataURL or null)
// ============================================================
class SignatureWidget {
  constructor(container, opts = {}) {
    this.container = container;
    this.defaultName = opts.defaultName || "";
    this.title = opts.title || "ลายเซ็น";
    this.method = "draw";
    this.pad = null;
    this.render();
  }

  render() {
    this.container.innerHTML = `
      <div class="sig-box">
        <strong>${this.title}</strong>
        <div class="sig-tabs">
          <button type="button" data-m="draw" class="active">✍️ วาดลายเซ็น</button>
          <button type="button" data-m="typed">⌨️ พิมพ์ชื่อ</button>
        </div>
        <div class="sig-pane" data-pane="draw">
          <canvas class="sigpad"></canvas>
          <div class="flex-between" style="margin-top:6px">
            <span class="small muted">เซ็นด้วยเมาส์หรือนิ้ว</span>
            <button type="button" class="btn btn-sm sig-clear">ล้าง</button>
          </div>
        </div>
        <div class="sig-pane hidden" data-pane="typed">
          <label class="fld">ชื่อ-นามสกุล ผู้ลงนาม</label>
          <input type="text" class="sig-typed-name" value="${this.defaultName}" placeholder="พิมพ์ชื่อเต็ม" />
          <p class="small muted" style="margin:6px 0 0">ระบบจะบันทึกชื่อพร้อมวันที่/เวลาเป็นหลักฐาน</p>
        </div>
      </div>`;

    const tabs = this.container.querySelectorAll(".sig-tabs button");
    tabs.forEach(b => b.onclick = () => this.switch(b.dataset.m));

    const canvas = this.container.querySelector("canvas.sigpad");
    this._resizeCanvas(canvas);
    this.pad = new SignaturePad(canvas, { penColor: "#0f172a", minWidth: 0.8, maxWidth: 2.2 });
    this.container.querySelector(".sig-clear").onclick = () => this.pad.clear();
    this._canvas = canvas;
  }

  _resizeCanvas(canvas) {
    const ratio = Math.max(window.devicePixelRatio || 1, 1);
    const rect = canvas.getBoundingClientRect();
    canvas.width = (rect.width || 300) * ratio;
    canvas.height = 140 * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
  }

  switch(m) {
    this.method = m;
    this.container.querySelectorAll(".sig-tabs button")
      .forEach(b => b.classList.toggle("active", b.dataset.m === m));
    this.container.querySelectorAll(".sig-pane")
      .forEach(p => p.classList.toggle("hidden", p.dataset.pane !== m));
  }

  getData() {
    if (this.method === "draw") {
      if (!this.pad || this.pad.isEmpty()) return null;
      return { method: "draw", signer_name: this.defaultName, signature_data: this.pad.toDataURL("image/png") };
    } else {
      const name = this.container.querySelector(".sig-typed-name").value.trim();
      if (!name) return null;
      return { method: "typed", signer_name: name, signature_data: null };
    }
  }
}
