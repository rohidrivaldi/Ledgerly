/* =============================================
   chat-demo.js — simulasi chat Ledgerly AI di landing (infinite loop)
   - baca pesan asli dr HTML (#chat-demo-messages) sbg sumber, bukan hardcode
     di JS -> teks tetep ada di DOM utk SEO & fallback no-JS (CLS 0).
   - urutan staggered: balon user muncul -> jeda + indikator "mengetik" ->
     balon bot muncul -> ... -> jeda baca 4 detik -> fade out -> ulang.
   - animasi murni transform+opacity (GPU, 60fps, no reflow berat).
   - IntersectionObserver: loop cuma jalan saat section keliatan (hemat
     resource pas offscreen). hormati prefers-reduced-motion.
   ============================================= */
(function () {
  var box = document.getElementById('chat-demo-messages');
  if (!box) return;

  // snapshot pesan asli (role + html) dr DOM sblm dikosongin
  var sumber = [];
  var asli = box.querySelectorAll('.chat-msg');
  for (var i = 0; i < asli.length; i++) {
    sumber.push({
      role: asli[i].classList.contains('user') ? 'user' : 'bot',
      html: asli[i].innerHTML
    });
  }
  if (!sumber.length) return;

  var reducedMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // kalau user minta reduced motion: tampilkan statis apa adanya, gak usah loop.
  if (reducedMotion) return;

  box.classList.add('js-anim');

  var timers = [];
  var jalan = false;

  function clearTimers() {
    for (var i = 0; i < timers.length; i++) clearTimeout(timers[i]);
    timers = [];
  }
  function nanti(fn, ms) {
    var id = setTimeout(fn, ms);
    timers.push(id);
    return id;
  }

  // bikin elemen balon chat (belum tampil; class .show ditambah utk animasi masuk)
  function buatBalon(role, html) {
    var el = document.createElement('div');
    el.className = 'chat-msg ' + role;
    el.innerHTML = html;
    box.appendChild(el);
    // paksa reflow sekali biar transisi .show ke-trigger (bukan langsung jadi)
    void el.offsetWidth;
    el.classList.add('show');
    return el;
  }

  function buatTyping() {
    var el = document.createElement('div');
    el.className = 'chat-typing';
    el.setAttribute('aria-hidden', 'true');
    el.innerHTML = '<span></span><span></span><span></span>';
    box.appendChild(el);
    void el.offsetWidth;
    el.classList.add('show');
    return el;
  }

  // mainkan 1 siklus penuh, lalu jadwalkan ulang
  function mainkan() {
    if (!jalan) return;
    box.classList.remove('fading');
    box.innerHTML = '';

    var delay = 400;     // jeda awal sblm pesan pertama
    var idx = 0;

    function langkah() {
      if (!jalan) return;
      if (idx >= sumber.length) {
        // semua tampil -> jeda baca 4 detik -> fade out -> ulang
        nanti(function () {
          if (!jalan) return;
          box.classList.add('fading');
          nanti(mainkan, 600); // tunggu transisi fade (0.4s) baru restart
        }, 4000);
        return;
      }

      var pesan = sumber[idx];
      idx++;

      if (pesan.role === 'bot') {
        // bot: tampilkan "mengetik" dulu ~1.1s, baru balon bot muncul
        var typing = buatTyping();
        nanti(function () {
          if (!jalan) return;
          if (typing && typing.parentNode) typing.parentNode.removeChild(typing);
          buatBalon('bot', pesan.html);
          nanti(langkah, 1400); // jeda baca sblm pesan berikutnya
        }, 1100);
      } else {
        // user: langsung muncul, jeda dikit sblm bot "baca"
        buatBalon('user', pesan.html);
        nanti(langkah, 900);
      }
    }

    nanti(langkah, delay);
  }

  function mulai() {
    if (jalan) return;
    jalan = true;
    mainkan();
  }
  function stop() {
    jalan = false;
    clearTimers();
  }

  // cuma jalan saat section chat keliatan di viewport (hemat resource)
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      for (var i = 0; i < entries.length; i++) {
        if (entries[i].isIntersecting) mulai();
        else stop();
      }
    }, { threshold: 0.25 });
    io.observe(box);
  } else {
    mulai(); // fallback browser lama
  }
})();
