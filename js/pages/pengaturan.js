/* =============================================
   pengaturan.js — halaman pengaturan
   info workspace, toggle integrasi, paket tier,
   dan biaya operasional
   ============================================= */

function initPengaturan() {
  let user = store.user || {};
  let s = store.settings || {};

  // 1. Render icon user
  let userIcon = document.getElementById('set-user-icon');
  if (userIcon) userIcon.innerHTML = icon('user', 14);

  // 2. Populate User details
  let elName = document.getElementById('set-user-name');
  if (elName) elName.innerText = user.nama || '-';
  let elEmail = document.getElementById('set-user-email');
  if (elEmail) elEmail.innerText = user.email || '-';
  let elBisnis = document.getElementById('set-user-bisnis');
  if (elBisnis) elBisnis.innerText = user.bisnis || '-';
  let elRole = document.getElementById('set-user-role');
  if (elRole) elRole.innerText = user.role || '-';

  // 3. Render Informasi Paket & Bantuan
  let setPaketContainer = document.getElementById('set-paket-container');
  if (setPaketContainer) {
    let paketLabel = 'Starter (Gratis Selamanya)';
    let paketStatus = 'Aktif — Gratis selamanya';
    let showCta = true;
    let sisaHari = 7;

    if (user.paket === 'business') {
      paketLabel = 'Profesional (7 Hari Trial)';
      if (user.tglDaftar) {
        let tglDaftar = new Date(user.tglDaftar);
        let tglSekarang = new Date();
        let diffTime = tglSekarang - tglDaftar;
        let diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
        sisaHari = Math.max(0, 7 - diffDays);
      }
      paketStatus = `Aktif — Sisa ${sisaHari} hari trial`;
    } else if (user.paket === 'enterprise') {
      paketLabel = 'Enterprise (Kustom)';
      paketStatus = 'Aktif';
      showCta = false;
    }

    setPaketContainer.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; border-bottom:1px solid var(--slate-100); padding-bottom:16px;">
          <div>
            <div style="font-size:12px; font-weight:600; color:var(--slate-400); text-transform:uppercase; letter-spacing:0.05em;">Paket Aktif</div>
            <div style="font-size:16px; font-weight:700; color:var(--slate-800); margin-top:4px;">${paketLabel}</div>
          </div>
          <div>
            <div style="font-size:12px; font-weight:600; color:var(--slate-400); text-transform:uppercase; letter-spacing:0.05em;">Status</div>
            <div style="font-size:14px; font-weight:600; color:var(--indigo-600); margin-top:6px;">${paketStatus}</div>
          </div>
        </div>
        
        <div>
          <div style="font-size:13px; color:var(--slate-500); line-height:1.5; margin-bottom:12px;">
            ${showCta ? 'Untuk memperpanjang langganan, upgrade paket, atau berkonsultasi mengenai kebutuhan Enterprise, silakan hubungi admin. Jika Anda mengalami kendala aplikasi, silakan hubungi Layanan Bantuan/CS.' : 'Akun Enterprise memiliki dukungan prioritas 24/7. Untuk kendala atau penyesuaian sistem, silakan hubungi admin.'}
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:8px;">
            ${showCta ? `
              <a href="https://wa.me/6285750917686?text=Halo%20Admin%20Ledgerly,%20saya%20ingin%20upgrade%20atau%20memperpanjang%20paket%20langganan%20toko%20saya." target="_blank" class="btn btn-primary btn-sm" style="display:inline-flex; align-items:center; gap:6px; text-decoration:none; font-size:13px;">
                ${icon('whatsapp', 14)} Hubungi Admin
              </a>
            ` : ''}
            <a href="https://wa.me/6285750917686?text=Halo%20CS%20Ledgerly,%20saya%20butuh%20bantuan%20mengenai%20kendala%20di%20aplikasi%20Ledgerly." target="_blank" class="btn btn-secondary btn-sm" style="display:inline-flex; align-items:center; gap:6px; text-decoration:none; font-size:13px;">
              ${icon('helpCircle', 14)} Hubungi CS Bantuan
            </a>
          </div>
        </div>
      </div>
    `;
  }

  // 4. Render Pengaturan Keuangan
  let setKeuanganContainer = document.getElementById('set-keuangan-container');
  if (setKeuanganContainer) {
    let biayaPersen = s.biayaOpsPersen !== undefined ? s.biayaOpsPersen : 8;
    setKeuanganContainer.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; gap:12px;">
        <div>
          <div style="font-size:14px; font-weight:600; color:var(--slate-700);">Persentase Biaya Operasional</div>
          <div style="font-size:12px; color:var(--slate-500); margin-top:2px;">Digunakan untuk mengestimasi pengeluaran operasional bulanan berdasarkan omzet</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <input class="form-input" type="number" min="0" max="100" value="${biayaPersen}" id="input-biaya-ops-persen" style="max-width:80px; text-align:center; font-size:14px;" onchange="ubahBiayaOpsPersen(this.value)">
          <span style="font-size:14px; font-weight:600; color:var(--slate-600);">%</span>
        </div>
      </div>
    `;
  }

  // 5. Render Integrasi (WhatsApp & Chatbot)
  let integrationsCard = document.getElementById('set-integrations-card');
  let togglesContainer = document.getElementById('set-toggles-container');
  
  if (user.paket === 'starter') {
    // Sembunyikan bagian integrasi jika menggunakan paket Starter
    if (integrationsCard) integrationsCard.style.display = 'none';
  } else {
    if (integrationsCard) integrationsCard.style.display = 'block';
    if (togglesContainer) {
      togglesContainer.innerHTML = `
        <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
          ${toggleRow('whatsapp', icon('whatsapp', 18), 'Notifikasi WhatsApp', 'Kirim alert otomatis saat stok di bawah minimum', s.waEnabled, 'var(--emerald-600)')}
          
          ${s.waEnabled ? `
            <div style="margin-left: 36px; display: flex; align-items: center; justify-content: space-between; gap: 12px; padding-top: 12px; border-top: 1px dashed var(--slate-100);">
              <div style="font-size: 13px; font-weight: 500; color: var(--slate-600);">Nomor WhatsApp Penerima Alert:</div>
              <input class="form-input" type="text" value="${s.nomorWA || ''}" id="input-wa-nomor" style="max-width:200px; font-size:13px;" placeholder="Contoh: 628123456789" onchange="ubahNomorWA(this.value)">
            </div>
          ` : ''}

          ${toggleRow('chatbot', icon('sparkles', 18), 'Chatbot AI', 'Input data dan tanya jawab lewat chat', s.chatbotEnabled, 'var(--indigo-600)')}
        </div>
      `;
    }
  }
}

function toggleRow(key, iconSvg, title, desc, isActive, color) {
  return `
    <div class="toggle-row" style="padding:0; margin:0; display:flex; align-items:center; justify-content:space-between;">
      <div class="toggle-left" style="display:flex; align-items:center; gap:12px;">
        <div class="toggle-icon" style="color:${color || 'var(--slate-500)'};">${iconSvg}</div>
        <div>
          <div class="toggle-title" style="font-weight:600; font-size:14px; color:var(--slate-800);">${title}</div>
          <div class="toggle-desc" style="font-size:12px; color:var(--slate-500); margin-top:2px;">${desc}</div>
        </div>
      </div>
      <div class="toggle-track${isActive ? ' active' : ''}" id="toggle-${key}" onclick="toggleSetting('${key}')" style="cursor:pointer;">
        <span class="toggle-knob"></span>
      </div>
    </div>`;
}

function toggleSetting(key) {
  let s = store.settings || {};
  if (key === 'whatsapp') {
    s.waEnabled = !s.waEnabled;
    store.settings = { ...s }; // memicu trigger render
  } else if (key === 'chatbot') {
    s.chatbotEnabled = !s.chatbotEnabled;
    store.settings = { ...s };

    // Perbarui visibilitas chatbot secara real-time
    if (typeof checkChatbotVisibility === 'function') {
      checkChatbotVisibility();
    }
  }
  salinSettingsKeLocalStorage();
  initPengaturan(); // re-render bagian pengaturan untuk memperbarui form WA nested
}

function ubahNomorWA(val) {
  let s = store.settings || {};
  s.nomorWA = val;
  store.settings = { ...s };
  salinSettingsKeLocalStorage();
}

function ubahBiayaOpsPersen(val) {
  let persen = parseInt(val);
  if (isNaN(persen) || persen < 0) persen = 0;
  if (persen > 100) persen = 100;

  let s = store.settings || {};
  s.biayaOpsPersen = persen;
  store.settings = { ...s };
  
  salinSettingsKeLocalStorage();

  // Pemicu re-render statistik instan
  if (typeof hitungStatistikDariTransaksi === 'function') {
    hitungStatistikDariTransaksi();
  }
}

function salinSettingsKeLocalStorage() {
  localStorage.setItem('ledgerly_settings', JSON.stringify(store.settings));
}
