/* =============================================
   api/create-user.js — serverless (Vercel)
   Bikin akun pemilik baru (auth + profil) oleh superadmin.
   Pakai SERVICE_ROLE_KEY yg cuma ada di server (gak pernah ke browser).

   KEAMANAN (OWASP Broken Access Control):
   endpoint ini WAJIB verifikasi pemanggil = superadmin dulu, kalau gak
   siapa aja bisa hit /api/create-user & bikin akun. caranya: frontend
   kirim JWT admin di header Authorization, server verifikasi + cek role.
   ============================================= */

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!SUPABASE_URL || !SERVICE_ROLE) {
    return res.status(500).json({ error: 'Server belum dikonfigurasi (SERVICE_ROLE_KEY).' });
  }

  // ambil JWT pemanggil dr header Authorization
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Tidak ada token. Harus login sebagai superadmin.' });
  }

  try {
    // 1. verifikasi token -> dapat user pemanggil
    const meResp = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + token }
    });
    if (!meResp.ok) {
      return res.status(401).json({ error: 'Token tidak valid / kadaluarsa.' });
    }
    const me = await meResp.json();

    // 2. cek role pemanggil di tabel Users HARUS superadmin
    const roleResp = await fetch(
      SUPABASE_URL + '/rest/v1/Users?user_id=eq.' + me.id + '&select=role',
      { headers: { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + SERVICE_ROLE } }
    );
    const roleRows = await roleResp.json();
    const role = roleRows && roleRows[0] ? roleRows[0].role : null;
    if (role !== 'superadmin') {
      return res.status(403).json({ error: 'Akses ditolak. Hanya superadmin yang boleh menambah pemilik.' });
    }

    // 3. validasi input
    const { email, password, nama, bisnis, noTelp, paket } = req.body || {};
    if (!email || !password || !nama || !bisnis) {
      return res.status(400).json({ error: 'Email, password, nama, dan bisnis wajib diisi.' });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: 'Password minimal 8 karakter.' });
    }

    // 4. buat akun auth (email_confirm:true -> langsung aktif, gak perlu verifikasi email)
    //    user_metadata.created_by='admin' -> nandain ke trigger handle_new_user
    //    biar dia SKIP bikin profil otomatis. soalnya jalur admin ini insert
    //    profil sendiri di step 5 (dgn nama/bisnis/paket lengkap). tanpa flag ini
    //    trigger & step 5 bakal sama2 insert -> unique_violation -> akun gagal dibuat.
    const createResp = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: 'Bearer ' + SERVICE_ROLE,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ email: email, password: password, email_confirm: true, user_metadata: { created_by: 'admin' } })
    });
    const created = await createResp.json();
    if (!createResp.ok) {
      // mis. email udah kepake
      return res.status(createResp.status).json({ error: created.msg || created.error_description || 'Gagal membuat akun auth.' });
    }

    // 5. insert profil ke tabel Users (pakai user_id dr akun auth yg baru dibuat)
    const profilResp = await fetch(SUPABASE_URL + '/rest/v1/Users', {
      method: 'POST',
      headers: {
        apikey: SERVICE_ROLE,
        Authorization: 'Bearer ' + SERVICE_ROLE,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal'
      },
      body: JSON.stringify({
        user_id: created.id,
        email: email,
        nama: nama,
        bisnis: bisnis,
        noTelp: noTelp ? parseInt(noTelp) : null,
        role: 'pemilik',
        paket: paket || 'starter'
      })
    });
    if (!profilResp.ok) {
      // rollback: hapus akun auth biar gak jadi akun yatim
      await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + created.id, {
        method: 'DELETE',
        headers: { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + SERVICE_ROLE }
      });
      const perr = await profilResp.text();
      return res.status(profilResp.status).json({ error: 'Gagal simpan profil: ' + perr });
    }

    return res.status(200).json({ ok: true, user_id: created.id });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};
