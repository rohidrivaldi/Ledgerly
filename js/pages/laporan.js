/* =============================================
   laporan.js — halaman export laporan
   download csv, excel, pdf
   ============================================= */

function initLaporan() {
  let ring = hitungRingkasan(30);

  // 1. Render Stat Cards
  let statsRow = document.getElementById('lap-stats-row');
  if (statsRow) {
    statsRow.innerHTML = `
      ${statCard('Total Produk', store.produk.length + ' SKU', icon('package'), 'Tersedia utk export')}
      ${statCard('Total Transaksi', store.transaksi.length + ' record', icon('arrowLeftRight'), 'Semua riwayat')}
      ${statCard('Laba Bersih 30hr', formatRupiah(ring.labaBersih), icon('trendingUp'), 'Utk laporan P&L', 'success')}
    `;
  }

  // 2. Render Export Cards
  let exportGrid = document.getElementById('lap-export-grid');
  if (exportGrid) {
    exportGrid.innerHTML = `
      ${exportCard('Inventaris CSV', 'Download daftar produk dan stok ke CSV', 'CSV', 'exportProdukCSV(store.produk)')}
      ${exportCard('Transaksi CSV', 'Download riwayat transaksi ke CSV', 'CSV', 'exportTransaksiCSV(store.transaksi)')}
      ${exportCard('Transaksi Excel', 'Download riwayat transaksi ke format Excel', 'XLSX', 'exportTransaksiExcel(store.transaksi)')}
      ${exportCard('Laporan Laba Rugi', 'Download laporan keuangan 30 hari ke PDF', 'PDF', 'exportLaporanPDF()')}
    `;
  }

  // 3. Render cloud icon
  let cloudIcon = document.getElementById('lap-cloud-icon');
  if (cloudIcon) cloudIcon.innerHTML = icon('cloud');
}

function exportCard(title, desc, format, onclickFn) {
  return `
    <div class="card export-card">
      <div class="export-card-left">
        <div class="export-icon">${icon('fileDown')}</div>
        <div>
          <div class="export-title">${title}</div>
          <div class="export-desc">${desc}</div>
          <span class="export-format">${format}</span>
        </div>
      </div>
      <button class="btn btn-primary" onclick="${onclickFn}" style="white-space:nowrap;">
        ${icon('fileDown', 14)} Download
      </button>
    </div>`;
}

function exportLaporanPDF() {
  let ring = hitungRingkasan(30);
  exportLaporanKeuangan({
    periode: '30 hari terakhir',
    omzet: ring.omzet,
    hpp: ring.hpp,
    labaKotor: ring.labaKotor,
    biaya: ring.biaya,
    labaBersih: ring.labaBersih
  });
}
