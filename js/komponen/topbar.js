/* =============================================
   topbar.js — komponen top bar
   search, chat toggle, notif bell, hamburger
   ============================================= */

var notifOpen = false;

function renderTopbar() {
  let el = document.getElementById('topbar');
  if (!el) return;

  let jmlNotif = store.notifikasi.length;

  let isSuper = store.user && store.user.role === 'superadmin';
  let placeholderText = isSuper ? 'Cari pemilik bisnis...' : 'Cari produk, transaksi...';

  el.innerHTML = `
    <button class="topbar-hamburger" onclick="bukaMobileNav()">${icon('menu')}</button>
    <div class="topbar-search">
      ${icon('search')}
      <input type="text" id="topbar-search-input" placeholder="${placeholderText}" oninput="syncSearch(this.value)">
    </div>
    <div class="topbar-actions">
      <div class="topbar-clock" id="topbar-clock" title="Waktu Indonesia Barat"></div>
      ${isSuper ? '' : `
      <div style="position:relative;">
        <button class="topbar-btn" onclick="toggleNotif()" title="Notifikasi" id="btn-notif">
          ${icon('bell')}
          ${jmlNotif > 0 ? `<span class="topbar-badge">${jmlNotif}</span>` : ''}
        </button>
        <div class="notif-dropdown hidden" id="notif-dropdown">
          ${renderNotifDropdown()}
        </div>
      </div>
      `}
    </div>
  `;

  // mulai jam WIB berdetak (sekali aja set intervalnya)
  mulaiJamWIB();
}

// update teks jam WIB tiap detik di topbar. selalu Asia/Jakarta apapun device.
var _jamWIBInterval = null;
function mulaiJamWIB() {
  function tick() {
    let el = document.getElementById('topbar-clock');
    if (!el) return;
    let now = new Date();
    let tgl = now.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Asia/Jakarta' });
    let jam = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });
    el.innerHTML = '<span class="clock-date">' + tgl + '</span><span class="clock-time">' + jam + ' WIB</span>';
  }
  tick();
  if (_jamWIBInterval) clearInterval(_jamWIBInterval);
  _jamWIBInterval = setInterval(tick, 1000);
}

function renderNotifDropdown() {
  let notifs = store.notifikasi;
  if (notifs.length === 0) {
    return `
      <div class="notif-header"><span class="title">Notifikasi</span></div>
      <div class="notif-empty">Semua stok aman 👍</div>
    `;
  }

  let waEnabled = store.settings && store.settings.waEnabled && (store.user && store.user.paket !== 'starter');
  let nomorWA = (store.settings && store.settings.nomorWA) || '628123456789';

  let items = notifs.map(function(n) {
    let iconSvg = waEnabled ? icon('whatsapp', 18) : icon('bell', 18);
    let iconBg = waEnabled ? 'var(--emerald-50)' : 'var(--indigo-50)';
    let iconColor = waEnabled ? 'var(--emerald-600)' : 'var(--indigo-600)';
    let viaText = waEnabled ? `via WhatsApp (${nomorWA})` : 'Sistem Ledgerly';

    return `
      <div class="notif-item">
        <div class="notif-wa-icon" style="background:${iconBg}; color:${iconColor};">${iconSvg}</div>
        <div class="info">
          <div class="produk-nama">${n.produkNama}</div>
          <div class="stok-info">Stok: ${n.stok} / min: ${n.minStok}</div>
          <div class="via">${viaText} • ${waktuLalu(n.dikirimPada)}</div>
        </div>
        <button class="close-btn" onclick="hapusNotif('${n.id}')">${icon('x')}</button>
      </div>
    `;
  }).join('');

  return `
    <div class="notif-header">
      <span class="title">Notifikasi</span>
      <span class="count">${notifs.length} alert</span>
    </div>
    <div class="notif-list">${items}</div>
  `;
}

function toggleNotif() {
  let dd = document.getElementById('notif-dropdown');
  if (!dd) return;
  notifOpen = !notifOpen;
  dd.classList.toggle('hidden', !notifOpen);
}

function hapusNotif(id) {
  tutupNotifikasi(id);
  // Re-render topbar untuk mengupdate badge count
  renderTopbar();
  // Kembalikan status open jika notifOpen bernilai true agar tidak menutup paksa
  let dd = document.getElementById('notif-dropdown');
  if (dd && notifOpen) {
    dd.classList.remove('hidden');
  }
}

// Menutup dropdown notifikasi ketika klik di luar area
document.addEventListener('click', function(event) {
  let dropdown = document.getElementById('notif-dropdown');
  let btn = document.getElementById('btn-notif');
  
  if (dropdown && !dropdown.classList.contains('hidden')) {
    if (!dropdown.contains(event.target) && (!btn || !btn.contains(event.target))) {
      dropdown.classList.add('hidden');
      notifOpen = false;
    }
  }
});


function bukaMobileNav() {
  let overlay = document.getElementById('mobile-nav');
  if (!overlay) return;
  overlay.classList.add('open');

  // render mobile nav links
  let panel = document.getElementById('mobile-nav-panel');
  if (!panel) return;

  let user = store.user || {};
  let linksHtml = '';
  if (user.role === 'superadmin') {
    linksHtml += mobileLink('#dasbor-superadmin', icon('fileBarChart', 18), 'Ikhtisar Sistem');
    linksHtml += mobileLink('#kelola-pemilik', icon('users', 18), 'Kelola Pemilik');
  } else {
    linksHtml += mobileLink('#inventaris', icon('package', 18), 'Inventaris');
    linksHtml += mobileLink('#keuangan', icon('wallet', 18), 'Keuangan');
    linksHtml += mobileLink('#transaksi', icon('arrowLeftRight', 18), 'Transaksi');
    linksHtml += mobileLink('#laporan', icon('fileBarChart', 18), 'Laporan');
    linksHtml += mobileLink('#keputusan', icon('lightbulb', 18), 'Keputusan');
    linksHtml += mobileLink('#pengaturan', icon('settings', 18), 'Pengaturan');
  }

  panel.innerHTML = `
    <div class="mobile-nav-header">
      <div style="display:flex; align-items:center; gap:10px;">
        <div style="display:grid; place-items:center; width:32px; height:32px; border-radius:10px; background:linear-gradient(135deg, var(--indigo-500), var(--purple-600)); color:#fff; flex-shrink:0;">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>
            <polyline points="3.29 7 12 12 20.71 7"/>
            <line x1="12" y1="22" x2="12" y2="12"/>
          </svg>
        </div>
        <div>
          <div style="font-size:14px; font-weight:700; color:var(--slate-900);">Ledgerly</div>
          <div style="font-size:11px; color:var(--slate-400);">Sistem UMKM</div>
        </div>
      </div>
      <button class="mobile-nav-close" onclick="tutupMobileNav()">${icon('x')}</button>
    </div>
    <div class="mobile-nav-links">
      ${linksHtml}
      <hr class="divider" style="margin:8px 0;">
      <button class="mobile-nav-logout" onclick="logout()">${icon('logOut', 16)} Keluar</button>
    </div>
  `;
}

function tutupMobileNav() {
  let overlay = document.getElementById('mobile-nav');
  if (overlay) overlay.classList.remove('open');
}

function mobileLink(hash, iconSvg, label) {
  let isActive = (typeof halamanSkrg !== 'undefined' && halamanSkrg === hash);
  return `
    <button class="mobile-nav-link${isActive ? ' active' : ''}" onclick="navigasi('${hash}')" style="display:flex; align-items:center; gap:10px;">
      <span style="color:var(--indigo-600); flex-shrink:0;">${iconSvg}</span>
      <span>${label}</span>
    </button>
  `;
}

// helper: waktu yg lalu
function waktuLalu(iso) {
  let diff = Date.now() - new Date(iso).getTime();
  let menit = Math.floor(diff / 60000);
  if (menit < 60) return menit + ' menit lalu';
  let jam = Math.floor(menit / 60);
  if (jam < 24) return jam + ' jam lalu';
  return Math.floor(jam / 24) + ' hari lalu';
}

// Sync topbar search to current page search
function syncSearch(val) {
  // Sync to cari-produk (Inventaris)
  let pageCari = document.getElementById('cari-produk');
  if (pageCari) {
    pageCari.value = val;
    pageCari.dispatchEvent(new Event('input'));
  }
  
  // Sync to cari-transaksi (Transaksi)
  let txCari = document.getElementById('cari-transaksi');
  if (txCari) {
    txCari.value = val;
    txCari.dispatchEvent(new Event('input'));
  }
  
  // Sync to cari-pemilik (Kelola Pemilik)
  let pemCari = document.getElementById('cari-pemilik');
  if (pemCari) {
    pemCari.value = val;
    pemCari.dispatchEvent(new Event('input'));
  }
}

// Menyetel visibilitas search bar secara dinamis sesuai hash halaman aktif
function updateTopbarSearchVisibility(hash) {
  let searchContainer = document.querySelector('.topbar-search');
  if (!searchContainer) return;
  
  let showSearch = (hash === '#inventaris' || hash === '#transaksi' || hash === '#kelola-pemilik' || hash === '#dasbor-superadmin');
  if (showSearch) {
    searchContainer.style.display = 'block';
    // Reset nilai pencarian topbar saat berpindah halaman
    let input = document.getElementById('topbar-search-input');
    if (input) input.value = '';
  } else {
    searchContainer.style.display = 'none';
  }
}

