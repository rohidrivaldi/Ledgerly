/* =============================================
   keputusan.js — halaman decision support
   produk terlaris, rekomendasi restock
   ============================================= */

var chartTerlaris = null;

function initKeputusan() {
  // 1. Hitung anggaran restock
  let produkRendah = store.produk.filter(function(p) { return p.stok < p.minStok; });
  let anggaranRestock = produkRendah.reduce(function(acc, p) {
    let kurang = p.minStok - p.stok;
    return acc + (kurang * p.hargaBeli);
  }, 0);

  // 2. Data terlaris dgn info produk
  let terlaris = (store.produkTerlaris || []).map(function(tp) {
    let p = store.produk.find(function(pr) { return pr.id === tp.produkId; });
    return {
      nama: p ? p.nama : 'Unknown',
      kategori: p ? p.kategori : '-',
      unit: tp.unit,
      omzet: tp.omzet
    };
  }).sort(function(a, b) { return b.unit - a.unit; });

  // 3. Render Stat Cards
  let statsRow = document.getElementById('kep-stats-row');
  if (statsRow) {
    statsRow.innerHTML = `
      ${statCard('Anggaran Restock', formatRupiah(anggaranRestock), icon('dollarSign'), 'Estimasi biaya utk restock', 'warning')}
      ${statCard('SKU Perlu Restock', produkRendah.length + ' produk', icon('alertTriangle'), 'Di bawah reorder point', 'danger')}
      ${statCard('Produk Terlaris', terlaris[0] ? terlaris[0].nama : '-', icon('trendingUp'), terlaris[0] ? formatKompak(terlaris[0].unit) + ' unit terjual' : '')}
    `;
  }

  // 4. Render ranking items
  let rankingList = document.getElementById('kep-ranking-list');
  if (rankingList) {
    rankingList.innerHTML = terlaris.map(function(t, i) {
      return `
        <div class="rank-item">
          <div class="rank-num">${i + 1}</div>
          <div class="rank-info">
            <div class="rank-name">${t.nama}</div>
            <div class="rank-cat">${t.kategori}</div>
          </div>
          <div class="rank-stats">
            <div class="rank-units">${formatKompak(t.unit)} unit</div>
            <div class="rank-revenue">${formatRupiah(t.omzet)}</div>
          </div>
        </div>`;
    }).join('');
  }

  // 5. Render tabel restock
  let tbody = document.querySelector('#tabel-restock tbody');
  if (tbody) {
    tbody.innerHTML = produkRendah.length === 0
      ? '<tr><td colspan="7" style="text-align:center; padding:32px; color:var(--slate-400);">Semua stok aman, tidak ada yg perlu restock 👍</td></tr>'
      : produkRendah.map(function(p) {
          let kurang = p.minStok - p.stok;
          return `
            <tr>
              <td class="td-bold">${p.nama}</td>
              <td class="td-right" style="color:var(--rose-600); font-weight:600;">${p.stok}</td>
              <td class="td-right">${p.minStok}</td>
              <td class="td-right td-semibold">${kurang}</td>
              <td class="td-right">${formatRupiah(p.hargaBeli)}</td>
              <td class="td-right td-semibold">${formatRupiah(kurang * p.hargaBeli)}</td>
              <td>${p.supplier}</td>
            </tr>`;
        }).join('');
  }

  // 6. Render Chart.js
  let ctx = document.getElementById('chart-terlaris');
  if (!ctx) return;

  if (chartTerlaris) chartTerlaris.destroy();

  let chartData = (store.produkTerlaris || []).map(function(tp) {
    let p = store.produk.find(function(pr) { return pr.id === tp.produkId; });
    return { nama: p ? p.nama : '?', unit: tp.unit };
  }).sort(function(a, b) { return b.unit - a.unit; });

  chartTerlaris = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.map(function(t) { return t.nama; }),
      datasets: [{
        label: 'Unit Terjual',
        data: chartData.map(function(t) { return t.unit; }),
        backgroundColor: [
          'rgba(251, 191, 36, 0.8)',
          'rgba(99, 102, 241, 0.8)',
          'rgba(16, 185, 129, 0.8)',
          'rgba(244, 63, 94, 0.8)',
          'rgba(168, 85, 247, 0.8)'
        ],
        borderRadius: 6
      }]
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
        y: { grid: { display: false }, ticks: { font: { size: 12 } } }
      }
    }
  });
}
