/* =============================================
   chatbot.js — panel chatbot AI
   logic jawab() identik dgn versi react
   ============================================= */

function toggleChatbot() {
  if (store && store.user && store.user.role === 'superadmin') {
    let fab = document.getElementById('chatbot-fab-container');
    if (fab) fab.style.display = 'none';
    let panel = document.getElementById('chatbot-panel');
    if (panel) panel.classList.add('hidden');
    return;
  }
  let panel = document.getElementById('chatbot-panel');
  let fabContainer = document.getElementById('chatbot-fab-container');
  if (!panel) return;

  if (panel.classList.contains('hidden')) {
    panel.classList.remove('hidden');
    renderChatPanel();
    if (fabContainer) {
      fabContainer.classList.add('hidden');
    }
  } else {
    panel.classList.add('hidden');
    if (fabContainer) {
      fabContainer.classList.remove('hidden');
    }
  }
}

function renderChatPanel() {
  let panel = document.getElementById('chatbot-panel');
  if (!panel) return;

  panel.innerHTML = `
    <div class="chatbot-header">
      <div class="chatbot-header-left">
        <div class="chatbot-avatar">${icon('sparkles')}</div>
        <div>
          <div class="chatbot-name">Ledgerly AI</div>
          <div class="chatbot-status">Aktif • Asisten AI</div>
        </div>
      </div>
      <div class="chatbot-header-actions">
        <button type="button" class="chatbot-action-btn" onclick="konfirmasiHapusChat()" title="Hapus Riwayat Chat">${icon('trash')}</button>
        <button type="button" class="chatbot-close" onclick="toggleChatbot()">${icon('x')}</button>
      </div>
    </div>
    <div class="chatbot-messages" id="chat-messages">
      ${renderChatMessages()}
    </div>
    <div class="chatbot-quick">
      <button type="button" class="quick-btn" onclick="kirimChat('Berapa stok Aqua?')">Cek stok Aqua</button>
      <button type="button" class="quick-btn" onclick="kirimChat('Produk terlaris')">Produk terlaris</button>
      <button type="button" class="quick-btn" onclick="kirimChat('Stok rendah')">Stok rendah</button>
    </div>
    <div class="chatbot-input-area">
      <input class="chatbot-input" type="text" id="chat-input" placeholder="Ketik pesan..." onkeydown="if(event.key==='Enter')kirimDariInput()">
      <button type="button" class="chatbot-voice" id="chatbot-voice-btn" onclick="mulaiSuara()" title="Kirim lewat suara">${icon('mic')}</button>
      <button type="button" class="chatbot-send" onclick="kirimDariInput()">${icon('send')}</button>
    </div>
  `;

  // scroll ke bawah
  scrollChatBottom();
}

function renderChatMessages() {
  return store.chatMessages.map(function(m) {
    return `<div class="chat-bubble ${m.from}">${formatMarkdown(m.text)}</div>`;
  }).join('');
}

function scrollChatBottom() {
  let container = document.getElementById('chat-messages');
  if (container) {
    setTimeout(function() {
      container.scrollTop = container.scrollHeight;
    }, 100);
  }
}

function kirimDariInput() {
  let input = document.getElementById('chat-input');
  if (!input || !input.value.trim()) return;
  kirimChat(input.value.trim());
  input.value = '';
}

async function kirimChat(pesan) {
  // 1. Tambah pesan user ke panel chat
  tambahChatMsg({ from: 'user', text: pesan });
  renderChatPanel();

  // 2. Cek apakah ada command transaksi lokal (tambah stok)
  let localResponse = prosesChatLokal(pesan);
  if (localResponse) {
    setTimeout(function() {
      tambahChatMsg({ from: 'bot', text: localResponse });
      renderChatPanel();
    }, 500);
    return;
  }

  // 3. Jika bukan command, panggil Gemini AI dengan loading state
  tambahChatMsg({ from: 'bot', text: 'Ledgerly AI sedang memproses...' });
  renderChatPanel();

  let jawaban = await tanyaGeminiAI(pesan);
  
  // Ganti loading text dengan jawaban riil dari Gemini
  store.chatMessages[store.chatMessages.length - 1].text = jawaban;
  localStorage.setItem(dapatkanChatKey(), JSON.stringify(store.chatMessages));
  renderChatPanel();
}

function prosesChatLokal(pesan) {
  let lower = pesan.toLowerCase().trim();

  // Deteksi jenis aksi (tambah / kurang)
  let isTambah = lower.includes('tambah') || lower.includes('masuk');
  let isKurang = lower.includes('kurang') || lower.includes('keluar') || lower.includes('jual');

  if (!isTambah && !isKurang) return null;

  if (isTambah && isKurang) return null; // ambivalen

  let tipe = isTambah ? 'MASUK' : 'KELUAR';

  // Temukan angka jumlah di dalam pesan
  let matchNum = lower.match(/\d+/);
  if (!matchNum) return null; // Tidak ada jumlah stok

  let qty = parseInt(matchNum[0]);

  // Bersihkan pesan untuk mengekstrak kata kunci produk
  let clean = lower.replace(matchNum[0], ''); // hapus angka
  // Hapus kata kunci instruksi, unit, dan kata pengisi khas percakapan
  clean = clean.replace(/\b(tambah|tambahkan|stok|masuk|kurang|kurangi|kurangkan|keluar|jual|penjualan|sebanyak|unit|pcs|dong|ya|sih|kah|tolong|mohon|saja)\b/g, '');
  
  // Bersihkan spasi ganda
  let keyword = clean.replace(/\s+/g, ' ').trim();

  if (qty > 0 && keyword) {
    // 1. Cari kecocokan langsung (exact/substring)
    let produk = store.produk.find(function(p) {
      let namaLower = p.nama.toLowerCase();
      let skuLower = p.sku.toLowerCase();
      return namaLower.includes(keyword) || skuLower.includes(keyword) || keyword.includes(namaLower);
    });

    // 2. Jika tidak ada kecocokan langsung, gunakan pencarian fuzzy (levenshtein & anagram/typo)
    if (!produk) {
      produk = cariProdukTerdekat(keyword);
    }

    if (produk) {
      let harga = tipe === 'MASUK' ? produk.hargaBeli : produk.hargaJual;
      let tx = {
        id: buatId('t'),
        tanggal: new Date().toISOString(),
        tipe: tipe,
        produkId: produk.id,
        produkNama: produk.nama,
        jumlah: qty,
        hargaSatuan: harga,
        total: qty * harga,
        metode: 'manual', // standard method for chat tracking
        catatan: 'Tercatat otomatis via chatbot AI'
      };
      
      tambahTransaksi(tx);

      // Simpan perubahan ke riwayat obrolan di localStorage secara instan
      setTimeout(function() {
        localStorage.setItem(dapatkanChatKey(), JSON.stringify(store.chatMessages));
      }, 100);

      let actionText = tipe === 'MASUK' ? 'bertambah' : 'berkurang (penjualan)';
      let signText = tipe === 'MASUK' ? '+' : '-';
      let iconSign = tipe === 'MASUK' ? '✅' : '📦';

      return iconSign + ' **Berhasil!** Stok **' + produk.nama + '** ' + actionText + ' **' + signText + qty + ' unit**. Total stok sekarang: **' + produk.stok + ' unit**. Transaksi tercatat otomatis.';
    } else {
      return '❌ Produk dengan kata kunci **"' + keyword + '"** tidak ditemukan di katalog toko.';
    }
  }

  return null;
}

// Helper untuk mencari produk terdekat menggunakan Jarak Levenshtein & Anagram
function cariProdukTerdekat(keyword) {
  if (!keyword || keyword.length < 2) return null;
  let minDistance = 999;
  let closestProduct = null;

  store.produk.forEach(function(p) {
    let namaLower = p.nama.toLowerCase();
    
    // 1. Cek jarak Levenshtein secara keseluruhan
    let dist = levenshtein(keyword, namaLower);
    if (dist < minDistance) {
      minDistance = dist;
      closestProduct = p;
    }

    // 2. Cek kecocokan parsial kata kunci
    let kataKunciList = keyword.split(' ');
    let namaKataList = namaLower.split(' ');
    
    kataKunciList.forEach(function(k) {
      if (k.length > 2) {
        namaKataList.forEach(function(w) {
          // Cek kesamaan parsial atau anagram sederhana
          if (w.includes(k) || k.includes(w)) {
            minDistance = 0;
            closestProduct = p;
          }
          // Cek transposisi (typo 2 huruf berdekatan, misal telru -> telur)
          if (w.length === k.length) {
            let sortedW = w.split('').sort().join('');
            let sortedK = k.split('').sort().join('');
            if (sortedW === sortedK) {
              minDistance = 0;
              closestProduct = p;
            }
          }
        });
      }
    });
  });

  // Izinkan toleransi kesalahan ketik (typo)
  let maxAllowed = keyword.length <= 5 ? 2 : 4;
  if (minDistance <= maxAllowed) {
    return closestProduct;
  }
  return null;
}

// Algoritma hitung Jarak Levenshtein untuk mengukur selisih string
function levenshtein(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;
  let tmp;
  if (a.length > b.length) { tmp = a; a = b; b = tmp; }

  let row = Array(a.length + 1);
  for (let i = 0; i <= a.length; i++) {
    row[i] = i;
  }

  for (let i = 1; i <= b.length; i++) {
    let val = i;
    for (let j = 1; j <= a.length; j++) {
      let temp = b[i - 1] === a[j - 1] ? row[j - 1] : Math.min(row[j - 1] + 1, row[j] + 1, val + 1);
      row[j - 1] = val;
      val = temp;
    }
    row[a.length] = val;
  }

  return row[a.length];
}

async function tanyaGeminiAI(pesan) {
  // ambil api key gemini secara aman dr env biar gak kena leak pas di-push ke github
  let apiKey = '';
  if (typeof window !== 'undefined' && window.process && window.process.env && window.process.env.VITE_GEMINI_API_KEY) {
    apiKey = window.process.env.VITE_GEMINI_API_KEY;
  } else if (typeof process !== 'undefined' && process.env && process.env.VITE_GEMINI_API_KEY) {
    apiKey = process.env.VITE_GEMINI_API_KEY;
  }

  if (!apiKey) {
    return "Maaf, API Key Gemini belum dikonfigurasi. Silakan atur VITE_GEMINI_API_KEY di file .env terlebih dahulu.";
  }
  let url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

  // Format data produk sebagai konteks
  let produkContext = store.produk.map(function(p) {
    return '- SKU: ' + p.sku + ', Nama: ' + p.nama + ', Kategori: ' + p.kategori + ', Stok: ' + p.stok + ' unit (Min: ' + p.minStok + '), Modal: Rp' + p.hargaBeli + ', Jual: Rp' + p.hargaJual;
  }).join('\n');

  // Format 10 transaksi terakhir sebagai konteks
  let transaksiContext = store.transaksi.slice(0, 10).map(function(t) {
    return '- [' + t.tanggal.slice(0, 10) + '] ' + t.tipe + ': ' + t.produkNama + ' sebanyak ' + t.jumlah + ' unit (Total: Rp' + t.total + ')';
  }).join('\n');

  let prompt = "Anda adalah asisten AI profesional untuk Ledgerly, sistem manajemen inventaris dan keuangan UMKM Indonesia.\n"
    + "Tugas Anda adalah membantu pemilik toko menganalisis stok barang, memberikan rekomendasi restock, memberikan saran keuangan, atau menjawab pertanyaan bisnis.\n\n"
    + "Berikut adalah data inventaris toko saat ini:\n" + produkContext + "\n\n"
    + "Berikut adalah 10 transaksi terbaru:\n" + transaksiContext + "\n\n"
    + "Pertanyaan Pengguna: " + pesan + "\n\n"
    + "Jawablah dengan profesional, ramah, solutif, singkat padat (maksimal 2-3 paragraf), serta gunakan Bahasa Indonesia formal tanpa singkatan seperti yg, utk, dgn. Gunakan format markdown tebal (**) untuk poin penting dan angka rupiah.";

  try {
    let response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{ text: prompt }]
        }]
      })
    });

    let data = await response.json();
    if (data.candidates && data.candidates[0] && data.candidates[0].content && data.candidates[0].content.parts[0]) {
      return data.candidates[0].content.parts[0].text;
    } else {
      throw new Error("Response API tidak dikenal");
    }
  } catch (err) {
    console.error("Gagal memanggil API Gemini:", err.message);
    return "Maaf, asisten AI sedang mengalami gangguan koneksi. Silakan coba tanyakan kembali beberapa saat lagi.";
  }
}

// Parser markdown sederhana untuk chat bubble
function formatMarkdown(text) {
  if (!text) return '';
  // Convert **text** to <strong>text</strong>
  text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  // Convert *text* to <em>text</em>
  text = text.replace(/\*(.*?)\*/g, '<em>$1</em>');
  // Convert line breaks to <br>
  text = text.replace(/\n/g, '<br>');
  return text;
}

// Voice Input: Speech-to-Text via Web Speech API
let recognition = null;
let isListening = false;

function mulaiSuara() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    alert("Maaf, browser Anda tidak mendukung Speech Recognition (Perekam Suara). Gunakan Google Chrome.");
    return;
  }

  const micBtn = document.getElementById('chatbot-voice-btn');
  const chatInput = document.getElementById('chat-input');
  if (!chatInput) return;

  if (isListening) {
    if (recognition) recognition.stop();
    return;
  }

  recognition = new SpeechRecognition();
  recognition.lang = 'id-ID';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = function() {
    isListening = true;
    if (micBtn) {
      micBtn.classList.add('pulse-animation');
    }
    chatInput.placeholder = 'Mendengarkan suara Anda...';
  };

  recognition.onerror = function(event) {
    console.error("Speech recognition error", event.error);
    stopListening();
  };

  recognition.onend = function() {
    stopListening();
  };

  recognition.onresult = function(event) {
    const text = event.results[0][0].transcript;
    chatInput.value = text;
  };

  recognition.start();

  function stopListening() {
    isListening = false;
    if (micBtn) {
      micBtn.classList.remove('pulse-animation');
    }
    if (chatInput) {
      chatInput.placeholder = 'Ketik pesan...';
    }
  }
}

function konfirmasiHapusChat() {
  if (confirm("Apakah Anda yakin ingin menghapus seluruh riwayat percakapan ini?")) {
    localStorage.removeItem(dapatkanChatKey());
    store.chatMessages = [
      { from: 'bot', text: 'Halo! Saya asisten AI Ledgerly. Saya bisa bantu kamu:\n- Cek stok barang\n- Tambah stok masuk/keluar\n- Lihat produk terlaris\n\nSilakan tanya apa saja!' }
    ];
    renderChatPanel();
  }
}

// Menonaktifkan Chatbot AI secara total untuk akun Superadmin
document.addEventListener('DOMContentLoaded', function() {
  function checkSuperadminChatbot() {
    if (store && store.user && store.user.role === 'superadmin') {
      let fab = document.getElementById('chatbot-fab-container');
      if (fab) {
        fab.style.display = 'none';
      }
      let panel = document.getElementById('chatbot-panel');
      if (panel) {
        panel.style.display = 'none';
        panel.classList.add('hidden');
      }
    }
  }
  
  // Jalankan langsung setelah DOM load
  checkSuperadminChatbot();
  
  // Interval berkala untuk mengantisipasi sinkronisasi data Supabase pasca-login
  setTimeout(checkSuperadminChatbot, 100);
  setTimeout(checkSuperadminChatbot, 500);
  setTimeout(checkSuperadminChatbot, 1500);
});
