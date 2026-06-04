import { defineConfig, loadEnv } from 'vite'
import { resolve } from 'path'
import { cpSync } from 'fs'

// vite config buat multi-page app (MPA)
// krn kita punya 3 html: index, login, dasbor
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [
      {
        name: 'html-env-injection',
        transformIndexHtml(html) {
          return html.replace(
            '</head>',
            `  <script>
    window.process = {
      env: {
        VITE_SUPABASE_URL: ${JSON.stringify(env.VITE_SUPABASE_URL || '')},
        VITE_SUPABASE_ANON_KEY: ${JSON.stringify(env.VITE_SUPABASE_ANON_KEY || '')},
        VITE_GEMINI_API_KEY: ${JSON.stringify(env.VITE_GEMINI_API_KEY || '')}
      }
    };
  </script>
</head>`
          )
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
      }
    ],
    // aktifin folder public biar pages/ dan css/pages/ ke-load statis dgn mime type yg bener
    publicDir: 'public',
    define: {
      'process.env.VITE_SUPABASE_URL': JSON.stringify(env.VITE_SUPABASE_URL || ''),
      'process.env.VITE_SUPABASE_ANON_KEY': JSON.stringify(env.VITE_SUPABASE_ANON_KEY || ''),
      'process.env.VITE_GEMINI_API_KEY': JSON.stringify(env.VITE_GEMINI_API_KEY || ''),
      'process.env.VITE_WHATSAPP_API_URL': JSON.stringify(env.VITE_WHATSAPP_API_URL || ''),
      'process.env.VITE_WHATSAPP_TOKEN': JSON.stringify(env.VITE_WHATSAPP_TOKEN || '')
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
