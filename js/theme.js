/* =============================================
   theme.js — toggle dark/light mode
   - baca preferensi dr localStorage ('ledgerly_theme'), DEFAULT light
     (gak ikut prefers-color-scheme sistem — sesuai permintaan).
   - wire SEMUA elemen .js-tema-toggle (landing punya 2: 1 desktop di header
     sebelah Masuk, 1 mobile sebelah hamburger). kalau gak ada satupun,
     bikin tombol floating pojok kiri-bawah (dipakai dashboard/login/register).
   - anti-FOUC: data-theme udh di-set inline di <head> sblm css ke-paint.
   ============================================= */
(function () {
  var KEY = 'ledgerly_theme';

  var ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  var ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';

  function temaSekarang() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function pasangIkonSemua() {
    var dark = temaSekarang() === 'dark';
    var ikon = dark ? ICON_SUN : ICON_MOON;
    var judul = dark ? 'Mode Terang' : 'Mode Gelap';
    var btns = document.querySelectorAll('.js-tema-toggle');
    for (var i = 0; i < btns.length; i++) {
      btns[i].innerHTML = ikon;
      btns[i].setAttribute('title', judul);
      btns[i].setAttribute('aria-label', judul);
    }
  }

  function setTema(mode) {
    if (mode === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem(KEY, mode); } catch (e) {}
  }

  function pasangTombol() {
    var btns = document.querySelectorAll('.js-tema-toggle');

    // kalau HTML gak nyediain tombol (dashboard/login/register), bikin floating
    if (!btns.length) {
      var fb = document.createElement('button');
      fb.className = 'tema-toggle js-tema-toggle';
      fb.type = 'button';
      document.body.appendChild(fb);
      btns = document.querySelectorAll('.js-tema-toggle');
    }

    pasangIkonSemua();

    for (var i = 0; i < btns.length; i++) {
      btns[i].addEventListener('click', function () {
        setTema(temaSekarang() === 'dark' ? 'light' : 'dark');
        pasangIkonSemua();
      });
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', pasangTombol);
  } else {
    pasangTombol();
  }
})();
