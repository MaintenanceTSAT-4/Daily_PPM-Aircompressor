// ============================================================
// App controller — session, navigation, notifications
// ============================================================
window.AppState = { profile: null, view: "check" };

const App = (() => {

  function applyTheme(t) {
    document.documentElement.setAttribute("data-theme", t);
    const btn = document.getElementById("themeToggle");
    if (btn) btn.textContent = t === "dark" ? "☀️ ธีมสว่าง" : "🌙 ธีมมืด";
    try { localStorage.setItem("ppm-theme", t); } catch (e) {}
  }

  async function init() {
    // theme (load saved before anything renders)
    let saved = "light";
    try { saved = localStorage.getItem("ppm-theme") || "light"; } catch (e) {}
    applyTheme(saved);
    document.getElementById("themeToggle").onclick = () =>
      applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");

    const user = await requireAuth();
    if (!user) return;

    const prof = await getMyProfile();
    if (!prof) { toast("ไม่พบโปรไฟล์ผู้ใช้", "err"); return; }
    window.AppState.profile = prof;

    // header / sidebar user
    document.getElementById("who").textContent = prof.full_name || prof.employee_code || "ผู้ใช้งาน";
    document.getElementById("roleBadge").textContent =
      prof.employee_code ? `${prof.role} · #${prof.employee_code}` : prof.role;
    document.getElementById("avatar").textContent =
      (prof.employee_code || prof.full_name || "?").trim().charAt(0).toUpperCase();
    if (prof.role === "admin") document.getElementById("navAdmin").classList.remove("hidden");

    document.getElementById("logout").onclick = async () => {
      await sb.auth.signOut();
      window.location.href = "index.html";
    };

    // nav
    document.querySelectorAll("#nav a").forEach(a => a.onclick = () => go(a.dataset.view));
    document.getElementById("bell").onclick = () => go("approvals");

    await refreshBadge();
    setInterval(refreshBadge, 30000); // poll notifications every 30s

    go("check");
  }

  async function go(view) {
    window.AppState.view = view;
    document.querySelectorAll("#nav a").forEach(a => a.classList.toggle("active", a.dataset.view === view));
    ["check", "dashboard", "approvals", "admin"].forEach(v =>
      document.getElementById("view-" + v).classList.toggle("hidden", v !== view));

    if (view === "check") await DailyCheck.render();
    else if (view === "dashboard") await Dashboard.render();
    else if (view === "approvals") await Approvals.render();
    else if (view === "admin") await Admin.render();
  }

  async function reloadCurrent() { await go(window.AppState.view); }

  async function refreshBadge() {
    const n = await countPending();
    const dot = document.getElementById("bellDot");
    dot.textContent = n;
    dot.classList.toggle("hidden", n === 0);
    const nc = document.getElementById("navCount");
    nc.textContent = n;
    nc.classList.toggle("hidden", n === 0);
  }

  return { init, go, refreshBadge, reloadCurrent };
})();

document.addEventListener("DOMContentLoaded", App.init);
