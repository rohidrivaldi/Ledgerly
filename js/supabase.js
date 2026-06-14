/* =============================================
   supabase.js — inisialisasi client supabase
   ============================================= */

// Mengambil URL dan Anon Key dari variabel lingkungan yang disuntikkan oleh Vite
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY;

// Inisialisasi client (function dari Supabase Library)
const db = window.supabase.createClient(supabaseUrl, supabaseKey);

// Tempel ke window biar global akses di module lain
window.supabaseClient = db;

// -- fungsi autentikasi global --
async function login(email, password) {
  if (window.supabaseClient) {
    try {
      // authentikasi user pakai function signInWithPassword dari Supabase Library
      const { data, error } = await window.supabaseClient.auth.signInWithPassword({
        email: email,
        password: password
      });

      if (error) throw error;

      if (data && data.user) {
        // Ambil data profil pengguna dari tabel Users
        let { data: profil } = await window.supabaseClient
          .from('Users')
          .select('*')
          .eq('email', email)
          .maybeSingle();

        // cek masa aktif paket business: klo tgl_expired udh lewat, auto-balik ke starter.
        // ini nyegah bug akun nyangkut di "business sisa 0 hari" terus-terusan.
        let paketAktif = profil ? profil.paket : 'starter';
        let tglExpired = profil ? profil.tgl_expired : null;
        let statusLangganan = profil ? profil.status_langganan : null;
        if (paketAktif === 'business' && tglExpired && new Date(tglExpired) < new Date()) {
          paketAktif = 'starter';
          tglExpired = null;
          statusLangganan = null;
          // sinkronkan balik ke DB biar konsisten
          try {
            await window.supabaseClient.from('Users')
              .update({ paket: 'starter', tgl_expired: null, status_langganan: null })
              .eq('user_id', data.user.id);
          } catch (e) { /* abaikan, nanti ke-sync lagi */ }
        }

        const userData = {
          id: data.user.id,
          nama: profil ? profil.nama : 'Pemilik Toko',
          email: email,
          bisnis: profil ? profil.bisnis : 'Toko Sejahtera',
          role: profil ? profil.role : 'pemilik',
          paket: paketAktif,
          tglExpired: tglExpired,
          statusLangganan: statusLangganan,
          noTelp: profil ? profil.noTelp : null,
          tglDaftar: data.user.created_at
        };
        localStorage.setItem('ledgerly_user', JSON.stringify(userData));
        if (typeof store !== 'undefined') {
          store.user = userData;
        }
        return { ok: true };
      }
    } catch (err) {
      console.warn("Gagal melakukan login ke Supabase:", err.message);
      return { ok: false, pesan: err.message || 'Email atau kata sandi salah.' };
    }
  }
  return { ok: false, pesan: 'Layanan database cloud tidak tersedia.' };
}

async function register(email, password, nama, bisnis) {
  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient.auth.signUp({
        email: email,
        password: password
      });
      if (error) throw error;
      
      if (data && data.user) {
        // Sisipkan data profil pengguna baru ke tabel Users di database
        const { error: profileError } = await window.supabaseClient
          .from('Users')
          .insert({
            user_id: data.user.id,
            email: email,
            nama: nama,
            bisnis: bisnis,
            role: 'pemilik'
          });
        
        if (profileError) {
          console.warn("Gagal menyisipkan profil pengguna baru ke tabel Users:", profileError.message);
        }
        return { ok: true };
      }
    } catch (err) {
      console.warn("Gagal mendaftar ke Supabase:", err.message);
      return { ok: false, pesan: err.message || 'Pendaftaran gagal.' };
    }
  }
  return { ok: false, pesan: 'Layanan database cloud tidak tersedia.' };
}

// -- login pakai Google OAuth --
// cuma MEMULAI flow; browser bakal redirect ke google lalu balik ke login.html.
// gate "harus terdaftar" dicek pas balik di cekKembaliOAuth().
async function loginWithGoogle() {
  if (!window.supabaseClient) {
    return { ok: false, pesan: 'Layanan database cloud tidak tersedia.' };
  }
  try {
    const { error } = await window.supabaseClient.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.origin + '/login.html',
        queryParams: { prompt: 'select_account' } // selalu tampilin pemilih akun
      }
    });
    if (error) throw error;
    return { ok: true }; // sukses -> browser lagi redirect ke google
  } catch (err) {
    console.warn('Gagal memulai login Google:', err.message);
    return { ok: false, pesan: err.message || 'Gagal memulai login Google.' };
  }
}

// -- gate pendekatan X: dipanggil pas login.html dimuat --
// kalau ini hasil balik dr login Google: cuma email yg UDAH terdaftar (punya
// profil di tabel Users) yg boleh masuk. selainnya akun nyangkut dihapus + tolak.
// return { status: 'ok' | 'ditolak' | 'none' }
async function cekKembaliOAuth() {
  if (!window.supabaseClient) return { status: 'none' };
  // udah ada localStorage -> berarti udah login normal, bukan OAuth return
  if (localStorage.getItem('ledgerly_user')) return { status: 'none' };

  let session = null;
  try {
    const { data } = await window.supabaseClient.auth.getSession();
    session = data ? data.session : null;
  } catch (e) { return { status: 'none' }; }
  if (!session || !session.user) return { status: 'none' };

  const user = session.user;

  // gate dicek BY EMAIL ("email ini udah daftar?"), bukan by user_id, krn
  // identitas google bisa beda dr akun email/password kalau gak ke-link.
  let profil = null;
  try {
    const r = await window.supabaseClient
      .from('Users').select('*').eq('email', user.email).maybeSingle();
    profil = r.data;
  } catch (e) {}

  if (!profil) {
    // BELUM terdaftar -> tolak. hapus akun auth nyangkut + signOut.
    try {
      await fetch('/api/delete-orphan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + session.access_token }
      });
    } catch (e) {}
    try { await window.supabaseClient.auth.signOut(); } catch (e) {}
    return { status: 'ditolak' };
  }

  // terdaftar -> bangun userData (sama logika kaya login biasa, termasuk cek expired)
  let paketAktif = profil.paket || 'starter';
  let tglExpired = profil.tgl_expired || null;
  let statusLangganan = profil.status_langganan || null;
  if (paketAktif === 'business' && tglExpired && new Date(tglExpired) < new Date()) {
    paketAktif = 'starter';
    tglExpired = null;
    statusLangganan = null;
    try {
      await window.supabaseClient.from('Users')
        .update({ paket: 'starter', tgl_expired: null, status_langganan: null })
        .eq('user_id', profil.user_id);
    } catch (e) {}
  }

  const userData = {
    id: profil.user_id,
    nama: profil.nama || 'Pemilik Toko',
    email: profil.email,
    bisnis: profil.bisnis || 'Toko Saya',
    role: profil.role || 'pemilik',
    paket: paketAktif,
    tglExpired: tglExpired,
    statusLangganan: statusLangganan,
    noTelp: profil.noTelp || null,
    tglDaftar: user.created_at
  };
  localStorage.setItem('ledgerly_user', JSON.stringify(userData));
  if (typeof store !== 'undefined') store.user = userData;
  return { status: 'ok' };
}

async function resetPassword(email) {
  if (window.supabaseClient) {
    try {
      const { data, error } = await window.supabaseClient.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/login.html'
      });
      if (error) throw error;
      return { ok: true };
    } catch (err) {
      console.warn("Gagal mengirim reset password ke Supabase:", err.message);
      return { ok: false, pesan: err.message || 'Gagal mengirim email reset password.' };
    }
  }
  return { ok: false, pesan: 'Layanan database cloud tidak tersedia.' };
}
