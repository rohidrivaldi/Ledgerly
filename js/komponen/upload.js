/* =============================================
   upload.js — modal upload file CSV
   pake PapaParse buat parsing csv nya
   ============================================= */

var uploadResult = null;

function bukaUploadModal() {
  let modal = document.getElementById('upload-modal');
  if (!modal) return;
  modal.classList.remove('hidden');
  uploadResult = null;
  renderUploadModal();
}

function tutupUploadModal() {
  let modal = document.getElementById('upload-modal');
  if (modal) modal.classList.add('hidden');
  uploadResult = null;
}

function renderUploadModal() {
  let modal = document.getElementById('upload-modal');
  if (!modal) return;

  modal.innerHTML = `
    <div class="modal-box" style="max-width:520px;">
      <div style="display:flex; justify-content:space-between; align-items:flex-start;">
        <div>
          <div class="modal-title">Upload Data Transaksi</div>
          <div class="modal-desc">Upload file CSV utk import transaksi massal</div>
        </div>
        <button onclick="tutupUploadModal()" style="padding:4px;">${icon('x')}</button>
      </div>
      <div class="upload-dropzone" id="dropzone" ondrop="handleDrop(event)" ondragover="handleDragOver(event)" ondragleave="handleDragLeave(event)">
        <div class="upload-icon">${icon('upload')}</div>
        <div class="upload-text">Drag & drop file CSV di sini, atau <span class="upload-link" onclick="document.getElementById('file-input').click()">pilih file</span></div>
        <div class="upload-hint">Format: CSV • Maks 5MB</div>
        <input type="file" id="file-input" accept=".csv" style="display:none" onchange="handleFileSelect(event)">
      </div>
      ${uploadResult ? renderUploadResult() : ''}
      <div class="upload-template">
        ${icon('fileSpreadsheet', 16)}
        Format CSV: tanggal, tipe (MASUK/KELUAR), nama_produk, jumlah, harga_satuan
      </div>
    </div>
  `;
}

function renderUploadResult() {
  return `
    <div class="upload-result">
      ${icon('checkCircle')}
      <div>
        <div class="ok-title">Upload Berhasil!</div>
        <div class="ok-detail">${uploadResult.jumlah} transaksi berhasil diimport</div>
      </div>
    </div>
  `;
}

function handleDragOver(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('dropzone').classList.add('dragover');
}

function handleDragLeave(e) {
  e.preventDefault();
  document.getElementById('dropzone').classList.remove('dragover');
}

function handleDrop(e) {
  e.preventDefault();
  e.stopPropagation();
  document.getElementById('dropzone').classList.remove('dragover');
  let files = e.dataTransfer.files;
  if (files.length > 0) prosesFile(files[0]);
}

function handleFileSelect(e) {
  let files = e.target.files;
  if (files.length > 0) prosesFile(files[0]);
}

function prosesFile(file) {
  if (!file.name.endsWith('.csv')) {
    alert('Hanya file CSV yg didukung.');
    return;
  }

  // cek apakah PapaParse udh loaded
  if (typeof Papa === 'undefined') {
    alert('Library PapaParse belum dimuat.');
    return;
  }

  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,
    complete: function(results) {
      let count = 0;
      results.data.forEach(function(row) {
        // cari produk berdasarkan nama
        let produk = store.produk.find(function(p) {
          return p.nama.toLowerCase() === (row.nama_produk || '').toLowerCase();
        });

        if (!produk) return;

        let tipe = (row.tipe || 'MASUK').toUpperCase();
        let jumlah = parseInt(row.jumlah) || 0;
        let harga = parseInt(row.harga_satuan) || (tipe === 'MASUK' ? produk.hargaBeli : produk.hargaJual);

        if (jumlah <= 0) return;

        let tx = {
          id: buatId('t'),
          tanggal: row.tanggal ? new Date(row.tanggal).toISOString() : new Date().toISOString(),
          tipe: tipe,
          produkId: produk.id,
          produkNama: produk.nama,
          jumlah: jumlah,
          hargaSatuan: harga,
          total: jumlah * harga,
          metode: 'csv',
          catatan: 'Import dari CSV'
        };
        tambahTransaksi(tx);
        count++;
      });

      uploadResult = { jumlah: count };
      renderUploadModal();

      // refresh halaman transaksi klo lg di situ
      if (halamanSkrg === '#transaksi') {
        navigasi('#transaksi');
      }
    },
    error: function(err) {
      alert('Gagal parsing CSV: ' + err.message);
    }
  });
}
