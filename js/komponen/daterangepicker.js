/* =============================================
   daterangepicker.js — komponen date range picker custom
   Mirip Mantine UI DateRangePicker:
   - Single input field: "1 Jan 2026 – 5 Jan 2026"
   - Popup calendar dengan grid tanggal
   - Klik tanggal 1 = start, klik tanggal 2 = end
   - Range di-highlight biru muda
   ============================================= */

(function() {
  // ── Utilitas ──
  var HARI_SINGKAT = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  var BULAN_PANJANG = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function tglToStr(d) {
    if (!d) return '';
    return pad(d.getDate()) + ' ' + BULAN_PANJANG[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear();
  }

  function samaTgl(a, b) {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
  }

  function diantara(tgl, start, end) {
    if (!tgl || !start || !end) return false;
    var t = tgl.getTime(), s = start.getTime(), e = end.getTime();
    return t > Math.min(s, e) && t < Math.max(s, e);
  }

  function hariIni() {
    var d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }

  function toInputVal(d) {
    if (!d) return '';
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }

  // ── Buat satu instance DateRangePicker ──
  function DateRangePicker(opts) {
    // opts: { containerId, placeholder, onChange }
    this.containerId = opts.containerId;
    this.placeholder = opts.placeholder || 'Pilih rentang tanggal';
    this.onChange     = opts.onChange || function() {};
    this.startDate    = null;
    this.endDate      = null;
    this.hoverDate    = null;
    this.tampilBulan  = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    this.open         = false;
    this._init();
  }

  DateRangePicker.prototype._init = function() {
    var self = this;
    var container = document.getElementById(this.containerId);
    if (!container) return;

    container.innerHTML = '<div class="drp-wrapper">' +
      '<div class="drp-input" id="' + this.containerId + '-input" tabindex="0">' +
        '<span class="drp-input-icon"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg></span>' +
        '<span class="drp-input-text" id="' + this.containerId + '-text">' + this.placeholder + '</span>' +
        '<button class="drp-clear-btn" id="' + this.containerId + '-clear" style="display:none;" title="Reset">' +
          '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>' +
        '</button>' +
      '</div>' +
      '<div class="drp-popup" id="' + this.containerId + '-popup" style="display:none;">' +
        '<div class="drp-calendar" id="' + this.containerId + '-cal"></div>' +
      '</div>' +
    '</div>';

    // Buka/tutup saat klik input (listener di wrapper agar area klik lebih luas)
    var inputEl = document.getElementById(this.containerId + '-input');
    var wrapperEl = container.querySelector('.drp-wrapper');
    if (wrapperEl) {
      wrapperEl.addEventListener('click', function(e) {
        if (e.target.closest('.drp-clear-btn')) return;
        e.stopPropagation(); // cegah bubble ke document listener yang akan menutup popup
        self._togglePopup();
      });
    }

    // Tombol clear
    document.getElementById(this.containerId + '-clear').addEventListener('click', function(e) {
      e.stopPropagation();
      self._reset();
    });

    // Tutup saat klik di luar
    document.addEventListener('click', function(e) {
      var wrapper = container.querySelector('.drp-wrapper');
      if (wrapper && !wrapper.contains(e.target)) {
        self._closePopup();
      }
    });

    this._renderCalendar();
  };

  DateRangePicker.prototype._togglePopup = function() {
    this.open ? this._closePopup() : this._openPopup();
  };

  DateRangePicker.prototype._openPopup = function() {
    var popup = document.getElementById(this.containerId + '-popup');
    var inputEl = document.getElementById(this.containerId + '-input');
    if (!popup || !inputEl) return;
    this.open = true;
    popup.style.display = 'block';
    this._renderCalendar();

    // Posisi smart: hitung apakah buka ke bawah atau ke atas
    var rect = inputEl.getBoundingClientRect();
    var popupH = popup.offsetHeight || 300;
    var popupW = popup.offsetWidth || 280;
    var spaceBelow = window.innerHeight - rect.bottom - 8;
    var spaceAbove = rect.top - 8;
    var top, left;

    if (spaceBelow >= popupH || spaceBelow >= spaceAbove) {
      top = rect.bottom + 6;
    } else {
      top = rect.top - popupH - 6;
    }

    // Pastikan tidak keluar kanan layar
    left = rect.left;
    if (left + popupW > window.innerWidth - 8) {
      left = window.innerWidth - popupW - 8;
    }
    if (left < 8) left = 8;

    popup.style.top  = top + 'px';
    popup.style.left = left + 'px';
  };

  DateRangePicker.prototype._closePopup = function() {
    var popup = document.getElementById(this.containerId + '-popup');
    if (!popup) return;
    this.open = false;
    popup.style.display = 'none';
  };

  DateRangePicker.prototype._reset = function() {
    this.startDate = null;
    this.endDate   = null;
    this.hoverDate = null;
    this._updateInput();
    this._renderCalendar();
    this.onChange('', '');
  };

  DateRangePicker.prototype._updateInput = function() {
    var textEl  = document.getElementById(this.containerId + '-text');
    var clearEl = document.getElementById(this.containerId + '-clear');
    var inputEl = document.getElementById(this.containerId + '-input');

    if (this.startDate && this.endDate) {
      textEl.textContent  = tglToStr(this.startDate) + ' – ' + tglToStr(this.endDate);
      textEl.style.color  = 'var(--slate-900)';
      clearEl.style.display = 'flex';
      if (inputEl) inputEl.classList.add('drp-has-value');
    } else if (this.startDate) {
      textEl.textContent  = tglToStr(this.startDate) + ' – pilih tanggal akhir';
      textEl.style.color  = 'var(--slate-500)';
      clearEl.style.display = 'none';
      if (inputEl) inputEl.classList.add('drp-has-value');
    } else {
      textEl.textContent  = this.placeholder;
      textEl.style.color  = 'var(--slate-400)';
      clearEl.style.display = 'none';
      if (inputEl) inputEl.classList.remove('drp-has-value');
    }
  };

  DateRangePicker.prototype._renderCalendar = function() {
    var calEl = document.getElementById(this.containerId + '-cal');
    if (!calEl) return;
    var self = this;

    var bulan = this.tampilBulan.getMonth();
    var tahun = this.tampilBulan.getFullYear();

    // Header bulan
    var hariPertama = new Date(tahun, bulan, 1).getDay(); // 0=Min
    var jumlahHari  = new Date(tahun, bulan + 1, 0).getDate();

    var headerHtml = '<div class="drp-header">' +
      '<button class="drp-nav-btn" onclick="window._drp_prev(\'' + this.containerId + '\')">&#8249;</button>' +
      '<span class="drp-month-label">' + BULAN_PANJANG[bulan] + ' ' + tahun + '</span>' +
      '<button class="drp-nav-btn" onclick="window._drp_next(\'' + this.containerId + '\')">&#8250;</button>' +
    '</div>';

    // Baris nama hari
    var hariHtml = '<div class="drp-days-header">';
    HARI_SINGKAT.forEach(function(h) { hariHtml += '<span>' + h + '</span>'; });
    hariHtml += '</div>';

    // Grid tanggal
    var gridHtml = '<div class="drp-grid">';

    // Sel kosong sebelum hari pertama (mulai dari Min=0)
    for (var i = 0; i < hariPertama; i++) {
      gridHtml += '<span class="drp-day empty"></span>';
    }

    var today = hariIni();
    for (var d = 1; d <= jumlahHari; d++) {
      var tgl = new Date(tahun, bulan, d);
      var cls = ['drp-day'];

      if (samaTgl(tgl, today)) cls.push('drp-today');
      if (self.startDate && samaTgl(tgl, self.startDate)) cls.push('drp-selected', 'drp-start');
      if (self.endDate   && samaTgl(tgl, self.endDate))   cls.push('drp-selected', 'drp-end');

      // Range highlight
      var effEnd = self.endDate || self.hoverDate;
      if (self.startDate && effEnd && diantara(tgl, self.startDate, effEnd)) {
        cls.push('drp-in-range');
      }

      // Weekend (0=Min, 6=Sab)
      var dow = tgl.getDay();
      if (dow === 0 || dow === 6) cls.push('drp-weekend');

      var iso = toInputVal(tgl);
      gridHtml += '<span class="' + cls.join(' ') + '" data-date="' + iso + '" onclick="window._drp_select(\'' + self.containerId + '\',\'' + iso + '\')" onmouseover="window._drp_hover(\'' + self.containerId + '\',\'' + iso + '\')">' + d + '</span>';
    }
    gridHtml += '</div>';

    calEl.innerHTML = headerHtml + hariHtml + gridHtml;
  };

  // ── Global handlers (dipanggil dari onclick inline) ──
  window._drp_instances = window._drp_instances || {};

  window._drp_prev = function(id) {
    var inst = window._drp_instances[id];
    if (!inst) return;
    inst.tampilBulan = new Date(inst.tampilBulan.getFullYear(), inst.tampilBulan.getMonth() - 1, 1);
    inst._renderCalendar();
  };

  window._drp_next = function(id) {
    var inst = window._drp_instances[id];
    if (!inst) return;
    inst.tampilBulan = new Date(inst.tampilBulan.getFullYear(), inst.tampilBulan.getMonth() + 1, 1);
    inst._renderCalendar();
  };

  window._drp_hover = function(id, iso) {
    var inst = window._drp_instances[id];
    if (!inst || !inst.startDate || inst.endDate) return;
    inst.hoverDate = new Date(iso);
    inst._renderCalendar();
  };

  window._drp_select = function(id, iso) {
    var inst = window._drp_instances[id];
    if (!inst) return;
    var tgl = new Date(iso);

    if (!inst.startDate || inst.endDate) {
      // Pilih start baru
      inst.startDate = tgl;
      inst.endDate   = null;
      inst.hoverDate = null;
    } else {
      // Pilih end
      if (tgl < inst.startDate) {
        // Jika end < start, swap
        inst.endDate   = inst.startDate;
        inst.startDate = tgl;
      } else {
        inst.endDate = tgl;
      }
      inst.hoverDate = null;
      // Tutup popup setelah memilih range
      setTimeout(function() { inst._closePopup(); }, 200);
      inst.onChange(toInputVal(inst.startDate), toInputVal(inst.endDate));
    }

    inst._updateInput();
    inst._renderCalendar();
  };

  // ── API publik ──
  window.buatDateRangePicker = function(opts) {
    var inst = new DateRangePicker(opts);
    window._drp_instances[opts.containerId] = inst;
    return inst;
  };

  // Helper: dapatkan nilai start/end dari instance
  window.getDrpValue = function(id) {
    var inst = window._drp_instances[id];
    if (!inst) return { start: '', end: '' };
    return {
      start: inst.startDate ? toInputVal(inst.startDate) : '',
      end:   inst.endDate   ? toInputVal(inst.endDate)   : ''
    };
  };

  window.resetDrp = function(id) {
    var inst = window._drp_instances[id];
    if (inst) inst._reset();
  };
})();
