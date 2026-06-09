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

// export laporan laba rugi ke EXCEL BERFORMULA DINAMIS (pakai exceljs).
// beda dgn xlsx biasa: cell Laba Kotor & Laba Bersih diisi FORMULA asli excel
// (mis. =B6-B7), jadi pas pemilik ubah angka Omzet/HPP di excel, hasilnya
// otomatis ke-recalc. cocok buat pembukuan yg dimodif manual.
async function exportLaporanExcel(ringkasan) {
  if (typeof ExcelJS === 'undefined') {
    alert('Library ExcelJS belum dimuat. Coba refresh halaman.');
    return;
  }

  var wb = new ExcelJS.Workbook();
  wb.creator = 'Ledgerly';
  var ws = wb.addWorksheet('Laba Rugi');

  ws.columns = [
    { width: 28 }, // A: posisi
    { width: 20 }  // B: jumlah
  ];

  // -- judul (row 1) + periode (row 2) --
  ws.mergeCells('A1:B1');
  var judul = ws.getCell('A1');
  judul.value = 'Laporan Laba Rugi - Ledgerly';
  judul.font = { bold: true, size: 14, color: { argb: 'FF4F46E5' } };
  judul.alignment = { vertical: 'middle' };
  ws.getRow(1).height = 24;

  ws.mergeCells('A2:B2');
  var periode = ws.getCell('A2');
  periode.value = 'Periode: ' + (ringkasan.periode || '-');
  periode.font = { size: 10, color: { argb: 'FF64748B' } };

  // -- header tabel (row 4) --
  var hRow = ws.getRow(4);
  hRow.getCell(1).value = 'Posisi';
  hRow.getCell(2).value = 'Jumlah (IDR)';
  hRow.eachCell(function(cell) {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF4F46E5' } };
    cell.alignment = { horizontal: cell.col === 2 ? 'right' : 'left' };
  });

  // -- baris data: row 5=Omzet, 6=HPP, 7=Laba Kotor, 8=Biaya, 9=Laba Bersih --
  // angka mentah dimasukin sbg value, yg turunan dimasukin sbg FORMULA
  ws.getCell('A5').value = 'Omzet (Pendapatan)';
  ws.getCell('B5').value = ringkasan.omzet || 0;

  ws.getCell('A6').value = 'Harga Pokok Penjualan (HPP)';
  ws.getCell('B6').value = ringkasan.hpp || 0;

  ws.getCell('A7').value = 'Laba Kotor';
  ws.getCell('B7').value = { formula: 'B5-B6' };          // <-- reaktif

  ws.getCell('A8').value = 'Biaya Operasional';
  ws.getCell('B8').value = ringkasan.biaya || 0;

  ws.getCell('A9').value = 'Laba Bersih';
  ws.getCell('B9').value = { formula: 'B7-B8' };          // <-- reaktif

  // format angka rupiah + style buat kolom B baris data
  for (var r = 5; r <= 9; r++) {
    var cellB = ws.getCell('B' + r);
    cellB.numFmt = '"Rp"#,##0';
    cellB.alignment = { horizontal: 'right' };
    // baris laba kotor & laba bersih ditebelin biar nonjol
    if (r === 7 || r === 9) {
      ws.getCell('A' + r).font = { bold: true };
      cellB.font = { bold: true, color: { argb: 'FF4F46E5' } };
      ws.getRow(r).eachCell(function(c) {
        c.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
      });
    }
  }

  // garis tepi tipis semua sel tabel
  for (var rr = 4; rr <= 9; rr++) {
    ['A', 'B'].forEach(function(col) {
      ws.getCell(col + rr).border = {
        top:    { style: 'thin', color: { argb: 'FFC7D2FE' } },
        bottom: { style: 'thin', color: { argb: 'FFC7D2FE' } },
        left:   { style: 'thin', color: { argb: 'FFC7D2FE' } },
        right:  { style: 'thin', color: { argb: 'FFC7D2FE' } }
      };
    });
  }

  // catatan kecil bahwa angka reaktif
  ws.mergeCells('A11:B11');
  var note = ws.getCell('A11');
  note.value = '* Sel Laba Kotor & Laba Bersih berisi formula otomatis. Ubah angka Omzet/HPP/Biaya, hasilnya ikut berubah.';
  note.font = { size: 9, italic: true, color: { argb: 'FF94A3B8' } };
  note.alignment = { wrapText: true };

  // generate buffer -> blob -> download
  try {
    var buf = await wb.xlsx.writeBuffer();
    var blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'laba-rugi-' + Date.now() + '.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  } catch (err) {
    alert('Gagal membuat file Excel: ' + err.message);
  }
}
