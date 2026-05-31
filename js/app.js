/* =============================================
   app.js — inti aplikasi dashboard ledgerly
   state management + SPA router
   yg nge-handle navigasi antar halaman di dasbor
   ============================================= */

// -- state global -- simpan data aplikasi disini
var store = {
  user: null,
  produk: JSON.parse(JSON.stringify(PRODUK)),  // copy biar bisa diubah
  transaksi: JSON.parse(JSON.stringify(TRANSAKSI)),
  notifikasi: buatNotifikasi(),
  chatMessages: (function() {
    let saved = localStorage.getItem('ledgerly_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Gagal memuat riwayat chat:", e);
      }
    }
    return [
      { from: 'bot', text: 'Halo! Saya asisten AI Ledgerly. Saya bisa bantu kamu:\n- Cek stok barang\n- Tambah stok masuk/keluar\n- Lihat produk terlaris\n\nSilakan tanya apa saja!' }
    ];
  })(),
  settings: {
    waEnabled: true,
    chatbotEnabled: true,
    cloudSync: true,
    nomorWA: '628123456789'
  }
};

// -- fungsi auth (pake localStorage) --
function cekLogin() {
  let userData = localStorage.getItem('ledgerly_user');
  if (userData) {
    store.user = JSON.parse(userData);
    
    // Muat riwayat chat spesifik user
    let chatKey = dapatkanChatKey();
    let savedChat = localStorage.getItem(chatKey);
    if (savedChat) {
      try {
        store.chatMessages = JSON.parse(savedChat);
      } catch (e) {
        console.warn("Gagal memuat riwayat chat user:", e);
      }
    } else {
      store.chatMessages = [
        { from: 'bot', text: 'Halo! Saya asisten AI Ledgerly. Saya bisa bantu kamu:\n- Cek stok barang\n- Tambah stok masuk/keluar\n- Lihat produk terlaris\n\nSilakan tanya apa saja!' }
      ];
    }
    
    // Sinkronisasi profil user terbaru dari database Supabase secara asinkron
    if (window.supabaseClient) {
      window.supabaseClient
        .from('Users')
        .select('role, nama, bisnis')
        .eq('email', store.user.email)
        .maybeSingle()
        .then(function(res) {
          if (res.data) {
            let updated = false;
            if (store.user.role !== res.data.role) {
              store.user.role = res.data.role;
              updated = true;
            }
            if (store.user.nama !== res.data.nama) {
              store.user.nama = res.data.nama;
              updated = true;
            }
            if (store.user.bisnis !== res.data.bisnis) {
              store.user.bisnis = res.data.bisnis;
              updated = true;
            }
            if (updated) {
              localStorage.setItem('ledgerly_user', JSON.stringify(store.user));
              // Re-render layout agar sesuai dengan hak akses yang baru
              if (typeof renderSidebar === 'function') renderSidebar();
              if (typeof renderTopbar === 'function') renderTopbar();
              // Jika peran berubah dan tidak lagi memiliki hak ke halaman aktif, redirect
              let hash = window.location.hash || '#inventaris';
              if (hash === '#kelola-pemilik' && store.user.role !== 'superadmin') {
                navigasi('#inventaris');
              } else if (hash === '#dasbor-superadmin' && store.user.role !== 'superadmin') {
                navigasi('#inventaris');
              } else if (store.user.role === 'superadmin' && ['#inventaris', '#keuangan', '#transaksi', '#laporan', '#keputusan', '#pengaturan'].includes(hash)) {
                navigasi('#dasbor-superadmin');
              }
            }
          }
        });
    }
    return true;
  }
  return false;
}

async function login(email, password) {
  // Hubungkan otentikasi ke database Supabase
  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;

      if (data && data.user) {
        // Ambil data profil pengguna dari tabel Users
        let { data: profil } = await window.supabaseClient
          .from('Users')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        store.user = {
          id: data.user.id,
          nama: profil ? profil.nama : 'Pemilik Toko',
          email: email,
          bisnis: profil ? profil.bisnis : 'Toko Sejahtera',
          role: profil ? profil.role : 'pemilik'
        };
        localStorage.setItem('ledgerly_user', JSON.stringify(store.user));
        return { ok: true };
      }
    } catch (err) {
      console.warn("Gagal melakukan login ke Supabase:", err.message);
      return { ok: false, pesan: err.message || 'Email atau kata sandi salah.' };
    }
  }
  return { ok: false, pesan: 'Layanan database cloud tidak tersedia.' };
}

async function register(email, password, nama, bisnis) {
  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient.auth.signUp({
        email: email,
        password: password
      });
      if (error) throw error;
      
      if (data && data.user) {
        // Sisipkan data profil pengguna baru ke tabel Users di database
        const { error: profileError } = await window.supabaseClient
          .from('Users')
          .insert({
            email: email,
            nama: nama,
            bisnis: bisnis,
            role: 'pemilik'
          });
        
        if (profileError) {
          console.warn("Gagal menyisipkan profil pengguna baru ke tabel Users:", profileError.message);
        }
        return { ok: true };
      }
    } catch (err) {
      console.warn("Gagal mendaftar ke Supabase:", err.message);
      return { ok: false, pesan: err.message || 'Pendaftaran gagal.' };
    }
  }
  return { ok: false, pesan: 'Layanan database cloud tidak tersedia.' };
}

async function resetPassword(email) {
  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login.html'
      });
      if (error) throw error;
      return { ok: true };
    } catch (err) {
      console.warn("Gagal mengirim reset password ke Supabase:", err.message);
      return { ok: false, pesan: err.message || 'Gagal mengirim email reset password.' };
    }
  }
  return { ok: false, pesan: 'Layanan database cloud tidak tersedia.' };
}

function logout() {
  if (confirm("Apakah Anda yakin ingin keluar dari sistem Ledgerly?")) {
    localStorage.removeItem('ledgerly_user');
    store.user = null;
    window.location.href = 'login.html';
  }
}

// -- mutasi data --

async function tambahTransaksi(tx) {
  // 1. Update local state terlebih dahulu (instant UI feedback)
  store.transaksi.unshift(tx);
  var p = store.produk.find(function(pr) { return pr.id === tx.produkId; });
  if (p) {
    if (tx.tipe === 'MASUK') p.stok += tx.jumlah;
    else p.stok -= tx.jumlah;
    p.updatedAt = new Date().toISOString().slice(0, 10);
  }
  store.notifikasi = buatNotifikasi();
  hitungStatistikDariTransaksi();
  
  // Re-render halaman aktif jika sedang berada di inventaris, keuangan, transaksi, keputusan
  navigasi(window.location.hash || '#inventaris');

  // 2. Kirim ke Supabase jika terhubung
  if (window.supabaseClient) {
    try {
      // Pastikan format UUID valid untuk foreign key
      let dbProdukId = (tx.produkId && tx.produkId.length > 10) ? tx.produkId : null;

      // Ambil atau map ID metode pembayaran
      let metodeId = 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'; // default Cash
      if (tx.metode) {
        let mLower = tx.metode.toLowerCase();
        if (mLower === 'transfer') metodeId = 'b2b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
        else if (mLower === 'qris') metodeId = 'b3b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d';
      }

      // 1. Insert into "Transactions"
      const { data: txData, error: txErr } = await window.supabaseClient
        .from('Transactions')
        .insert({
          isPenjualan: tx.tipe === 'KELUAR',
          user_id: (store.user && store.user.id && store.user.id.length > 10) ? store.user.id : 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
          metode_id: metodeId,
          catatan: tx.catatan || '',
          created_at: tx.tanggal
        })
        .select()
        .single();
      
      if (txErr) throw txErr;

      // 2. Insert into "Detail_Transactions"
      if (txData && dbProdukId) {
        const { error: detErr } = await window.supabaseClient
          .from('Detail_Transactions')
          .insert({
            transaction_id: txData.transaction_id,
            product_id: dbProdukId,
            jumlah: tx.jumlah
          });
          
        if (detErr) throw detErr;
      }

      // 3. Update stok di "Products"
      if (p && p.id && p.id.length > 10) {
        const { error: prodErr } = await window.supabaseClient
          .from('Products')
          .update({
            current_stok: p.stok
          })
          .eq('product_id', p.id);
          
        if (prodErr) throw prodErr;
      }
      console.log("Berhasil sinkronisasi transaksi & stok ke Supabase!");
    } catch (err) {
      console.warn("Gagal kirim data ke Supabase, data disimpan lokal saja:", err.message);
    }
  }
}

function tutupNotifikasi(id) {
  store.notifikasi = store.notifikasi.filter(function(n) { return n.id !== id; });
}

function tambahChatMsg(msg) {
  store.chatMessages.push(msg);
  localStorage.setItem(dapatkanChatKey(), JSON.stringify(store.chatMessages));
}

// -- hitung-hitungan keuangan --

function hitungRingkasan(hari) {
  let data = (store.penjualanHarian || []).slice(-hari);
  let totalOmzet = 0, totalHpp = 0, totalPesanan = 0;
  for (let i = 0; i < data.length; i++) {
    totalOmzet += data[i].omzet;
    totalHpp += data[i].hpp;
    totalPesanan += data[i].pesanan;
  }
  let labaKotor = totalOmzet - totalHpp;
  let biayaOps = Math.round(totalOmzet * 0.08);
  let labaBersih = labaKotor - biayaOps;
  return {
    omzet: totalOmzet,
    hpp: totalHpp,
    labaKotor: labaKotor,
    biaya: biayaOps,
    labaBersih: labaBersih,
    pesanan: totalPesanan,
    hari: hari,
    dataHarian: data
  };
}

function hitungInventaris() {
  let totalUnit = 0, totalNilai = 0, rendah = 0;
  store.produk.forEach(function(p) {
    totalUnit += p.stok;
    totalNilai += p.stok * p.hargaBeli;
    if (p.stok < p.minStok) rendah++;
  });
  return {
    totalUnit: totalUnit,
    totalNilai: totalNilai,
    totalSKU: store.produk.length,
    stokRendah: rendah
  };
}

// ============ SPA ROUTER ============

// daftar halaman yg tersedia
var ROUTES = {
  '#inventaris': { title: 'Inventaris', init: typeof initInventaris !== 'undefined' ? initInventaris : function(){} },
  '#keuangan': { title: 'Keuangan', init: typeof initKeuangan !== 'undefined' ? initKeuangan : function(){} },
  '#transaksi': { title: 'Transaksi', init: typeof initTransaksi !== 'undefined' ? initTransaksi : function(){} },
  '#laporan': { title: 'Laporan', init: typeof initLaporan !== 'undefined' ? initLaporan : function(){} },
  '#keputusan': { title: 'Keputusan', init: typeof initKeputusan !== 'undefined' ? initKeputusan : function(){} },
  '#pengaturan': { title: 'Pengaturan', init: typeof initPengaturan !== 'undefined' ? initPengaturan : function(){} },
  '#kelola-pemilik': { title: 'Kelola Pemilik', init: typeof initKelolaPemilik !== 'undefined' ? initKelolaPemilik : function(){} },
  '#dasbor-superadmin': { title: 'Ikhtisar Sistem', init: typeof initDasborSuperadmin !== 'undefined' ? initDasborSuperadmin : function(){} }
};

var halamanSkrg = '#inventaris'; // default

function muatStylesHalaman(pageName) {
  let oldLink = document.getElementById('dynamic-page-stylesheet');
  if (oldLink) oldLink.remove();

  let link = document.createElement('link');
  link.id = 'dynamic-page-stylesheet';
  link.rel = 'stylesheet';
  link.href = `/css/pages/${pageName}.css`;
  document.head.appendChild(link);
}

async function navigasi(hash) {
  let userRole = (store.user && store.user.role) ? store.user.role : 'pemilik';
  let defaultHash = (userRole === 'superadmin') ? '#dasbor-superadmin' : '#inventaris';

  if (!hash || !ROUTES[hash]) hash = defaultHash;

  // Proteksi hak akses rute
  if (userRole !== 'superadmin') {
    if (hash === '#kelola-pemilik' || hash === '#dasbor-superadmin') {
      hash = '#inventaris';
    }
  } else {
    if (hash !== '#kelola-pemilik' && hash !== '#dasbor-superadmin') {
      hash = '#dasbor-superadmin';
    }
  }

  halamanSkrg = hash;
  window.location.hash = hash;

  // render halaman
  let route = ROUTES[hash];
  let konten = document.getElementById('konten-utama');
  if (konten) {
    konten.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:200px; color:var(--slate-400);">Memuat halaman...</div>';
    try {
      let pageName = hash.substring(1); // 'inventaris'
      
      // muat stylesheet halaman secara dinamis dr folder public
      muatStylesHalaman(pageName);
      
      let response = await fetch(`pages/${pageName}.html`);
      if (!response.ok) throw new Error(`Gagal memuat halaman: ${response.statusText}`);
      
      let html = await response.text();
      konten.innerHTML = html;
      
      // kasih waktu buat DOM siap trus init event listener
      setTimeout(function() { 
        if (typeof route.init === 'function') {
          route.init(); 
        }
      }, 50);
    } catch (err) {
      console.error("Gagal memuat halaman:", err.message);
      konten.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:200px; color:var(--rose-600);">Gagal memuat halaman: ${err.message}</div>`;
    }
  }

  // update sidebar active state
  document.querySelectorAll('.sidebar-link').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('data-hash') === hash);
  });

  // update judul di title
  document.title = route.title + ' - Ledgerly';

  // tutup mobile nav klo terbuka
  let overlay = document.getElementById('mobile-nav');
  if (overlay) overlay.classList.remove('open');
}

// -- hitung statistik harian, bulanan & terlaris dari data transaksi --
function hitungStatistikDariTransaksi() {
  // 1. Hitung Penjualan Harian (60 hari terakhir)
  let harian = [];
  let mapHarian = {};
  
  // Inisialisasi 60 hari terakhir dengan nilai 0
  for (let i = 59; i >= 0; i--) {
    let d = new Date();
    d.setDate(d.getDate() - i);
    let tglStr = d.toISOString().slice(0, 10);
    mapHarian[tglStr] = { tanggal: tglStr, omzet: 0, hpp: 0, pesanan: 0 };
    harian.push(tglStr);
  }

  // Scan semua transaksi
  if (store.transaksi) {
    store.transaksi.forEach(function(t) {
      let tglStr = t.tanggal.slice(0, 10);
      if (mapHarian[tglStr]) {
        if (t.tipe === 'KELUAR') {
          mapHarian[tglStr].omzet += t.total;
          mapHarian[tglStr].pesanan += 1;
          // Cari modal produk untuk hitung HPP
          let p = store.produk.find(function(pr) { return pr.id === t.produkId; });
          let modal = p ? p.hargaBeli : Math.round(t.hargaSatuan * 0.85); // fallback
          mapHarian[tglStr].hpp += t.jumlah * modal;
        }
      }
    });
  }

  store.penjualanHarian = harian.map(function(tgl) {
    return mapHarian[tgl];
  });

  // 2. Hitung Arus Kas Bulanan (6 bulan terakhir)
  let arusKas = [];
  let mapArusKas = {};
  let namaBulan = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
  
  // Inisialisasi 6 bulan terakhir
  let dSkrg = new Date();
  for (let i = 5; i >= 0; i--) {
    let d = new Date(dSkrg.getFullYear(), dSkrg.getMonth() - i, 1);
    let key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    let label = namaBulan[d.getMonth()];
    mapArusKas[key] = { bulan: label, masuk: 0, keluar: 0, bersih: 0 };
    arusKas.push(key);
  }

  // Scan semua transaksi untuk cashflow
  if (store.transaksi) {
    store.transaksi.forEach(function(t) {
      let d = new Date(t.tanggal);
      let key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
      if (mapArusKas[key]) {
        if (t.tipe === 'KELUAR') {
          // Penjualan -> Uang MASUK ke kas
          mapArusKas[key].masuk += t.total;
        } else {
          // Pembelian/Restock -> Uang KELUAR dari kas
          mapArusKas[key].keluar += t.total;
        }
      }
    });
  }

  store.arusKas = arusKas.map(function(key) {
    let item = mapArusKas[key];
    item.bersih = item.masuk - item.keluar;
    return item;
  });

  // 3. Hitung Produk Terlaris
  let mapLaris = {};
  if (store.transaksi) {
    store.transaksi.forEach(function(t) {
      if (t.tipe === 'KELUAR') {
        if (!mapLaris[t.produkId]) {
          mapLaris[t.produkId] = { produkId: t.produkId, unit: 0, omzet: 0 };
        }
        mapLaris[t.produkId].unit += t.jumlah;
        mapLaris[t.produkId].omzet += t.total;
      }
    });
  }

  let listLaris = Object.values(mapLaris);
  listLaris.sort(function(a, b) { return b.unit - a.unit; });
  
  // Jika data transaksi kosong, berikan default dari produk yang ada agar chart tidak kosong
  if (listLaris.length === 0 && store.produk && store.produk.length > 0) {
    listLaris = store.produk.slice(0, 5).map(function(p, idx) {
      return {
        produkId: p.id,
        unit: 20 - idx * 3,
        omzet: (20 - idx * 3) * p.hargaJual
      };
    });
  }
  
  store.produkTerlaris = listLaris.slice(0, 5);
}

// -- sinkronisasi data dari supabase --
async function sinkronisasiSupabase() {
  if (!window.supabaseClient) {
    hitungStatistikDariTransaksi();
    return;
  }

  try {
    // 1. Ambil data kategori
    let { data: kategori } = await window.supabaseClient
      .from('Kategori')
      .select('*');

    let katMap = {};
    if (kategori) {
      store.kategoriList = kategori;
      kategori.forEach(function(k) {
        katMap[k.kategori_id] = k.nama_kategori;
      });
    }

    // 2. Ambil data produk
    let { data: produk, error: errProduk } = await window.supabaseClient
      .from('Products')
      .select('*');

    if (errProduk) throw errProduk;

    if (produk && produk.length > 0) {
      store.produk = produk.map(function(p) {
        return {
          id: p.product_id,
          sku: p.SKU || 'SKU-TEMP',
          nama: p.nama_product || 'Produk Tanpa Nama',
          kategori: katMap[p.kategori_id] || 'Lainnya',
          stok: parseInt(p.current_stok) || 0,
          minStok: parseInt(p.min_stok) || 0,
          hargaBeli: parseInt(p.modal) || 0,
          hargaJual: parseInt(p.harga) || 0,
          supplier: 'Supplier Utama',
          updatedAt: new Date().toISOString().slice(0, 10)
        };
      });
    }

    // 3. Ambil data metode pembayaran
    let { data: metodes } = await window.supabaseClient
      .from('Metode')
      .select('*');

    let metMap = {};
    if (metodes) {
      metodes.forEach(function(m) {
        metMap[m.metode_id] = m.metode_pembayaran;
      });
    }

    // 4. Ambil data detail transaksi
    let { data: details } = await window.supabaseClient
      .from('Detail_Transactions')
      .select('*');

    let detailMap = {};
    if (details) {
      details.forEach(function(d) {
        detailMap[d.transaction_id] = d;
      });
    }

    // Map produk by product_id
    let prodMap = {};
    store.produk.forEach(function(p) {
      prodMap[p.id] = p;
    });

    // 5. Ambil data transaksi
    let { data: transaksi, error: errTransaksi } = await window.supabaseClient
      .from('Transactions')
      .select('*')
      .order('created_at', { ascending: false });

    if (errTransaksi) throw errTransaksi;

    if (transaksi && transaksi.length > 0) {
      store.transaksi = transaksi.map(function(t) {
        let det = detailMap[t.transaction_id];
        let prodId = det ? det.product_id : null;
        let prod = prodId ? prodMap[prodId] : null;

        let tipe = t.isPenjualan ? 'KELUAR' : 'MASUK';
        let qty = det ? parseInt(det.jumlah) : 0;
        let hargaSat = prod ? (tipe === 'MASUK' ? prod.hargaBeli : prod.hargaJual) : 0;

        return {
          id: t.transaction_id,
          tanggal: t.created_at,
          tipe: tipe,
          produkId: prodId || 'dummy',
          produkNama: prod ? prod.nama : (t.catatan || 'Produk Lainnya'),
          jumlah: qty,
          hargaSatuan: hargaSat,
          total: qty * hargaSat,
          metode: metMap[t.metode_id] ? metMap[t.metode_id].toLowerCase() : 'manual',
          catatan: t.catatan || ''
        };
      });
    }

    // Hitung statistik
    hitungStatistikDariTransaksi();

    // Update notifikasi
    store.notifikasi = buatNotifikasi();

    // Re-render halaman aktif setelah data berhasil dimuat
    navigasi(window.location.hash || '#inventaris');
    console.log("Sinkronisasi data Supabase berhasil!");
  } catch (err) {
    console.warn("Gagal memuat data dari Supabase (kemungkinan tabel belum dibuat). Menggunakan mock data.", err.message);
    hitungStatistikDariTransaksi(); // agar default stats tetap terisi
  }
}

// inisialisasi app pas DOM ready
function initApp() {
  // cek login dulu
  if (!cekLogin()) {
    window.location.href = 'login.html';
    return;
  }

  // render layout (sidebar + topbar)
  renderSidebar();
  renderTopbar();

  // Pake hash utk navigasi awal
  let hash = window.location.hash || '#inventaris';
  navigasi(hash);

  // Jalankan sinkronisasi data dari Supabase secara asinkron
  sinkronisasiSupabase();

  // listen hash change
  window.addEventListener('hashchange', function() {
    navigasi(window.location.hash);
  });

  // Inisialisasi rotasi teks tips untuk Chatbot FAB
  initChatbotFabTips();
}

// jalanin pas halaman selesai load
document.addEventListener('DOMContentLoaded', initApp);

// Mengatur rotasi berkala teks tips di bubble chat FAB
function initChatbotFabTips() {
  const tips = [
    "Tanya stok barang?",
    "Mau tambah stok lewat chat?",
    "Butuh analisis laba rugi?",
    "Yuk kelola toko Anda!",
    "Coba rekam suara Anda!",
    "Tanya AI Ledgerly..."
  ];
  let tipIndex = 0;
  setInterval(function() {
    let tipEl = document.getElementById('chatbot-fab-tip');
    let container = document.getElementById('chatbot-fab-container');
    if (tipEl && container && !container.classList.contains('hidden')) {
      tipEl.style.opacity = '0';
      tipEl.style.transform = 'translateX(5px)';
      setTimeout(function() {
        tipIndex = (tipIndex + 1) % tips.length;
        tipEl.textContent = tips[tipIndex];
        tipEl.style.opacity = '1';
        tipEl.style.transform = 'translateX(0)';
      }, 300);
    }
  }, 6000);
}
