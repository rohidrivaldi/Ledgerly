/* =============================================
   api/delete-orphan.js — serverless (Vercel)
   Hapus akun auth "nyangkut" hasil login OAuth (Google) dari email yg
   BELUM terdaftar. Dipakai gate pendekatan X: kalau orang login Google
   tp emailnya gak punya profil di tabel Users, akun auth-nya kebuat tp
   gak boleh masuk -> frontend panggil endpoint ini buat ngebersihin.

   KEAMANAN:
   - pemanggil WAJIB sertakan JWT-nya sendiri (token sesi yg barusan kebuat).
   - endpoint cuma boleh hapus akun MILIK pemanggil itu sendiri (id dr token),
     gak bisa hapus akun orang lain.
   - DAN cuma hapus kalau akun itu beneran gak punya profil (orphan). kalau
     ternyata punya profil, TOLAK (jgn sampe ngehapus akun sah).
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

  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Tidak ada token.' });
  }

  try {
    // 1. verifikasi token -> dapat user pemanggil (id-nya dr token, bukan dr body,
    //    jadi gak bisa nipu buat hapus akun orang lain)
    const meResp = await fetch(SUPABASE_URL + '/auth/v1/user', {
      headers: { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + token }
    });
    if (!meResp.ok) {
      return res.status(401).json({ error: 'Token tidak valid / kadaluarsa.' });
    }
    const me = await meResp.json();
    if (!me || !me.id) {
      return res.status(401).json({ error: 'User tidak ditemukan dari token.' });
    }

    // 2. cek profil di tabel Users (service_role bypass RLS). HARUS kosong.
    const profilResp = await fetch(
      SUPABASE_URL + '/rest/v1/Users?user_id=eq.' + me.id + '&select=user_id',
      { headers: { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + SERVICE_ROLE } }
    );
    if (!profilResp.ok) {
      return res.status(500).json({ error: 'Gagal cek profil: ' + (await profilResp.text()) });
    }
    const rows = await profilResp.json();
    if (Array.isArray(rows) && rows.length > 0) {
      // akun ini PUNYA profil (sah) -> JANGAN dihapus.
      return res.status(409).json({ error: 'Akun terdaftar, tidak dihapus.' });
    }

    // 3. orphan terkonfirmasi -> hapus akun auth-nya
    const delResp = await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + me.id, {
      method: 'DELETE',
      headers: { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + SERVICE_ROLE }
    });
    if (!delResp.ok) {
      return res.status(delResp.status).json({ error: 'Gagal hapus akun: ' + (await delResp.text()) });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    return res.status(500).json({ error: 'Internal Server Error: ' + err.message });
  }
};
