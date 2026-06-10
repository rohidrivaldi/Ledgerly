/* =============================================
   data.js — inisialisasi state awal
   ============================================= */

// Arrays kosong, data riil diambil & disinkronkan langsung dari Supabase
const PRODUK = [];
const TRANSAKSI = [];
const PENJUALAN_HARIAN = [];
const ARUS_KAS = [];
const PRODUK_TERLARIS = [];

// bikin notifikasi dr produk yg stoknya rendah
function buatNotifikasi() {
  // superadmin gak punya toko sendiri — notif stok rendah itu fitur pemilik toko.
  // jgn turunin notif dr produk platform, biar admin gak liat stok punya pemilik lain
  if (window.store && window.store.user && window.store.user.role === 'superadmin') return [];

  let prodList = (window.store && window.store.produk) ? window.store.produk : [];
  return prodList.filter(function(p) { return p.stok < p.minStok; }).map(function(p, i) {
    return {
      id: 'a' + (i + 1),
      produkId: p.id,
      produkNama: p.nama,
      stok: p.stok,
      minStok: p.minStok,
      dikirimPada: new Date(Date.now() - i * 3600000).toISOString(),
      saluran: 'whatsapp'
    };
  });
}
