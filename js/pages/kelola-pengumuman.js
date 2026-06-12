/* =============================================
   kelola-pengumuman.js — halaman superadmin
   CRUD pengumuman + atur link saluran whatsapp
   ============================================= */

function initKelolaPengumuman() {
  let plus = document.getElementById('kp-plus-icon');
  if (plus) plus.innerHTML = icon('plus', 16);

  // isi input link saluran dr platform settings
  let inpSaluran = document.getElementById('kp-wa-saluran');
  if (inpSaluran) inpSaluran.value = (store.platformSettings && store.platformSettings.wa_saluran) || '';

  renderTabelPengumuman();
}

function renderTabelPengumuman() {
  let body = document.querySelector('#tabel-pengumuman tbody');
  let sub = document.getElementById('kp-subtitle');
  if (!body) return;

  let data = store.pengumuman || [];
  if (sub) sub.innerText = data.length + ' pengumuman aktif';

  if (data.length === 0) {
    body.innerHTML = '<tr><td colspan="5" class="text-center" style="padding:40px; color:var(--slate-400);">Belum ada pengumuman. Klik "Pengumuman Baru" untuk membuat.</td></tr>';
    return;
  }

  body.innerHTML = data.map(function(p) {
    let tgl = p.created_at ? formatTanggalWaktu(p.created_at) : '';
    let isiSingkat = (p.isi || '');
    if (isiSingkat.length > 60) isiSingkat = isiSingkat.slice(0, 60) + '...';
    // pakai textContent-safe: escape
    function esc(s) { return (s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
    return '<tr>'
      + '<td class="td-bold">' + esc(p.judul) + '</td>'
      + '<td style="color:var(--slate-500);">' + esc(isiSingkat) + '</td>'
      + '<td class="td-mono" style="font-size:12px; white-space:nowrap;">' + tgl + '</td>'
      + '<td class="text-center"><span class="badge badge-success">Aktif</span></td>'
      + '<td><div style="display:flex; justify-content:flex-end; gap:8px;">'
      + '<button class="btn btn-secondary btn-xs" onclick="bukaModalPengumuman(' + p.id + ')">' + icon('settings', 12) + ' Ubah</button>'
      + '<button class="btn btn-danger btn-xs" onclick="konfirmasiHapusPengumuman(' + p.id + ', \'' + esc(p.judul).replace(/'/g, "\\'") + '\')">' + icon('x', 12) + ' Hapus</button>'
      + '</div></td>'
      + '</tr>';
  }).join('');
}

// ====== SALURAN WA ======
async function simpanSaluranWA() {
  let inp = document.getElementById('kp-wa-saluran');
  let statusEl = document.getElementById('kp-saluran-status');
  let btn = document.getElementById('kp-btn-saluran');
  if (!inp || !window.supabaseClient) return;

  let link = inp.value.trim();
  // validasi sederhana: klo diisi harus url http(s)
  if (link && !/^https?:\/\/.+/.test(link)) {
    tampilStatusSaluran('Link harus diawali http:// atau https://', true);
    return;
  }

  btn.disabled = true; btn.textContent = 'Menyimpan...';
  try {
    const { error } = await window.supabaseClient
      .from('Platform_Settings')
      .upsert([{ key: 'wa_saluran', value: link }], { onConflict: 'key' });
    if (error) throw error;

    // update store lokal
    let ps = store.platformSettings || {};
    ps.wa_saluran = link;
    store.platformSettings = ps;
    tampilStatusSaluran(link ? 'Link saluran berhasil disimpan!' : 'Link saluran dikosongkan (status di pemilik: belum tersedia).', false);
  } catch (err) {
    tampilStatusSaluran('Gagal menyimpan: ' + err.message, true);
  } finally {
    btn.disabled = false; btn.textContent = 'Simpan Link';
  }
}

function tampilStatusSaluran(pesan, isError) {
  let el = document.getElementById('kp-saluran-status');
  if (!el) return;
  el.textContent = pesan;
  el.style.display = 'block';
  el.style.color = isError ? 'var(--rose-600)' : 'var(--emerald-600)';
  if (!isError) setTimeout(function() { if (el) el.style.display = 'none'; }, 3000);
}

// ====== MODAL TAMBAH/UBAH PENGUMUMAN ======
function bukaModalPengumuman(id) {
  tutupModalPengumuman();

  let target = (store.pengumuman || []).find(function(p) { return p.id === id; }) || {};
  let judulModal = id ? 'Ubah Pengumuman' : 'Pengumuman Baru';

  let html = '<div class="modal-overlay" id="modal-pengumuman" onclick="if(event.target.id===\'modal-pengumuman\') tutupModalPengumuman()">'
    + '<div class="modal-box" style="max-width:520px;">'
    + '<div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:18px; gap:12px;">'
    + '<div><div class="modal-title">' + judulModal + '</div>'
    + '<div class="modal-desc" style="margin-top:4px;">Pengumuman ini tampil di halaman Pengumuman semua pemilik toko.</div></div>'
    + '<button class="btn btn-secondary btn-xs" onclick="tutupModalPengumuman()">' + icon('x', 16) + '</button>'
    + '</div>'
    + '<form id="form-pengumuman" onsubmit="simpanPengumuman(event, ' + (id || 'null') + ')" style="display:flex; flex-direction:column; gap:14px;">'
    + '<div><label class="form-label">Judul</label>'
    + '<input class="form-input" type="text" id="pg-judul" value="' + (target.judul || '').replace(/"/g, '&quot;') + '" required maxlength="120" placeholder="Contoh: Fitur Baru Telah Hadir!"></div>'
    + '<div><label class="form-label">Isi Pengumuman</label>'
    + '<textarea class="form-input" id="pg-isi" rows="5" required style="resize:vertical;" placeholder="Tulis isi pengumuman di sini...">' + (target.isi || '').replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</textarea></div>'
    + '<div style="display:flex; justify-content:flex-end; gap:8px;">'
    + '<button type="button" class="btn btn-secondary" onclick="tutupModalPengumuman()">Batal</button>'
    + '<button type="submit" class="btn btn-primary">Simpan</button>'
    + '</div></form></div></div>';

  document.body.insertAdjacentHTML('beforeend', html);
}

function tutupModalPengumuman() {
  let m = document.getElementById('modal-pengumuman');
  if (m) m.remove();
}

async function simpanPengumuman(e, id) {
  e.preventDefault();
  let judul = document.getElementById('pg-judul').value.trim();
  let isi = document.getElementById('pg-isi').value.trim();
  if (!judul || !isi || !window.supabaseClient) return;

  try {
    if (id) {
      const { error } = await window.supabaseClient
        .from('Pengumuman').update({ judul: judul, isi: isi }).eq('id', id);
      if (error) throw error;
    } else {
      const { error } = await window.supabaseClient
        .from('Pengumuman').insert({ judul: judul, isi: isi, is_aktif: true });
      if (error) throw error;
    }
    tutupModalPengumuman();
    await muatUlangPengumuman();
  } catch (err) {
    alert('Gagal menyimpan pengumuman: ' + err.message);
  }
}

function konfirmasiHapusPengumuman(id, judul) {
  konfirmasiUI({
    judul: 'Hapus pengumuman?',
    pesan: 'Pengumuman "' + judul + '" akan dihapus permanen dan tidak lagi tampil di halaman pemilik.',
    teksYa: 'Ya, Hapus',
    onYa: function() { hapusPengumuman(id); }
  });
}

async function hapusPengumuman(id) {
  if (!window.supabaseClient) return;
  try {
    const { error } = await window.supabaseClient.from('Pengumuman').delete().eq('id', id);
    if (error) throw error;
    await muatUlangPengumuman();
  } catch (err) {
    alert('Gagal menghapus: ' + err.message);
  }
}

// ambil ulang pengumuman dr DB lalu re-render tabel
async function muatUlangPengumuman() {
  try {
    const { data } = await window.supabaseClient
      .from('Pengumuman').select('*').eq('is_aktif', true).order('created_at', { ascending: false });
    store.pengumuman = data || [];
  } catch (e) {}
  renderTabelPengumuman();
}
