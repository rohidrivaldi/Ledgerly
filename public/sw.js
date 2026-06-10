/* =============================================
   sw.js — service worker Ledgerly (PWA)
   Tujuan: app shell (HTML/CSS/JS) tetep bisa dibuka pas offline.
   Strategi: network-first + fallback cache. jadi tiap aset yg pernah
   diakses pas online otomatis ke-cache, lalu pas offline disajikan
   dari cache. cocok buat URL js yg ber-query ?v=timestamp (dinamis).
   CATATAN: ini cuma utk BACA offline (lihat data). nulis transaksi
   tetep butuh online (sync ke Supabase) — sesuai scope yg disepakati.
   ============================================= */

var CACHE_NAME = 'ledgerly-v1';

// aset inti yg di-precache pas install (yg URL-nya stabil/tanpa query)
var ASET_INTI = [
  './dasbor.html',
  './login.html',
  './index.html',
  './register.html',
  './assets/logo.svg',
  './manifest.json'
];

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

// pas activate: hapus cache versi lama + ambil alih klien
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(keys.map(function(k) {
        if (k !== CACHE_NAME) return caches.delete(k);
      }));
    }).then(function() { return self.clients.claim(); })
  );
});

// pas fetch: network-first, fallback ke cache pas offline/gagal
self.addEventListener('fetch', function(e) {
  var req = e.request;

  // cuma tangani GET. POST (mis. /api/chatbot, insert supabase) dibiarkan
  // lewat normal — gak boleh di-cache, butuh online.
  if (req.method !== 'GET') return;

  // skip request ke Supabase API (data dinamis, jangan di-cache stale)
  if (req.url.indexOf('supabase.co') !== -1) return;

  e.respondWith(
    fetch(req).then(function(res) {
      // sukses online: simpan salinan ke cache buat jaga2 offline nanti
      // (cuma respons valid yg di-cache)
      if (res && res.status === 200 && res.type !== 'opaque') {
        var salinan = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(req, salinan).catch(function() {});
        });
      }
      return res;
    }).catch(function() {
      // offline / gagal: coba ambil dari cache
      return caches.match(req).then(function(cached) {
        if (cached) return cached;
        // klo navigasi halaman & gak ada di cache, fallback ke dasbor.html
        if (req.mode === 'navigate') {
          return caches.match('./dasbor.html');
        }
        // gak ada apa2: balikin error response biar gak nge-throw
        return new Response('Offline — konten belum tersimpan di cache.', {
          status: 503, headers: { 'Content-Type': 'text/plain' }
        });
      });
    })
  );
});
