// ============================================================
// Supabase configuration
// 1) Create a project at https://supabase.com
// 2) Settings -> API -> copy "Project URL" and "anon public" key
// 3) Paste them below.
// ============================================================
const SUPABASE_URL = "https://zxhhskarkhghkmsndbgw.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inp4aGhza2Fya2hnaGttc25kYmd3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1MDI0MDAsImV4cCI6MjA5NzA3ODQwMH0.LAnKh4ZuxbuVFvHalMofJ1FLGj0pAUQUycZ4vvjGZ3g";

// App constants
const SHIFTS = ["A", "B", "C"];

// ---- Employee-code login ---------------------------------------------
// Users log in with EMPLOYEE CODE ONLY (no password typed). Behind the
// scenes each code maps to a hidden internal email + a derived password
// so Supabase Auth (and Row Level Security) keep working.
const EMP_EMAIL_DOMAIN = "ppm.local";   // internal only, users never see this
const EMP_PASS_PREFIX  = "PPMx7-";       // makes the derived password >= 6 chars

function normCode(code) { return String(code || "").trim().toLowerCase(); }
function codeEmail(code) { return `${normCode(code)}@${EMP_EMAIL_DOMAIN}`; }
function codePassword(code) { return `${EMP_PASS_PREFIX}${normCode(code)}`; }

// Create the global Supabase client (supabase-js v2 loaded via CDN)
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Shared helpers --------------------------------------------------
async function getSessionUser() {
  const { data: { session } } = await sb.auth.getSession();
  return session ? session.user : null;
}

async function getMyProfile() {
  const user = await getSessionUser();
  if (!user) return null;
  const { data } = await sb
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  return data ? { ...data, email: user.email } : null;
}

async function requireAuth() {
  const user = await getSessionUser();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

async function logAudit(table, recordId, action, details = {}) {
  const prof = await getMyProfile();
  if (!prof) return;
  await sb.from("audit_logs").insert({
    table_name: table,
    record_id: recordId,
    action,
    actor_id: prof.id,
    actor_name: prof.full_name,
    details
  });
}

function fmtDateTime(ts) {
  if (!ts) return "-";
  return new Date(ts).toLocaleString("th-TH", { dateStyle: "medium", timeStyle: "short" });
}

function toast(msg, type = "ok") {
  const el = document.createElement("div");
  el.className = `toast toast-${type}`;
  el.textContent = msg;
  document.body.appendChild(el);
  setTimeout(() => el.classList.add("show"), 10);
  setTimeout(() => { el.classList.remove("show"); setTimeout(() => el.remove(), 300); }, 3000);
}

const STATUS_LABEL = {
  draft:     "แบบร่าง",
  submitted: "รออนุมัติ",
  approved:  "อนุมัติแล้ว",
  rejected:  "ตีกลับ"
};
