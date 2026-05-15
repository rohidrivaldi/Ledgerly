/* =============================================
   export.js — fungsi-fungsi utk ekspor data
   ke csv, excel, sama pdf
   ============================================= */

// export produk ke csv
function exportProdukCSV(daftarProduk) {
  var header = ['SKU', 'Nama', 'Kategori', 'Stok', 'Min Stok', 'Harga Beli', 'Harga Jual', 'Supplier'];
  var rows = daftarProduk.map(function(p) {
    return [p.sku, p.nama, p.kategori, p.stok, p.minStok, p.hargaBeli, p.hargaJual, p.supplier];
  });
  var csvContent = [header].concat(rows).map(function(r) {
    return r.map(csvEscape).join(',');
  }).join('\n');
  downloadFile('inventaris-' + Date.now() + '.csv', csvContent, 'text/csv');
}

// export transaksi ke csv
function exportTransaksiCSV(daftarTx) {
  var header = ['Tanggal', 'Tipe', 'Produk', 'Jumlah', 'Harga Satuan', 'Total', 'Metode', 'Catatan'];
  var rows = daftarTx.map(function(t) {
    return [
      formatTanggalWaktu(t.tanggal), t.tipe, t.produkNama, t.jumlah,
      t.hargaSatuan, t.total, t.metode, t.catatan || ''
    ];
  });
  var csv = [header].concat(rows).map(function(r) {
    return r.map(csvEscape).join(',');
  }).join('\n');
  downloadFile('transaksi-' + Date.now() + '.csv', csv, 'text/csv');
}

// export transaksi ke excel (pake SheetJS / xlsx)
function exportTransaksiExcel(daftarTx) {
  // cek dulu apakah XLSX library udh di-load
  if (typeof XLSX === 'undefined') {
    alert('Library XLSX belum dimuat. Coba refresh halaman.');
    return;
  }
  var rows = daftarTx.map(function(t) {
    return {
      'Tanggal': formatTanggalWaktu(t.tanggal),
      'Tipe': t.tipe,
      'Produk': t.produkNama,
      'Jumlah': t.jumlah,
      'Harga Satuan': t.hargaSatuan,
      'Total': t.total,
      'Metode': t.metode,
      'Catatan': t.catatan || ''
    };
  });
  var ws = XLSX.utils.json_to_sheet(rows);
  var wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Transaksi');
  XLSX.writeFile(wb, 'transaksi-' + Date.now() + '.xlsx');
}

// export laporan keuangan ke pdf
function exportLaporanKeuangan(ringkasan) {
  // cek dulu library jspdf
  if (typeof jspdf === 'undefined' && typeof window.jspdf === 'undefined') {
    alert('Library jsPDF belum dimuat.');
    return;
  }

  var jsPDF = window.jspdf.jsPDF;
  var doc = new jsPDF();

  doc.setFontSize(18);
  doc.text('Laporan Keuangan - Laba Rugi', 14, 18);

  doc.setFontSize(11);
  doc.setTextColor(100);
  doc.text('Periode: ' + ringkasan.periode, 14, 26);
  doc.text('Dihasilkan: ' + new Date().toLocaleString('id-ID'), 14, 32);

  doc.setTextColor(0);

  // pake autoTable plugin
  doc.autoTable({
    startY: 40,
    head: [['Posisi', 'Jumlah (IDR)']],
    body: [
      ['Omzet', formatRupiah(ringkasan.omzet)],
      ['Harga Pokok Penjualan', formatRupiah(ringkasan.hpp)],
      ['Laba Kotor', formatRupiah(ringkasan.labaKotor)],
      ['Biaya Operasional', formatRupiah(ringkasan.biaya)],
      ['Laba Bersih', formatRupiah(ringkasan.labaBersih)],
    ],
    theme: 'striped',
    headStyles: { fillColor: [79, 70, 229] },
  });

  doc.save('laporan-keuangan-' + Date.now() + '.pdf');
}
