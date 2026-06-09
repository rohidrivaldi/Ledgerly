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

  // 2. Render Profil Form Dinamis
  let setProfilContainer = document.getElementById('set-profil-container');
  if (setProfilContainer) {
    let roleText = 'Pemilik Toko';
    if (user.role === 'superadmin') roleText = 'Superadmin';
    else if (user.role === 'admin') roleText = 'Admin';

    setProfilContainer.innerHTML = `
      <form id="form-edit-profil" onsubmit="window.simpanProfil(event)" style="display:flex; flex-direction:column; gap:16px;">
        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px;">
          <div>
            <label class="setting-label" style="display:block; margin-bottom:6px;"><span id="set-user-icon"></span> Nama Pemilik</label>
            <input class="form-input" type="text" id="edit-user-nama" value="${user.nama || ''}" required style="font-size:13px; font-weight:500;">
          </div>
          <div>
            <label class="setting-label" style="display:block; margin-bottom:6px;">Email (ID Akun)</label>
            <input class="form-input" type="text" value="${user.email || ''}" readonly disabled style="text-transform:none; font-size:13px; background:var(--slate-50); color:var(--slate-400); cursor:not-allowed;">
          </div>
          <div>
            <label class="setting-label" style="display:block; margin-bottom:6px;">Nama Bisnis / Toko</label>
            <input class="form-input" type="text" id="edit-user-bisnis" value="${user.bisnis || ''}" required style="font-size:13px; font-weight:500;">
          </div>
          <div>
            <label class="setting-label" style="display:block; margin-bottom:6px;">Peran (Hak Akses)</label>
            <input class="form-input" type="text" value="${roleText}" readonly disabled style="font-size:13px; background:var(--slate-50); color:var(--slate-400); cursor:not-allowed;">
          </div>
        </div>
        <div style="display:flex; justify-content:flex-end; margin-top:8px;">
          <button type="submit" class="btn btn-primary" id="btn-save-profile" style="padding:10px 20px; font-size:13px; border-radius:10px; display:inline-flex; align-items:center; gap:8px;">
            ${icon('save', 16)} Simpan Perubahan Profil
          </button>
        </div>
      </form>
    `;
  }

  // 3. Render Informasi Paket & Bantuan (Gabungan)
  let setPaketContainer = document.getElementById('set-paket-container');
  if (setPaketContainer) {
    let paketLabel = 'Starter (Gratis Selamanya)';
    let paketStatus = 'Aktif';
    let badgeClass = 'badge-neutral';
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
      paketStatus = `Trial • Sisa ${sisaHari} Hari`;
      badgeClass = 'badge-info';
    } else if (user.paket === 'enterprise') {
      paketLabel = 'Enterprise (Kustom)';
      paketStatus = 'Premium Aktif';
      badgeClass = 'badge-success';
      showCta = false;
    }

    setPaketContainer.innerHTML = `
      <div style="display:flex; flex-direction:column; gap:20px;">
        <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--slate-100); padding-bottom:18px;">
          <div>
            <div style="font-size:11px; font-weight:700; color:var(--slate-400); text-transform:uppercase; letter-spacing:0.05em;">Status Akun</div>
            <div style="font-size:16px; font-weight:700; color:var(--slate-800); margin-top:4px;">${paketLabel}</div>
          </div>
          <span class="badge ${badgeClass}" style="padding:6px 12px; font-size:12px; font-weight:600;">${paketStatus}</span>
        </div>
        
        <div>
          <div style="font-size:13px; color:var(--slate-500); line-height:1.6; margin-bottom:16px;">
            ${showCta 
              ? 'Akun Anda saat ini menggunakan paket <strong>Starter</strong>. Silakan hubungi Admin untuk memperpanjang langganan atau upgrade ke paket <strong>Profesional/Enterprise</strong> untuk membuka semua fitur pembukuan tanpa batasan.' 
              : 'Akun <strong>Enterprise</strong> Anda aktif dengan akses prioritas 24/7. Hubungi Admin jika memerlukan kustomisasi sistem tambahan.'}
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:10px;">
            ${showCta ? `
              <a href="https://wa.me/6285750917686?text=Halo%20Admin%20Ledgerly,%20saya%20tertarik%20untuk%20melakukan%20upgrade%20atau%20memperpanjang%20paket%20langganan%20toko%20saya." target="_blank" class="btn btn-primary" style="padding:10px 20px; font-size:13px; border-radius:10px; display:inline-flex; align-items:center; gap:8px;">
                ${icon('whatsapp', 16)} Hubungi Admin (Upgrade)
              </a>
            ` : ''}
            <a href="https://wa.me/6285750917686?text=Halo%20CS%20Ledgerly,%20saya%20mengalami%20kendala%20di%20aplikasi%20Ledgerly%20dan%20memerlukan%20bantuan." target="_blank" class="btn btn-secondary" style="padding:10px 20px; font-size:13px; border-radius:10px; display:inline-flex; align-items:center; gap:8px;">
              ${icon('helpCircle', 16)} Hubungi CS Bantuan (Lapor Kendala)
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
      <div style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
        <div>
          <div style="font-size:14px; font-weight:600; color:var(--slate-800);">Persentase Estimasi Biaya Operasional</div>
          <div style="font-size:12px; color:var(--slate-400); margin-top:4px; line-height:1.4;">Diperlukan untuk memperkirakan biaya operasional warung secara dinamis pada perhitungan Laba Bersih berdasarkan total omzet.</div>
        </div>
        <div style="display:flex; align-items:center; gap:6px;">
          <input class="form-input" type="number" min="0" max="100" value="${biayaPersen}" id="input-biaya-ops-persen" style="width:70px; text-align:center; font-size:14px; font-weight:600; border-radius:8px;" onchange="ubahBiayaOpsPersen(this.value)">
          <span style="font-size:14px; font-weight:600; color:var(--slate-500);">%</span>
        </div>
      </div>
    `;
  }

  // 5. Render Integrasi (WhatsApp & Chatbot)
  let integrationsCard = document.getElementById('set-integrations-card');
  let togglesContainer = document.getElementById('set-toggles-container');
  
  if (integrationsCard && togglesContainer) {
    integrationsCard.style.display = 'block';
    
    if (user.paket === 'starter') {
      // Paket Starter: HANYA tampilkan Chatbot AI (tidak ada WhatsApp Notifikasi)
      togglesContainer.innerHTML = `
        <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
          ${toggleRow('chatbot', icon('sparkles', 18), 'Chatbot AI', 'Input data dan tanya jawab lewat chat', s.chatbotEnabled, 'var(--indigo-600)')}
        </div>
      `;
    } else {
      // Paket Profesional/Enterprise: Tampilkan kedua-duanya (WhatsApp nested + Chatbot)
      togglesContainer.innerHTML = `
        <div style="padding: 20px; display: flex; flex-direction: column; gap: 16px;">
          ${toggleRow('whatsapp', icon('whatsapp', 18), 'Notifikasi WhatsApp', 'Kirim alert otomatis saat stok di bawah minimum', s.waEnabled, 'var(--emerald-600)')}
          
          ${s.waEnabled ? `
            <div style="margin-left: 36px; display: flex; flex-direction: column; gap: 6px; padding-top: 12px; border-top: 1px dashed var(--slate-100);">
              <div style="display: flex; align-items: center; justify-content: space-between; gap: 12px;">
                <div style="font-size: 13px; font-weight: 500; color: var(--slate-600);">Nomor WhatsApp Anda:</div>
                <div style="position: relative; display: flex; align-items: center; max-width: 200px; width: 100%;">
                  <input class="form-input" type="text" value="${s.nomorWA || ''}" id="input-wa-nomor" style="width: 100%; font-size: 13px; padding-right: 30px;" placeholder="Contoh: 6285750917686" oninput="window.tanganiInputWA(this.value)">
                  <span id="wa-indicator" style="position: absolute; right: 10px; display: flex; align-items: center; pointer-events: none;"></span>
                </div>
              </div>
              <div id="wa-error-msg" style="font-size: 11px; text-align: right; margin-top: 2px; display: none;"></div>
            </div>
          ` : ''}

          ${toggleRow('chatbot', icon('sparkles', 18), 'Chatbot AI', 'Input data dan tanya jawab lewat chat', s.chatbotEnabled, 'var(--indigo-600)')}
        </div>
      `;
    }
  }

  // Jalankan validasi awal untuk menampilkan indikator centang/silang jika WhatsApp aktif
  if (s.waEnabled && user.paket !== 'starter') {
    setTimeout(function() {
      let inputEl = document.getElementById('input-wa-nomor');
      if (inputEl) {
        window.tanganiInputWA(inputEl.value);
      }
    }, 10);
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
    store.settings = { ...s };
  } else if (key === 'chatbot') {
    s.chatbotEnabled = !s.chatbotEnabled;
    store.settings = { ...s };

    // Perbarui visibilitas chatbot secara real-time
    if (typeof checkChatbotVisibility === 'function') {
      checkChatbotVisibility();
    }
  }
  salinSettingsKeLocalStorage();
  initPengaturan(); // re-render untuk memperbarui layout nested WA input
}

window.tanganiInputWA = async function(val) {
  let inputEl = document.getElementById('input-wa-nomor');
  let indicatorEl = document.getElementById('wa-indicator');
  let errorEl = document.getElementById('wa-error-msg');
  
  if (!inputEl || !indicatorEl || !errorEl) return;

  // Bersihkan karakter non-angka
  let clean = val.replace(/[^0-9]/g, '');
  if (inputEl.value !== clean) {
    inputEl.value = clean;
  }

  // Ambil nomor dasar (base number) tanpa kode negara atau 0
  let base = clean;
  if (clean.startsWith('62')) {
    base = clean.substring(2);
  } else if (clean.startsWith('0')) {
    base = clean.substring(1);
  }

  // Cek apakah kosong
  if (clean.length === 0) {
    indicatorEl.innerHTML = '';
    errorEl.style.display = 'none';
    return;
  }

  // Validasi panjang base (10-13 digit)
  let isValid = base.length >= 10 && base.length <= 13;

  if (isValid) {
    indicatorEl.innerHTML = '<span style="color: var(--emerald-500); font-weight: bold; font-size: 14px;">✓</span>';
    errorEl.style.display = 'none';

    // Format nomor untuk disimpan: jika berawalan 0, ubah ke 62
    let waFormatted = clean;
    if (waFormatted.startsWith('0')) {
      waFormatted = '62' + waFormatted.substring(1);
    } else if (!waFormatted.startsWith('62')) {
      waFormatted = '62' + waFormatted;
    }

    // Simpan ke settings
    let s = store.settings || {};
    s.nomorWA = waFormatted;
    store.settings = { ...s };
    localStorage.setItem('ledgerly_settings', JSON.stringify(s));

    // Sinkronkan ke database Supabase
    if (window.supabaseClient && store.user && store.user.id) {
      try {
        let waNum = parseInt(waFormatted);
        if (store.user.noTelp !== waNum) {
          const { error } = await window.supabaseClient
            .from('Users')
            .update({ noTelp: waNum })
            .eq('user_id', store.user.id);

          if (error) throw error;
          
          store.user.noTelp = waNum;
          localStorage.setItem('ledgerly_user', JSON.stringify(store.user));
          console.log("Nomor WhatsApp berhasil diperbarui ke database!");
        }
      } catch (err) {
        console.warn("Gagal memperbarui nomor WhatsApp ke database:", err.message);
      }
    }
  } else {
    indicatorEl.innerHTML = '<span style="color: var(--rose-500); font-weight: bold; font-size: 14px;">✗</span>';
    errorEl.textContent = 'Nomor harus 10 hingga 13 digit (diluar kode negara/0)';
    errorEl.style.color = 'var(--rose-600)';
    errorEl.style.display = 'block';
  }
};

window.simpanProfil = async function(e) {
  e.preventDefault();
  
  let user = store.user || {};
  let namaBaru = document.getElementById('edit-user-nama').value.trim();
  let bisnisBaru = document.getElementById('edit-user-bisnis').value.trim();
  let btn = document.getElementById('btn-save-profile');
  
  if (!namaBaru || !bisnisBaru) return;
  if (!window.supabaseClient || !user.id) return;
  
  btn.disabled = true;
  btn.style.opacity = '0.7';
  btn.style.cursor = 'wait';
  btn.innerHTML = `${icon('loader', 16)} Menyimpan...`;
  
  try {
    const { error } = await window.supabaseClient
      .from('Users')
      .update({
        nama: namaBaru,
        bisnis: bisnisBaru
      })
      .eq('user_id', user.id);
      
    if (error) throw error;
    
    // Update local store
    user.nama = namaBaru;
    user.bisnis = bisnisBaru;
    store.user = { ...user };
    localStorage.setItem('ledgerly_user', JSON.stringify(user));
    
    alert("Profil dan nama bisnis Anda berhasil diperbarui!");
  } catch (err) {
    console.error("Gagal memperbarui profil:", err.message);
    alert("Gagal memperbarui profil: " + err.message);
  } finally {
    btn.disabled = false;
    btn.style.opacity = '1';
    btn.style.cursor = 'pointer';
    btn.innerHTML = `${icon('save', 16)} Simpan Perubahan Profil`;
    initPengaturan(); // re-render
  }
};

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
