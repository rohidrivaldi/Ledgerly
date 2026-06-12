/* =============================================
   sidebar.js — komponen sidebar navigasi
   ============================================= */

function renderSidebar() {
  let el = document.getElementById("sidebar");
  if (!el) return;

  let user = store.user || {};
  let inisial = (user.nama || "U")
    .split(" ")
    .map(function (w) {
      return w[0];
    })
    .join("")
    .toUpperCase()
    .slice(0, 2);

  let isCollapsed = localStorage.getItem("ledgerly_sidebar_collapsed") === "true";
  let shell = document.querySelector(".dasbor-shell");
  if (shell) {
    shell.classList.toggle("sidebar-collapsed", isCollapsed);
  }

  let navHtml = "";
  if (user.role === "superadmin") {
    navHtml += navLink("#dasbor-superadmin", icon("fileBarChart"), "Ikhtisar Sistem");
    navHtml += navLink("#kelola-pemilik", icon("users"), "Kelola Pemilik");
    navHtml += navLink("#kelola-pengumuman", icon("bell"), "Kelola Pengumuman");
    navHtml += navLink("#pengaturan-platform", icon("settings"), "Pengaturan Platform");
  } else {
    navHtml += navLink("#inventaris", icon("package"), "Inventaris");
    navHtml += navLink("#keuangan", icon("wallet"), "Keuangan");
    navHtml += navLink("#transaksi", icon("arrowLeftRight"), "Transaksi");
    navHtml += navLink("#laporan", icon("fileBarChart"), "Laporan");
    navHtml += navLink("#keputusan", icon("lightbulb"), "Keputusan");
    navHtml += navLink("#pengumuman", icon("bell"), "Pengumuman");
    navHtml += navLink("#pengaturan", icon("settings"), "Pengaturan");
  }

  el.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-logo">
        <div style="padding: 8px">
          <img src="assets/logo.svg" alt="Ledgerly Logo" style="width: 100%; height: 100%; filter: brightness(0) invert(1)" />
        </div>
      </div>
      <div class="sidebar-brand-text">
        <div class="sidebar-app-name">Ledgerly</div>
        <div class="sidebar-app-sub">Sistem UMKM</div>
      </div>
      <button class="sidebar-toggle-btn" id="sidebar-toggle-btn" onclick="toggleSidebarCollapse()" title="${isCollapsed ? "Expand Sidebar" : "Minimize Sidebar"}">
        ${isCollapsed ? icon("chevronRight", 16) : icon("chevronLeft", 16)}
      </button>
    </div>
    <nav class="sidebar-nav">
      ${navHtml}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">${inisial}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${user.nama || "User"}</div>
          <div class="sidebar-user-biz">${user.bisnis || ""}</div>
        </div>
        <button class="sidebar-logout" onclick="logout()" title="Logout">${icon("logOut")}</button>
      </div>
    </div>
  `;

  // attach click events ke nav links
  el.querySelectorAll(".sidebar-link").forEach(function (link) {
    link.addEventListener("click", function () {
      navigasi(this.getAttribute("data-hash"));
    });
  });
}

// helper bikin nav link html
function navLink(hash, iconSvg, label) {
  let isActive = halamanSkrg === hash ? " active" : "";
  return `
    <button class="sidebar-link${isActive}" data-hash="${hash}" title="${label}">
      ${iconSvg}<span>${label}</span>
    </button>
  `;
}

function toggleSidebarCollapse() {
  let isCollapsed = localStorage.getItem("ledgerly_sidebar_collapsed") === "true";
  isCollapsed = !isCollapsed;
  localStorage.setItem("ledgerly_sidebar_collapsed", isCollapsed);

  let shell = document.querySelector(".dasbor-shell");
  if (shell) {
    shell.classList.toggle("sidebar-collapsed", isCollapsed);
  }

  // Update button icon & title
  let btn = document.getElementById("sidebar-toggle-btn");
  if (btn) {
    btn.innerHTML = isCollapsed ? icon("chevronRight", 16) : icon("chevronLeft", 16);
    btn.title = isCollapsed ? "Expand Sidebar" : "Minimize Sidebar";
  }
}
