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
    complete: async function(results) {
      let validRows = [];
      
      // 1. Validasi baris dan kumpulkan data
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

        validRows.push({
          produk: produk,
          tipe: tipe,
          jumlah: jumlah,
          hargaSatuan: harga,
          tanggal: row.tanggal ? new Date(row.tanggal).toISOString() : new Date().toISOString()
        });
      });

      if (validRows.length === 0) {
        alert('Tidak ada baris transaksi valid yang ditemukan di CSV.');
        return;
      }

      // 2. Kirim secara bulk jika terhubung ke Supabase
      if (window.supabaseClient) {
        try {
          // 2a. Siapkan insert bulk Transactions
          let txsToInsert = validRows.map(function(r) {
            return {
              isPenjualan: r.tipe === 'KELUAR',
              user_id: (store.user && store.user.id && store.user.id.length > 10) ? store.user.id : 'a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d',
              metode_id: 'b1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d', // default Cash
              catatan: 'Import dari CSV',
              created_at: r.tanggal
            };
          });

          const { data: insertedTxs, error: txErr } = await window.supabaseClient
            .from('Transactions')
            .insert(txsToInsert)
            .select();

          if (txErr) throw txErr;

          // 2b. Siapkan insert bulk Detail_Transactions
          let detailsToInsert = [];
          for (let i = 0; i < insertedTxs.length; i++) {
            let txData = insertedTxs[i];
            let r = validRows[i];
            detailsToInsert.push({
              transaction_id: txData.transaction_id,
              product_id: r.produk.id,
              jumlah: r.jumlah
            });
          }

          const { error: detErr } = await window.supabaseClient
            .from('Detail_Transactions')
            .insert(detailsToInsert);

          if (detErr) throw detErr;

          // 2c. Hitung akumulasi perubahan stok produk dan lakukan update
          let stokUpdates = {};
          validRows.forEach(function(r) {
            let p = r.produk;
            if (!stokUpdates[p.id]) {
              stokUpdates[p.id] = { id: p.id, stok: p.stok };
            }
            if (r.tipe === 'MASUK') {
              stokUpdates[p.id].stok += r.jumlah;
            } else {
              stokUpdates[p.id].stok -= r.jumlah;
            }
          });

          // Jalankan update stok secara paralel
          let updatePromises = Object.values(stokUpdates).map(function(u) {
            return window.supabaseClient
              .from('Products')
              .update({ current_stok: u.stok })
              .eq('product_id', u.id);
          });

          await Promise.all(updatePromises);

          // 2d. Sinkronisasi ulang data di state local (hanya pemicu render 1 kali)
          await sinkronisasiSupabase();

        } catch (err) {
          console.error("Gagal melakukan bulk import ke Supabase:", err.message);
          alert("Gagal melakukan import ke database cloud: " + err.message);
          return;
        }
      } else {
        // Fallback offline/local state update (tanpa Supabase)
        let newLocalTxs = [];
        validRows.forEach(function(r) {
          let p = r.produk;
          if (r.tipe === 'MASUK') {
            p.stok += r.jumlah;
          } else {
            p.stok -= r.jumlah;
          }

          newLocalTxs.push({
            id: buatId('t'),
            tanggal: r.tanggal,
            tipe: r.tipe,
            produkId: p.id,
            produkNama: p.nama,
            jumlah: r.jumlah,
            hargaSatuan: r.hargaSatuan,
            total: r.jumlah * r.hargaSatuan,
            metode: 'csv',
            catatan: 'Import dari CSV (Offline)'
          });
        });

        // Update local state secara langsung untuk reaktivitas Proxy
        store.transaksi = [...newLocalTxs, ...store.transaksi];
        store.produk = [...store.produk];
        store.notifikasi = buatNotifikasi();
      }

      uploadResult = { jumlah: validRows.length };
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
