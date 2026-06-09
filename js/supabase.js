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

        const userData = {
          id: data.user.id,
          nama: profil ? profil.nama : 'Pemilik Toko',
          email: email,
          bisnis: profil ? profil.bisnis : 'Toko Sejahtera',
          role: profil ? profil.role : 'pemilik'
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
