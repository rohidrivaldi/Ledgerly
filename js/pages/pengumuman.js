/* =============================================
   pengumuman.js — halaman pengumuman utk pemilik toko
   nampilin pengumuman dr admin + status saluran whatsapp
   ============================================= */

function initPengumuman() {
  renderStatusSaluran();
  renderDaftarPengumuman();
}

// status saluran whatsapp: klo admin udh isi link -> tampil tombol gabung.
// klo masih kosong -> placeholder "belum tersedia, silahkan ditunggu"
function renderStatusSaluran() {
  let ps = store.platformSettings || {};
  let link = (ps.wa_saluran || '').trim();

  let iconEl = document.getElementById('peng-saluran-icon');
  let descEl = document.getElementById('peng-saluran-desc');
  let aksiEl = document.getElementById('peng-saluran-aksi');
  let cardEl = document.getElementById('peng-saluran-card');
  if (!descEl) return;

  if (link) {
    // saluran tersedia
    if (cardEl) cardEl.classList.remove('peng-saluran-kosong');
    if (iconEl) {
      iconEl.innerHTML = icon('whatsapp', 22);
      iconEl.style.background = 'var(--emerald-50)';
      iconEl.style.color = 'var(--emerald-600)';
    }
    descEl.innerHTML = 'Saluran resmi sudah tersedia. Gabung untuk dapat info & promo terbaru.';
    if (aksiEl) {
      aksiEl.innerHTML = '<a href="' + link + '" target="_blank" class="btn btn-primary" style="white-space:nowrap; display:inline-flex; align-items:center; gap:6px;">'
        + icon('whatsapp', 16) + ' Gabung Saluran</a>';
    }
  } else {
    // saluran belum dibuat admin -> placeholder
    if (cardEl) cardEl.classList.add('peng-saluran-kosong');
    if (iconEl) {
      iconEl.innerHTML = icon('clock', 22);
      iconEl.style.background = 'var(--slate-100)';
      iconEl.style.color = 'var(--slate-400)';
    }
    descEl.innerHTML = 'Saluran WhatsApp belum tersedia / belum dibuat oleh admin. Silakan ditunggu, ya!';
    if (aksiEl) {
      aksiEl.innerHTML = '<span class="badge badge-neutral" style="white-space:nowrap;">Belum Tersedia</span>';
    }
  }
}

function renderDaftarPengumuman() {
  let listEl = document.getElementById('peng-list');
  if (!listEl) return;

  let data = store.pengumuman || [];
  if (data.length === 0) {
    listEl.innerHTML = '<div class="card" style="padding:40px; text-align:center; color:var(--slate-400);">'
      + icon('bell', 28) + '<div style="margin-top:10px; font-size:14px;">Belum ada pengumuman saat ini.</div></div>';
    return;
  }

  listEl.innerHTML = data.map(function(p) {
    let tgl = p.created_at ? formatTanggalWaktu(p.created_at) : '';
    // isi pengumuman pake textContent biar aman dr XSS (input dr admin)
    let isiAman = (p.isi || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\n/g, '<br>');
    let judulAman = (p.judul || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return '<div class="card peng-item">'
      + '<div class="peng-item-head">'
      + '<div class="peng-item-judul">' + judulAman + '</div>'
      + '<div class="peng-item-tgl">' + tgl + '</div>'
      + '</div>'
      + '<div class="peng-item-isi">' + isiAman + '</div>'
      + '</div>';
  }).join('');
}
