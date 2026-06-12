/* =============================================
   pengaturan-platform.js — halaman superadmin
   atur wa.me admin/cs + template pesan (global)
   ============================================= */

// isi form dr store.platformSettings
function initPengaturanPlatform() {
  let ps = store.platformSettings || {};
  let elAdmin = document.getElementById('ps-wa-admin');
  let elCs = document.getElementById('ps-wa-cs');
  let elPesanUp = document.getElementById('ps-pesan-upgrade');
  let elPesanCs = document.getElementById('ps-pesan-cs');

  if (elAdmin) elAdmin.value = ps.wa_admin || '';
  if (elCs) elCs.value = ps.wa_cs || '';
  if (elPesanUp) elPesanUp.value = ps.pesan_upgrade || '';
  if (elPesanCs) elPesanCs.value = ps.pesan_cs || '';

  // batasi input nomor cuma angka
  [elAdmin, elCs].forEach(function(el) {
    if (el) el.addEventListener('input', function() {
      this.value = this.value.replace(/[^0-9]/g, '');
    });
  });
}

async function simpanPlatformSettings(e) {
  e.preventDefault();
  let btn = document.getElementById('ps-btn-simpan');
  let statusEl = document.getElementById('ps-status');

  let waAdmin = (document.getElementById('ps-wa-admin').value || '').trim();
  let waCs = (document.getElementById('ps-wa-cs').value || '').trim();
  let pesanUp = (document.getElementById('ps-pesan-upgrade').value || '').trim();
  let pesanCs = (document.getElementById('ps-pesan-cs').value || '').trim();

  // validasi nomor wa: 10-15 digit, awalan 62
  function waValid(n) { return /^62[0-9]{8,13}$/.test(n); }
  if (!waValid(waAdmin) || !waValid(waCs)) {
    tampilStatusPS('Nomor WhatsApp harus diawali 62 dan 10-15 digit angka.', true);
    return;
  }
  if (!window.supabaseClient) return;

  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  try {
    // upsert tiap key. Platform_Settings = tabel key-value
    let rows = [
      { key: 'wa_admin', value: waAdmin },
      { key: 'wa_cs', value: waCs },
      { key: 'pesan_upgrade', value: pesanUp },
      { key: 'pesan_cs', value: pesanCs }
    ];
    const { error } = await window.supabaseClient
      .from('Platform_Settings')
      .upsert(rows, { onConflict: 'key' });

    if (error) throw error;

    // update store lokal biar langsung kepake tanpa reload
    store.platformSettings = { wa_admin: waAdmin, wa_cs: waCs, pesan_upgrade: pesanUp, pesan_cs: pesanCs };
    tampilStatusPS('Pengaturan berhasil disimpan!', false);
  } catch (err) {
    console.error('Gagal simpan platform settings:', err.message);
    tampilStatusPS('Gagal menyimpan: ' + err.message, true);
  } finally {
    btn.disabled = false;
    btn.textContent = 'Simpan Pengaturan';
  }
}

function tampilStatusPS(pesan, isError) {
  let el = document.getElementById('ps-status');
  if (!el) return;
  el.textContent = pesan;
  el.style.display = 'block';
  el.style.color = isError ? 'var(--rose-600)' : 'var(--emerald-600)';
  if (!isError) {
    setTimeout(function() { if (el) el.style.display = 'none'; }, 3000);
  }
}
