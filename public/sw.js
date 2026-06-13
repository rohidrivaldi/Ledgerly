/* =============================================
   sw.js — service worker Ledgerly (PWA)
   Tujuan: app shell (HTML/CSS/JS) tetep bisa dibuka pas offline.

   STRATEGI: network-first dgn cache key yg DINORMALISASI.
   masalah versi lama dulu: tiap load url-nya beda krn ada ?v=timestamp
   & ?cb=timestamp, jadi tiap versi ke-cache selamanya & numpuk (ratusan
   entri). pas offline/fallback, SW bisa nyajiin file versi lama yg gak
   cocok sama yg lain -> komponen (mis. date range picker) jadi ngilang.

   solusinya: buang query ?v=/?cb= sblm simpan/ambil dr cache, jadi cuma
   ADA 1 salinan per file & selalu ditimpa versi terbaru tiap online.
   online = selalu fresh dr network. offline = salinan terakhir, konsisten.

   CATATAN: ini cuma utk BACA offline. nulis transaksi tetep butuh online.
   ============================================= */

// BUMP versi ini tiap kali strategi cache berubah -> cache lama auto-dihapus
var CACHE_NAME = 'ledgerly-v2';

// aset inti yg di-precache pas install (yg URL-nya stabil/tanpa query)
var ASET_INTI = [
  './dasbor.html',
  './login.html',
  './index.html',
  './register.html',
  './assets/logo.svg',
  './manifest.json'
];

// normalisasi url buat key cache: buang query cache-buster (?v= / ?cb=)
// biar tiap file cuma punya 1 entri di cache (bukan numpuk ratusan versi).
function keyCache(req) {
  try {
    var u = new URL(req.url);
    u.searchParams.delete('v');
    u.searchParams.delete('cb');
    return u.toString();
  } catch (e) {
    return req.url;
  }
}

// pas install: precache aset inti, langsung aktif (skipWaiting)
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      // addAll bisa gagal kalo salah satu 404, jadi cache satu-satu & abaikan error
      return Promise.all(ASET_INTI.map(function(url) {
        return cache.add(url).catch(function() { /* abaikan klo gagal */ });
      }));
    }).then(function() { return self.skipWaiting(); })
  );
});

// pas activate: hapus SEMUA cache versi lama (termasuk ledgerly-v1 yg numpuk)
// + ambil alih klien biar SW baru langsung jalan tanpa nunggu reload kedua
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

// pas fetch: network-first, fallback ke cache pas offline/gagal.
// pakai key ternormalisasi biar gak nyimpen versi numpuk & gak nyajiin stale.
self.addEventListener('fetch', function(e) {
  var req = e.request;

  // cuma tangani GET. POST (mis. /api/chatbot, insert supabase) dibiarkan
  // lewat normal — gak boleh di-cache, butuh online.
  if (req.method !== 'GET') return;

  // skip request ke Supabase API (data dinamis, jangan di-cache stale)
  if (req.url.indexOf('supabase.co') !== -1) return;

  // skip endpoint internal API (chatbot dll) — gak boleh ke-cache
  if (req.url.indexOf('/api/') !== -1) return;

  var ck = keyCache(req);

  e.respondWith(
    fetch(req).then(function(res) {
      // sukses online: simpan salinan ke cache (key ternormalisasi) biar
      // jaga2 offline. tiap online file ditimpa versi terbaru -> gak stale.
      if (res && res.status === 200 && res.type !== 'opaque') {
        var salinan = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(ck, salinan).catch(function() {});
        });
      }
      return res;
    }).catch(function() {
      // offline / gagal: coba ambil dari cache pakai key ternormalisasi
      return caches.open(CACHE_NAME).then(function(cache) {
        return cache.match(ck).then(function(cached) {
          if (cached) return cached;
          // klo navigasi halaman & gak ada di cache, fallback ke dasbor.html
          if (req.mode === 'navigate') {
            return cache.match('./dasbor.html');
          }
          // gak ada apa2: balikin error response biar gak nge-throw
          return new Response('Offline — konten belum tersimpan di cache.', {
            status: 503, headers: { 'Content-Type': 'text/plain' }
          });
        });
      });
    })
  );
});
