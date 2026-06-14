/* =============================================
   kelola-pemilik.js — Halaman Manajemen Pengguna
   Untuk peran Superadmin mengelola Pemilik Toko
   ============================================= */

var listPemilik = []; // State lokal data pemilik

// Inisialisasi halaman kelola pemilik
async function initKelolaPemilik() {
  let kpPlus = document.getElementById("kp-plus-icon");
  if (kpPlus) kpPlus.innerHTML = icon("plus", 16);

  // Muat data pemilik dari database dan render ke tabel
  await muatDaftarPemilik();
  let cariInput = document.getElementById("cari-pemilik");
  if (cariInput) {
    let topbarSearch = document.getElementById("topbar-search-input");
    if (topbarSearch && topbarSearch.value) {
      cariInput.value = topbarSearch.value;
      filterPemilik(); // langsung filter berdasarkan query dari topbar search jika ada
    }
  }
}

// Ambil data pemilik dari Supabase dan render ke tabel
async function muatDaftarPemilik() {
  let body = document.getElementById("body-tabel-pemilik");
  let subTitle = document.getElementById("sub-total-pemilik");
  if (!body) return;

  // Jika Supabase tidak terhubung, tampilkan pesan error
  if (!window.supabaseClient) {
    body.innerHTML =
      '<tr><td colspan="6" class="text-center" style="padding:40px; color:var(--rose-600);">Koneksi database cloud tidak tersedia.</td></tr>';
    return;
  }

  try {
    // Ambil data pemilik dari tabel "Users" di Supabase
    const { data, error } = await window.supabaseClient.from("Users").select("*").order("nama", { ascending: true });

    if (error) throw error;

    // Simpan data ke state lokal dan render ke tabel
    listPemilik = data || [];
    subTitle.innerText = listPemilik.length + " akun terdaftar";
    renderRowsPemilik(listPemilik);
  } catch (err) {
    console.error("Gagal mengambil data pemilik:", err.message);
    body.innerHTML =
      '<tr><td colspan="6" class="text-center" style="padding:40px; color:var(--rose-600);">Gagal memuat data: ' + err.message + "</td></tr>";
  }
}

function renderRowsPemilik(data) {
  let body = document.getElementById("body-tabel-pemilik");
  if (!body) return;

  // Jika tidak ada data, tampilkan pesan kosong
  if (data.length === 0) {
    body.innerHTML =
      '<tr><td colspan="6" class="text-center" style="padding:40px; color:var(--slate-400);">Tidak ada pemilik toko yang ditemukan.</td></tr>';
    return;
  }

  // Render setiap baris data pemilik ke dalam tabel
  body.innerHTML = data
    .map(function (u) {
      let badgeColor = u.role === "superadmin" ? "badge-danger" : "badge-success";
      let badgeDot = u.role === "superadmin" ? "red" : "green";
      let waNum = u.noTelp ? "+" + u.noTelp : "—";

      // escape semua nilai dr db sblm masuk ke innerHTML (anti-XSS).
      // nama/email/bisnis diisi sendiri sama owner pas daftar, jadi gak bisa dipercaya.
      let namaEsc = escapeHtml(u.nama) || "—";
      let emailEsc = escapeHtml(u.email) || "—";
      let bisnisEsc = escapeHtml(u.bisnis) || "—";
      let roleEsc = escapeHtml(u.role) || "pemilik";
      // buat argumen onclick -> dlm atribut kutip ganda yg isinya string kutip tunggal
      let userIdAttr = escapeAttr(u.user_id);
      let namaAttr = escapeAttr(u.nama);

      // Paket Badge — bedain trial vs langganan + tampilin sisa hari
      let paketBadge = "badge-neutral";
      let paketLabel = "Starter";
      if (u.paket === "business") {
        let sisa = 0;
        if (u.tgl_expired) {
          sisa = Math.max(0, Math.ceil((new Date(u.tgl_expired) - new Date()) / (1000 * 60 * 60 * 24)));
        }
        if (u.status_langganan === "langganan") {
          paketBadge = "badge-success";
          paketLabel = "Langganan • " + sisa + " hari";
        } else {
          paketBadge = "badge-info";
          paketLabel = "Trial • " + sisa + " hari";
        }
        if (sisa <= 0) { paketBadge = "badge-neutral"; paketLabel = "Kedaluwarsa"; }
      } else if (u.paket === "enterprise") {
        paketBadge = "badge-danger";
        paketLabel = "Enterprise";
      }

      let deleteBtn =
        u.role !== "superadmin"
          ? `<button class="btn btn-danger btn-xs" onclick="konfirmasiHapusPemilik('${userIdAttr}', '${namaAttr}')" title="Hapus Akun">${icon("x", 12)} Hapus</button>`
          : '<span style="color:var(--slate-400); font-size:11px; font-style:italic;">Utama</span>';

      return `
      <tr>
        <td class="td-bold">${namaEsc}</td>
        <td style="text-transform:none;">${emailEsc}</td>
        <td>${bisnisEsc}</td>
        <td><span class="badge ${paketBadge}">${paketLabel}</span></td>
        <td><span class="badge ${badgeColor}"><span class="badge-dot ${badgeDot}"></span>${roleEsc}</span></td>
        <td class="td-mono">${waNum}</td>
        <td>
          <div style="display:flex; justify-content:flex-end; gap:8px; align-items:center;">
            <button class="btn btn-secondary btn-xs" onclick="bukaModalPemilik('${userIdAttr}')" title="Ubah Profil">${icon("settings", 12)} Ubah</button>
            <span style="display:inline-flex; justify-content:flex-end; align-items:center; width:96px; flex-shrink:0;">${deleteBtn}</span>
          </div>
        </td>
      </tr>
    `;
    })
    .join("");
}

// Filter daftar pemilik berdasarkan query pencarian
function filterPemilik() {
  let query = document.getElementById("cari-pemilik").value.toLowerCase();
  let filtered = listPemilik.filter(function (u) {
    return (
      (u.nama || "").toLowerCase().includes(query) || (u.email || "").toLowerCase().includes(query) || (u.bisnis || "").toLowerCase().includes(query)
    );
  });
  renderRowsPemilik(filtered);
}

// hitung sisa hari trial dr tgl_expired target (buat pre-fill input). default 7
function hitungSisaHariTarget(target) {
  if (target && target.paket === "business" && target.tgl_expired) {
    let diff = new Date(target.tgl_expired) - new Date();
    let hari = Math.ceil(diff / (1000 * 60 * 60 * 24));
    return hari > 0 ? hari : 1;
  }
  return 7;
}

// show/hide input masa trial pas paket diganti di dropdown
function toggleInputMasaTrial() {
  let sel = document.getElementById("p-paket");
  let wrap = document.getElementById("wrap-masa-trial");
  if (sel && wrap) wrap.style.display = sel.value === "business" ? "block" : "none";
}

// Render pop-up untuk tambah/ubah data pemilik
function bukaModalPemilik(userId) {
  // Hapus modal lama jika ada
  tutupModalPemilik();

  let target =
    listPemilik.find(function (u) {
      return u.user_id === userId;
    }) || {};
  let title = userId ? "Ubah Profil Pemilik" : "Tambah Pemilik Baru";

  // escape nilai yg masuk ke value="..." form (anti-XSS via atribut).
  let namaVal = escapeAttr(target.nama);
  let emailVal = escapeAttr(target.email);
  let bisnisVal = escapeAttr(target.bisnis);
  let notelpVal = escapeAttr(target.noTelp);
  let userIdAttr = escapeAttr(userId || "");

  let modalHtml = `
    <div class="modal-overlay" id="modal-pemilik-container" onclick="if(event.target.id==='modal-pemilik-container') tutupModalPemilik()">
      <div class="modal-box" style="max-width:480px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:20px; gap:12px;">
          <div>
            <div class="modal-title">${title}</div>
            <div class="modal-desc">Kelola detail kredensial dan hak akses bisnis</div>
          </div>
          <button class="btn btn-secondary btn-xs" onclick="tutupModalPemilik()">${icon("x", 16)}</button>
        </div>
        <form id="form-pemilik" onsubmit="simpanPemilik(event, '${userIdAttr}')">
          <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
            <div>
              <label class="form-label">Nama Lengkap</label>
              <input class="form-input" type="text" id="p-nama" value="${namaVal}" required>
            </div>
            <div>
              <label class="form-label">Email Kerja</label>
              <input class="form-input" type="email" id="p-email" value="${emailVal}" style="text-transform:none;" required ${userId ? 'readonly disabled' : ''}>
            </div>
            ${userId ? '' : `
            <div>
              <label class="form-label">Kata Sandi <span style="font-weight:400; text-transform:none; color:var(--slate-400);">(min 8 karakter)</span></label>
              <div class="login-input-group" style="position:relative;">
                <input class="form-input" type="password" id="p-password" minlength="8" required placeholder="Buat kata sandi untuk pemilik" autocomplete="new-password">
                <button type="button" onclick="togglePwPemilik()" style="position:absolute; right:10px; top:50%; transform:translateY(-50%); background:none; border:none; cursor:pointer; color:var(--slate-400); padding:4px;" id="btn-pw-pemilik">${icon('eye', 16)}</button>
              </div>
              <div style="font-size:11px; color:var(--slate-400); margin-top:4px;">Akun langsung aktif (tanpa verifikasi email). Catat & beritahukan sandi ini ke pemilik.</div>
            </div>
            `}
            <div>
              <label class="form-label">Nama Bisnis / Toko</label>
              <input class="form-input" type="text" id="p-bisnis" value="${bisnisVal}" required>
            </div>
            <div>
              <label class="form-label">Nomor WhatsApp (Format: 628xxxx)</label>
              <input class="form-input" type="text" inputmode="numeric" id="p-notelp" value="${notelpVal}" placeholder="Contoh: 628123456789" required oninput="this.value=this.value.replace(/[^0-9]/g,'').slice(0,15)">
              <div style="font-size:11px; color:var(--slate-400); margin-top:4px;">Format 62xxx, 9-13 digit (di luar kode negara).</div>
            </div>
            <div>
              <label class="form-label">Paket Langganan</label>
              <select class="form-select" id="p-paket" onchange="toggleInputMasaTrial()">
                <option value="starter"${target.paket === "starter" || !target.paket ? " selected" : ""}>Starter (Gratis)</option>
                <option value="business"${target.paket === "business" ? " selected" : ""}>Business (Trial)</option>
                <option value="enterprise"${target.paket === "enterprise" ? " selected" : ""}>Enterprise (Kustom)</option>
              </select>
            </div>
            <div id="wrap-masa-trial" style="display:${target.paket === "business" ? "block" : "none"};">
              <label class="form-label">Status Langganan</label>
              <select class="form-select" id="p-status-langganan" style="margin-bottom:10px;">
                <option value="trial"${target.status_langganan !== "langganan" ? " selected" : ""}>Trial (uji coba)</option>
                <option value="langganan"${target.status_langganan === "langganan" ? " selected" : ""}>Langganan (sudah bayar)</option>
              </select>
              <label class="form-label">Masa Aktif (hari dari sekarang)</label>
              <input class="form-input" type="number" id="p-masa-trial" min="1" max="365" value="${hitungSisaHariTarget(target)}" placeholder="Contoh: 7">
              <div style="font-size:11px; color:var(--slate-400); margin-top:4px;">${target.tgl_expired ? 'Berakhir saat ini: ' + new Date(target.tgl_expired).toLocaleDateString('id-ID', { day:'numeric', month:'long', year:'numeric', timeZone:'Asia/Jakarta' }) : 'Isi jumlah hari masa aktif.'}</div>
            </div>
          </div>
          <div style="display:flex; justify-content:end; gap:8px;">
            <button type="button" class="btn btn-secondary" onclick="tutupModalPemilik()">Batal</button>
            <button type="submit" class="btn btn-primary">Simpan Perubahan</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
}

// Tutup dan hapus modal dari DOM
function tutupModalPemilik() {
  let modal = document.getElementById("modal-pemilik-container");
  if (modal) modal.remove();
}

// toggle lihat/sembunyi password di form tambah pemilik
function togglePwPemilik() {
  let inp = document.getElementById("p-password");
  let btn = document.getElementById("btn-pw-pemilik");
  if (!inp) return;
  if (inp.type === "password") {
    inp.type = "text";
    if (btn) btn.innerHTML = icon("eyeOff", 16);
  } else {
    inp.type = "password";
    if (btn) btn.innerHTML = icon("eye", 16);
  }
}

// Simpan data pemilik baru atau yang sudah diubah ke database
async function simpanPemilik(e, userId) {
  e.preventDefault();

  let nama = document.getElementById("p-nama").value.trim();
  let email = document.getElementById("p-email").value.trim();
  let bisnis = document.getElementById("p-bisnis").value.trim();
  let noTelp = document.getElementById("p-notelp").value.trim();

  // validasi nomor WA — mirror aturan form register: bersihin non-angka,
  // buang awalan 0/62, base HARUS 9-13 digit. nyegah nomor luber (input
  // number gak punya maxlength jadi wajib dicek manual di sini).
  let waClean = noTelp.replace(/[^0-9]/g, '');
  let waBase = waClean;
  if (waBase.startsWith('62')) waBase = waBase.substring(2);
  else if (waBase.startsWith('0')) waBase = waBase.substring(1);
  if (waBase.length < 9 || waBase.length > 13) {
    alert('Nomor WhatsApp tidak valid. Masukkan 9 hingga 13 digit (di luar kode negara/awalan 0).');
    return;
  }
  // simpan dalam format 62xxxx yg konsisten
  noTelp = '62' + waBase;

  let target =
    listPemilik.find(function (u) {
      return u.user_id === userId;
    }) || {};
  let role = target.role || "pemilik"; // pertahankan peran asli atau default ke pemilik untuk akun baru
  let paket = document.getElementById("p-paket").value;

  // hitung tgl_expired buat paket business dr input jumlah hari.
  // paket lain (starter/enterprise) gak ada expired -> null
  let tglExpired = null;
  let statusLangganan = null;
  if (paket === "business") {
    let inputHari = document.getElementById("p-masa-trial");
    let hari = inputHari ? parseInt(inputHari.value) : 7;
    if (isNaN(hari) || hari < 1) hari = 7;
    let exp = new Date();
    exp.setDate(exp.getDate() + hari);
    tglExpired = exp.toISOString();
    // status dipilih admin manual (trial / langganan), bukan ditebak dr lama hari
    let selStatus = document.getElementById("p-status-langganan");
    statusLangganan = selStatus ? selStatus.value : "trial";
  }

  if (!window.supabaseClient) return;

  try {
    if (userId) {
      // UPDATE data user di Supabase
      const { error } = await window.supabaseClient
        .from("Users")
        .update({ nama: nama, email: email, bisnis: bisnis, noTelp: parseInt(noTelp), role: role, paket: paket, tgl_expired: tglExpired, status_langganan: statusLangganan })
        .eq("user_id", userId);

      if (error) throw error;
      console.log("Berhasil memperbarui data pemilik!");
    } else {
      // TAMBAH pemilik baru: lewat endpoint serverless /api/create-user.
      // endpoint pegang service_role key di server (bikin akun auth + profil
      // sekaligus, email langsung aktif). gak bisa dr frontend langsung krn
      // signUp bakal nge-logout admin + service_role gak boleh ke browser.
      let password = (document.getElementById("p-password") || {}).value || "";

      // ambil JWT admin buat dikirim ke endpoint (dipakai verifikasi superadmin)
      let token = "";
      try {
        const { data: sesi } = await window.supabaseClient.auth.getSession();
        token = sesi && sesi.session ? sesi.session.access_token : "";
      } catch (e) {}

      const resp = await fetch("/api/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: "Bearer " + token },
        body: JSON.stringify({ email: email, password: password, nama: nama, bisnis: bisnis, noTelp: noTelp, paket: paket })
      });
      const hasil = await resp.json();
      if (!resp.ok) throw new Error(hasil.error || "Gagal membuat akun pemilik.");

      // klo paket business, set tgl_expired + status (endpoint cuma set profil dasar)
      if (paket === "business" && hasil.user_id) {
        await window.supabaseClient.from("Users")
          .update({ tgl_expired: tglExpired, status_langganan: statusLangganan })
          .eq("user_id", hasil.user_id);
      }
      console.log("Berhasil menambahkan pemilik baru + akun login!");
    }

    tutupModalPemilik(); // tutup modal setelah berhasil menyimpan
    await muatDaftarPemilik(); // refresh
  } catch (err) {
    console.error("Gagal menyimpan data pemilik:", err.message);
    alert("Error: " + err.message);
  }
}

// notifikasi konfirmasi sebelum menghapus akun pemilik
function konfirmasiHapusPemilik(userId, nama) {
  konfirmasiUI({
    judul: 'Hapus akun "' + nama + '"?',
    pesan: 'Data profil pemilik ini akan dihapus permanen dari database.',
    teksYa: 'Ya, Hapus',
    onYa: function() { hapusPemilik(userId); }
  });
}

// Hapus data pemilik dari database berdasarkan userId
async function hapusPemilik(userId) {
  if (!window.supabaseClient) return; // check koneksi ke Supabase

  try {
    // DELETE data user dari Supabase
    const { error } = await window.supabaseClient.from("Users").delete().eq("user_id", userId);

    if (error) throw error;
    console.log("Berhasil menghapus pemilik!");
    
    await muatDaftarPemilik(); // refresh daftar setelah penghapusan
  } catch (err) {
    console.error("Gagal menghapus pemilik:", err.message);
    alert("Gagal menghapus: " + err.message);
  }
}
