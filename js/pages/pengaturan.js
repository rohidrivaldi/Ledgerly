/* =============================================
   pengaturan.js — halaman pengaturan
   info workspace, toggle integrasi
   ============================================= */

function initPengaturan() {
  let user = store.user || {};
  let s = store.settings;

  // 1. Render icon
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

  // 3. Render integrations
  let togglesContainer = document.getElementById('set-toggles-container');
  if (togglesContainer) {
    togglesContainer.innerHTML = `
      ${toggleRow('whatsapp', icon('whatsapp', 18), 'Notifikasi WhatsApp', 'Kirim alert otomatis saat stok di bawah minimum', s.waEnabled, 'var(--emerald-600)')}
      ${toggleRow('chatbot', icon('sparkles', 18), 'Chatbot AI', 'Input data dan tanya jawab lewat chat', s.chatbotEnabled, 'var(--indigo-600)')}

      <div class="toggle-row">
        <div class="toggle-left">
          <div class="toggle-icon" style="color:var(--emerald-600);">${icon('whatsapp', 18)}</div>
          <div>
            <div class="toggle-title">Nomor WhatsApp</div>
            <div class="toggle-desc">Nomor tujuan notifikasi stok rendah</div>
          </div>
        </div>
        <input class="form-input" type="text" value="${s.nomorWA}" id="input-wa-nomor" style="max-width:200px; font-size:14px;" onchange="ubahNomorWA(this.value)">
      </div>
    `;
  }
}

function toggleRow(key, iconSvg, title, desc, isActive, color) {
  return `
    <div class="toggle-row">
      <div class="toggle-left">
        <div class="toggle-icon" style="color:${color || 'var(--slate-500)'};">${iconSvg}</div>
        <div>
          <div class="toggle-title">${title}</div>
          <div class="toggle-desc">${desc}</div>
        </div>
      </div>
      <div class="toggle-track${isActive ? ' active' : ''}" id="toggle-${key}" onclick="toggleSetting('${key}')">
        <span class="toggle-knob"></span>
      </div>
    </div>`;
}

function toggleSetting(key) {
  if (key === 'whatsapp') {
    store.settings.waEnabled = !store.settings.waEnabled;
    let track = document.getElementById('toggle-whatsapp');
    if (track) track.classList.toggle('active', store.settings.waEnabled);
    
    // Perbarui topbar notifikasi agar perubahan setelan WhatsApp langsung tercermin
    if (typeof renderTopbar === 'function') {
      renderTopbar();
    }
  } else if (key === 'chatbot') {
    store.settings.chatbotEnabled = !store.settings.chatbotEnabled;
    let track = document.getElementById('toggle-chatbot');
    if (track) track.classList.toggle('active', store.settings.chatbotEnabled);
    
    // Perbarui visibilitas chatbot secara real-time
    if (typeof checkChatbotVisibility === 'function') {
      checkChatbotVisibility();
    }
  }
  salinSettingsKeLocalStorage();
}

function ubahNomorWA(val) {
  store.settings.nomorWA = val;
  salinSettingsKeLocalStorage();
}

function salinSettingsKeLocalStorage() {
  localStorage.setItem('ledgerly_settings', JSON.stringify(store.settings));
}
