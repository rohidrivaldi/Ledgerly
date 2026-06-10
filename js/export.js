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

// export transaksi ke excel dengan styling (xlsx-js-style)
function exportTransaksiExcel(daftarTx) {
  if (typeof XLSX === 'undefined') {
    alert('Library XLSX belum dimuat. Coba refresh halaman.');
    return;
  }

  // --- definisi warna & style ---
  var clrHeader  = { fgColor: { rgb: '4F46E5' } };   // indigo-600
  var clrRowEven = { fgColor: { rgb: 'EEF2FF' } };   // indigo-50 (biru muda)
  var clrRowOdd  = { fgColor: { rgb: 'FFFFFF' } };   // putih
  var clrTotal   = { fgColor: { rgb: 'E0E7FF' } };   // indigo-100
  var fontWhite  = { bold: true, color: { rgb: 'FFFFFF' }, sz: 11 };
  var fontNormal = { sz: 11, color: { rgb: '0F172A' } };
  var fontBold   = { bold: true, sz: 11, color: { rgb: '0F172A' } };
  var fontTotalVal = { bold: true, sz: 11, color: { rgb: '4F46E5' } };

  var borderThin = {
    top:    { style: 'thin',   color: { rgb: 'C7D2FE' } },
    bottom: { style: 'thin',   color: { rgb: 'C7D2FE' } },
    left:   { style: 'thin',   color: { rgb: 'C7D2FE' } },
    right:  { style: 'thin',   color: { rgb: 'C7D2FE' } }
  };
  var borderTotal = {
    top:    { style: 'medium', color: { rgb: '6366F1' } },
    bottom: { style: 'double', color: { rgb: '4F46E5' } },
    left:   { style: 'thin',   color: { rgb: 'C7D2FE' } },
    right:  { style: 'thin',   color: { rgb: 'C7D2FE' } }
  };

  var headerCols = ['Tanggal','Tipe','Produk','Jumlah','Harga Satuan','Total','Metode','Catatan'];
  var colLetters  = ['A','B','C','D','E','F','G','H'];

  // baris 1 = header
  var aoa = [headerCols];

  // baris data
  var totalJumlah = 0, totalTotal = 0;
  daftarTx.forEach(function(t) {
    aoa.push([
      formatTanggalWaktu(t.tanggal),
      t.tipe,
      t.produkNama,
      t.jumlah,
      t.hargaSatuan,
      t.total,
      t.metode,
      t.catatan || ''
    ]);
    totalJumlah += (t.jumlah   || 0);
    totalTotal  += (t.total    || 0);
  });

  // baris TOTAL di akhir
  aoa.push(['','','TOTAL', totalJumlah, '', totalTotal, '', '']);

  var ws = XLSX.utils.aoa_to_sheet(aoa);

  // --- styling setiap sel ---
  var totalRows = aoa.length;
  aoa.forEach(function(row, r) {
    var isHeader = (r === 0);
    var isTotal  = (r === totalRows - 1);
    var isEven   = (r % 2 === 1); // baris data genap (indeks 1,3,5…)

    row.forEach(function(_, c) {
      var cellRef = colLetters[c] + (r + 1);
      if (!ws[cellRef]) ws[cellRef] = { v: row[c] != null ? row[c] : '', t: 's' };

      var fill   = isHeader ? clrHeader : isTotal ? clrTotal : isEven ? clrRowEven : clrRowOdd;
      var font   = isHeader ? fontWhite  : isTotal ? (c === 2 ? fontBold : c === 3 || c === 5 ? fontTotalVal : fontNormal) : fontNormal;
      var border = isTotal ? borderTotal : borderThin;
      var align  = { horizontal: (c >= 3 && c <= 5) ? 'right' : 'left', vertical: 'center' };

      ws[cellRef].s = { fill: fill, font: font, border: border, alignment: align };

      // paksa tipe numerik untuk kolom angka
      if (!isHeader && !isTotal && (c === 3 || c === 4 || c === 5)) {
        ws[cellRef].t = 'n';
        ws[cellRef].v = row[c] || 0;
      }
    });
  });

  // --- lebar kolom ---
  ws['!cols'] = [
    { wch: 22 }, // Tanggal
    { wch: 10 }, // Tipe
    { wch: 28 }, // Produk
    { wch: 10 }, // Jumlah
    { wch: 16 }, // Harga Satuan
    { wch: 16 }, // Total
    { wch: 12 }, // Metode
    { wch: 32 }  // Catatan
  ];

  // --- auto-filter di baris header ---
  ws['!autofilter'] = { ref: 'A1:H1' };

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
