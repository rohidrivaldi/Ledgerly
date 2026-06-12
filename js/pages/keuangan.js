/* =============================================
   keuangan.js — halaman keuangan
   chart omzet, tren, arus kas, laba rugi
   ============================================= */

var periodeHari     = 30;
var keuCustomStart  = '';
var keuCustomEnd    = '';
var chartOmzet = null,
    chartTren  = null,
    chartArusKas = null;

function initKeuangan() {
  // Render Period Selector
  let periodSel = document.getElementById('keu-period-selector');
  if (periodSel) {
    periodSel.innerHTML = `
      ${periodBtn(7)}
      ${periodBtn(30)}
      ${periodBtn(60)}
    `;
  }

  // Init DateRangePicker jika belum
  if (typeof buatDateRangePicker === 'function' && document.getElementById('drp-keuangan')) {
    if (!window._drp_instances || !window._drp_instances['drp-keuangan']) {
      buatDateRangePicker({
        containerId: 'drp-keuangan',
        placeholder: 'Rentang tanggal...',
        onChange: function(start, end) {
          keuCustomStart = start;
          keuCustomEnd   = end;
          // Hapus highlight tombol periode
          let ps = document.getElementById('keu-period-selector');
          if (ps) ps.querySelectorAll('.period-btn').forEach(function(b) { b.classList.remove('active'); });
          renderKeuangan();
        }
      });
    }
  }

  renderKeuangan();
}

function renderKeuangan() {
  // Tentukan sumber data: custom range ATAU N hari terakhir
  let ring;
  if (keuCustomStart || keuCustomEnd) {
    ring = hitungRingkasanRentang(keuCustomStart, keuCustomEnd);
    ring.hari = null; // tandai mode custom
  } else {
    ring = hitungRingkasan(periodeHari);
  }

  let margin = ring.omzet > 0 ? ring.labaBersih / ring.omzet : 0;
  let data   = ring.dataHarian;

  // Tentukan label periode
  let labelPeriode = ring.hari
    ? ring.hari + ' hari terakhir'
    : (keuCustomStart && keuCustomEnd)
      ? keuCustomStart + ' s/d ' + keuCustomEnd
      : 'Rentang terpilih';

  // Warna laba bersih: merah jika rugi, hijau jika untung
  let labaBersihClass = ring.labaBersih >= 0 ? 'success' : 'danger';

  // Render Stat Cards
  let statsRow = document.getElementById('keu-stats-row');
  if (statsRow) {
    statsRow.innerHTML = `
      ${statCard('Total Omzet', formatRupiah(ring.omzet), icon('trendingUp'), labelPeriode)}
      ${statCard('Laba Kotor', formatRupiah(ring.labaKotor), icon('dollarSign'), formatPersen(ring.omzet > 0 ? ring.labaKotor / ring.omzet : 0) + ' margin', 'success')}
      ${statCard('Laba Bersih', formatRupiah(ring.labaBersih), icon('dollarSign'), formatPersen(Math.abs(margin)) + ' net margin', labaBersihClass)}
      ${statCard('Total Pesanan', formatKompak(ring.pesanan), icon('shoppingCart'), 'Transaksi keluar')}
    `;
  }

  // Render Laba Rugi (Profit & Loss)
  let plSub = document.getElementById('keu-pl-subtitle');
  if (plSub) plSub.innerText = 'Periode ' + labelPeriode;

  let plList = document.getElementById('keu-pl-list');
  if (plList) {
    let persenBiaya = (store.settings && store.settings.biayaOpsPersen !== undefined) ? store.settings.biayaOpsPersen : 8;
    // Warna laba bersih baris P&L
    let warnLabaBersih = ring.labaBersih >= 0 ? 'var(--emerald-600)' : 'var(--rose-600)';
    plList.innerHTML = `
      ${plRow('Omzet (Pendapatan)', ring.omzet, false)}
      ${plRow('Harga Pokok Penjualan', ring.hpp, true)}
      ${plRow('Laba Kotor', ring.labaKotor, false)}
      ${plRow('Biaya Operasional (~' + persenBiaya + '%)', ring.biaya, true)}
      <div class="pl-row" style="background:var(--slate-50);">
        <span class="pl-label" style="font-weight:700;">Laba Bersih</span>
        <span class="pl-amount" style="color:${warnLabaBersih}; font-weight:700;">${ring.labaBersih < 0 ? '-' : ''}${formatRupiah(Math.abs(ring.labaBersih))}</span>
      </div>
    `;
  }

  // Render Chart.js
  let labels = data.map(function(d) {
    return new Date(d.tanggal).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  });

  // chart omzet vs hpp
  let ctxOmzet = document.getElementById('chart-omzet');
  if (ctxOmzet) {
    if (chartOmzet) chartOmzet.destroy();
    chartOmzet = new Chart(ctxOmzet, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Omzet',
            data: data.map(function(d) { return d.omzet; }),
            borderColor: 'rgb(99, 102, 241)',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true, tension: 0.3, pointRadius: 0,
          },
          {
            label: 'HPP',
            data: data.map(function(d) { return d.hpp; }),
            borderColor: 'rgb(244, 63, 94)',
            backgroundColor: 'rgba(244, 63, 94, 0.05)',
            fill: true, tension: 0.3, pointRadius: 0,
          },
        ],
      },
      options: chartOpts(),
    });
  }

  // chart tren pesanan
  let ctxTren = document.getElementById('chart-tren');
  if (ctxTren) {
    if (chartTren) chartTren.destroy();
    chartTren = new Chart(ctxTren, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Pesanan',
            data: data.map(function(d) { return d.pesanan; }),
            borderColor: 'rgb(16, 185, 129)',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true, tension: 0.3, pointRadius: 0,
          },
        ],
      },
      options: chartOpts(),
    });
  }

  // chart arus kas
  let ctxArus = document.getElementById('chart-arus');
  if (ctxArus) {
    if (chartArusKas) chartArusKas.destroy();
    chartArusKas = new Chart(ctxArus, {
      type: 'bar',
      data: {
        labels: (store.arusKas || []).map(function(a) { return a.bulan; }),
        datasets: [
          {
            label: 'Pemasukan',
            data: (store.arusKas || []).map(function(a) { return a.masuk; }),
            backgroundColor: 'rgba(16, 185, 129, 0.8)',
            borderRadius: 6,
          },
          {
            label: 'Pengeluaran',
            data: (store.arusKas || []).map(function(a) { return a.keluar; }),
            backgroundColor: 'rgba(244, 63, 94, 0.7)',
            borderRadius: 6,
          },
        ],
      },
      options: chartOpts(),
    });
  }
}

// ============ FILTER CUSTOM ============

function filterKeuanganCustom() {
  keuCustomStart = (typeof getDrpValue === 'function') ? getDrpValue('drp-keuangan').start : '';
  keuCustomEnd   = (typeof getDrpValue === 'function') ? getDrpValue('drp-keuangan').end   : '';
  if (keuCustomStart || keuCustomEnd) {
    let periodSel = document.getElementById('keu-period-selector');
    if (periodSel) periodSel.querySelectorAll('.period-btn').forEach(function(btn) { btn.classList.remove('active'); });
  }
  renderKeuangan();
}

function resetFilterKeuangan() {
  keuCustomStart = '';
  keuCustomEnd   = '';
  if (typeof resetDrp === 'function') resetDrp('drp-keuangan');
  renderKeuangan();
  let periodSel = document.getElementById('keu-period-selector');
  if (periodSel) periodSel.innerHTML = `${periodBtn(7)}${periodBtn(30)}${periodBtn(60)}`;
}

// ============ HELPERS ============

function plRow(label, amount, isExpense) {
  return `
    <div class="pl-row">
      <span class="pl-label${isExpense ? ' expense' : ''}">${label}</span>
      <span class="pl-amount${isExpense ? ' negative' : ''}">${isExpense ? '-' : ''}${formatRupiah(amount)}</span>
    </div>`;
}

function periodBtn(hari) {
  let isActive = !keuCustomStart && !keuCustomEnd && periodeHari === hari;
  return `<button class="period-btn${isActive ? ' active' : ''}" onclick="gantiPeriode(${hari})">${hari} Hari</button>`;
}

function gantiPeriode(hari) {
  periodeHari    = hari;
  keuCustomStart = '';
  keuCustomEnd   = '';
  if (typeof resetDrp === 'function') resetDrp('drp-keuangan');
  navigasi('#keuangan');
}

function chartOpts() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: 'top', labels: { font: { size: 11 } } },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(0,0,0,0.04)' },
        ticks: {
          callback: function(v) { return formatKompak(v); },
        },
      },
      x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0 } },
    },
  };
}
