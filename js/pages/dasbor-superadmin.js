/* =============================================
   dasbor-superadmin.js — Halaman Dashboard Utama Superadmin
   ============================================= */

// State local untuk dasbor superadmin
var superadminStats = {
  totalOwners: 0,
  totalProducts: 0,
  totalTransactions: 0,
  totalVolume: 0,
  ownersList: [],
};

var chartSub = null; // Instance Chart.js

// render HTML untuk kartu statistik di dasbor superadmin
function renderSuperadminStatsCards() {
  return `
    ${statCard("Total Pemilik UMKM", superadminStats.totalOwners + " akun", icon("users"), "Terdaftar di platform")}
    ${statCard("Total Produk Sistem", superadminStats.totalProducts + " produk", icon("package"), "Item katalog global")}
    ${statCard("Total Transaksi", superadminStats.totalTransactions + " transaksi", icon("arrowLeftRight"), "Seluruh data platform")}
    ${statCard("Volume Transaksi", formatRupiah(superadminStats.totalVolume), icon("trendingUp"), "Total nilai transaksi", "success")}
  `;
}

// Inisialisasi halaman dasbor superadmin
async function initDasborSuperadmin() {
  // render elemen statis seperti ikon dan teks
  let btnKp = document.getElementById("sa-nav-kp-btn");
  if (btnKp) btnKp.innerHTML = `${icon("users", 14)} Kelola Pemilik`;
  let btnLogout = document.getElementById("sa-logout-btn");
  if (btnLogout) btnLogout.innerHTML = `${icon("logOut", 14)} Keluar`;

  // sinkronisasi data dari Supabase
  if (!window.supabaseClient) {
    renderErrorDasborSuperadmin(); // koneksi DB gak ada -> tampilkan error jujur, bukan dummy
    return;
  }

  try {
    // 1. Ambil data pemilik bisnis
    const { data: users, error: errUsers } = await window.supabaseClient.from("Users").select("*").order("nama", { ascending: true });

    if (errUsers) throw errUsers;

    // Filter yang bukan superadmin untuk statistik pemilik UMKM
    let owners = (users || []).filter((u) => u.role !== "superadmin");
    superadminStats.totalOwners = owners.length;
    superadminStats.ownersList = owners;

    // 2. Ambil total produk platform
    const { data: products, error: errProds } = await window.supabaseClient.from("Products").select("product_id, modal, harga");
    if (errProds) throw errProds;
    superadminStats.totalProducts = products ? products.length : 0;

    // 3. Ambil total transaksi platform
    const { data: txs, error: errTxs } = await window.supabaseClient.from("Transactions").select("transaction_id, isPenjualan");
    if (errTxs) throw errTxs;
    superadminStats.totalTransactions = txs ? txs.length : 0; // kalo data null, set ke 0

    // 4. Ambil detail transaksi untuk menghitung volume keuangan platform
    const { data: details, error: errDetails } = await window.supabaseClient.from("Detail_Transactions").select("transaction_id, product_id, jumlah");
    if (errDetails) throw errDetails;

    // Hitung volume keuangan
    let totalVolume = 0;
    if (details && products && txs) {
      let prodMap = {};
      products.forEach((p) => (prodMap[p.product_id] = p));
      let txMap = {};
      txs.forEach((t) => (txMap[t.transaction_id] = t));

      // loop detail transaksi untuk menghitung total volume berdasarkan harga jual atau modal produk
      details.forEach((d) => {
        let p = prodMap[d.product_id];
        let t = txMap[d.transaction_id];
        if (p && t) {
          totalVolume += d.jumlah * (t.isPenjualan ? p.harga : p.modal);
        }
      });
    }
    superadminStats.totalVolume = totalVolume;

    // Update UI Stats Cards
    let container = document.getElementById("sa-stats-container");
    if (container) {
      container.innerHTML = renderSuperadminStatsCards();
    }

    // Update Tabel Pemilik Bisnis Terbaru
    let body = document.getElementById("sa-body-pemilik");
    let tabSubtitle = document.getElementById("sa-tabel-subtitle");
    if (body) {
      if (owners.length === 0) {
        body.innerHTML =
          '<tr><td colspan="5" class="text-center" style="padding:30px; color:var(--slate-400);">Tidak ada pemilik toko terdaftar.</td></tr>';
      } else {
        tabSubtitle.innerText = owners.length + " pemilik bisnis terdaftar";
        body.innerHTML = owners
          .slice(0, 5) // tampilkan 5 pemilik terbaru
          .map(function (u) {
            let waNum = u.noTelp ? "+" + u.noTelp : "—";

            // escape data owner sblm masuk innerHTML. ini dibuka di sesi SUPERADMIN,
            // jadi klo gak di-escape, nama toko jahat bisa nyuntik script di akun admin.
            let namaEsc = escapeHtml(u.nama) || "—";
            let bisnisEsc = escapeHtml(u.bisnis) || "—";
            let emailEsc = escapeHtml(u.email) || "—";

            let paketBadge = "badge-neutral";
            let paketLabel = "Starter";
            if (u.paket === "business") {
              paketBadge = "badge-info";
              paketLabel = "Business (Trial)";
            } else if (u.paket === "enterprise") {
              paketBadge = "badge-danger";
              paketLabel = "Enterprise";
            }

            return `
            <tr>
              <td class="td-bold">${namaEsc}</td>
              <td>${bisnisEsc}</td>
              <td style="text-transform:none;">${emailEsc}</td>
              <td><span class="badge ${paketBadge}">${paketLabel}</span></td>
              <td class="td-mono">${waNum}</td>
            </tr>
          `;
          })
          .join(""); // gabungkan semua baris menjadi satu string HTML
      }
    }

    // Render Chart subscription
    initSubscriptionChart(owners);

    // sync sukses -> status platform: Supabase hijau (beneran terhubung)
    setStatusPlatform(true);
  } catch (err) {
    console.error("Gagal sinkronisasi data dasbor superadmin:", err.message);
    renderErrorDasborSuperadmin();
  }
}

// set status layanan platform DINAMIS (bukan hardcode "Aktif" yg bohong).
// - Supabase: hijau kalau sync DB sukses, merah kalau gagal.
// - Gemini AI: hijau (proxy /api/chatbot aktif & ada key di server).
// - WhatsApp Gateway: bot node.js TERPISAH (repo lain, Pterodactyl) yg blm
//   tentu jalan -> status "Belum Aktif" (jujur), bukan "Aktif" palsu.
function setStatusPlatform(supabaseOk) {
  function setBadge(elId, ok, teksOk, teksGagal) {
    let el = document.getElementById(elId);
    if (!el) return;
    if (ok) {
      el.className = 'badge badge-success';
      el.innerHTML = '<span class="badge-dot green"></span>' + teksOk;
    } else {
      el.className = 'badge badge-neutral';
      el.innerHTML = '<span class="badge-dot"></span>' + teksGagal;
    }
  }
  setBadge('sa-status-supabase', supabaseOk, 'Terhubung', 'Terputus');
  setBadge('sa-status-gemini', true, 'Aktif', 'Nonaktif');
  // WhatsApp bot belum di-deploy -> tampilkan jujur sbg "Belum Aktif"
  setBadge('sa-status-wa', false, 'Aktif', 'Belum Aktif');
}

// Inisialisasi Chart.js untuk distribusi paket langganan pemilik bisnis.
// 4 segmen: Starter, Business Trial, Business Langganan, Enterprise.
// business dipecah berdasarkan status_langganan (trial vs udah bayar).
function initSubscriptionChart(owners) {
  let canvas = document.getElementById("chart-subscription");
  if (!canvas) return;

  if (chartSub) chartSub.destroy();

  // Hitung jumlah tiap paket/status
  let starterCount = 0;
  let businessTrialCount = 0;
  let businessLanggananCount = 0;
  let enterpriseCount = 0;

  owners.forEach((u) => {
    if (u.paket === "business") {
      // pisah trial vs langganan (default trial kalau status belum diset)
      if (u.status_langganan === "langganan") businessLanggananCount++;
      else businessTrialCount++;
    } else if (u.paket === "enterprise") {
      enterpriseCount++;
    } else {
      starterCount++;
    }
  });

  // Buat chart untuk display distribusi paket langganan
  chartSub = new Chart(canvas, {
    type: "doughnut",
    data: {
      labels: ["Starter", "Business (Trial)", "Business (Langganan)", "Enterprise"],
      datasets: [
        {
          data: [starterCount, businessTrialCount, businessLanggananCount, enterpriseCount],
          backgroundColor: [
            "#64748b", // Slate / Gray — Starter
            "#6366f1", // Indigo — Business Trial
            "#10b981", // Emerald — Business Langganan (udah bayar)
            "#f43f5e", // Rose — Enterprise
          ],
          borderWidth: 2,
          borderColor: "#ffffff",
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          position: "bottom",
          labels: {
            boxWidth: 12,
            font: { size: 11, family: "Inter" },
            padding: 10,
          },
        },
      },
      cutout: "65%",
    },
  });
}

// render state ERROR (bukan dummy palsu). dulu fungsi ini nampilin nama palsu
// "Budi Santoso" dll yg nyesatin admin. sekarang jujur: zero + pesan gagal,
// biar admin tau ini bukan data asli & ada masalah koneksi.
function renderErrorDasborSuperadmin() {
  superadminStats.totalOwners = 0;
  superadminStats.totalProducts = 0;
  superadminStats.totalTransactions = 0;
  superadminStats.totalVolume = 0;

  let container = document.getElementById("sa-stats-container");
  if (container) {
    container.innerHTML = renderSuperadminStatsCards();
  }

  let body = document.getElementById("sa-body-pemilik");
  if (body) {
    body.innerHTML =
      '<tr><td colspan="5" class="text-center" style="padding:30px; color:var(--rose-600);">Gagal memuat data dari server. Cek koneksi internet lalu muat ulang halaman.</td></tr>';
  }

  // status Supabase jadi merah krn sync gagal
  setStatusPlatform(false);

  // chart kosong (semua 0)
  initSubscriptionChart([]);
}
