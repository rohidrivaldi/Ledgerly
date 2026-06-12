/* =============================================
   daterangepicker.js — komponen date range picker custom
   Mirip Mantine UI DateRangePicker:
   - Single input field: "1 Jan 2026 – 5 Jan 2026"
   - Popup calendar dengan grid tanggal
   - Klik tanggal 1 = start, klik tanggal 2 = end
   - Range di-highlight biru muda
   - Event delegation: listener di calEl, BUKAN inline onclick/onmouseover
   ============================================= */

(function() {
  // ── Utilitas ──
  var HARI_SINGKAT   = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
  var BULAN_PANJANG  = ['Januari','Februari','Maret','April','Mei','Juni',
                        'Juli','Agustus','September','Oktober','November','Desember'];

  function pad(n) { return n < 10 ? '0' + n : '' + n; }

  function tglToStr(d) {
    if (!d) return '';
    return pad(d.getDate()) + ' ' + BULAN_PANJANG[d.getMonth()].slice(0, 3) + ' ' + d.getFullYear();
  }

  function samaTgl(a, b) {
    if (!a || !b) return false;
    return a.getFullYear() === b.getFullYear() &&
           a.getMonth()    === b.getMonth()    &&
           a.getDate()     === b.getDate();
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

  // ── Constructor ──
  function DateRangePicker(opts) {
    this.containerId  = opts.containerId;
    this.placeholder  = opts.placeholder || 'Pilih rentang tanggal';
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

    // Bangun HTML struktur
    container.innerHTML =
      '<div class="drp-wrapper">' +
        '<div class="drp-input" id="' + this.containerId + '-input" tabindex="0">' +
          '<span class="drp-input-icon">' +
            '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' +
              '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>' +
              '<line x1="16" y1="2" x2="16" y2="6"/>' +
              '<line x1="8" y1="2" x2="8" y2="6"/>' +
              '<line x1="3" y1="10" x2="21" y2="10"/>' +
            '</svg>' +
          '</span>' +
          '<span class="drp-input-text" id="' + this.containerId + '-text">' + this.placeholder + '</span>' +
          '<button class="drp-clear-btn" id="' + this.containerId + '-clear" style="display:none;" title="Reset" type="button">' +
            '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round">' +
              '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>' +
            '</svg>' +
          '</button>' +
        '</div>' +
        '<div class="drp-popup" id="' + this.containerId + '-popup" style="display:none;">' +
          '<div class="drp-calendar" id="' + this.containerId + '-cal"></div>' +
        '</div>' +
      '</div>';

    var inputEl  = document.getElementById(this.containerId + '-input');
    var clearEl  = document.getElementById(this.containerId + '-clear');
    var popupEl  = document.getElementById(this.containerId + '-popup');
    var calEl    = document.getElementById(this.containerId + '-cal');
    var wrapperEl = container.querySelector('.drp-wrapper');

    // ── Buka/tutup saat klik input ──
    if (wrapperEl) {
      wrapperEl.addEventListener('click', function(e) {
        if (e.target.closest('.drp-clear-btn')) return;
        if (e.target.closest('.drp-popup')) return; // jangan toggle saat klik di popup
        e.stopPropagation();
        self._togglePopup();
      });
    }

    // ── Popup: stop semua event bubble ke document ──
    if (popupEl) {
      popupEl.addEventListener('click',     function(e) { e.stopPropagation(); });
      popupEl.addEventListener('mousedown', function(e) { e.stopPropagation(); });
    }

    // ── EVENT DELEGATION di calEl ──
    // Listener ini dipasang SEKALI dan bertahan meski calEl.innerHTML di-rebuild
    if (calEl) {
      // Klik pada tanggal atau tombol nav
      calEl.addEventListener('click', function(e) {
        e.stopPropagation();
        var dayEl = e.target.closest('[data-date]');
        var navEl = e.target.closest('[data-action]');
        if (dayEl && dayEl.dataset.date) {
          self._selectDay(dayEl.dataset.date);
        } else if (navEl) {
          var act = navEl.dataset.action;
          if (act === 'prev') {
            self.tampilBulan = new Date(self.tampilBulan.getFullYear(), self.tampilBulan.getMonth() - 1, 1);
            self._renderCalendar();
          } else if (act === 'next') {
            self.tampilBulan = new Date(self.tampilBulan.getFullYear(), self.tampilBulan.getMonth() + 1, 1);
            self._renderCalendar();
          }
        }
      });

      // Hover untuk preview range — update CLASS di tempat, JANGAN rebuild innerHTML.
      // krn klo rebuild pas hover, node tanggal kehapus di tengah mousedown->mouseup,
      // jadinya event click batal & tanggal akhir gabisa dipilih. ini bug lama.
      calEl.addEventListener('mouseover', function(e) {
        if (!self.startDate || self.endDate) return;
        var dayEl = e.target.closest('[data-date]');
        if (dayEl && dayEl.dataset.date) {
          self._previewRange(dayEl.dataset.date);
        }
      });

      calEl.addEventListener('mouseleave', function() {
        if (!self.startDate || self.endDate) return;
        self._previewRange(null);
      });
    }

    // ── Tombol clear ──
    if (clearEl) {
      clearEl.addEventListener('click', function(e) {
        e.stopPropagation();
        self._reset();
      });
    }

    // ── Tutup saat klik di luar ──
    document.addEventListener('click', function(e) {
      if (self.open) {
        var wrapper = container.querySelector('.drp-wrapper');
        if (wrapper && !wrapper.contains(e.target)) {
          self._closePopup();
        }
      }
    });

    this._renderCalendar();
  };

  // ── Toggle / Open / Close ──
  DateRangePicker.prototype._togglePopup = function() {
    this.open ? this._closePopup() : this._openPopup();
  };

  DateRangePicker.prototype._openPopup = function() {
    var popup  = document.getElementById(this.containerId + '-popup');
    var inputEl = document.getElementById(this.containerId + '-input');
    if (!popup || !inputEl) return;
    this.open = true;
    popup.style.display = 'block';
    this._renderCalendar();
    this._position();

    // Reposisi popup pas user scroll / resize biar gak lari kemana-mana.
    // popup-nya position:fixed jadi harus ngikut posisi input scr manual.
    // capture:true biar nangkep scroll di parent container juga (bukan cuma window)
    var self = this;
    this._onScrollResize = function() {
      if (self.open) self._position();
    };
    window.addEventListener('scroll', this._onScrollResize, true);
    window.addEventListener('resize', this._onScrollResize);
  };

  // ── Hitung & set posisi popup relatif ke input (atas/bawah sesuai ruang) ──
  DateRangePicker.prototype._position = function() {
    var popup   = document.getElementById(this.containerId + '-popup');
    var inputEl = document.getElementById(this.containerId + '-input');
    if (!popup || !inputEl) return;

    var rect     = inputEl.getBoundingClientRect();
    var popupH   = popup.offsetHeight || 300;
    var popupW   = popup.offsetWidth  || 280;
    var spaceBwl = window.innerHeight - rect.bottom - 8;
    var spaceAbs = rect.top - 8;
    var top, left;

    if (spaceBwl >= popupH || spaceBwl >= spaceAbs) {
      top = rect.bottom + 6;
    } else {
      top = rect.top - popupH - 6;
    }

    left = rect.left;
    if (left + popupW > window.innerWidth - 8) left = window.innerWidth - popupW - 8;
    if (left < 8) left = 8;

    popup.style.top  = top  + 'px';
    popup.style.left = left + 'px';
  };

  DateRangePicker.prototype._closePopup = function() {
    var popup = document.getElementById(this.containerId + '-popup');
    if (!popup) return;
    this.open = false;
    popup.style.display = 'none';

    // copot listener scroll/resize biar gak numpuk
    if (this._onScrollResize) {
      window.removeEventListener('scroll', this._onScrollResize, true);
      window.removeEventListener('resize', this._onScrollResize);
      this._onScrollResize = null;
    }
  };

  // ── Pilih tanggal ──
  DateRangePicker.prototype._selectDay = function(iso) {
    var tgl = new Date(iso);
    if (!this.startDate || this.endDate) {
      // Mulai range baru
      this.startDate = tgl;
      this.endDate   = null;
      this.hoverDate = null;
    } else {
      // Lengkapi range
      if (tgl < this.startDate) {
        this.endDate   = this.startDate;
        this.startDate = tgl;
      } else {
        this.endDate = tgl;
      }
      this.hoverDate = null;
      var self = this;
      setTimeout(function() { self._closePopup(); }, 150);
      this.onChange(toInputVal(this.startDate), toInputVal(this.endDate));
    }
    this._updateInput();
    this._renderCalendar();
  };

  // ── Reset ──
  DateRangePicker.prototype._reset = function() {
    this.startDate = null;
    this.endDate   = null;
    this.hoverDate = null;
    this._updateInput();
    this._renderCalendar();
    this.onChange('', '');
  };

  // ── Update teks input ──
  DateRangePicker.prototype._updateInput = function() {
    var textEl  = document.getElementById(this.containerId + '-text');
    var clearEl = document.getElementById(this.containerId + '-clear');
    var inputEl = document.getElementById(this.containerId + '-input');
    if (!textEl) return;

    if (this.startDate && this.endDate) {
      textEl.textContent    = tglToStr(this.startDate) + ' – ' + tglToStr(this.endDate);
      textEl.style.color    = 'var(--slate-900)';
      if (clearEl) clearEl.style.display = 'flex';
      if (inputEl) inputEl.classList.add('drp-has-value');
    } else if (this.startDate) {
      textEl.textContent    = tglToStr(this.startDate) + ' – pilih tanggal akhir';
      textEl.style.color    = 'var(--slate-500)';
      if (clearEl) clearEl.style.display = 'none';
      if (inputEl) inputEl.classList.add('drp-has-value');
    } else {
      textEl.textContent    = this.placeholder;
      textEl.style.color    = 'var(--slate-400)';
      if (clearEl) clearEl.style.display = 'none';
      if (inputEl) inputEl.classList.remove('drp-has-value');
    }
  };

  // ── Render kalender (hanya update innerHTML, listener di calEl tetap hidup) ──
  DateRangePicker.prototype._renderCalendar = function() {
    var calEl = document.getElementById(this.containerId + '-cal');
    if (!calEl) return;
    var self = this;

    var bulan       = this.tampilBulan.getMonth();
    var tahun       = this.tampilBulan.getFullYear();
    var hariPertama = new Date(tahun, bulan, 1).getDay(); // 0=Min
    var jumlahHari  = new Date(tahun, bulan + 1, 0).getDate();

    // Header — gunakan data-action, BUKAN onclick inline
    var headerHtml =
      '<div class="drp-header">' +
        '<button class="drp-nav-btn" data-action="prev" type="button">&#8249;</button>' +
        '<span class="drp-month-label">' + BULAN_PANJANG[bulan] + ' ' + tahun + '</span>' +
        '<button class="drp-nav-btn" data-action="next" type="button">&#8250;</button>' +
      '</div>';

    // Nama hari
    var hariHtml = '<div class="drp-days-header">';
    HARI_SINGKAT.forEach(function(h) { hariHtml += '<span>' + h + '</span>'; });
    hariHtml += '</div>';

    // Grid tanggal — gunakan data-date, BUKAN onclick inline
    var gridHtml = '<div class="drp-grid">';
    for (var i = 0; i < hariPertama; i++) {
      gridHtml += '<span class="drp-day empty"></span>';
    }

    var today  = hariIni();
    var effEnd = this.endDate || this.hoverDate;

    for (var d = 1; d <= jumlahHari; d++) {
      var tgl = new Date(tahun, bulan, d);
      var cls = ['drp-day'];

      if (samaTgl(tgl, today))               cls.push('drp-today');
      if (self.startDate && samaTgl(tgl, self.startDate)) cls.push('drp-selected', 'drp-start');
      if (self.endDate   && samaTgl(tgl, self.endDate))   cls.push('drp-selected', 'drp-end');
      if (effEnd && self.startDate && diantara(tgl, self.startDate, effEnd)) cls.push('drp-in-range');

      var dow = tgl.getDay();
      if (dow === 0 || dow === 6) cls.push('drp-weekend');

      var iso = toInputVal(tgl);
      // data-date dipakai oleh event delegation di calEl listener
      gridHtml += '<span class="' + cls.join(' ') + '" data-date="' + iso + '">' + d + '</span>';
    }
    gridHtml += '</div>';

    calEl.innerHTML = headerHtml + hariHtml + gridHtml;
  };

  // ── Preview range pas hover — cuma toggle class, GAK rebuild innerHTML ──
  // ini yg bikin klik tanggal akhir gak batal lagi
  DateRangePicker.prototype._previewRange = function(iso) {
    this.hoverDate = iso ? new Date(iso) : null;
    var calEl = document.getElementById(this.containerId + '-cal');
    if (!calEl) return;
    var effEnd = this.endDate || this.hoverDate;
    var self = this;
    calEl.querySelectorAll('.drp-day[data-date]').forEach(function(el) {
      var tgl = new Date(el.dataset.date);
      var inRange = effEnd && self.startDate && diantara(tgl, self.startDate, effEnd);
      el.classList.toggle('drp-in-range', !!inRange);
    });
  };

  // ── API publik ──
  window._drp_instances = window._drp_instances || {};

  window.buatDateRangePicker = function(opts) {
    // Cegah duplikasi: hapus instance lama kalau ada
    if (window._drp_instances[opts.containerId]) {
      var old = window._drp_instances[opts.containerId];
      if (old._closePopup) old._closePopup();
    }
    var inst = new DateRangePicker(opts);
    window._drp_instances[opts.containerId] = inst;
    return inst;
  };

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
