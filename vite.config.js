import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import { cpSync } from 'fs'

// vite config buat multi-page app (MPA)
// krn kita punya 3 html: index, login, dasbor
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')

  // versi build buat cache-busting otomatis (dipakai pas build/deploy).
  // di-stamp sekali per build jadi semua halaman seragam versinya
  const buildVersion = Date.now()

  return {
    plugins: [
      {
        name: 'html-env-injection',
        transformIndexHtml(html, ctx) {
          // 1. inject env ke window.process.
          // CATATAN KEAMANAN: cuma key publik yg boleh di sini.
          // Supabase anon/publishable key memang dirancang publik (dilindungi RLS).
          // VITE_GEMINI_API_KEY TIDAK di-inject ke client — itu rahasia, dipanggil
          // lewat proxy /api/chatbot (server-side) biar gak keliatan di Network/console.
          let out = html.replace(
            '</head>',
            `  <script>
    window.process = {
      env: {
        VITE_SUPABASE_URL: ${JSON.stringify(env.VITE_SUPABASE_URL || '')},
        VITE_SUPABASE_ANON_KEY: ${JSON.stringify(env.VITE_SUPABASE_ANON_KEY || '')}
      }
    };
  </script>
</head>`
          )

          // 2. auto cache-busting: ganti semua ?v=NN di tag script jadi versi otomatis.
          // jadi gak usah bump manual ?v=8 -> ?v=9 tiap edit js lagi.
          // dev: tiap reload dpt timestamp baru (browser gak nyimpen js basi).
          // build: satu versi per deploy, jadi tiap deploy user otomatis ambil js terbaru.
          let ver = (ctx && ctx.server) ? Date.now() : buildVersion
          out = out.replace(/\?v=\d+/g, '?v=' + ver)

          return out
        }
      },
      {
        // Copy folder js/ dan assets/ ke dist/ saat build
        // krn script kita bukan ES module, Vite gak bundle otomatis
        name: 'copy-static-folders',
        writeBundle() {
          cpSync(resolve(__dirname, 'js'), resolve(__dirname, 'dist/js'), { recursive: true })
          cpSync(resolve(__dirname, 'assets'), resolve(__dirname, 'dist/assets'), { recursive: true })
        }
      },
      {
        // Dev proxy buat /api/chatbot — biar pas `npm run dev` (localhost) pemanggilan
        // Gemini tetep lewat server (key gak keliatan di browser), sama persis kayak
        // serverless function Vercel di produksi. Jadi gak ada lagi direct-call yg bocorin key.
        name: 'dev-api-chatbot',
        configureServer(server) {
          server.middlewares.use('/api/chatbot', async function(req, res) {
            if (req.method !== 'POST') {
              res.statusCode = 405; res.end('Method Not Allowed'); return;
            }
            // verifikasi sesi user dulu (mirror api/chatbot.js produksi) — endpoint
            // gak boleh kebuka buat anon biar kuota Gemini gak di-abuse.
            let SUPABASE_URL = env.VITE_SUPABASE_URL;
            let ANON_KEY = env.VITE_SUPABASE_ANON_KEY;
            let token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
            if (!token) { res.statusCode = 401; res.end('Harus login dulu.'); return; }
            if (SUPABASE_URL && ANON_KEY) {
              try {
                let meR = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + token } });
                if (!meR.ok) { res.statusCode = 401; res.end('Sesi tidak valid.'); return; }
              } catch (e) { res.statusCode = 401; res.end('Gagal verifikasi sesi.'); return; }
            } else {
              res.statusCode = 500; res.end('Supabase env belum diset.'); return;
            }
            // baca body JSON
            let body = '';
            req.on('data', function(c) { body += c; });
            req.on('end', async function() {
              try {
                let prompt = '';
                try { prompt = JSON.parse(body || '{}').prompt || ''; } catch (e) {}
                if (!prompt) { res.statusCode = 400; res.end('Prompt is required'); return; }
                if (String(prompt).length > 8000) { res.statusCode = 413; res.end('Prompt terlalu panjang.'); return; }

                let apiKey = env.VITE_GEMINI_API_KEY;
                if (!apiKey) { res.statusCode = 500; res.end('Gemini API Key belum diset di .env'); return; }

                let url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=' + apiKey;
                let r = await fetch(url, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }] })
                });
                if (!r.ok) { res.statusCode = r.status; res.end(await r.text()); return; }

                res.setHeader('Content-Type', 'text/plain; charset=utf-8');
                let reader = r.body.getReader();
                let dec = new TextDecoder();
                while (true) {
                  let { done, value } = await reader.read();
                  if (done) break;
                  res.write(dec.decode(value, { stream: true }));
                }
                res.end();
              } catch (err) {
                res.statusCode = 500; res.end('Internal Server Error: ' + err.message);
              }
            });
          });
        }
      },
      {
        // Dev proxy buat /api/create-user — bikin akun pemilik (auth+profil) oleh
        // superadmin. SERVICE_ROLE key cuma di server. mirror api/create-user.js.
        name: 'dev-api-create-user',
        configureServer(server) {
          server.middlewares.use('/api/create-user', function(req, res) {
            if (req.method !== 'POST') { res.statusCode = 405; res.end('Method Not Allowed'); return; }
            var SUPABASE_URL = env.VITE_SUPABASE_URL;
            var SERVICE_ROLE = env.SUPABASE_SERVICE_ROLE_KEY;
            if (!SUPABASE_URL || !SERVICE_ROLE) { res.statusCode = 500; res.end(JSON.stringify({ error: 'SERVICE_ROLE_KEY belum diset di .env' })); return; }

            var token = (req.headers['authorization'] || '').replace(/^Bearer\s+/i, '');
            if (!token) { res.statusCode = 401; res.end(JSON.stringify({ error: 'Harus login superadmin.' })); return; }

            var body = '';
            req.on('data', function(c) { body += c; });
            req.on('end', async function() {
              function kirim(code, obj) { res.statusCode = code; res.setHeader('Content-Type', 'application/json'); res.end(JSON.stringify(obj)); }
              try {
                // verifikasi token -> user pemanggil
                var meR = await fetch(SUPABASE_URL + '/auth/v1/user', { headers: { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + token } });
                if (!meR.ok) return kirim(401, { error: 'Token tidak valid.' });
                var me = await meR.json();
                // cek role superadmin (service_role bypass RLS). klo balik kosong,
                // kemungkinan SERVICE_ROLE key salah (bukan service_role) -> RLS blok.
                var roleR = await fetch(SUPABASE_URL + '/rest/v1/Users?user_id=eq.' + me.id + '&select=role', { headers: { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + SERVICE_ROLE } });
                if (!roleR.ok) return kirim(500, { error: 'Gagal verifikasi role. Cek SUPABASE_SERVICE_ROLE_KEY (harus service_role, bukan anon). Detail: ' + (await roleR.text()) });
                var roleRows = await roleR.json();
                var roleVal = (Array.isArray(roleRows) && roleRows[0]) ? roleRows[0].role : null;
                if (roleVal !== 'superadmin') {
                  var petunjuk = roleVal ? '' : ' (role tdk ketemu — kemungkinan SERVICE_ROLE key salah, row keblok RLS)';
                  return kirim(403, { error: 'Akses ditolak. Hanya superadmin.' + petunjuk });
                }

                var d = {};
                try { d = JSON.parse(body || '{}'); } catch (e) {}
                if (!d.email || !d.password || !d.nama || !d.bisnis) return kirim(400, { error: 'Email, password, nama, bisnis wajib diisi.' });
                if (String(d.password).length < 8) return kirim(400, { error: 'Password minimal 8 karakter.' });
                // validasi nomor WA (mirror api/create-user.js): base 9-13 digit
                var waClean = String(d.noTelp == null ? '' : d.noTelp).replace(/[^0-9]/g, '');
                var waBase = waClean;
                if (waBase.indexOf('62') === 0) waBase = waBase.substring(2);
                else if (waBase.indexOf('0') === 0) waBase = waBase.substring(1);
                if (waBase.length < 9 || waBase.length > 13) return kirim(400, { error: 'Nomor WhatsApp tidak valid (harus 9-13 digit di luar kode negara).' });
                var noTelpClean = '62' + waBase;

                var cR = await fetch(SUPABASE_URL + '/auth/v1/admin/users', {
                  method: 'POST', headers: { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + SERVICE_ROLE, 'Content-Type': 'application/json' },
                  body: JSON.stringify({ email: d.email, password: d.password, email_confirm: true, user_metadata: { created_by: 'admin' } })
                });
                var created = await cR.json();
                if (!cR.ok) return kirim(cR.status, { error: created.msg || created.error_description || 'Gagal buat akun auth.' });

                var pR = await fetch(SUPABASE_URL + '/rest/v1/Users', {
                  method: 'POST', headers: { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + SERVICE_ROLE, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
                  body: JSON.stringify({ user_id: created.id, email: d.email, nama: d.nama, bisnis: d.bisnis, noTelp: parseInt(noTelpClean), role: 'pemilik', paket: d.paket || 'starter' })
                });
                if (!pR.ok) {
                  await fetch(SUPABASE_URL + '/auth/v1/admin/users/' + created.id, { method: 'DELETE', headers: { apikey: SERVICE_ROLE, Authorization: 'Bearer ' + SERVICE_ROLE } });
                  return kirim(pR.status, { error: 'Gagal simpan profil: ' + (await pR.text()) });
                }
                kirim(200, { ok: true, user_id: created.id });
              } catch (err) {
                kirim(500, { error: 'Internal Server Error: ' + err.message });
              }
            });
          });
        }
      }
    ],
    // aktifin folder public biar pages/ dan css/pages/ ke-load statis dgn mime type yg bener
    publicDir: 'public',
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || '')
    },
    build: {
      rollupOptions: {
        input: {
          main: resolve(__dirname, 'index.html'),
          login: resolve(__dirname, 'login.html'),
          register: resolve(__dirname, 'register.html'),
          dasbor: resolve(__dirname, 'dasbor.html'),
        },
      },
    },
    server: {
      port: 5173,
      open: true,
    },
  }
})
