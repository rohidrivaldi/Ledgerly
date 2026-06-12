/* =============================================
   app.js — inti aplikasi dashboard ledgerly
   state management + SPA router
   yg nge-handle navigasi antar halaman di dasbor
   ============================================= */

// -- state global -- simpan data aplikasi disini
var _storeObj = {
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
  settings: (function() {
    let saved = localStorage.getItem('ledgerly_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.warn("Gagal memuat settings:", e);
      }
    }
    return {
      waEnabled: true,
      chatbotEnabled: true,
      cloudSync: true,
      nomorWA: '628123456789',
      biayaOpsPersen: 8
    };
  })(),
  // pengaturan platform global (wa.me admin/cs + template). default dipakai
  // sblm sync; nanti ditimpa nilai dr Platform_Settings di Supabase
  platformSettings: {
    wa_admin: '6285750917686',
    wa_cs: '6285750917686',
    pesan_upgrade: 'Halo Admin Ledgerly, saya tertarik untuk melakukan upgrade atau memperpanjang paket langganan toko saya.',
    pesan_cs: 'Halo CS Ledgerly, saya mengalami kendala di aplikasi Ledgerly dan memerlukan bantuan.'
  }
};

let renderTimeout;
function jadwalkanRender() {
  if (renderTimeout) clearTimeout(renderTimeout);
  renderTimeout = setTimeout(function() {
    if (typeof navigasi === 'function') {
      navigasi(window.location.hash || '#inventaris');
    }
  }, 10); // debounce 10ms untuk mencegah re-render berlebihan
}

var store = new Proxy(_storeObj, {
  set(target, key, value) {
    target[key] = value;
    
    // Auto re-render jika data inti aplikasi berubah
    if (key === 'produk' || key === 'transaksi' || key === 'notifikasi') {
      if ((key === 'transaksi' || key === 'produk') && typeof hitungStatistikDariTransaksi === 'function') {
        hitungStatistikDariTransaksi();
      }
      if (key === 'notifikasi' && typeof renderTopbar === 'function') {
        renderTopbar();
      }
      jadwalkanRender();
    }
    
    // Auto re-render layout jika status user login berubah
    if (key === 'user') {
      if (typeof renderSidebar === 'function') renderSidebar();
      if (typeof renderTopbar === 'function') renderTopbar();
    }
    
    return true;
  },
  get(target, key) {
    return target[key];
  }
});

// -- fungsi auth (pake localStorage) --
function cekLogin() {
  // Cek localStorage untuk data user yang sudah login sebelum nya
  let userData = localStorage.getItem('ledgerly_user');
  if (userData) {
    store.user = JSON.parse(userData); // simpan data user
    
    // Muat riwayat chat spesifik user
    let chatKey = dapatkanChatKey(); // function dari utils.js
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
    return true;
  }
  return false;
}

// delete user data session saat logout
function logout() {
  konfirmasiUI({
    judul: 'Keluar dari Ledgerly?',
    pesan: 'Anda akan keluar dari sistem dan kembali ke halaman login.',
    teksYa: 'Ya, Keluar',
    onYa: async function() {
      if (window.supabaseClient) {
        try {
          await window.supabaseClient.auth.signOut();
        } catch (err) {
          console.warn("Gagal logout dari Supabase session:", err.message);
        }
      }
      localStorage.removeItem('ledgerly_user');
      store.user = null;
      window.location.href = 'login.html';
    }
  });
}

// -- mutasi data --

async function tambahTransaksi(tx) {
  // 1. Update local state terlebih dahulu (instant UI feedback)
  store.transaksi = [tx, ...store.transaksi];

  // Update stok produk di local state (pr = setiap item di store.produk -> global variable)
  var p = store.produk.find(function(pr) { return pr.id === tx.produkId; });
  if (p) {
    if (tx.tipe === 'MASUK') p.stok += tx.jumlah; // transaksi masuk
    else p.stok -= tx.jumlah; // transaksi keluar

    // Update tanggal produk
    p.updatedAt = new Date().toISOString().slice(0, 10);
  }
  
  // Reassign array produk dan notifikasi untuk memicu reaktifitas Proxy
  store.produk = [...store.produk];
  store.notifikasi = buatNotifikasi(); // function dari data.js

  // 2. Kirim ke Supabase jika terhubung
  if (window.supabaseClient) {
    try {
      // Pastikan format UUID valid untuk foreign key
      let dbProdukId = (tx.produkId && tx.produkId.length > 10) ? tx.produkId : null;

      // Ambil atau map ID metode pembayaran (UUID dari supabase tabel Metode)
      let metodeId = 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'; // default Cash
      if (tx.metode) {
        let mLower = tx.metode.toLowerCase();
        if (mLower === 'transfer') metodeId = 'b2b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'; // Transfer Bank
        else if (mLower === 'qris') metodeId = 'b3b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d'; // QRIS
      }

      // 2a. Add new "Transactions" (asychronous insert / wait for result)
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

      // 2b. Add new "Detail_Transactions" (isi trasaksi -> produk apa, jumlah berapa)
      if (txData && dbProdukId) {
        const { error: detErr } = await window.supabaseClient
          .from('Detail_Transactions')
          .insert({
            transaction_id: txData.transaction_id,
            product_id: dbProdukId,
            jumlah: tx.jumlah,
            // snapshot nama+harga produk saat transaksi dibuat. biar history & laporan
            // tetep utuh walau produknya nanti dihapus (FK SET NULL gak ngerusak nilai)
            nama_snapshot: p ? p.nama : (tx.produkNama || null),
            harga_beli_snapshot: p ? p.hargaBeli : null,
            harga_jual_snapshot: p ? p.hargaJual : null
          });

        if (detErr) throw detErr;
      }

      // 2c. Update stok di "Products"
      if (p && p.id && p.id.length > 10) { // check id valid tidak
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

// hapus notifikasi dari list berdasarkan id nya
function tutupNotifikasi(id) {
  store.notifikasi = store.notifikasi.filter(function(n) { return n.id !== id; });
}

// tambah pesan chat baru ke state dan simpan ke localStorage (per user)
function tambahChatMsg(msg) {
  store.chatMessages = [...store.chatMessages, msg];
  localStorage.setItem(dapatkanChatKey(), JSON.stringify(store.chatMessages));
}

// -- hitung-hitungan keuangan --

function hitungRingkasan(hari) {
  let data = (store.penjualanHarian || []).slice(-hari); // ambil data sesuai hari
  let totalOmzet = 0, totalHpp = 0, totalPesanan = 0;

  // hitung total omzet, hpp dan jumlah pesanan dari data harian
  for (let i = 0; i < data.length; i++) {
    totalOmzet += data[i].omzet;
    totalHpp += data[i].hpp;
    totalPesanan += data[i].pesanan;
  }
  let labaKotor = totalOmzet - totalHpp;
  let persenBiaya = (store.settings && store.settings.biayaOpsPersen !== undefined) ? store.settings.biayaOpsPersen : 8;
  let biayaOps = Math.round(totalOmzet * (persenBiaya / 100));
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

// Hitung ringkasan dari rentang tanggal spesifik (untuk filter date picker)
function hitungRingkasanRentang(startVal, endVal) {
  var startDate = startVal ? new Date(startVal) : null;
  var endDate   = endVal   ? new Date(endVal)   : null;
  if (endDate) endDate.setHours(23, 59, 59, 999); // sertakan seluruh hari akhir

  var totalOmzet = 0, totalHpp = 0, totalPesanan = 0;
  var dataHarian = [];

  // Gunakan store.penjualanHarian jika tersedia (60 hari), filter sesuai rentang
  var allHarian = store.penjualanHarian || [];

  allHarian.forEach(function(d) {
    var tgl = new Date(d.tanggal);
    var dlmRentang = (!startDate || tgl >= startDate) && (!endDate || tgl <= endDate);
    if (dlmRentang) {
      totalOmzet   += d.omzet;
      totalHpp     += d.hpp;
      totalPesanan += d.pesanan;
      dataHarian.push(d);
    }
  });

  var labaKotor  = totalOmzet - totalHpp;
  var persenBiaya = (store.settings && store.settings.biayaOpsPersen !== undefined) ? store.settings.biayaOpsPersen : 8;
  var biayaOps   = Math.round(totalOmzet * (persenBiaya / 100));
  var labaBersih = labaKotor - biayaOps;

  return {
    omzet: totalOmzet,
    hpp: totalHpp,
    labaKotor: labaKotor,
    biaya: biayaOps,
    labaBersih: labaBersih,
    pesanan: totalPesanan,
    dataHarian: dataHarian
  };
}

// update stok produk, total nilai inventaris dan jumlah SKU
function hitungInventaris() {
  let totalUnit = 0, totalNilai = 0, rendah = 0;

  // hitung total unit, nilai dan stok rendah dari data produk di store
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
  // format: '#hash': { title: 'Judul Halaman', init: namaFungsiInitHalaman ? jika tidak ada, function kosong } 
  '#inventaris': { title: 'Inventaris', init: typeof initInventaris !== 'undefined' ? initInventaris : function(){} },
  '#keuangan': { title: 'Keuangan', init: typeof initKeuangan !== 'undefined' ? initKeuangan : function(){} },
  '#transaksi': { title: 'Transaksi', init: typeof initTransaksi !== 'undefined' ? initTransaksi : function(){} },
  '#laporan': { title: 'Laporan', init: typeof initLaporan !== 'undefined' ? initLaporan : function(){} },
  '#keputusan': { title: 'Keputusan', init: typeof initKeputusan !== 'undefined' ? initKeputusan : function(){} },
  '#pengaturan': { title: 'Pengaturan', init: typeof initPengaturan !== 'undefined' ? initPengaturan : function(){} },
  '#kelola-pemilik': { title: 'Kelola Pemilik', init: typeof initKelolaPemilik !== 'undefined' ? initKelolaPemilik : function(){} },
  '#dasbor-superadmin': { title: 'Ikhtisar Sistem', init: typeof initDasborSuperadmin !== 'undefined' ? initDasborSuperadmin : function(){} },
  '#pengaturan-platform': { title: 'Pengaturan Platform', init: typeof initPengaturanPlatform !== 'undefined' ? initPengaturanPlatform : function(){} }
};

var halamanSkrg = '#inventaris'; // default

// function untuk pindah css kustom sesuai halaman nya
function muatStylesHalaman(pageName) {
  let oldLink = document.getElementById('dynamic-page-stylesheet');
  if (oldLink) oldLink.remove(); // hapus link stylesheet lama

  // link stylesheet baru untuk halaman nya
  let link = document.createElement('link');
  link.id = 'dynamic-page-stylesheet';
  link.rel = 'stylesheet';
  link.href = `/css/pages/${pageName}.css`;
  document.head.appendChild(link);
}

// function untuk pindah / navigasi antar halaman
async function navigasi(hash) {
  let userRole = (store.user && store.user.role) ? store.user.role : 'pemilik';
  let defaultHash = (userRole === 'superadmin') ? '#dasbor-superadmin' : '#inventaris';

  // jika hash tidak valid atau tidak ada di ROUTES, pakai default
  if (!hash || !ROUTES[hash]) hash = defaultHash;

  // daftar halaman khusus superadmin
  var halamanSuperadmin = ['#kelola-pemilik', '#dasbor-superadmin', '#pengaturan-platform'];

  // jika user bukan superadmin, tidak boleh akses halaman superadmin
  if (userRole !== 'superadmin') {
    if (halamanSuperadmin.indexOf(hash) !== -1) {
      hash = '#inventaris';
    }
  } else {
    // superadmin cuma boleh di halaman superadmin
    if (halamanSuperadmin.indexOf(hash) === -1) {
      hash = '#dasbor-superadmin';
    }
  }

  // update halamanSkrg sebelum render + update global halaman apa yang sedang aktif
  halamanSkrg = hash;
  window.location.hash = hash;

  // ambil info halaman dari ROUTES
  let route = ROUTES[hash]; 
  
  // render html dari route di slot konten-utama
  let konten = document.getElementById('konten-utama'); 
  if (konten) {
    konten.innerHTML = '<div style="display:flex; justify-content:center; align-items:center; height:200px; color:var(--slate-400);">Memuat halaman...</div>';
    try {
      // ambil nama halaman dari hash, misal '#inventaris' -> 'inventaris'
      let pageName = hash.substring(1); 
      
      // muat stylesheet halaman secara dinamis dr folder public
      muatStylesHalaman(pageName);
      
      // fetch file HTML halaman dari folder public/pages
      // ?cb= untuk cache busting agar browser tidak pakai versi lama
      let response = await fetch(`pages/${pageName}.html?cb=${window._appVersion || Date.now()}`);
      if (!response.ok) throw new Error(`Gagal memuat halaman: ${response.statusText}`);
      
      // tampilkan HTML halaman di slot konten
      let html = await response.text();
      konten.innerHTML = html;
      
      // kasih waktu buat DOM siap trus jalanin fungsi init halaman (jika ada)
      setTimeout(function() { 
        if (typeof route.init === 'function') { // check jika fungsi init ada
          route.init(); // excute function init utk selected page
        }
      }, 50); // delay 50ms
    } catch (err) {
      console.error("Gagal memuat halaman:", err.message);
      konten.innerHTML = `<div style="display:flex; justify-content:center; align-items:center; height:200px; color:var(--rose-600);">Gagal memuat halaman: ${err.message}</div>`;
    }
  }

  // update sidebar active state
  document.querySelectorAll('.sidebar-link').forEach(function(el) {
    el.classList.toggle('active', el.getAttribute('data-hash') === hash);
  });

  // update search bar visibility
  if (typeof updateTopbarSearchVisibility === 'function') {
    updateTopbarSearchVisibility(hash);
  }

  // update judul di title
  document.title = route.title + ' - Ledgerly';

  // tutup mobile nav klo terbuka
  let overlay = document.getElementById('mobile-nav');
  if (overlay) overlay.classList.remove('open');
}

// -- hitung statistik harian, bulanan & terlaris dari data transaksi --
function hitungStatistikDariTransaksi() {
  // 1. Hitung Penjualan Harian (60 hari terakhir) -----------------------------
  let harian = [];
  let mapHarian = {};
  
  // Inisialisasi object untuk menyimpan data harian (60 hari terakhir)
  for (let i = 59; i >= 0; i--) {
    let d = new Date(); // tanggal hari ini
    d.setDate(d.getDate() - i); // mundur 1 setiap loop
    let tglStr = d.toISOString().slice(0, 10); // ambil tanggal saja "YYYY-MM-DD"
    mapHarian[tglStr] = { tanggal: tglStr, omzet: 0, hpp: 0, pesanan: 0 };
    harian.push(tglStr);
  }

  // Scan setiap transaksi
  if (store.transaksi) {
    store.transaksi.forEach(function(t) {
      let tglStr = t.tanggal.slice(0, 10); // ambil bagian tanggal saja

      if (mapHarian[tglStr]) { // apakah transaksi masuk dalam 60 hari terakhir
        if (t.tipe === 'KELUAR') { // hanya transaksi keluar (penjualan) yang dihitung untuk omzet dan HPP
          mapHarian[tglStr].omzet += t.total;
          mapHarian[tglStr].pesanan += 1;

          // Cari modal produk untuk hitung HPP
          let p = store.produk.find(function(pr) { return pr.id === t.produkId; });
          let modal = p ? p.hargaBeli : Math.round(t.hargaSatuan * 0.85); // kalau tidak ada, estimasi modal 85% dari harga jual
          mapHarian[tglStr].hpp += t.jumlah * modal; // hitung HPP berdasarkan jumlah dan modal produk
        }
      }
    });
  }

  // update store.penjualanHarian dengan data yang sudah dihitung
  store.penjualanHarian = harian.map(function(tgl) {
    return mapHarian[tgl];
  });

  // 2. Hitung Arus Kas Bulanan (6 bulan terakhir) --------------------------------
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
        if (t.tipe === 'KELUAR') { // tipe = status barang keluar (penjualan)
          // Penjualan -> Uang MASUK ke kas
          mapArusKas[key].masuk += t.total;
        } else {
          // Pembelian/Restock -> Uang KELUAR dari kas
          mapArusKas[key].keluar += t.total;
        }
      }
    });
  }

  // hitung arus kas bersih untuk setiap bulan
  store.arusKas = arusKas.map(function(key) {
    let item = mapArusKas[key];
    item.bersih = item.masuk - item.keluar;
    return item;
  });

  // 3. Hitung Produk Terlaris -------------------------------------------------
  let mapLaris = {};
  if (store.transaksi) {
    store.transaksi.forEach(function(t) {
      // hanya hitung transaksi keluar (penjualan) untuk produk terlaris
      if (t.tipe === 'KELUAR') {
        if (!mapLaris[t.produkId]) {
          mapLaris[t.produkId] = { produkId: t.produkId, unit: 0, omzet: 0 };
        }

        // update total unit terjual dan omzet untuk produk ini
        mapLaris[t.produkId].unit += t.jumlah;
        mapLaris[t.produkId].omzet += t.total;
      }
    });
  }

  // ubah mapLaris jadi array dan sort berdasarkan unit terjual terbanyak
  let listLaris = Object.values(mapLaris);
  listLaris.sort(function(a, b) { return b.unit - a.unit; });
  
  // Jika data transaksi kosong, berikan default dari produk yang ada agar chart tidak kosong
  if (listLaris.length === 0 && store.produk && store.produk.length > 0) {
    // buat data dummy berdasarkan produk yang ada, dengan unit dan omzet menurun
    listLaris = store.produk.slice(0, 5).map(function(p, idx) {
      return {
        produkId: p.id,
        unit: 20 - idx * 3,
        omzet: (20 - idx * 3) * p.hargaJual
      };
    });
  }
  
  // update store.produkTerlaris dengan 5 produk terlaris berdasarkan unit terjual
  store.produkTerlaris = listLaris.slice(0, 5);
}

// -- sinkronisasi data dari supabase ke lokal -- (supaya tidak komunikasi berkali-kali ke supabase)
async function sinkronisasiSupabase() {
  // jika tidak ada koneksi ke Supabase, hitung statistik dari data yang ada di local
  if (!window.supabaseClient) {
    hitungStatistikDariTransaksi();
    return;
  }

  // 0. Ambil profile user terbaru & cek masa berlaku Trial 7 hari
  try {
    const { data: { user: authUser } } = await window.supabaseClient.auth.getUser();
    if (authUser) {
      let { data: profil } = await window.supabaseClient
        .from('Users')
        .select('*')
        .eq('email', authUser.email)
        .maybeSingle();

      if (profil) {
        let updatedUser = {
          id: authUser.id,
          nama: profil.nama,
          email: authUser.email,
          bisnis: profil.bisnis,
          role: profil.role,
          paket: profil.paket || 'starter',
          tglExpired: profil.tgl_expired || null,
          statusLangganan: profil.status_langganan || null,
          noTelp: profil.noTelp,
          tglDaftar: authUser.created_at
        };

        // Sinkronisasi noTelp profil ke nomorWA settings secara otomatis
        if (profil.noTelp) {
          let s = store.settings || {};
          let dbNoTelp = String(profil.noTelp);
          if (!s.nomorWA || s.nomorWA === '628123456789' || s.nomorWA !== dbNoTelp) {
            s.nomorWA = dbNoTelp;
            store.settings = { ...s };
            localStorage.setItem('ledgerly_settings', JSON.stringify(s));
          }
        }

        // Cek masa berlaku trial: pake tgl_expired (diset admin), bukan tglDaftar.
        // klo udh lewat, auto-downgrade ke starter. berlaku utk semua akun
        // (gak ada lagi pengecualian hardcoded rohid).
        if (updatedUser.paket === 'business' && updatedUser.tglExpired) {
          if (new Date(updatedUser.tglExpired) < new Date()) {
            updatedUser.paket = 'starter';
            updatedUser.tglExpired = null;
            updatedUser.statusLangganan = null;
            await window.supabaseClient
              .from('Users')
              .update({ paket: 'starter', tgl_expired: null, status_langganan: null })
              .eq('email', authUser.email);
            console.log('Trial habis — akun ' + authUser.email + ' diturunkan ke Starter.');
          }
        }

        store.user = updatedUser;
        localStorage.setItem('ledgerly_user', JSON.stringify(updatedUser));
      }
    }
  } catch (err) {
    console.warn("Gagal mensinkronkan data profil pengguna:", err.message);
  }

  // kalo ada koneksi, coba ambil data dari Supabase dan update state global
  try {
    // 0. Ambil pengaturan platform global (wa.me admin/cs + template pesan).
    // dibaca semua user (RLS select true), tapi cuma superadmin yg bisa ubah.
    try {
      let { data: ps } = await window.supabaseClient.from('Platform_Settings').select('*');
      if (ps) {
        let map = {};
        ps.forEach(function(row) { map[row.key] = row.value; });
        store.platformSettings = map;
      }
    } catch (e) { /* abaikan, pake default klo gagal */ }

    // 1. Ambil data kategori
    let { data: kategori } = await window.supabaseClient
      .from('Kategori')
      .select('*');

    let katMap = {};

    // simpan id ke nama kategori di map untuk referensi nanti
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

    // map data produk dari Supabase ke lokal storage
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
          supplierNama: p.supplier_nama || '',
          supplierWa: p.supplier_wa || '',
          supplier: p.supplier_nama || '',
          barcode: p.barcode || '',
          updatedAt: p.updated_at || new Date().toISOString().slice(0, 10)
        };
      });
    }

    // 3. Ambil data metode pembayaran
    let { data: metodes } = await window.supabaseClient
      .from('Metode')
      .select('*');

    let metMap = {};

    // simpan id ke nama metode pembayaran di map untuk referensi nanti
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

    // simpan detail transaksi di map dengan key transaction_id untuk referensi nanti
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

    // Map data transaksi dari Supabase ke format yang digunakan di aplikasi
    if (transaksi && transaksi.length > 0) {
      store.transaksi = transaksi.map(function(t) {
        let det = detailMap[t.transaction_id];
        let prodId = det ? det.product_id : null;
        let prod = prodId ? prodMap[prodId] : null;

        let tipe = t.isPenjualan ? 'KELUAR' : 'MASUK';
        let qty = det ? parseInt(det.jumlah) : 0;

        // utamain snapshot (kebal walau produk dihapus), fallback ke produk live.
        // harga: pas MASUK pake harga beli, pas KELUAR pake harga jual.
        let namaFinal = (det && det.nama_snapshot) ? det.nama_snapshot
                        : (prod ? prod.nama : (t.catatan || 'Produk Lainnya'));
        let hargaSat;
        if (tipe === 'MASUK') {
          hargaSat = (det && det.harga_beli_snapshot != null) ? parseInt(det.harga_beli_snapshot)
                     : (prod ? prod.hargaBeli : 0);
        } else {
          hargaSat = (det && det.harga_jual_snapshot != null) ? parseInt(det.harga_jual_snapshot)
                     : (prod ? prod.hargaJual : 0);
        }

        return {
          id: t.transaction_id,
          tanggal: t.created_at,
          tipe: tipe,
          produkId: prodId || 'dummy',
          produkNama: namaFinal,
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
    store.notifikasi = buatNotifikasi(); // function dari data.js

    // Re-render halaman aktif setelah data berhasil dimuat
    navigasi(window.location.hash || '#inventaris');
    console.log("Sinkronisasi data Supabase berhasil!");

    // simpan snapshot ke IndexedDB biar bisa dibaca pas offline nanti
    simpanSnapshotOffline();
  } catch (err) {
    console.warn("Gagal memuat data dari Supabase (kemungkinan offline). Coba muat snapshot offline.", err.message);
    // pas gagal (mis. offline): coba muat data terakhir dari IndexedDB
    muatSnapshotOffline().then(function(snap) {
      if (snap && snap.produk) {
        store.produk = snap.produk;
        store.transaksi = snap.transaksi || [];
        store.kategoriList = snap.kategoriList || [];
        hitungStatistikDariTransaksi();
        store.notifikasi = buatNotifikasi();
        navigasi(window.location.hash || '#inventaris');
        console.log("Memuat data dari snapshot offline (terakhir: " + (snap.disimpanPada || '?') + ")");
      } else {
        hitungStatistikDariTransaksi(); // gak ada snapshot — default stats
      }
    });
  }
}

// ============ SNAPSHOT OFFLINE (IndexedDB) ============
// simpan snapshot data inti ke IndexedDB pas online, biar pas offline
// app masih bisa nampilin data terakhir (BACA aja, bukan nulis).

var _IDB_NAMA = 'ledgerly_offline';
var _IDB_STORE = 'snapshot';

function bukaIDB() {
  return new Promise(function(resolve, reject) {
    if (!window.indexedDB) { reject(new Error('IndexedDB gak didukung')); return; }
    var req = indexedDB.open(_IDB_NAMA, 1);
    req.onupgradeneeded = function() {
      var db = req.result;
      if (!db.objectStoreNames.contains(_IDB_STORE)) {
        db.createObjectStore(_IDB_STORE);
      }
    };
    req.onsuccess = function() { resolve(req.result); };
    req.onerror = function() { reject(req.error); };
  });
}

// simpan snapshot produk + transaksi + kategori ke IndexedDB
function simpanSnapshotOffline() {
  bukaIDB().then(function(db) {
    var tx = db.transaction(_IDB_STORE, 'readwrite');
    var st = tx.objectStore(_IDB_STORE);
    st.put({
      produk: store.produk,
      transaksi: store.transaksi,
      kategoriList: store.kategoriList,
      disimpanPada: new Date().toISOString()
    }, 'data');
  }).catch(function(err) {
    console.warn('Gagal simpan snapshot offline:', err.message);
  });
}

// muat snapshot dari IndexedDB (dipanggil pas sinkronisasi online gagal)
function muatSnapshotOffline() {
  return bukaIDB().then(function(db) {
    return new Promise(function(resolve) {
      var tx = db.transaction(_IDB_STORE, 'readonly');
      var req = tx.objectStore(_IDB_STORE).get('data');
      req.onsuccess = function() { resolve(req.result || null); };
      req.onerror = function() { resolve(null); };
    });
  }).catch(function() { return null; });
}

// inisialisasi app pas DOM ready
function initApp() {
  // Pasang listener status autentikasi Supabase secara real-time
  if (window.supabaseClient) {
    window.supabaseClient.auth.onAuthStateChange(function(event, session) {
      if (event === 'SIGNED_OUT' || !session) {
        localStorage.removeItem('ledgerly_user');
        store.user = null;
        // Hanya redirect jika sedang di dalam dashboard/dasbor.html
        if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('register.html')) {
          window.location.href = 'login.html';
        }
      }
    });
  }

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

  // Update teks tips setiap 6 detik jika FAB tidak disembunyikan
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
