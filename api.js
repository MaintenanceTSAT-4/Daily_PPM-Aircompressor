// ============================================================
// API — talks to the Google Apps Script web app (Google Sheet DB)
// Uses text/plain POST to avoid CORS preflight (Apps Script friendly).
// ============================================================
const API = (() => {

  async function call(action, payload = {}) {
    const sess = getSession();
    const body = Object.assign({ action, actorCode: sess ? sess.code : "" }, payload);
    let res;
    try {
      res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "text/plain;charset=utf-8" },
        body: JSON.stringify(body)
      });
    } catch (e) {
      throw new Error("เชื่อมต่อ Google Sheet ไม่ได้ — ตรวจสอบ API_URL และการ Deploy");
    }
    let data;
    try { data = await res.json(); }
    catch (e) { throw new Error("ตอบกลับไม่ถูกต้องจากเซิร์ฟเวอร์ (ตรวจสอบการ Deploy Apps Script)"); }
    if (data && data.ok === false) throw new Error(data.error || "เกิดข้อผิดพลาด");
    return data;
  }

  return {
    call,
    ping:           () => call("ping"),
    bootstrapAdmin: (code, name) => call("bootstrapAdmin", { code, name }),
    login:          (code) => call("login", { code }),

    listMachines:   (activeOnly=true) => call("listMachines", { activeOnly }).then(r=>r.data),
    listItems:      (machineId) => call("listItems", { machineId }).then(r=>r.data),
    listChecks:     (filter={}) => call("listChecks", filter).then(r=>r.data),
    countPending:   () => call("countPending").then(r=>r.count),
    getCheck:       (machineId, date, shift) => call("getCheck", { machineId, date, shift }).then(r=>r.data),
    getCheckById:   (id) => call("getCheckById", { id }).then(r=>r.data),
    saveCheck:      (header, values, signature) => call("saveCheck", { header, values, signature }),
    decide:         (id, status, reason, signerName) => call("decide", { id, status, reason, signerName }),

    listUsers:      () => call("listUsers").then(r=>r.data),
    addEmployee:    (code, name, role) => call("addEmployee", { code, name, role }),
    setRole:        (code, role) => call("setRole", { code, role }),

    addMachine:     (code, name, location) => call("addMachine", { code, name, location }),
    toggleMachine:  (id) => call("toggleMachine", { id }),
    deleteMachine:  (id) => call("deleteMachine", { id }),

    addItem:        (item) => call("addItem", item),
    toggleItem:     (id) => call("toggleItem", { id }),
    deleteItem:     (id) => call("deleteItem", { id })
  };
})();
