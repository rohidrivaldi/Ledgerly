/* =============================================
   api/chatbot.js — serverless (Vercel)
   Proxy ke Gemini AI. API key Gemini cuma ada di server,
   gak pernah ke browser.

   KEAMANAN (OWASP A01 Broken Access Control / A07):
   endpoint ini WAJIB verifikasi pemanggil = user yg udh login dulu.
   klo gak, siapa aja bisa hit /api/chatbot tanpa akun & nguras kuota
   Gemini kita (biaya + bisa kena rate limit). caranya: frontend kirim
   JWT user di header Authorization, server verifikasi ke Supabase.
   ============================================= */

module.exports = async function handler(req, res) {
  // Hanya ijinkan method POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
  const ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY;

  // verifikasi token pemanggil dulu — harus user yg udh login.
  const authHeader = req.headers['authorization'] || '';
  const token = authHeader.replace(/^Bearer\s+/i, '');
  if (!token) {
    return res.status(401).json({ error: 'Tidak ada token. Harus login dulu.' });
  }
  if (SUPABASE_URL && ANON_KEY) {
    try {
      const meResp = await fetch(SUPABASE_URL + '/auth/v1/user', {
        headers: { apikey: ANON_KEY, Authorization: 'Bearer ' + token }
      });
      if (!meResp.ok) {
        return res.status(401).json({ error: 'Sesi tidak valid / kadaluarsa. Silakan login ulang.' });
      }
    } catch (e) {
      return res.status(401).json({ error: 'Gagal verifikasi sesi.' });
    }
  } else {
    // klo server belum dikonfigurasi, mending tolak drpd buka akses bebas
    return res.status(500).json({ error: 'Server belum dikonfigurasi (Supabase env).' });
  }

  const { prompt } = req.body;
  if (!prompt) {
    return res.status(400).json({ error: 'Prompt is required' });
  }

  // batasi panjang prompt biar gak dipake nge-abuse kuota dgn payload gede
  if (String(prompt).length > 8000) {
    return res.status(413).json({ error: 'Prompt terlalu panjang.' });
  }

  // Mengambil API Key secara aman dari environment variable server
  const apiKey = process.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'Gemini API Key is not configured on the server.' });
  }

  // Menggunakan streamGenerateContent untuk streaming real-time
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:streamGenerateContent?key=${apiKey}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt
              }
            ]
          }
        ]
      })
    });

    if (!response.ok) {
      const data = await response.json();
      return res.status(response.status).json(data);
    }

    // Set headers untuk chunked streaming response
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.setHeader('Transfer-Encoding', 'chunked');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value, { stream: true });
      res.write(chunk);
    }
    
    res.end();
  } catch (error) {
    return res.status(500).json({ error: `Internal Server Error: ${error.message}` });
  }
};
