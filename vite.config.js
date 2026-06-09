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
            // baca body JSON
            let body = '';
            req.on('data', function(c) { body += c; });
            req.on('end', async function() {
              try {
                let prompt = '';
                try { prompt = JSON.parse(body || '{}').prompt || ''; } catch (e) {}
                if (!prompt) { res.statusCode = 400; res.end('Prompt is required'); return; }

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
