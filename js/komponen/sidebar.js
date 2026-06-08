/* =============================================
   sidebar.js — komponen sidebar navigasi
   ============================================= */

function renderSidebar() {
  let el = document.getElementById('sidebar');
  if (!el) return;

  let user = store.user || {};
  let inisial = (user.nama || 'U').split(' ').map(function(w) { return w[0]; }).join('').toUpperCase().slice(0, 2);

  let isCollapsed = localStorage.getItem('ledgerly_sidebar_collapsed') === 'true';
  let shell = document.querySelector('.dasbor-shell');
  if (shell) {
    shell.classList.toggle('sidebar-collapsed', isCollapsed);
  }

  let navHtml = '';
  if (user.role === 'superadmin') {
    navHtml += navLink('#dasbor-superadmin', icon('fileBarChart'), 'Ikhtisar Sistem');
    navHtml += navLink('#kelola-pemilik', icon('users'), 'Kelola Pemilik');
  } else {
    navHtml += navLink('#inventaris', icon('package'), 'Inventaris');
    navHtml += navLink('#keuangan', icon('wallet'), 'Keuangan');
    navHtml += navLink('#transaksi', icon('arrowLeftRight'), 'Transaksi');
    navHtml += navLink('#laporan', icon('fileBarChart'), 'Laporan');
    navHtml += navLink('#keputusan', icon('lightbulb'), 'Keputusan');
    navHtml += navLink('#pengaturan', icon('settings'), 'Pengaturan');
  }

  el.innerHTML = `
    <div class="sidebar-brand">
      <div class="sidebar-logo">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
          <polyline points="3.29 7 12 12 20.71 7"/>
          <line x1="12" y1="22" x2="12" y2="12"/>
        </svg>
      </div>
      <div class="sidebar-brand-text">
        <div class="sidebar-app-name">Ledgerly</div>
        <div class="sidebar-app-sub">Sistem UMKM</div>
      </div>
      <button class="sidebar-toggle-btn" id="sidebar-toggle-btn" onclick="toggleSidebarCollapse()" title="${isCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar'}">
        ${isCollapsed ? icon('chevronRight', 16) : icon('chevronLeft', 16)}
      </button>
    </div>
    <nav class="sidebar-nav">
      ${navHtml}
    </nav>
    <div class="sidebar-footer">
      <div class="sidebar-user">
        <div class="sidebar-avatar">${inisial}</div>
        <div class="sidebar-user-info">
          <div class="sidebar-user-name">${user.nama || 'User'}</div>
          <div class="sidebar-user-biz">${user.bisnis || ''}</div>
        </div>
        <button class="sidebar-logout" onclick="logout()" title="Logout">${icon('logOut')}</button>
      </div>
    </div>
  `;

  // attach click events ke nav links
  el.querySelectorAll('.sidebar-link').forEach(function(link) {
    link.addEventListener('click', function() {
      navigasi(this.getAttribute('data-hash'));
    });
  });
}

// helper bikin nav link html
function navLink(hash, iconSvg, label) {
  let isActive = halamanSkrg === hash ? ' active' : '';
  return `
    <button class="sidebar-link${isActive}" data-hash="${hash}" title="${label}">
      ${iconSvg}<span>${label}</span>
    </button>
  `;
}

function toggleSidebarCollapse() {
  let isCollapsed = localStorage.getItem('ledgerly_sidebar_collapsed') === 'true';
  isCollapsed = !isCollapsed;
  localStorage.setItem('ledgerly_sidebar_collapsed', isCollapsed);

  let shell = document.querySelector('.dasbor-shell');
  if (shell) {
    shell.classList.toggle('sidebar-collapsed', isCollapsed);
  }

  // Update button icon & title
  let btn = document.getElementById('sidebar-toggle-btn');
  if (btn) {
    btn.innerHTML = isCollapsed ? icon('chevronRight', 16) : icon('chevronLeft', 16);
    btn.title = isCollapsed ? 'Expand Sidebar' : 'Minimize Sidebar';
  }
}
