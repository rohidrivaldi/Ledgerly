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

      // Paket Badge
      let paketBadge = "badge-neutral";
      let paketLabel = "Starter";
      if (u.paket === "business") {
        paketBadge = "badge-info";
        paketLabel = "Business (Trial)";
      } else if (u.paket === "enterprise") {
        paketBadge = "badge-danger";
        paketLabel = "Enterprise";
      }

      let deleteBtn =
        u.role !== "superadmin"
          ? `<button class="btn btn-danger btn-xs" onclick="konfirmasiHapusPemilik('${u.user_id}', '${u.nama}')" title="Hapus Akun">${icon("x", 12)} Hapus</button>`
          : '<span style="color:var(--slate-400); font-size:11px; font-style:italic; padding:4px 8px;">Utama</span>';

      return `
      <tr>
        <td class="td-bold">${u.nama || "—"}</td>
        <td style="text-transform:none;">${u.email || "—"}</td>
        <td>${u.bisnis || "—"}</td>
        <td><span class="badge ${paketBadge}">${paketLabel}</span></td>
        <td><span class="badge ${badgeColor}"><span class="badge-dot ${badgeDot}"></span>${u.role || "pemilik"}</span></td>
        <td class="td-mono">${waNum}</td>
        <td class="text-center">
          <div style="display:flex; justify-content:center; gap:8px; align-items:center;">
            <button class="btn btn-secondary btn-xs" onclick="bukaModalPemilik('${u.user_id}')" title="Ubah Profil">${icon("settings", 12)} Ubah</button>
            ${deleteBtn}
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

// Render pop-up untuk tambah/ubah data pemilik
function bukaModalPemilik(userId) {
  // Hapus modal lama jika ada
  tutupModalPemilik();

  let target =
    listPemilik.find(function (u) {
      return u.user_id === userId;
    }) || {};
  let title = userId ? "Ubah Profil Pemilik" : "Tambah Pemilik Baru";

  let modalHtml = `
    <div class="modal-overlay" id="modal-pemilik-container">
      <div class="modal-box" style="max-width:480px;">
        <div style="display:flex; justify-content:between; align-items:start; margin-bottom:20px;">
          <div>
            <div class="modal-title">${title}</div>
            <div class="modal-desc">Kelola detail kredensial dan hak akses bisnis</div>
          </div>
          <button class="btn btn-secondary btn-xs" onclick="tutupModalPemilik()">${icon("x", 16)}</button>
        </div>
        <form id="form-pemilik" onsubmit="simpanPemilik(event, '${userId || ""}')">
          <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
            <div>
              <label class="form-label">Nama Lengkap</label>
              <input class="form-input" type="text" id="p-nama" value="${target.nama || ""}" required>
            </div>
            <div>
              <label class="form-label">Email Kerja</label>
              <input class="form-input" type="email" id="p-email" value="${target.email || ""}" style="text-transform:none;" required>
            </div>
            <div>
              <label class="form-label">Nama Bisnis / Toko</label>
              <input class="form-input" type="text" id="p-bisnis" value="${target.bisnis || ""}" required>
            </div>
            <div>
              <label class="form-label">Nomor WhatsApp (Format: 628xxxx)</label>
              <input class="form-input" type="number" id="p-notelp" value="${target.noTelp || ""}" placeholder="Contoh: 628123456789" required>
            </div>
            <div>
              <label class="form-label">Paket Langganan</label>
              <select class="form-select" id="p-paket">
                <option value="starter"${target.paket === "starter" || !target.paket ? " selected" : ""}>Starter (Gratis)</option>
                <option value="business"${target.paket === "business" ? " selected" : ""}>Business (Trial 7 Hari)</option>
                <option value="enterprise"${target.paket === "enterprise" ? " selected" : ""}>Enterprise (Kustom)</option>
              </select>
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

// Simpan data pemilik baru atau yang sudah diubah ke database
async function simpanPemilik(e, userId) {
  e.preventDefault();

  let nama = document.getElementById("p-nama").value.trim();
  let email = document.getElementById("p-email").value.trim();
  let bisnis = document.getElementById("p-bisnis").value.trim();
  let noTelp = document.getElementById("p-notelp").value.trim();
  let target =
    listPemilik.find(function (u) {
      return u.user_id === userId;
    }) || {};
  let role = target.role || "pemilik"; // pertahankan peran asli atau default ke pemilik untuk akun baru
  let paket = document.getElementById("p-paket").value;

  if (!window.supabaseClient) return;

  try {
    if (userId) {
      // UPDATE data user di Supabase
      const { error } = await window.supabaseClient
        .from("Users")
        .update({ nama: nama, email: email, bisnis: bisnis, noTelp: parseInt(noTelp), role: role, paket: paket })
        .eq("user_id", userId);

      if (error) throw error;
      console.log("Berhasil memperbarui data pemilik!");
    } else {
      // INSERT data user baru ke Supabase
      const { error } = await window.supabaseClient
        .from("Users")
        .insert({ nama: nama, email: email, bisnis: bisnis, noTelp: parseInt(noTelp), role: role, paket: paket });

      if (error) throw error;
      console.log("Berhasil menambahkan pemilik baru!");
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
  let setuju = confirm("Apakah Anda yakin ingin menghapus akun pemilik '" + nama + "'? Data profil akan dihapus permanen dari database.");
  if (setuju) {
    hapusPemilik(userId);
  }
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
