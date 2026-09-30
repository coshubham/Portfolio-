/* theme.js — light / dark mode. Runs before first paint: reads ?theme=, then localStorage, default dark. */
(function () {
  var d = document.documentElement, q = new URLSearchParams(location.search).get('theme'), s = null;
  try { s = localStorage.getItem('theme'); } catch (e) {}
  var t = (q === 'light' || q === 'dark') ? q : ((s === 'light' || s === 'dark') ? s : 'dark');
  d.setAttribute('data-theme', t);
  if (q) { try { localStorage.setItem('theme', t); } catch (e) {} }
  function meta() { var m = document.querySelector('meta[name="theme-color"]'); if (m) m.content = d.getAttribute('data-theme') === 'light' ? '#f5f3ff' : '#110d2b'; }
  function bind() {
    var b = document.querySelector('.theme-toggle'); if (!b) return;
    function sync() { var l = d.getAttribute('data-theme') === 'light'; b.setAttribute('aria-pressed', l ? 'true' : 'false'); b.setAttribute('aria-label', l ? 'Switch to dark mode' : 'Switch to light mode'); meta(); }
    sync();
    b.addEventListener('click', function () { var n = d.getAttribute('data-theme') === 'light' ? 'dark' : 'light'; d.setAttribute('data-theme', n); try { localStorage.setItem('theme', n); } catch (e) {} sync(); });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind); else bind();
})();
