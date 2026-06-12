/* =============================================
   laporan.js — halaman export laporan
   download csv, excel, pdf
   ============================================= */

function initLaporan() {
  // Init DateRangePicker
  if (typeof buatDateRangePicker === 'function' && document.getElementById('drp-laporan')) {
    if (!window._drp_instances || !window._drp_instances['drp-laporan']) {
      buatDateRangePicker({
        containerId: 'drp-laporan',
        placeholder: 'Pilih rentang periode...',
        onChange: function() { initLaporan(); }
      });
    }
  }

  let ring = hitungRingkasanLaporan();

  // 1. Render Stat Cards
  let statsRow = document.getElementById('lap-stats-row');
  if (statsRow) {
    statsRow.innerHTML = `
      ${statCard('Total Produk', store.produk.length + ' SKU', icon('package'), 'Tersedia utk export')}
      ${statCard('Total Transaksi', getDaftarTxLaporan().length + ' Transaksi', icon('arrowLeftRight'), 'Sesuai periode')}
      ${statCard('Laba Bersih', formatRupiah(ring.labaBersih), icon('trendingUp'), 'Sesuai periode', ring.labaBersih >= 0 ? 'success' : 'danger')}
    `;
  }

  // 2. Render Export Cards
  let exportGrid = document.getElementById('lap-export-grid');
  if (exportGrid) {
    exportGrid.innerHTML = `
      ${exportCard('Inventaris CSV', 'Download daftar produk dan stok ke CSV', 'CSV', 'exportProdukCSV(store.produk)')}
      ${exportCard('Transaksi CSV', 'Download riwayat transaksi (sesuai periode) ke CSV', 'CSV', 'exportTransaksiCSVFiltered()')}
      ${exportCard('Transaksi Excel', 'Download riwayat transaksi (sesuai periode) ke Excel rapi', 'XLSX', 'exportTransaksiExcelFiltered()')}
      ${exportCard('Laporan Laba Rugi', 'Download laporan keuangan (sesuai periode) ke PDF', 'PDF', 'exportLaporanPDF()')}
    `;
  }

  // 3. Render cloud icon
  let cloudIcon = document.getElementById('lap-cloud-icon');
  if (cloudIcon) cloudIcon.innerHTML = icon('cloud');
}

// ============ HELPERS FILTER PERIODE ============

function getPeriodeLaporan() {
  var drpVal = (typeof getDrpValue === 'function') ? getDrpValue('drp-laporan') : { start: '', end: '' };
  return { startVal: drpVal.start || '', endVal: drpVal.end || '' };
}

function getDaftarTxLaporan() {
  let { startVal, endVal } = getPeriodeLaporan();
  if (!startVal && !endVal) return store.transaksi;

  var startDate = startVal ? new Date(startVal) : null;
  var endDate   = endVal   ? new Date(endVal)   : null;
  if (endDate) endDate.setHours(23, 59, 59, 999);

  return store.transaksi.filter(function(t) {
    var tgl = new Date(t.tanggal);
    return (!startDate || tgl >= startDate) && (!endDate || tgl <= endDate);
  });
}

function hitungRingkasanLaporan() {
  let { startVal, endVal } = getPeriodeLaporan();
  if (startVal || endVal) {
    return hitungRingkasanRentang(startVal, endVal);
  }
  return hitungRingkasan(30);
}

function getLabelPeriodeLaporan() {
  let { startVal, endVal } = getPeriodeLaporan();
  if (startVal && endVal) return startVal + ' s/d ' + endVal;
  if (startVal) return 'sejak ' + startVal;
  if (endVal)   return 'sampai ' + endVal;
  return '30 hari terakhir';
}

function resetPeriodeLaporan() {
  if (typeof resetDrp === 'function') resetDrp('drp-laporan');
  initLaporan();
}

// ============ FUNGSI EKSPOR ============

function exportTransaksiCSVFiltered() {
  exportTransaksiCSV(getDaftarTxLaporan());
}

function exportTransaksiExcelFiltered() {
  exportTransaksiExcel(getDaftarTxLaporan());
}

function exportLaporanPDF() {
  let ring = hitungRingkasanLaporan();
  exportLaporanKeuangan({
    periode: getLabelPeriodeLaporan(),
    omzet: ring.omzet,
    hpp: ring.hpp,
    labaKotor: ring.labaKotor,
    biaya: ring.biaya,
    labaBersih: ring.labaBersih
  });
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
