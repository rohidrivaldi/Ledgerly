/* =============================================
   transaksi.js — halaman riwayat & input transaksi
   ============================================= */

var filterTipeTx = 'semua';

function initTransaksi() {
  let masuk = 0, keluar = 0;
  store.transaksi.forEach(function(t) {
    if (t.tipe === 'MASUK') masuk += t.total;
    else keluar += t.total;
  });
  let bersih = masuk - keluar;

  let txFiltered = filterTipeTx === 'semua'
    ? store.transaksi
    : store.transaksi.filter(function(t) { return t.tipe === filterTipeTx; });

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

  // 2. Populate stats & totals
  let elTotalMasuk = document.getElementById('tx-total-masuk');
  if (elTotalMasuk) elTotalMasuk.innerText = formatRupiah(masuk);
  let elTotalKeluar = document.getElementById('tx-total-keluar');
  if (elTotalKeluar) elTotalKeluar.innerText = formatRupiah(keluar);
  let elTotalBersih = document.getElementById('tx-total-bersih');
  if (elTotalBersih) elTotalBersih.innerText = formatRupiah(bersih);

  let txSubtitle = document.getElementById('tx-list-subtitle');
  if (txSubtitle) txSubtitle.innerText = `${txFiltered.length} transaksi`;

  // 3. Populate period filter buttons
  let periodSel = document.getElementById('tx-period-selector');
  if (periodSel) {
    periodSel.innerHTML = `
      ${filterBtn('semua', 'Semua')}
      ${filterBtn('MASUK', 'Masuk')}
      ${filterBtn('KELUAR', 'Keluar')}
    `;
  }

  // 4. Render Table Rows
  let tbody = document.querySelector('#konten-utama table tbody');
  if (tbody) {
    tbody.innerHTML = renderRowsTransaksi(txFiltered);
  }

  // 5. Populate New Transaction Modal Product list
  let pSelect = document.getElementById('tx-produk');
  if (pSelect) {
    pSelect.innerHTML = store.produk.map(function(p) {
      return `<option value="${p.id}">${p.nama}</option>`;
    }).join('');
  }

  // 6. Setup Search Input Event
  initTransaksiSearch();
}

function renderRowsTransaksi(list) {
  return list.map(function(t) {
    return `
      <tr>
        <td>${formatTanggalWaktu(t.tanggal)}</td>
        <td><span class="badge ${t.tipe === 'MASUK' ? 'badge-success' : 'badge-danger'}">${t.tipe}</span></td>
        <td class="td-bold">${t.produkNama}</td>
        <td class="td-right">${t.jumlah}</td>
        <td class="td-right">${formatRupiah(t.hargaSatuan)}</td>
        <td class="td-right td-semibold">${formatRupiah(t.total)}</td>
        <td><span class="badge badge-neutral">${t.metode}</span></td>
        <td class="text-center">
          <button class="btn btn-danger btn-xs" style="padding:2px 6px;" onclick="konfirmasiHapusTransaksi('${t.id}', '${t.produkNama}', ${t.jumlah}, '${t.tipe}', '${t.produkId}')">
            ${icon('x', 12)} Batal
          </button>
        </td>
      </tr>`;
  }).join('');
}

function filterBtn(val, label) {
  return `<button class="period-btn${filterTipeTx === val ? ' active' : ''}" onclick="filterTransaksi('${val}')">${label}</button>`;
}

function filterTransaksi(val) {
  filterTipeTx = val;
  navigasi('#transaksi');
}

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
    metode: 'manual',
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
      let q = this.value.toLowerCase();
      let txFiltered = filterTipeTx === 'semua'
        ? store.transaksi
        : store.transaksi.filter(function(t) { return t.tipe === filterTipeTx; });

      let filtered = txFiltered.filter(function(t) {
        return t.produkNama.toLowerCase().includes(q) || 
               (t.catatan || '').toLowerCase().includes(q) || 
               t.metode.toLowerCase().includes(q);
      });

      let tbody = document.querySelector('#konten-utama table tbody');
      if (tbody) {
        tbody.innerHTML = renderRowsTransaksi(filtered);
      }
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
        p.stok -= jumlah; // Jika sebelumnya beli/masuk, kurangi kembali stoknya
      } else {
        p.stok += jumlah; // Jika sebelumnya jual/keluar, tambah kembali stoknya
      }

      const { error: prodError } = await window.supabaseClient
        .from('Products')
        .update({ current_stok: p.stok })
        .eq('product_id', produkId);

      if (prodError) throw prodError;
    }

    console.log("Berhasil membatalkan transaksi!");
    // Sinkronisasi ulang data di local state dan re-render
    await sinkronisasiSupabase();
  } catch (err) {
    console.error("Gagal membatalkan transaksi:", err.message);
    alert("Gagal membatalkan transaksi: " + err.message);
  }
}
