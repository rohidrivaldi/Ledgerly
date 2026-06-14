# Ledgerly 📊 — Sistem Manajemen Inventaris & Keuangan Terintegrasi UMKM

[![Dicoding Capstone](https://img.shields.io/badge/Dicoding-Capstone%20Project-blue?style=for-the-badge&logo=dicoding)](https://www.dicoding.com)
[![Vite](https://img.shields.io/badge/Vite-v6.4-646CFF?style=for-the-badge&logo=vite)](https://vite.dev)
[![Supabase](https://img.shields.io/badge/Supabase-Database-3FCF8E?style=for-the-badge&logo=supabase)](https://supabase.com)
[![Gemini](https://img.shields.io/badge/Gemini%20AI-Flash-8E75C2?style=for-the-badge&logo=googlegemini)](https://deepmind.google/technologies/gemini/)

Ledgerly adalah platform sistem manajemen inventaris dan keuangan berbasis web yang dirancang secara khusus untuk memberdayakan usaha mikro, kecil, dan menengah (UMKM) retail di Indonesia. Proyek ini diajukan sebagai **Capstone Project Program Tempa yang diselenggarakan oleh Dicoding** untuk tahun 2026.

---

## 👥 Profil Tim (TP-G007)

Kami adalah kelompok **TP-G007** di bawah tema **Smart Business & UMKM Empowerment**:

| ID Peserta | Nama | Learning Path | Peran & Kontribusi Utama |
| :--- | :--- | :--- | :--- |
| **WDC480B6Y0021** | M. Rohid Rivaldi | Web Development | UI Login, AI Chatbot, Integrasi WhatsApp |
| **WDC183B6Y0032** | Anwar Fauzi | Web Development | UI Riwayat & Input Transaksi, Ekspor Laporan |
| **WDC244B6Y0036** | Nathanael Chandra Kusuma | Web Development | UI Dashboard Keuangan, Arsitektur Database |
| **WDC007B6Y0030** | Bangkit Agung Nugroho | Web Development | UI Dashboard Inventory, Decision Support |

### 🎓 Pembimbing & Fasilitator

* **Mentor / Fasilitator**: Rotua Eka Wati Br. Sitorus (Web Development Learning Path)
* **Advisor / Pendamping**: Rully Saputra (TP26-FS007)

---

## 🎯 Latar Belakang & Permasalahan

Sebagian besar pelaku UMKM ritel di Indonesia masih mengandalkan pencatatan persediaan barang dan arus keuangan secara manual (buku kas fisik). Hal ini memicu beberapa kendala utama:
1. **Stockout & Overstock**: Ketidakmampuan memantau tingkat persediaan secara real-time yang memicu hilangnya potensi penjualan atau menumpuknya modal pada barang mati (*dead stock*).
2. **Kelemahan Valuasi**: Sulitnya menghitung nilai aset inventaris secara tepat karena tidak adanya penerapan metode persediaan standar seperti rata-rata (*Average*) atau FIFO.
3. **Arus Kas Terhambat**: Ketiadaan insight keuangan otomatis yang menyulitkan pemilik dalam menentukan margin keuntungan bersih riil dan strategi pembelian barang kembali (*restock*).

**Ledgerly** hadir sebagai solusi digital "all-in-one" dengan antarmuka yang sangat ramah pengguna, berkinerja tinggi, dan didukung kecerdasan buatan (AI) untuk menyederhanakan alur kerja operasional UMKM secara instan.

---

## 🛠️ Tech Stack & Ekosistem Sistem

Ledgerly mengadopsi arsitektur **Pure Decoupled SPA (Single Page Application)** berbasis teknologi vanilla yang tangguh dan ringan:

* **Frontend Utama**: Vanilla HTML5, Vanilla CSS3 (Custom Design System), JavaScript (ES6+).
* **Development & Build Tool**: [Vite](https://vite.dev) (Kompilasi super cepat & manajemen aset publik statis).
* **Database & Cloud Backend**: [Supabase](https://supabase.com) (PostgreSQL Database, Supabase Auth, Row-Level Security / RLS).
* **Serverless Functions**: Vercel Serverless (`/api/create-user` untuk pembuatan akun oleh superadmin & `/api/chatbot` sebagai proxy AI ber-JWT).
* **Kecerdasan Buatan (AI)**: [Gemini AI API](https://deepmind.google/technologies/gemini/) (`gemini-2.5-flash` untuk pemrosesan NLP & Voice Input).
* **Notifikasi WhatsApp**: WhatsApp Gateway berbasis Node.js (repositori terpisah, di-host di Pterodactyl Panel).
* **Ekspor & Utilitas**: [jsPDF](https://github.com/parallax/jsPDF) (Ekspor PDF Laba Rugi), [SheetJS](https://sheetjs.com) (Ekspor XLSX Excel), [PapaParse](https://www.papaparse.com) (Parsing CSV cepat).
* **Visualisasi Bagan**: [Chart.js](https://www.chartjs.org) (Grafik interaktif inventaris & performa arus kas).
* **Strategi Aset**: Seluruh pustaka pihak ketiga **di-self-host** (`public/js/vendor/`) — tanpa dependensi CDN runtime — untuk keandalan (anti-503) dan keamanan (CSP ketat `script-src 'self'`).

---

## 🌟 Fitur Unggulan Platform

### 1. Dashboard Inventaris Real-Time
* Peta grafik tingkat persediaan barang aktif.
* Peringatan otomatis (*reorder point warning*) ketika jumlah stok barang berada di bawah batas minimum keamanan.
* Tabel katalog barang interaktif dengan fitur pencarian instan dan filter kategori.

### 2. Dashboard Keuangan Otomatis
* Laporan Laba Rugi yang diperbarui secara real-time berdasarkan pencatatan transaksi masuk dan keluar.
* Chart visualisasi perbandingan Omzet vs Harga Pokok Penjualan (HPP).
* Grafik bar tren penjualan harian dan arus kas bulanan (Filter periode dinamis: 7, 30, dan 60 hari terakhir).

### 3. Ekspor & Impor Transaksi Massal
* Pengguna dapat mengunggah file CSV secara massal menggunakan PapaParse dropzone untuk merekam puluhan transaksi dalam hitungan detik.
* Ekspor satu-klik laporan keuangan ke format PDF, CSV, atau Excel (XLSX).

### 4. Asisten AI & Suara Terintegrasi (Ledgerly AI)
* **Voice Input**: Perekaman perintah teks dengan suara via Web Speech API (`webkitSpeechRecognition`) berbahasa Indonesia.
* **Local NLP Parser**: Algoritma cerdas yang mendeteksi masukan kalimat percakapan (contoh: *"tambah stok minyak goreng 5 pcs"*) untuk dieksekusi secara lokal.
* **Fuzzy Match & Typo Tolerance**: Pencarian produk berbasis Jarak Levenshtein dan Transposisi Huruf Anagram (misal mengetik `"telru"` akan otomatis memetakan ke `"Telur Ayam 1kg"`).
* **Supabase Sync**: Hasil transaksi chatbot AI secara instan mensinkronkan data stok di tabel PostgreSQL Cloud Supabase.

### 5. Dasbor Kontrol Superadmin
* Antarmuka khusus superadmin platform untuk mengelola akun pemilik UMKM, memantau volume total transaksi platform, status server, dan analisis chart paket langganan aktif.

### 6. QR Code Produk
* Setiap produk di katalog inventaris dilengkapi dengan QR Code unik yang di-generate secara otomatis.
* QR Code dapat di-scan untuk mengidentifikasi detail produk secara instan, mencakup nama produk, SKU, harga beli, dan harga jual.
* Mempercepat proses pencatatan dan verifikasi barang di lapangan tanpa perlu pencarian manual.


### 7. Notifikasi WhatsApp Otomatis
* Sistem mengirimkan alert otomatis via WhatsApp kepada pemilik toko ketika stok suatu produk turun di bawah batas minimum (reorder point).
* Memastikan pemilik UMKM selalu mendapatkan informasi stok kritis secara real-time, bahkan saat tidak sedang membuka aplikasi.

### 8. Papan Pengumuman (Announcement)
* Menampilkan info dan kabar terbaru dari tim Ledgerly langsung di dalam dashboard pengguna.
* Pemilik UMKM dapat memperoleh informasi terkini seputar pembaruan fitur, pemberitahuan pemeliharaan sistem, atau pengumuman penting lainnya tanpa harus meninggalkan platform.

### 9. Mode Gelap (Dark Mode)
* Sakelar tema terang/gelap di seluruh halaman (landing, login, register, dan dashboard) lewat tombol ikon yang mudah dijangkau.
* Preferensi tema tersimpan otomatis di perangkat pengguna (localStorage) dan diterapkan tanpa kedip (anti-FOUC) saat halaman dimuat ulang.
* Default tetap mode terang dan responsif penuh di mobile maupun desktop tanpa memengaruhi performa (Lighthouse/PageSpeed).
---

## 📂 Struktur Arsitektur Kode

```
ledgerly/
├── index.html              # Landing page promosi utama
├── login.html              # Halaman gerbang masuk auth
├── register.html           # Halaman pendaftaran akun baru
├── dasbor.html             # Shell utama Single Page Application (SPA)
├── css/
│   ├── style.css           # Sistem desain & token global
│   ├── landing.css         # Styling landing page
│   ├── login.css           # Styling halaman login
│   ├── register.css        # Styling halaman pendaftaran
│   ├── dasbor.css          # Styling shell utama dasbor (Sidebar, Topbar)
│   ├── daterangepicker.css # Styling komponen pemilih rentang tanggal
│   └── theme.css           # Definisi & override tema gelap (dark mode)
├── js/
│   ├── app.js              # State management global & dynamic SPA router
│   ├── data.js             # Initial state local arrays
│   ├── utils.js            # Helper format rupiah, escapeHtml & koleksi ikon SVG
│   ├── export.js           # Ekspor PDF, CSV, Excel
│   ├── supabase.js         # Koneksi Supabase client & inisialisasi
│   ├── register.js         # Logika pendaftaran akun + validasi
│   ├── theme.js            # Toggle dark/light mode (anti-FOUC, localStorage)
│   ├── komponen/
│   │   ├── sidebar.js      # Sidebar navigasi SPA
│   │   ├── topbar.js       # Topbar search & notifikasi
│   │   ├── chatbot.js      # Logika asisten AI & suara (Gemini AI)
│   │   └── upload.js       # Penanganan impor CSV dropzone
│   ├── pages/
│   │   ├── inventaris.js   # Logika interaksi halaman inventaris
│   │   ├── keuangan.js     # Logika interaksi halaman keuangan
│   │   ├── transaksi.js    # Logika interaksi halaman transaksi
│   │   ├── laporan.js      # Logika interaksi halaman laporan
│   │   ├── keputusan.js    # Logika keputusan & ranking terlaris
│   │   ├── pengaturan.js   # Logika setting workspace & integrasi
│   │   ├── kelola-pemilik.js    # Logika superadmin manajemen akun
│   │   └── dasbor-superadmin.js # Logika ringkasan ikhtisar sistem
│   └── vendor/             # Pustaka pihak ketiga di-self-host (anti-CDN/503)
├── api/                    # Vercel Serverless Functions
│   ├── create-user.js      # Buat akun pemilik oleh superadmin (service_role + JWT guard)
│   └── chatbot.js          # Proxy Gemini AI ber-otentikasi JWT
├── public/                 # Aset statis terisolasi (MIME Types-safe)
│   ├── pages/              # Kumpulan kerangka HTML murni per halaman (.html)
│   ├── js/vendor/          # Lokasi fisik pustaka self-host (di-serve apa adanya)
│   └── sw.js               # Service Worker (cache PWA, network-first)
├── vite.config.js          # Konfigurasi Vite + dev proxy /api lokal
└── vercel.json             # Rewrites, cleanUrls, security headers (CSP, HSTS, dll)
```

---

## 🚀 Panduan Memulai Proyek

### A. Prasyarat Lokal
Pastikan perangkat Anda telah terpasang [Node.js](https://nodejs.org) (Versi 18+ direkomendasikan).

### B. Langkah Instalasi & Jalankan
1. Clone repositori ini ke dalam direktori lokal Anda:
   ```bash
   git clone https://github.com/username/ledgerly.git
   ```
2. Masuk ke folder proyek:
   ```bash
   cd ledgerly
   ```
3. Pasang semua dependensi pengembangan:
   ```bash
   npm install
   ```
4. Salin berkas `.env.example` menjadi `.env` dan isi variabel kunci Supabase & Gemini Anda secara aman:
   ```bash
   cp .env.example .env
   ```
5. Jalankan server pengembangan lokal:
   ```bash
   npm run dev
   ```
   *Vite akan meluncurkan server lokal secara instan pada alamat `http://localhost:5173`.*

---

## 🔒 Konfigurasi Keamanan (OWASP Top 10)

Ledgerly dirancang dengan prinsip pertahanan berlapis (*defense in depth*):
* **Row-Level Security (RLS)**: Setiap tabel Supabase dikonfigurasi dengan kebijakan RLS berbasis UUID pengguna (`auth.uid()`), mencegah kebocoran data antartoko UMKM yang berbeda. Eskalasi peran dicegah lewat trigger `check_user_modifications`.
* **Otorisasi Serverless**: Endpoint `/api/create-user` memverifikasi JWT pemanggil DAN memastikan perannya `superadmin` di server sebelum membuat akun. `service_role key` hanya hidup di environment server (Vercel), tidak pernah dikirim ke browser.
* **Bebas Credentials Leak**: Kunci API sensitif dilindungi variabel lingkungan (`VITE_GEMINI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) dan dikesampingkan dari Git melalui [.gitignore](.gitignore).
* **Mitigasi Cross-Site Scripting (XSS)**: Seluruh data dinamis disanitasi via helper `escapeHtml`/`escapeAttr` (atau `textContent`) sebelum disajikan ke DOM.
* **Content Security Policy (CSP) ketat**: `script-src 'self'` — seluruh pustaka di-self-host, tidak ada eksekusi skrip dari domain eksternal. Dilengkapi header HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, dan COOP via [vercel.json](vercel.json).
* **Validasi Input Berlapis**: Nomor WhatsApp, panjang kata sandi, dan field wajib divalidasi baik di sisi klien maupun server (serverless + dev proxy) sehingga bypass frontend tetap tertolak.
* **Keandalan Aset (anti-supply-chain & anti-503)**: Seluruh pustaka pihak ketiga di-self-host di `public/js/vendor/`, menghilangkan ketergantungan pada CDN eksternal yang bisa down atau disusupi.

---

## 📝 Catatan Pembaruan Terbaru

Rangkuman peningkatan signifikan pada iterasi terakhir proyek:
* **Mode Gelap (Dark Mode)** di seluruh halaman dengan preferensi tersimpan & anti-FOUC.
* **Self-host seluruh pustaka** (Supabase, Chart.js, jsPDF, SheetJS, PapaParse, ExcelJS, html5-qrcode, QRious, Lenis) — nol dependensi CDN runtime, lebih andal & aman.
* **Hardening Keamanan OWASP**: CSP ketat, sanitasi XSS menyeluruh, otorisasi JWT pada serverless, dan validasi input berlapis.
* **Auto-Provisioning Profil**: Trigger database otomatis membuat profil pengguna saat pendaftaran sehingga akun baru langsung tampil di panel superadmin.
* **Perbaikan Dasbor Superadmin**: Statistik & grafik paket langganan akurat (4 segmen: Starter, Business Trial, Business Langganan, Enterprise) dengan status layanan platform yang jujur.
* **Stabilitas Service Worker**: Strategi cache *network-first* untuk mencegah penyajian versi lama aplikasi.

---

© 2026 Tim TP-G007 Dicoding — Seluruh hak cipta dilindungi.
