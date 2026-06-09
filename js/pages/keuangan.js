/* =============================================
   keuangan.js — halaman keuangan
   chart omzet, tren, arus kas, laba rugi
   ============================================= */

var periodeHari = 30;
var chartOmzet = null,
  chartTren = null,
  chartArusKas = null;

function initKeuangan() {
  // Hitung ringkasan keuangan
  let ring = hitungRingkasan(periodeHari);
  let margin = ring.omzet > 0 ? ring.labaBersih / ring.omzet : 0;
  let data = ring.dataHarian;

  // 1. Render Period Selector Button
  let periodSel = document.getElementById("keu-period-selector");
  if (periodSel) {
    periodSel.innerHTML = `
      ${periodBtn(7)}
      ${periodBtn(30)}
      ${periodBtn(60)}
    `;
  }

  // 2. Render Stat Cards
  let statsRow = document.getElementById("keu-stats-row");
  if (statsRow) {
    statsRow.innerHTML = `
      ${statCard("Total Omzet", formatRupiah(ring.omzet), icon("trendingUp"), periodeHari + " hari terakhir")}
      ${statCard("Laba Kotor", formatRupiah(ring.labaKotor), icon("dollarSign"), formatPersen(ring.labaKotor / ring.omzet) + " margin", "success")}
      ${statCard("Laba Bersih", formatRupiah(ring.labaBersih), icon("dollarSign"), formatPersen(margin) + " net margin", "success")}
      ${statCard("Total Pesanan", formatKompak(ring.pesanan), icon("shoppingCart"), "Transaksi keluar")}
    `;
  }

  // 3. Render Laba Rugi (Profit & Loss)
  let plSub = document.getElementById("keu-pl-subtitle");
  if (plSub) plSub.innerText = `Periode ${periodeHari} hari terakhir`;

  let plList = document.getElementById("keu-pl-list");
  if (plList) {
    let persenBiaya = (store.settings && store.settings.biayaOpsPersen !== undefined) ? store.settings.biayaOpsPersen : 8;
    plList.innerHTML = `
      ${plRow("Omzet (Pendapatan)", ring.omzet, false)}
      ${plRow("Harga Pokok Penjualan", ring.hpp, true)}
      ${plRow("Laba Kotor", ring.labaKotor, false)}
      ${plRow(`Biaya Operasional (~${persenBiaya}%)`, ring.biaya, true)}
      <div class="pl-row" style="background:var(--slate-50);">
        <span class="pl-label" style="font-weight:700;">Laba Bersih</span>
        <span class="pl-amount" style="color:var(--emerald-600); font-weight:700;">${formatRupiah(ring.labaBersih)}</span>
      </div>
    `;
  }

  // 4. Render Chart.js
  // Buat array label tanggal dari setiap data harian
  let labels = data.map(function (d) {
    return new Date(d.tanggal).toLocaleDateString("id-ID", { day: "numeric", month: "short" });
  });

  // chart omzet vs hpp (Harga Pokok Penjualan)
  let ctxOmzet = document.getElementById("chart-omzet");
  if (ctxOmzet) {
    if (chartOmzet) chartOmzet.destroy();
    chartOmzet = new Chart(ctxOmzet, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Omzet",
            data: data.map(function (d) {
              // Ambil angka omzet untuk setiap hari dan jadikan array baru
              return d.omzet;
            }),
            borderColor: "rgb(99, 102, 241)",
            backgroundColor: "rgba(99, 102, 241, 0.1)",
            fill: true,
            tension: 0.3,
            pointRadius: 0,
          },
          {
            label: "HPP",
            data: data.map(function (d) {
              // Ambil angka HPP untuk setiap hari dan jadikan array baru
              return d.hpp;
            }),
            borderColor: "rgb(244, 63, 94)",
            backgroundColor: "rgba(244, 63, 94, 0.05)",
            fill: true,
            tension: 0.3,
            pointRadius: 0,
          },
        ],
      },
      options: chartOpts(),
    });
  }

  // chart tren pesanan
  let ctxTren = document.getElementById("chart-tren");
  if (ctxTren) {
    if (chartTren) chartTren.destroy();
    chartTren = new Chart(ctxTren, {
      type: "line",
      data: {
        labels: labels,
        datasets: [
          {
            label: "Pesanan",
            data: data.map(function (d) {
              // Ambil jumlah pesanan untuk setiap hari dan jadikan array baru
              return d.pesanan;
            }),
            borderColor: "rgb(16, 185, 129)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            fill: true,
            tension: 0.3,
            pointRadius: 0,
          },
        ],
      },
      options: chartOpts(),
    });
  }

  // chart arus kas
  let ctxArus = document.getElementById("chart-arus");
  if (ctxArus) {
    if (chartArusKas) chartArusKas.destroy(); // Detele chart lama

    chartArusKas = new Chart(ctxArus, {
      type: "bar",
      data: {
        // Jika store.arusKas tidak ada, pakai array kosong
        labels: (store.arusKas || []).map(function (a) {
          // Ambil nama bulan dari setiap item arus kas
          return a.bulan;
        }),
        datasets: [
          {
            label: "Pemasukan",
            data: (store.arusKas || []).map(function (a) {
              // Ambil nilai pemasukan dari arus kas
              return a.masuk;
            }),
            backgroundColor: "rgba(16, 185, 129, 0.8)",
            borderRadius: 6,
          },
          {
            label: "Pengeluaran",
            data: (store.arusKas || []).map(function (a) {
              // Ambil nilai pengeluaran dari arus kas
              return a.keluar;
            }),
            backgroundColor: "rgba(244, 63, 94, 0.7)",
            borderRadius: 6,
          },
        ],
      },
      options: chartOpts(),
    });
  }
}

// Buat HTML laporan laba rugi dengan label dan nilai
function plRow(label, amount, isExpense) {
  return `
    <div class="pl-row">
      <span class="pl-label${isExpense ? " expense" : ""}">${label}</span>
      <span class="pl-amount${isExpense ? " negative" : ""}">${isExpense ? "-" : ""}${formatRupiah(amount)}</span>
    </div>`;
}

// Buat tombol periode hari dan beri class active jika dipilih
function periodBtn(hari) {
  return `<button class="period-btn${periodeHari === hari ? " active" : ""}" onclick="gantiPeriode(${hari})">${hari} Hari</button>`;
}

// Set periode baru lalu refresh halaman keuangan
function gantiPeriode(hari) {
  periodeHari = hari;
  navigasi("#keuangan");
}

// shared chart options biar ga ngulang dari 0
function chartOpts() {
  return {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: true, position: "top", labels: { font: { size: 11 } } },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: "rgba(0,0,0,0.04)" },
        ticks: {
          callback: function (v) {
            // Ubah angka sumbu-y menjadi format ringkas seperti 1K, 2M
            return formatKompak(v);
          },
        },
      },
      x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 0 } },
    },
  };
}
