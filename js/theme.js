/* =============================================
   theme.js — toggle dark/light mode
   - baca preferensi dr localStorage ('ledgerly_theme')
   - bikin tombol floating (pojok kiri bawah) dgn ikon matahari/bulan
   - anti-FOUC: data-theme udh di-set inline di <head> sblm css ke-paint,
     file ini cuma ngurus tombol + ganti tema pas diklik.
   ============================================= */
(function () {
  var KEY = 'ledgerly_theme';

  // ikon inline (gak gantung file icon app, biar jalan di landing & dashboard)
  var ICON_MOON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z"/></svg>';
  var ICON_SUN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41"/></svg>';

  function temaSekarang() {
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light';
  }

  function pasangIkon(btn) {
    // klo lagi dark, tampilin ikon matahari (artinya: klik utk terang). sebaliknya.
    btn.innerHTML = temaSekarang() === 'dark' ? ICON_SUN : ICON_MOON;
    btn.setAttribute('title', temaSekarang() === 'dark' ? 'Mode Terang' : 'Mode Gelap');
    btn.setAttribute('aria-label', btn.getAttribute('title'));
  }

  function setTema(mode) {
    if (mode === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
    else document.documentElement.removeAttribute('data-theme');
    try { localStorage.setItem(KEY, mode); } catch (e) {}
  }

  function buatTombol() {
    if (document.getElementById('tema-toggle-btn')) return; // jgn dobel
    var btn = document.createElement('button');
    btn.id = 'tema-toggle-btn';
    btn.className = 'tema-toggle';
    btn.type = 'button';
    pasangIkon(btn);
    btn.addEventListener('click', function () {
      setTema(temaSekarang() === 'dark' ? 'light' : 'dark');
      pasangIkon(btn);
    });
    document.body.appendChild(btn);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', buatTombol);
  } else {
    buatTombol();
  }
})();
