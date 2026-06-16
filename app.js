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
    let saved = "light";
    try { saved = localStorage.getItem("ppm-theme") || "light"; } catch (e) {}
    applyTheme(saved);
    document.getElementById("themeToggle").onclick = () =>
      applyTheme(document.documentElement.getAttribute("data-theme") === "dark" ? "light" : "dark");

    const user = requireAuth();
    if (!user) return;

    const prof = getMyProfile();
    if (!prof) { toast("ไม่พบโปรไฟล์ผู้ใช้", "err"); return; }
    window.AppState.profile = prof;

    document.getElementById("who").textContent = prof.full_name || prof.code || "ผู้ใช้งาน";
    document.getElementById("roleBadge").textContent =
      prof.code ? `${prof.role} · #${prof.code}` : prof.role;
    document.getElementById("avatar").textContent =
      String(prof.code || prof.full_name || "?").trim().charAt(0).toUpperCase();
    if (prof.role === "admin") document.getElementById("navAdmin").classList.remove("hidden");

    document.getElementById("logout").onclick = () => {
      clearSession();
      window.location.href = "index.html";
    };

    document.querySelectorAll("#nav a").forEach(a => a.onclick = () => go(a.dataset.view));
    document.getElementById("bell").onclick = () => go("approvals");

    await refreshBadge();
    setInterval(refreshBadge, 30000);

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
