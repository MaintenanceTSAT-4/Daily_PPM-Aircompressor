// ============================================================
// Configuration — Google Sheet backend (via Apps Script web app)
// 1) Follow SETUP_GOOGLE_SHEET.md to create the Sheet + Apps Script
// 2) Deploy the Apps Script as a Web App and copy its URL
// 3) Paste the URL below.
// ============================================================
const API_URL = "https://script.google.com/macros/s/PASTE-YOUR-DEPLOYMENT-ID/exec";

// App constants
const SHIFTS = ["A", "B", "C"];
const STATUS_LABEL = { draft:"แบบร่าง", submitted:"รออนุมัติ", approved:"อนุมัติแล้ว", rejected:"ตีกลับ" };

// ---- Session (localStorage; identity = employee code) ----------------
function setSession(profile){ try{ localStorage.setItem("ppm-session", JSON.stringify(profile)); }catch(e){} }
function getSession(){ try{ return JSON.parse(localStorage.getItem("ppm-session")||"null"); }catch(e){ return null; } }
function clearSession(){ try{ localStorage.removeItem("ppm-session"); }catch(e){} }

function getMyProfile(){ return getSession(); }              // { code, full_name, role }
function requireAuth(){
  const s = getSession();
  if (!s){ window.location.href = "index.html"; return null; }
  return s;
}

function normCode(c){ return String(c||"").trim().toLowerCase(); }

// ---- Shared helpers --------------------------------------------------
async function logAudit(){ /* audit is written server-side; kept as no-op for compatibility */ }

function fmtDateTime(ts){
  if (!ts) return "-";
  const d = new Date(ts);
  if (isNaN(d)) return String(ts);
  return d.toLocaleString("th-TH", { dateStyle:"medium", timeStyle:"short" });
}

function toast(msg, type="ok"){
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(()=>el.classList.add("show"),10);
  setTimeout(()=>{ el.classList.remove("show"); setTimeout(()=>el.remove(),300); },3200);
}
