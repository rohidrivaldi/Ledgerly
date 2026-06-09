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

  // set ikon tombol prediksi AI
  let btnPrediksi = document.getElementById('btn-prediksi-ai');
  if (btnPrediksi) btnPrediksi.innerHTML = icon('sparkles', 16) + ' Analisis Sekarang';

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
      ? '<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--slate-400);">Semua stok aman, tidak ada yg perlu restock 👍</td></tr>'
      : produkRendah.map(function(p) {
          let kurang = p.minStok - p.stok;
          // klo supplier kosong tampilin strip, jgn teks palsu
          let supplierTxt = p.supplier ? p.supplier : '<span style="color:var(--slate-400);">—</span>';
          // kontak WA: bikin link wa.me biar pemilik bisa lgsg chat supplier buat restock
          let waTd;
          if (p.supplierWa) {
            let waBersih = p.supplierWa.replace(/[^0-9]/g, '');
            if (waBersih.charAt(0) === '0') waBersih = '62' + waBersih.slice(1);
            let pesan = encodeURIComponent('Halo, saya mau restock ' + p.nama + ' sebanyak ' + kurang + ' unit. Apakah tersedia?');
            waTd = '<a href="https://wa.me/' + waBersih + '?text=' + pesan + '" target="_blank" style="color:var(--emerald-600); font-weight:600; text-decoration:none;">Chat WA</a>';
          } else {
            waTd = '<span style="color:var(--slate-400);">—</span>';
          }
          return `
            <tr>
              <td class="td-bold">${p.nama}</td>
              <td class="td-right" style="color:var(--rose-600); font-weight:600;">${p.stok}</td>
              <td class="td-right">${p.minStok}</td>
              <td class="td-right td-semibold">${kurang}</td>
              <td class="td-right">${formatRupiah(p.hargaBeli)}</td>
              <td class="td-right td-semibold">${formatRupiah(kurang * p.hargaBeli)}</td>
              <td>${supplierTxt}</td>
              <td>${waTd}</td>
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

// ============ PREDIKSI KEBUTUHAN STOK (DEMAND FORECASTING AI) ============

async function jalankanPrediksiStok() {
  let btn = document.getElementById('btn-prediksi-ai');
  let hasilEl = document.getElementById('kep-prediksi-hasil');
  if (!hasilEl) return;

  // 1. Hitung penjualan per produk dr 30 hari terakhir (transaksi KELUAR)
  let batas = new Date();
  batas.setDate(batas.getDate() - 30);

  let jualPerProduk = {};
  (store.transaksi || []).forEach(function(t) {
    if (t.tipe !== 'KELUAR') return;
    if (new Date(t.tanggal) < batas) return;
    if (!jualPerProduk[t.produkId]) jualPerProduk[t.produkId] = 0;
    jualPerProduk[t.produkId] += t.jumlah;
  });

  // 2. Bangun ringkasan per produk: rata2 harian + estimasi hari sampai habis
  let baris = (store.produk || []).map(function(p) {
    let totalJual = jualPerProduk[p.id] || 0;
    let rataHarian = totalJual / 30;
    let estHari = rataHarian > 0 ? Math.floor(p.stok / rataHarian) : null;
    return {
      nama: p.nama,
      stok: p.stok,
      minStok: p.minStok,
      totalJual30: totalJual,
      rataHarian: rataHarian,
      estHari: estHari
    };
  });

  // klo gak ada penjualan sama sekali, kasih tau user
  let adaPenjualan = baris.some(function(b) { return b.totalJual30 > 0; });
  if (!adaPenjualan) {
    hasilEl.innerHTML = '<div style="text-align:center; color:var(--slate-400); padding:24px 0; font-size:13px;">Belum ada data penjualan dalam 30 hari terakhir untuk dianalisis.</div>';
    return;
  }

  // 3. Format jadi teks konteks buat AI
  let konteks = baris.map(function(b) {
    let estTxt = b.estHari === null ? 'belum ada penjualan' : ('diperkirakan habis dalam ~' + b.estHari + ' hari');
    return '- ' + b.nama + ': stok ' + b.stok + ' unit (min ' + b.minStok + '), terjual ' + b.totalJual30
      + ' unit/30hari (rata2 ' + b.rataHarian.toFixed(1) + '/hari), ' + estTxt;
  }).join('\n');

  let pertanyaan = 'Berdasarkan data tren penjualan 30 hari terakhir berikut:\n' + konteks
    + '\n\nBuatkan analisis prediksi kebutuhan stok untuk toko ini. Untuk tiap produk yang berisiko habis dalam waktu dekat, '
    + 'sebutkan estimasi kapan habis dan rekomendasikan jumlah unit yang sebaiknya direstock sebelum kehabisan. '
    + 'Prioritaskan produk paling mendesak. Jawab ringkas dengan poin-poin, gunakan format markdown tebal untuk nama produk dan angka penting.';

  // 4. Loading state + panggil Gemini (reuse fungsi chatbot, support lokal & proxy)
  if (btn) { btn.disabled = true; btn.style.opacity = '0.6'; btn.innerHTML = icon('loader', 16) + ' Menganalisis...'; }
  hasilEl.innerHTML = '<div style="color:var(--slate-400); font-size:13px; padding:8px 0;">AI sedang menganalisis tren penjualan...</div>';

  try {
    if (typeof tanyaGeminiAI !== 'function') throw new Error('Fungsi AI tidak tersedia');
    let jawaban = await tanyaGeminiAI(pertanyaan, function(teksSementara) {
      // streaming: update hasil tiap chunk masuk
      hasilEl.innerHTML = (typeof formatMarkdown === 'function') ? formatMarkdown(teksSementara) : teksSementara;
    });
    hasilEl.innerHTML = (typeof formatMarkdown === 'function') ? formatMarkdown(jawaban) : jawaban;
  } catch (err) {
    hasilEl.innerHTML = '<div style="color:var(--rose-600); font-size:13px;">Gagal menganalisis: ' + err.message + '</div>';
  } finally {
    if (btn) { btn.disabled = false; btn.style.opacity = '1'; btn.innerHTML = icon('sparkles', 16) + ' Analisis Ulang'; }
  }
}
