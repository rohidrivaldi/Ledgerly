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
