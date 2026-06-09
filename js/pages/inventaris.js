/* =============================================
   inventaris.js — halaman inventaris
   tampilkan stat cards, chart stok, peringatan, tabel produk
   ============================================= */

var chartStok = null; // simpan instance chart biar bisa di-destroy

function initInventaris() {
  let inv = hitungInventaris();
  let produkRendah = store.produk.filter(function(p) { return p.stok < p.minStok; });

  // 1. Render icon plus
  let btnPlus = document.getElementById('btn-plus-icon');
  if (btnPlus) btnPlus.innerHTML = icon('plus', 16);

  // 2. Render stat cards
  let statsRow = document.getElementById('inv-stats-row');
  if (statsRow) {
    statsRow.innerHTML = `
      ${statCard('Total Unit', formatKompak(inv.totalUnit), icon('boxes'), 'Semua produk')}
      ${statCard('Nilai Inventaris', formatRupiah(inv.totalNilai), icon('dollarSign'), 'Berdasarkan harga beli', 'success')}
      ${statCard('Total SKU', inv.totalSKU, icon('package'), 'Produk aktif')}
      ${statCard('Peringatan Stok', inv.stokRendah, icon('alertTriangle'), 'Di bawah minimum', inv.stokRendah > 0 ? 'danger' : '')}
    `;
  }

  // 3. Render Peringatan Stok Rendah
  let warnSub = document.getElementById('inv-warning-subtitle');
  if (warnSub) warnSub.innerText = `${produkRendah.length} produk perlu restock`;

  let alertList = document.getElementById('inv-alert-list');
  if (alertList) {
    alertList.innerHTML = produkRendah.length === 0
      ? '<div class="alert-empty">Semua stok aman 👍</div>'
      : produkRendah.map(function(p) {
          let persen = Math.round((p.stok / p.minStok) * 100);
          return `
            <div class="alert-item">
              <div class="alert-icon">${icon('alertTriangle')}</div>
              <div class="alert-info">
                <div class="nama">${p.nama}</div>
                <div class="stok-text">Stok: ${p.stok} / Min: ${p.minStok}</div>
                <div class="progress-bar">
                  <div class="progress-fill" style="width:${persen}%; background:${persen < 50 ? 'var(--rose-500)' : 'var(--amber-500)'};"></div>
                </div>
              </div>
            </div>
          `;
        }).join('');
  }

  // 4. Render Katalog Produk
  let katSub = document.getElementById('inv-katalog-subtitle');
  if (katSub) katSub.innerText = `${store.produk.length} produk terdaftar`;

  let tbody = document.querySelector('#tabel-produk tbody');
  if (tbody) tbody.innerHTML = renderTabelProduk(store.produk);

  // 5. Init Chart & Search input
  initInventarisChart();
  initInventarisSearch();
}

function renderTabelProduk(data) {
  return data.map(function(p) {
    let isRendah = p.stok < p.minStok;
    return `
      <tr>
        <td class="td-mono">${p.sku}</td>
        <td class="td-bold">${p.nama}</td>
        <td>${p.kategori}</td>
        <td class="td-right td-semibold">${p.stok}</td>
        <td class="td-right">${p.minStok}</td>
        <td class="td-right">${formatRupiah(p.hargaBeli)}</td>
        <td class="td-right">${formatRupiah(p.hargaJual)}</td>
        <td>
          ${isRendah
            ? '<span class="badge badge-danger"><span class="badge-dot red"></span> Rendah</span>'
            : '<span class="badge badge-success"><span class="badge-dot green"></span> Aman</span>'}
        </td>
        <td class="text-center">
          <div style="display:flex; justify-content:center; gap:6px;">
            <button class="btn btn-secondary btn-xs" style="padding:4px;" onclick="bukaModalProduk('${p.id}')" title="Edit">
              ${icon('settings', 12)}
            </button>
            <button class="btn btn-danger btn-xs" style="padding:4px;" onclick="konfirmasiHapusProduk('${p.id}', '${p.nama}')" title="Hapus">
              ${icon('x', 12)}
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function initInventarisChart() {
  let ctx = document.getElementById('chart-stok');
  if (!ctx) return;

  if (chartStok) chartStok.destroy();

  let labels = store.produk.map(function(p) { return p.nama; });
  let stokData = store.produk.map(function(p) { return p.stok; });
  let minData = store.produk.map(function(p) { return p.minStok; });
  let colors = store.produk.map(function(p) {
    return p.stok < p.minStok ? 'rgba(244, 63, 94, 0.8)' : 'rgba(99, 102, 241, 0.8)';
  });

  chartStok = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [
        {
          label: 'Stok Saat Ini',
          data: stokData,
          backgroundColor: colors,
          borderRadius: 6
        },
        {
          label: 'Reorder Point',
          data: minData,
          type: 'line',
          borderColor: 'rgba(244, 63, 94, 0.5)',
          borderDash: [6, 4],
          pointRadius: 0,
          borderWidth: 2,
          fill: false
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'top', labels: { font: { size: 12 } } }
      },
      scales: {
        y: { beginAtZero: true, grid: { color: 'rgba(0,0,0,0.04)' } },
        x: { grid: { display: false }, ticks: { font: { size: 10 }, maxRotation: 45, minRotation: 45 } }
      }
    }
  });
}

function initInventarisSearch() {
  let cariInput = document.getElementById('cari-produk');
  if (cariInput) {
    let topbarSearch = document.getElementById('topbar-search-input');
    if (topbarSearch && topbarSearch.value) {
      cariInput.value = topbarSearch.value;
    }

    cariInput.addEventListener('input', function() {
      let q = this.value.toLowerCase();
      let filtered = store.produk.filter(function(p) {
        return p.nama.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q);
      });
      let tbody = document.querySelector('#tabel-produk tbody');
      if (tbody) tbody.innerHTML = renderTabelProduk(filtered);
    });

    if (cariInput.value) {
      cariInput.dispatchEvent(new Event('input'));
    }
  }
}

// helper stat card
function statCard(label, value, iconSvg, delta, colorClass) {
  return `
    <div class="card stat-card">
      <div class="stat-card-wrap">
        <div>
          <div class="stat-label">${label}</div>
          <div class="stat-value${colorClass ? ' ' + colorClass : ''}">${value}</div>
          <div class="stat-delta">${delta || ''}</div>
        </div>
        <div class="stat-icon">${iconSvg}</div>
      </div>
    </div>
  `;
}

// ============ FUNGSI CRUD PRODUK MODAL ============

function bukaModalProduk(produkId) {
  tutupModalProduk();

  let target = store.produk.find(function(p) { return p.id === produkId; }) || {};
  let title = produkId ? 'Ubah Informasi Produk' : 'Tambah Produk Baru';

  let katList = store.kategoriList || [
    { kategori_id: 'c1c2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nama_kategori: 'Sembako' },
    { kategori_id: 'c2c2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nama_kategori: 'Makanan' },
    { kategori_id: 'c3c2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nama_kategori: 'Minuman' },
    { kategori_id: 'c4c2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nama_kategori: 'Rumah Tangga' },
    { kategori_id: 'c5c2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', nama_kategori: 'Perawatan Pribadi' }
  ];

  let modalHtml = `
    <div class="modal-overlay" id="modal-produk-container">
      <div class="modal-box" style="max-width:480px;">
        <div style="display:flex; justify-content:between; align-items:start; margin-bottom:20px;">
          <div>
            <div class="modal-title">${title}</div>
            <div class="modal-desc">Kelola stok, harga, dan SKU produk Anda</div>
          </div>
          <button class="btn btn-secondary btn-xs" onclick="tutupModalProduk()">${icon('x', 16)}</button>
        </div>
        <form id="form-produk" onsubmit="simpanProduk(event, '${produkId || ''}')">
          <div style="display:flex; flex-direction:column; gap:12px; margin-bottom:20px;">
            <div>
              <label class="form-label">Nama Produk</label>
              <input class="form-input" type="text" id="pr-nama" value="${target.nama || ''}" required>
            </div>
            <div>
              <label class="form-label">SKU</label>
              <input class="form-input" type="text" id="pr-sku" value="${target.sku || ''}" required>
            </div>
            <div>
              <label class="form-label">Kategori</label>
              <select class="form-select" id="pr-kategori">
                ${katList.map(function(k) {
                  let isSelected = target.kategori === k.nama_kategori ? ' selected' : '';
                  return `<option value="${k.kategori_id}"${isSelected}>${k.nama_kategori}</option>`;
                }).join('')}
              </select>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div>
                <label class="form-label">Stok Saat Ini</label>
                <input class="form-input" type="number" id="pr-stok" value="${target.stok != null ? target.stok : 0}" required>
              </div>
              <div>
                <label class="form-label">Batas Minimum (Reorder)</label>
                <input class="form-input" type="number" id="pr-minstok" value="${target.minStok != null ? target.minStok : 10}" required>
              </div>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
              <div>
                <label class="form-label">Harga Modal (Beli)</label>
                <input class="form-input" type="number" id="pr-modal" value="${target.hargaBeli != null ? target.hargaBeli : 0}" required>
              </div>
              <div>
                <label class="form-label">Harga Jual</label>
                <input class="form-input" type="number" id="pr-harga" value="${target.hargaJual != null ? target.hargaJual : 0}" required>
              </div>
            </div>
          </div>
          <div style="display:flex; justify-content:end; gap:8px;">
            <button type="button" class="btn btn-secondary" onclick="tutupModalProduk()">Batal</button>
            <button type="submit" class="btn btn-primary">Simpan</button>
          </div>
        </form>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function tutupModalProduk() {
  let modal = document.getElementById('modal-produk-container');
  if (modal) modal.remove();
}

async function simpanProduk(e, produkId) {
  e.preventDefault();

  let nama = document.getElementById('pr-nama').value.trim();
  let sku = document.getElementById('pr-sku').value.trim();
  let kategoriId = document.getElementById('pr-kategori').value;
  let stok = parseInt(document.getElementById('pr-stok').value);
  let minStok = parseInt(document.getElementById('pr-minstok').value);
  let modalVal = parseInt(document.getElementById('pr-modal').value);
  let hargaVal = parseInt(document.getElementById('pr-harga').value);

  if (!window.supabaseClient) return;

  try {
    if (produkId) {
      // Update produk ke Supabase
      const { error } = await window.supabaseClient
        .from('Products')
        .update({
          nama_product: nama,
          SKU: sku,
          kategori_id: kategoriId,
          current_stok: stok,
          min_stok: minStok,
          modal: modalVal,
          harga: hargaVal
        })
        .eq('product_id', produkId);

      if (error) throw error;
      console.log("Berhasil mengubah data produk!");
    } else {
      // Pengecekan limit 50 produk untuk paket Starter
      if (store.user && store.user.paket === 'starter' && store.produk && store.produk.length >= 50) {
        alert("Batas produk tercapai! Paket Starter hanya mendukung hingga 50 produk. Silakan upgrade ke paket Profesional untuk menambah lebih banyak produk.");
        return;
      }

      // Insert produk baru ke Supabase
      const { error } = await window.supabaseClient
        .from('Products')
        .insert({
          nama_product: nama,
          SKU: sku,
          kategori_id: kategoriId,
          current_stok: stok,
          min_stok: minStok,
          modal: modalVal,
          harga: hargaVal,
          max_stok: stok * 2
        });

      if (error) throw error;
      console.log("Berhasil menyimpan produk baru!");
    }

    tutupModalProduk();
    // Sinkronisasi ulang data di state local dan re-render
    await sinkronisasiSupabase();
  } catch (err) {
    console.error("Gagal menyimpan data produk:", err.message);
    alert("Gagal menyimpan data produk: " + err.message);
  }
}

function konfirmasiHapusProduk(produkId, nama) {
  let setuju = confirm("Apakah Anda yakin ingin menghapus produk '" + nama + "'? Produk akan terhapus permanen dari database.");
  if (setuju) {
    hapusProduk(produkId);
  }
}

async function hapusProduk(produkId) {
  if (!window.supabaseClient) return;

  try {
    const { error } = await window.supabaseClient
      .from('Products')
      .delete()
      .eq('product_id', produkId);

    if (error) throw error;
    console.log("Berhasil menghapus produk!");
    await sinkronisasiSupabase();
  } catch (err) {
    console.error("Gagal menghapus produk:", err.message);
    alert("Gagal menghapus: " + err.message);
  }
}
