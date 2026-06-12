/* =============================================
   transaksi.js — halaman riwayat & input transaksi
   ============================================= */

var txHalamanSkrg = 1;
var txPerHalaman  = 10;

function initTransaksi() {
  // 1. Inject Icons
  let iconPlus = document.getElementById('tx-plus-icon');
  if (iconPlus) iconPlus.innerHTML = icon('plus', 16);
  let iconUpload = document.getElementById('tx-upload-icon');
  if (iconUpload) iconUpload.innerHTML = icon('upload', 16);
  let iconClose = document.getElementById('btn-tx-close');
  if (iconClose) iconClose.innerHTML = icon('x', 18);

  let iconArrowDown = document.getElementById('tx-arrow-down-icon');
  if (iconArrowDown) iconArrowDown.innerHTML = icon('arrowDown', 16);
  let iconArrowUp = document.getElementById('tx-arrow-up-icon');
  if (iconArrowUp) iconArrowUp.innerHTML = icon('arrowUp', 16);
  let iconArrowLfr = document.getElementById('tx-arrow-lfr-icon');
  if (iconArrowLfr) iconArrowLfr.innerHTML = icon('arrowLeftRight', 16);

  // 2. Populate product list di modal
  let pSelect = document.getElementById('tx-produk');
  if (pSelect) {
    pSelect.innerHTML = store.produk.map(function(p) {
      return `<option value="${p.id}">${p.nama}</option>`;
    }).join('');
  }

  // 3. Reset pagination & render tabel
  txHalamanSkrg = 1;
  renderTransaksiTable();

  // 4. Init DateRangePicker
  if (typeof buatDateRangePicker === 'function' && document.getElementById('drp-transaksi')) {
    buatDateRangePicker({
      containerId: 'drp-transaksi',
      placeholder: 'Rentang tanggal...',
      onChange: function() {
        txHalamanSkrg = 1;
        renderTransaksiTable();
      }
    });
  }

  // 5. Setup Search Input
  initTransaksiSearch();
}

// ============ RENDER TABEL DENGAN FILTER & PAGINATION ============

function getDaftarTxFiltered() {
  let q          = (document.getElementById('cari-transaksi')  || {}).value || '';
  let tipeFilter = (document.getElementById('filter-tx-tipe')  || {}).value || '';
  let metFilter  = (document.getElementById('filter-tx-metode')|| {}).value || '';

  // Baca dari DateRangePicker custom
  var drpVal = (typeof getDrpValue === 'function') ? getDrpValue('drp-transaksi') : { start: '', end: '' };
  let startVal = drpVal.start;
  let endVal   = drpVal.end;

  var startDate = startVal ? new Date(startVal) : null;
  var endDate   = endVal   ? new Date(endVal)   : null;
  if (endDate) endDate.setHours(23, 59, 59, 999);

  return store.transaksi.filter(function(t) {
    let lolosQ    = !q || t.produkNama.toLowerCase().includes(q.toLowerCase()) ||
                    (t.catatan || '').toLowerCase().includes(q.toLowerCase()) ||
                    t.metode.toLowerCase().includes(q.toLowerCase());
    let lolosTipe = !tipeFilter || t.tipe === tipeFilter;
    let lolosMet  = !metFilter  || t.metode.toLowerCase() === metFilter.toLowerCase();
    let lolosTgl  = true;
    if (startDate || endDate) {
      let tgl = new Date(t.tanggal);
      lolosTgl = (!startDate || tgl >= startDate) && (!endDate || tgl <= endDate);
    }
    return lolosQ && lolosTipe && lolosMet && lolosTgl;
  });
}

function renderTransaksiTable() {
  let filtered = getDaftarTxFiltered();

  // Hitung stats dari data yang lolos filter
  let masuk = 0, keluar = 0;
  filtered.forEach(function(t) {
    if (t.tipe === 'MASUK') masuk += t.total;
    else keluar += t.total;
  });
  let bersih = keluar - masuk;

  let elTotalMasuk = document.getElementById('tx-total-masuk');
  if (elTotalMasuk) elTotalMasuk.innerText = formatRupiah(masuk);
  let elTotalKeluar = document.getElementById('tx-total-keluar');
  if (elTotalKeluar) elTotalKeluar.innerText = formatRupiah(keluar);
  let elTotalBersih = document.getElementById('tx-total-bersih');
  if (elTotalBersih) elTotalBersih.innerText = formatRupiah(bersih);

  let cardBersih = document.getElementById('tx-card-bersih');
  if (cardBersih) {
    cardBersih.className = 'summary-card';
    if (bersih > 0) cardBersih.classList.add('bersih-positif');
    else if (bersih < 0) cardBersih.classList.add('bersih-negatif');
    else cardBersih.classList.add('bersih-netral');
  }

  // Pagination
  let totalData    = filtered.length;
  let totalHalaman = Math.max(1, Math.ceil(totalData / txPerHalaman));
  if (txHalamanSkrg > totalHalaman) txHalamanSkrg = totalHalaman;

  let slice = filtered.slice((txHalamanSkrg - 1) * txPerHalaman, txHalamanSkrg * txPerHalaman);

  let txSubtitle = document.getElementById('tx-list-subtitle');
  if (txSubtitle) txSubtitle.innerText = totalData + ' transaksi' + (totalData < store.transaksi.length ? ' (difilter)' : '');

  // Render baris
  let tbody = document.querySelector('#konten-utama table tbody');
  if (tbody) {
    tbody.innerHTML = slice.length === 0
      ? '<tr><td colspan="8" style="text-align:center; padding:32px; color:var(--slate-400);">Tidak ada transaksi yang cocok dengan filter.</td></tr>'
      : renderRowsTransaksi(slice);
  }

  // Render pagination
  let pgEl = document.getElementById('tx-pagination-placeholder');
  if (pgEl) {
    if (totalHalaman <= 1) {
      pgEl.innerHTML = '';
    } else {
      pgEl.innerHTML = `
        <div style="display:flex; align-items:center; justify-content:space-between; font-size:13px; color:var(--slate-600);">
          <span>Halaman ${txHalamanSkrg} dari ${totalHalaman} &nbsp;(${totalData} transaksi)</span>
          <div style="display:flex; gap:6px;">
            <button class="btn btn-secondary" style="padding:6px 12px; font-size:12px;" ${txHalamanSkrg <= 1 ? 'disabled' : ''} onclick="gantiHalamanTx(${txHalamanSkrg - 1})">${icon('chevronLeft', 14)} Sebelumnya</button>
            <button class="btn btn-secondary" style="padding:6px 12px; font-size:12px;" ${txHalamanSkrg >= totalHalaman ? 'disabled' : ''} onclick="gantiHalamanTx(${txHalamanSkrg + 1})">Selanjutnya ${icon('chevronRight', 14)}</button>
          </div>
        </div>`;
    }
  }
}

function gantiHalamanTx(halaman) {
  txHalamanSkrg = halaman;
  renderTransaksiTable();
}

function filterTransaksiUpdate() {
  txHalamanSkrg = 1;
  renderTransaksiTable();
}

function resetFilterTransaksi() {
  let ids = ['cari-transaksi','filter-tx-tipe','filter-tx-metode'];
  ids.forEach(function(id) {
    let el = document.getElementById(id);
    if (el) el.value = '';
  });
  if (typeof resetDrp === 'function') resetDrp('drp-transaksi');
  txHalamanSkrg = 1;
  renderTransaksiTable();
}

function renderRowsTransaksi(list) {
  return list.map(function(t) {
    let adaCatatan = t.catatan && t.catatan.trim() !== '';
    return `
      <tr>
        <td>${formatTanggalWaktu(t.tanggal)}</td>
        <td><span class="badge ${t.tipe === 'MASUK' ? 'badge-danger' : 'badge-success'}">${t.tipe}</span></td>
        <td class="td-bold">${t.produkNama}</td>
        <td class="td-right">${t.jumlah}</td>
        <td class="td-right">${formatRupiah(t.hargaSatuan)}</td>
        <td class="td-right td-semibold">${formatRupiah(t.total)}</td>
        <td><span class="badge badge-neutral">${t.metode}</span></td>
        <td class="text-center">
          <div style="display:flex; justify-content:center; gap:4px;">
            <button class="btn btn-secondary btn-xs" style="padding:2px 6px; font-size:11px;" onclick="lihatCatatanTx('${escapeHtml(t.catatan || '')}', '${t.produkNama}')" ${!adaCatatan ? 'disabled style="opacity:0.4; padding:2px 6px; font-size:11px;"' : ''} title="${adaCatatan ? 'Lihat Catatan' : 'Tidak ada catatan'}">
              ${icon('eye', 12)} Catatan
            </button>
            <button class="btn btn-danger btn-xs" style="padding:2px 6px;" onclick="konfirmasiHapusTransaksi('${t.id}', '${t.produkNama}', ${t.jumlah}, '${t.tipe}', '${t.produkId}')">
              ${icon('x', 12)} Batal
            </button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

function escapeHtml(str) {
  return (str || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

// ============ MODAL LIHAT CATATAN ============

function lihatCatatanTx(catatan, produkNama) {
  // hapus modal lama kalau ada
  let old = document.getElementById('modal-catatan-container');
  if (old) old.remove();

  let html = `
    <div class="modal-overlay" id="modal-catatan-container" onclick="tutupModalCatatan(event)">
      <div class="modal-box" style="max-width:420px;">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:16px;">
          <div>
            <div class="modal-title">Catatan Transaksi</div>
            <div class="modal-desc">${escapeHtml(produkNama)}</div>
          </div>
          <button class="modal-close-btn" onclick="tutupModalCatatan()">${icon('x', 18)}</button>
        </div>
        <div style="background:var(--slate-50); border:1px solid var(--slate-200); border-radius:var(--radius-lg); padding:16px; font-size:14px; color:var(--slate-700); line-height:1.6; white-space:pre-wrap; word-break:break-word;">
          ${catatan && catatan.trim() ? escapeHtml(catatan) : '<span style="color:var(--slate-400); font-style:italic;">Tidak ada catatan.</span>'}
        </div>
        <div style="margin-top:16px; text-align:right;">
          <button class="btn btn-secondary" onclick="tutupModalCatatan()">Tutup</button>
        </div>
      </div>
    </div>`;

  document.body.insertAdjacentHTML('beforeend', html);
}

function tutupModalCatatan(event) {
  if (event && event.target.id !== 'modal-catatan-container') return;
  let modal = document.getElementById('modal-catatan-container');
  if (modal) modal.remove();
}

// ============ MODAL TRANSAKSI BARU ============

function bukaModalTx() {
  let modal = document.getElementById('modal-tx');
  if (modal) modal.classList.remove('hidden');
}

function tutupModalTx() {
  let modal = document.getElementById('modal-tx');
  if (modal) modal.classList.add('hidden');
}

function submitTx(e) {
  e.preventDefault();

  let tipe = document.getElementById('tx-tipe').value;
  let produkId = document.getElementById('tx-produk').value;
  let jumlah = parseInt(document.getElementById('tx-jumlah').value);
  let metode = document.getElementById('tx-metode').value;
  let catatan = document.getElementById('tx-catatan').value;

  let produk = store.produk.find(function(p) { return p.id === produkId; });
  if (!produk || jumlah <= 0) return;

  let harga = tipe === 'MASUK' ? produk.hargaBeli : produk.hargaJual;

  let tx = {
    id: buatId('t'),
    tanggal: new Date().toISOString(),
    tipe: tipe,
    produkId: produk.id,
    produkNama: produk.nama,
    jumlah: jumlah,
    hargaSatuan: harga,
    total: jumlah * harga,
    metode: metode,
    catatan: catatan || ''
  };

  tambahTransaksi(tx);
  tutupModalTx();
  navigasi('#transaksi');
}

function initTransaksiSearch() {
  let cariInput = document.getElementById('cari-transaksi');
  if (cariInput) {
    let topbarSearch = document.getElementById('topbar-search-input');
    if (topbarSearch && topbarSearch.value) {
      cariInput.value = topbarSearch.value;
    }

    cariInput.addEventListener('input', function() {
      txHalamanSkrg = 1;
      renderTransaksiTable();
    });

    if (cariInput.value) {
      cariInput.dispatchEvent(new Event('input'));
    }
  }
}

// ============ FUNGSI BATAL/HAPUS TRANSAKSI ============

function konfirmasiHapusTransaksi(txId, produkNama, jumlah, tipe, produkId) {
  let setuju = confirm("Apakah Anda yakin ingin membatalkan transaksi '" + produkNama + " (" + tipe + ")' sejumlah " + jumlah + " unit? Stok produk terkait akan disesuaikan kembali.");
  if (setuju) {
    hapusTransaksi(txId, jumlah, tipe, produkId);
  }
}

async function hapusTransaksi(txId, jumlah, tipe, produkId) {
  if (!window.supabaseClient) return;

  try {
    // 1. Hapus dari Detail_Transactions
    const { error: detError } = await window.supabaseClient
      .from('Detail_Transactions')
      .delete()
      .eq('transaction_id', txId);

    if (detError) throw detError;

    // 2. Hapus dari Transactions
    const { error: txError } = await window.supabaseClient
      .from('Transactions')
      .delete()
      .eq('transaction_id', txId);

    if (txError) throw txError;

    // 3. Kembalikan/revert stok produk di tabel Products
    let p = store.produk.find(function(pr) { return pr.id === produkId; });
    if (p) {
      if (tipe === 'MASUK') {
        p.stok -= jumlah;
      } else {
        p.stok += jumlah;
      }

      const { error: prodError } = await window.supabaseClient
        .from('Products')
        .update({ current_stok: p.stok })
        .eq('product_id', produkId);

      if (prodError) throw prodError;
    }

    console.log("Berhasil membatalkan transaksi!");
    await sinkronisasiSupabase();
  } catch (err) {
    console.error("Gagal membatalkan transaksi:", err.message);
    alert("Gagal membatalkan transaksi: " + err.message);
  }
}
