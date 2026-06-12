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
      // hitung sisa hari dr tgl_expired (diset admin), BUKAN dr tglDaftar.
      // dulu pake tglDaftar makanya nyangkut "sisa 0 hari" terus krn akun udh lama dibuat
      if (user.tglExpired) {
        let tglExp = new Date(user.tglExpired);
        let tglSekarang = new Date();
        let diffTime = tglExp - tglSekarang;
        sisaHari = Math.max(0, Math.ceil(diffTime / (1000 * 60 * 60 * 24)));
      } else {
        sisaHari = 0;
      }

      // status (trial/langganan) dipilih admin manual & disimpan di DB.
      // jd pelanggan yg sisa harinya menipis TETEP "langganan", gak balik "trial".
      if (user.statusLangganan === 'langganan') {
        paketLabel = 'Profesional (Langganan Aktif)';
        paketStatus = `Aktif • Sisa ${sisaHari} Hari`;
        badgeClass = 'badge-success';
      } else {
        paketLabel = 'Profesional (Trial)';
        paketStatus = `Trial • Sisa ${sisaHari} Hari`;
        badgeClass = 'badge-info';
      }
    } else if (user.paket === 'enterprise') {
      paketLabel = 'Enterprise (Kustom)';
      paketStatus = 'Premium Aktif';
      badgeClass = 'badge-success';
      showCta = false;
    }

    let deskripsiAkun = 'Akun Anda saat ini menggunakan paket <strong>Starter</strong>. Silakan hubungi Admin untuk memperpanjang langganan atau upgrade ke paket <strong>Profesional/Enterprise</strong> untuk membuka semua fitur pembukuan tanpa batasan.';
    if (user.paket === 'business') {
      if (user.statusLangganan === 'langganan') {
        deskripsiAkun = `Langganan paket <strong>Profesional</strong> Anda aktif dengan sisa waktu <strong>${sisaHari} hari</strong>. Semua fitur premium terbuka penuh. Hubungi Admin untuk memperpanjang sebelum masa langganan berakhir agar layanan tidak terputus.`;
      } else {
        deskripsiAkun = `Akun Anda menggunakan paket <strong>Profesional (Trial)</strong>. Sisa waktu <strong>${sisaHari} hari</strong>. Segera hubungi Admin untuk berlangganan atau memperpanjang sebelum masa trial berakhir.`;
      }
    } else if (user.paket === 'enterprise') {
      deskripsiAkun = 'Akun <strong>Enterprise</strong> Anda aktif dengan akses prioritas 24/7. Hubungi Admin jika memerlukan kustomisasi sistem tambahan.';
    }

    // ambil wa.me + template pesan dr platform settings (diatur superadmin).
    // pesan di-encode biar aman dipake di url wa.me
    let ps = store.platformSettings || {};
    let psWaAdmin = ps.wa_admin || '6285750917686';
    let psWaCs = ps.wa_cs || '6285750917686';
    let psPesanUpgrade = encodeURIComponent(ps.pesan_upgrade || 'Halo Admin Ledgerly, saya ingin upgrade paket.');
    let psPesanCs = encodeURIComponent(ps.pesan_cs || 'Halo CS Ledgerly, saya butuh bantuan.');

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
            ${deskripsiAkun}
          </div>
          <div style="display:flex; flex-wrap:wrap; gap:10px;">
            ${showCta ? `
              <a href="https://wa.me/${psWaAdmin}?text=${psPesanUpgrade}" target="_blank" class="btn btn-primary" style="padding:10px 20px; font-size:13px; border-radius:10px; display:inline-flex; align-items:center; gap:8px;">
                ${icon('whatsapp', 16)} Hubungi Admin (Upgrade)
              </a>
            ` : ''}
            <a href="https://wa.me/${psWaCs}?text=${psPesanCs}" target="_blank" class="btn btn-secondary" style="padding:10px 20px; font-size:13px; border-radius:10px; display:inline-flex; align-items:center; gap:8px;">
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

  // Render daftar kategori
  renderKategoriList();
}

function toggleRow(key, iconSvg, title, desc, isActive, color) {
  return `
    <div class="toggle-row" style="padding:0; margin:0; display:flex; flex-wrap:nowrap; align-items:center; justify-content:space-between; gap:12px;">
      <div class="toggle-left" style="display:flex; align-items:center; gap:12px; flex:1; min-width:0;">
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

// ============ KELOLA KATEGORI ============

function renderKategoriList() {
  let container = document.getElementById('set-kategori-list');
  if (!container) return;

  let list = store.kategoriList || [];
  if (list.length === 0) {
    container.innerHTML = '<div style="text-align:center; color:var(--slate-400); font-size:13px; padding:20px 0;">Belum ada kategori. Tambahkan kategori pertama Anda!</div>';
    return;
  }

  container.innerHTML = '<div style="display:flex; flex-wrap:wrap; gap:8px;">' +
    list.map(function(k) {
      return '<div style="display:flex; align-items:center; gap:6px; background:var(--slate-50); border:1px solid var(--slate-200); border-radius:20px; padding:5px 12px; font-size:13px; color:var(--slate-700);">'
        + '<span>' + (k.nama_kategori || k.nama || '') + '</span>'
        + '<button onclick="konfirmasiHapusKategori(\'' + k.kategori_id + '\', \'' + (k.nama_kategori || k.nama || '') + '\')" '
        + 'style="background:none; border:none; cursor:pointer; color:var(--slate-400); display:flex; align-items:center; padding:0; margin-left:2px; font-size:14px; line-height:1;" '
        + 'title="Hapus kategori" >&times;</button>'
        + '</div>';
    }).join('') + '</div>';
}

async function tambahKategori() {
  let input = document.getElementById('input-kategori-baru');
  let errEl = document.getElementById('kat-error');
  if (!input) return;

  let nama = input.value.trim();
  errEl.style.display = 'none';

  // Validasi
  if (!nama) { errEl.textContent = 'Nama kategori tidak boleh kosong.'; errEl.style.display = 'block'; return; }
  if (nama.length > 30) { errEl.textContent = 'Nama kategori maksimal 30 karakter.'; errEl.style.display = 'block'; return; }

  let duplikat = (store.kategoriList || []).some(function(k) {
    return (k.nama_kategori || '').toLowerCase() === nama.toLowerCase();
  });
  if (duplikat) { errEl.textContent = 'Kategori \"' + nama + '\" sudah ada.'; errEl.style.display = 'block'; return; }

  try {
    // wajib sertakan user_id krn RLS Kategori cek auth.uid() = user_id.
    // klo gak diisi, insert ditolak policy (row level security)
    let { data, error } = await window.supabaseClient
      .from('Kategori')
      .insert({ nama_kategori: nama, user_id: (store.user || {}).id })
      .select();

    if (error) throw error;

    // Update store
    if (data && data[0]) {
      store.kategoriList = [...(store.kategoriList || []), data[0]];
    }

    input.value = '';
    renderKategoriList();
    refreshDropdownKategori();
  } catch (err) {
    errEl.textContent = 'Gagal menambah kategori: ' + err.message;
    errEl.style.display = 'block';
  }
}

// tampilkan modal konfirmasi UI (bukan confirm() bawaan browser yg jelek)
function konfirmasiHapusKategori(id, nama) {
  // cek brp produk yg make kategori ini
  let dipakai = (store.produk || []).filter(function(p) { return p.kategori === nama; }).length;

  // hapus modal lama klo ada, biar gak numpuk
  let lama = document.getElementById('modal-hapus-kategori');
  if (lama) lama.remove();

  let modalHtml;
  if (dipakai > 0) {
    // DIPAKAI produk -> TOLAK hapus, cuma kasih peringatan. gak ada tombol hapus.
    // user harus pindahin/hapus produknya dulu baru bisa hapus kategori ini.
    modalHtml = '<div class="modal-overlay" id="modal-hapus-kategori" onclick="if(event.target.id===\'modal-hapus-kategori\') tutupModalHapusKategori()">'
      + '<div class="modal-box" style="max-width:420px;">'
      + '<div style="display:flex; align-items:flex-start; gap:14px; margin-bottom:18px;">'
      + '<div style="flex-shrink:0; width:42px; height:42px; border-radius:50%; background:var(--amber-50); color:var(--amber-600); display:grid; place-items:center;">' + icon('alertTriangle', 20) + '</div>'
      + '<div>'
      + '<div class="modal-title">Tidak bisa dihapus</div>'
      + '<div class="modal-desc" style="margin-top:6px; line-height:1.5;">Kategori <b>"' + nama + '"</b> masih dipakai <b>' + dipakai + ' produk</b>. '
      + 'Pindahkan produk tersebut ke kategori lain (lewat Edit produk) atau hapus produknya dulu, baru kategori ini bisa dihapus.</div>'
      + '</div>'
      + '</div>'
      + '<div style="display:flex; justify-content:flex-end; gap:8px;">'
      + '<button class="btn btn-primary" onclick="tutupModalHapusKategori()">Mengerti</button>'
      + '</div>'
      + '</div></div>';
  } else {
    // KOSONG -> boleh dihapus
    modalHtml = '<div class="modal-overlay" id="modal-hapus-kategori" onclick="if(event.target.id===\'modal-hapus-kategori\') tutupModalHapusKategori()">'
      + '<div class="modal-box" style="max-width:420px;">'
      + '<div style="display:flex; align-items:flex-start; gap:14px; margin-bottom:18px;">'
      + '<div style="flex-shrink:0; width:42px; height:42px; border-radius:50%; background:var(--rose-50); color:var(--rose-600); display:grid; place-items:center;">' + icon('trash', 20) + '</div>'
      + '<div>'
      + '<div class="modal-title">Hapus kategori "' + nama + '"?</div>'
      + '<div class="modal-desc" style="margin-top:6px; line-height:1.5;">Kategori ini belum dipakai produk manapun, jadi aman dihapus.</div>'
      + '</div>'
      + '</div>'
      + '<div style="display:flex; justify-content:flex-end; gap:8px;">'
      + '<button class="btn btn-secondary" onclick="tutupModalHapusKategori()">Batal</button>'
      + '<button class="btn btn-danger" onclick="hapusKategori(\'' + id + '\')">Ya, Hapus</button>'
      + '</div>'
      + '</div></div>';
  }

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function tutupModalHapusKategori() {
  let modal = document.getElementById('modal-hapus-kategori');
  if (modal) modal.remove();
}

async function hapusKategori(id) {
  tutupModalHapusKategori();
  try {
    let { error } = await window.supabaseClient
      .from('Kategori')
      .delete()
      .eq('kategori_id', id);

    if (error) throw error;

    store.kategoriList = (store.kategoriList || []).filter(function(k) { return k.kategori_id !== id; });
    renderKategoriList();
    refreshDropdownKategori();
  } catch (err) {
    alert('Gagal menghapus kategori: ' + err.message);
  }
}

function refreshDropdownKategori() {
  // Refresh dropdown filter di halaman inventaris jika sedang aktif
  let filterKat = document.getElementById('filter-inv-kategori');
  if (filterKat) {
    let currentVal = filterKat.value;
    let list = store.kategoriList || [];
    filterKat.innerHTML = '<option value="">Semua Kategori</option>' +
      list.map(function(k) { return '<option value="' + (k.nama_kategori || '') + '">' + (k.nama_kategori || '') + '</option>'; }).join('');
    filterKat.value = currentVal;
  }
}
