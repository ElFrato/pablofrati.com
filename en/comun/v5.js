(function () {
  'use strict';
  var d = document, root = d.documentElement;
  var bar = d.getElementById('v5-bar'); if (!bar) return;
  var ddWrap = bar.querySelector('.v5-casos'), ddB = d.getElementById('v5-casos-b'), dd = d.getElementById('v5-casos');
  var ctc = d.getElementById('v5-contacto'), scrim = d.getElementById('v5-scrim');
  var sheetMQ = matchMedia('(max-width: 860px), (hover: none) and (pointer: coarse)'), rm = matchMedia('(prefers-reduced-motion: reduce)');
  var FOC = 'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])';

  function focusables(el) { return [].slice.call(el.querySelectorAll(FOC)).filter(function (x) { return x.offsetParent !== null || x.getClientRects().length; }); }
  function show(el) { clearTimeout(el._v5t); el.hidden = false; void el.offsetWidth; el.classList.add('v5-open'); }
  function hide(el) {
    el.classList.remove('v5-open'); clearTimeout(el._v5t);
    el._v5t = setTimeout(function () { if (!el.classList.contains('v5-open')) el.hidden = true; }, rm.matches ? 0 : 260);
  }
  function hideNow(el) { clearTimeout(el._v5t); el.classList.remove('v5-open'); el.hidden = true; }
  function expand(el, on) { if (el && el.setAttribute) el.setAttribute('aria-expanded', on ? 'true' : 'false'); }
  function lenis(on) { var l = window.__lenis; if (!l) return; try { if (on) l.start(); else l.stop(); } catch (e) {} }
  function quieta(e) {
    if (!root.classList.contains('v5-lock')) return;
    var t = e.target && e.target.closest ? e.target : null;
    if (e.type === 'keydown') {
      if (!/^(PageUp|PageDown|Home|End|ArrowUp|ArrowDown| |Spacebar)$/.test(e.key)) return;
      if (t && t.closest('input, textarea, select, [contenteditable], .v5-dd') || (e.key === ' ' && t && t !== d.body && t !== root)) return;
    } else if (t && t.closest('.v5-ctc, .v5-dd')) return;
    if (e.cancelable) e.preventDefault();
  }
  function lock(on) {
    if (root.classList.contains('v5-lock') === on) return;
    root.classList.toggle('v5-lock', on);
    var f = on ? addEventListener : removeEventListener, o = { passive: false };
    f('wheel', quieta, o); f('touchmove', quieta, o); f('keydown', quieta);
  }

  function norm(p) { return p.replace(/index\.html$/, ''); }
  function samePage(a) {
    try { var u = new URL(a.getAttribute('href'), location.href); return u.origin === location.origin && norm(u.pathname) === norm(location.pathname) ? u : null; }
    catch (e) { return null; }
  }
  function goTo(u) {
    var id = u.hash ? decodeURIComponent(u.hash.slice(1)) : '', el = id && d.getElementById(id), y = 0;
    if (id && !el) return false;
    if (el) y = Math.max(0, Math.round(el.getBoundingClientRect().top + scrollY - (parseFloat(getComputedStyle(el).scrollMarginTop) || 0)));
    if (window.__lenis) { try { window.__lenis.scrollTo(y, { immediate: true, force: true }); } catch (e) {} }
    scrollTo({ top: y, behavior: 'auto' });
    return true;
  }
  function plainClick(e, a) { return !(e.defaultPrevented || e.button > 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || (a.target && a.target !== '_self')); }

  var ddOn = false, thumbs = false;
  function ddLinks() { return dd ? [].slice.call(dd.querySelectorAll('a[href]')) : []; }
  function eager() { if (thumbs || !dd) return; thumbs = true; dd.querySelectorAll('img[loading="lazy"]').forEach(function (im) { im.loading = 'eager'; }); }
  function ddOpen(first) {
    if (!dd || ddOn) { if (first && ddOn) ddLinks()[0].focus(); return; }
    ctcClose(false); eager(); ddOn = true; show(dd); expand(ddB, true);
    if (first) ddLinks()[0].focus();
  }
  function ddClose(back) {
    if (!ddOn) return; ddOn = false; hide(dd); expand(ddB, false);
    if (back) ddB.focus();
  }
  if (ddB && dd) {
    ddB.addEventListener('click', function () { if (ddOn) ddClose(false); else ddOpen(false); });
    ddB.addEventListener('pointerenter', eager); ddB.addEventListener('focus', eager);
    ddB.addEventListener('keydown', function (e) {
      if (e.key === 'ArrowDown') { e.preventDefault(); ddOpen(true); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); ddOpen(false); var l = ddLinks(); l[l.length - 1].focus(); }
    });
    dd.addEventListener('keydown', function (e) {
      var l = ddLinks(), i = l.indexOf(d.activeElement), n = -1;
      if (e.key === 'ArrowDown') n = i < 0 ? 0 : Math.min(l.length - 1, i + 1);
      else if (e.key === 'ArrowUp') n = i <= 0 ? -2 : i - 1;
      else if (e.key === 'Home') n = 0;
      else if (e.key === 'End') n = l.length - 1;
      else return;
      e.preventDefault();
      if (n === -2) ddB.focus(); else l[n].focus();
    });
    ddWrap.addEventListener('focusout', function (e) { if (ddOn && e.relatedTarget && !ddWrap.contains(e.relatedTarget)) ddClose(false); });
  }

  var layer = null, opener = null, pushed = false, pending = null;
  function modalOpen(el, from) {
    if (layer === el) return;
    ddClose(false); ctcClose(false); abClose(false);
    if (layer) hideNow(layer);
    else {
      opener = from || null; show(scrim); lock(true); lenis(false);
      if (!pushed) { try { history.pushState({ v5: 1 }, ''); pushed = true; } catch (e) {} }
    }
    layer = el; show(el);
    el.focus({ preventScroll: true });
  }
  function modalClose(viaBack) {
    if (!layer) return;
    var el = layer; layer = null;
    hide(el); hide(scrim); lock(false); lenis(true);
    d.querySelectorAll('[data-v5-contacto]').forEach(function (b) { expand(b, false); });
    if (pushed) { pushed = false; if (!viaBack) { history.back(); return finishLater(); } }
    finish();
  }
  function finishLater() {
    clearTimeout(finishLater.t); finishLater.t = setTimeout(finish, 400);
  }
  function finish() {
    clearTimeout(finishLater.t);
    var o = opener; opener = null;
    if (pending) { var u = pending; pending = null; if (u.same) goTo(u.url); else location.href = u.href; return; }
    if (o && o.focus && d.body.contains(o) && o.offsetParent !== null) o.focus({ preventScroll: true });
  }
  addEventListener('popstate', function () { if (layer) modalClose(true); else if (pending || opener) finish(); });
  if (scrim) scrim.addEventListener('click', function () { modalClose(false); });

  var ctcOn = false, ctcFrom = null;
  function ctcPlace(from) {
    var s = ctc.style;
    if (sheetMQ.matches || !from || !from.getBoundingClientRect) { s.position = s.top = s.left = s.right = s.zIndex = ''; return; }
    var r = from.getBoundingClientRect();
    if (bar.contains(from)) {
      s.position = 'fixed'; s.right = 'auto'; s.zIndex = '';
      s.top = Math.round(r.bottom + 12) + 'px'; s.left = Math.round(Math.max(16, r.right - ctc.offsetWidth)) + 'px';
      return;
    }
    s.position = 'absolute'; s.right = 'auto'; s.zIndex = '49';
    s.top = Math.round(r.bottom + scrollY + 8) + 'px';
    s.left = Math.round(Math.max(16, Math.min(r.left, innerWidth - ctc.offsetWidth - 16))) + 'px';
  }
  function ctcOpen(from) {
    if (!ctc) return;
    if (sheetMQ.matches) { ctcPlace(null); ctc.classList.add('v5-as-sheet'); ctc.setAttribute('aria-modal', 'true'); modalOpen(ctc, layer ? opener : from); expand(from, true); return; }
    ctc.classList.remove('v5-as-sheet'); ctc.removeAttribute('aria-modal');
    if (ctcOn && ctcFrom === from) { ctc.focus({ preventScroll: true }); return; }
    if (ctcOn) { expand(ctcFrom, false); ctcFrom = from || null; expand(from, true); ctcPlace(from); ctc.focus({ preventScroll: true }); return; }
    ddClose(false); ctcOn = true; ctcFrom = from || null;
    ctc.hidden = false; ctcPlace(from); show(ctc); expand(from, true);
    ctc.focus({ preventScroll: true });
  }
  addEventListener('resize', function () { if (ctcOn && ctcFrom) ctcPlace(ctcFrom); });
  function ctcClose(back) {
    if (!ctcOn) return; ctcOn = false; hide(ctc); expand(ctcFrom, false);
    if (back && ctcFrom) ctcFrom.focus({ preventScroll: true }); ctcFrom = null;
  }
  d.addEventListener('click', function (e) {
    var b = e.target.closest('[data-v5-contacto]');
    if (b) { e.preventDefault(); if (ctcOn && ctcFrom === b) ctcClose(false); else ctcOpen(b); return; }
    var x = e.target.closest('[data-v5-cerrar]');
    if (x) { if (layer && layer.contains(x)) modalClose(false); else if (ctcOn) ctcClose(true); return; }
    var c = e.target.closest('[data-v5-copiar]');
    if (c) { if (c.tagName === 'A') e.preventDefault(); copy(c); }
  });
  if (ctc) ctc.addEventListener('focusout', function (e) { if (ctcOn && e.relatedTarget && !ctc.contains(e.relatedTarget) && !e.relatedTarget.closest('[data-v5-contacto]')) ctcClose(false); });
  function copy(btn) {
    var box = btn.closest('.v5-ctc, .v5-pie') || ctc, m = btn.querySelector('[data-v5-mail]') || box.querySelector('[data-v5-mail]'), out = box.querySelector('.v5-copied');
    var txt = m ? m.textContent.trim() : '';
    var cp = btn.querySelector('.v5-cp') || box.querySelector('.v5-cp');
    function ok() {
      if (cp) { cp.classList.add('v5-ok'); clearTimeout(copy.c); copy.c = setTimeout(function () { cp.classList.remove('v5-ok'); }, 1600); }
      if (out) { out.textContent = 'Copied'; clearTimeout(copy.t); copy.t = setTimeout(function () { out.textContent = ''; }, 2000); }
    }
    function fallback() {
      if (!m) return; var r = d.createRange(); r.selectNodeContents(m);
      var s = getSelection(); s.removeAllRanges(); s.addRange(r); if (out) out.textContent = 'Selected';
    }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(txt).then(ok, fallback); else fallback(); } catch (e) { fallback(); }
  }

  var fab = d.getElementById('v5-fab'), ab = d.getElementById('v5-ab'), abOn = false, pieVis = false;
  function fabVer() {
    if (!fab || abOn) return;
    var v = !pieVis && !root.classList.contains('v5-oculta');
    fab.classList.toggle('v5-ver', v); fab.inert = !v;
  }
  function abOpen() {
    if (!fab || !ab || abOn) return;
    ddClose(false); ctcClose(false); if (layer) modalClose(false);
    abOn = true; clearTimeout(ab._t); ab.hidden = false;
    var r = fab.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, B = 24;
    [].forEach.call(ab.querySelectorAll('.v5-ab-b'), function (el, k) {
      var y = cy - (r.height / 2 + 12 + B) - k * (2 * B + 12);
      el.style.left = (cx - B) + 'px'; el.style.top = (y - B) + 'px';
      el.style.setProperty('--fx', '0px'); el.style.setProperty('--fy', (cy - y) + 'px');
    });
    lock(true); lenis(false);
    fab.inert = false; fab.classList.add('v5-abierto'); expand(fab, true); fab.setAttribute('aria-label', 'Close the contact panel');
    requestAnimationFrame(function () { requestAnimationFrame(function () { if (abOn) ab.classList.add('v5-abierto'); }); });
  }
  function abClose(back) {
    if (!abOn) return; abOn = false;
    ab.classList.remove('v5-abierto'); clearTimeout(ab._t);
    ab._t = setTimeout(function () { if (!ab.classList.contains('v5-abierto')) ab.hidden = true; }, rm.matches ? 0 : 380);
    fab.classList.remove('v5-abierto'); expand(fab, false); fab.setAttribute('aria-label', 'Contact');
    lock(false); lenis(true); fabVer();
    if (back) fab.focus({ preventScroll: true });
  }
  function abCopy(a) {
    var t = a.querySelector('.v5-ab-t'), out = ab.querySelector('.v5-copied'), m = a.getAttribute('href').replace(/^mailto:/, '');
    function ok() {
      a.classList.add('v5-ok'); if (t) t.textContent = 'Copied'; if (out) out.textContent = 'Copied';
      clearTimeout(a._c); a._c = setTimeout(function () { a.classList.remove('v5-ok'); if (t) t.textContent = m; if (out) out.textContent = ''; }, 1600);
    }
    function mailto() { location.href = a.href; }
    try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(m).then(ok, mailto); else mailto(); } catch (e) { mailto(); }
  }
  if (fab && ab) {
    fab.inert = true;
    fab.addEventListener('click', function () { if (abOn) abClose(false); else abOpen(); });
    ab.addEventListener('click', function (e) {
      if (e.target.classList.contains('v5-ab-velo')) { abClose(false); return; }
      var a = e.target.closest('a[href]'); if (!a) return;
      if (a.hasAttribute('data-v5-ab-copiar')) { e.preventDefault(); abCopy(a); return; }
      setTimeout(function () { abClose(false); }, 0);
    });
    var pie = d.querySelector('.v5-pie');
    if (pie && 'IntersectionObserver' in window) new IntersectionObserver(function (es) { pieVis = es[0].isIntersecting; fabVer(); }, { rootMargin: '0px 0px -15% 0px' }).observe(pie);
    addEventListener('scroll', fabVer, { passive: true }); addEventListener('resize', fabVer);
    fabVer();
  }

  var cel = matchMedia('(max-width: 860px), (hover: none) and (pointer: coarse)'), ultY = scrollY;
  function oculta(v) { if (root.classList.contains('v5-oculta') !== v) { root.classList.toggle('v5-oculta', v); fabVer(); } }
  addEventListener('scroll', function () {
    var y = scrollY;
    if (!cel.matches) oculta(false);
    else if (!ddOn && !ctcOn && !abOn && !layer) { if (y > ultY + 6 && y > 120) oculta(true); else if (y < ultY - 6 || y < 60) oculta(false); }
    ultY = y;
  }, { passive: true });
  bar.addEventListener('focusin', function () { oculta(false); });

  d.addEventListener('pointerdown', function (e) {
    var t = e.target;
    if (ddOn && !ddWrap.contains(t)) ddClose(false);
    if (ctcOn && !ctc.contains(t) && !t.closest('[data-v5-contacto]')) ctcClose(false);
  }, true);
  d.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') {
      if (layer) { e.preventDefault(); modalClose(false); }
      else if (abOn) { e.preventDefault(); abClose(true); }
      else if (ctcOn) { e.preventDefault(); ctcClose(true); }
      else if (ddOn) { e.preventDefault(); ddClose(true); }
      return;
    }
    if (e.key === 'Tab' && layer) {
      var f = focusables(layer); if (!f.length) { e.preventDefault(); return; }
      var a = f[0], z = f[f.length - 1], cur = d.activeElement;
      if (e.shiftKey && (cur === a || cur === layer || !layer.contains(cur))) { e.preventDefault(); z.focus(); }
      else if (!e.shiftKey && (cur === z || !layer.contains(cur))) { e.preventDefault(); a.focus(); }
    }
  });
  d.addEventListener('focusin', function (e) { if (layer && !layer.contains(e.target)) { var f = focusables(layer); (f[0] || layer).focus({ preventScroll: true }); } });

  bar.addEventListener('click', function (e) {
    var a = e.target.closest('a[href]'); if (!a || !plainClick(e, a)) return;
    var u = samePage(a); if (!u) return;
    e.preventDefault(); ddClose(false); goTo(u);
  });

  function reset() { ddClose(false); ctcClose(false); abClose(false); if (layer) modalClose(false); }
  if (sheetMQ.addEventListener) sheetMQ.addEventListener('change', reset); else if (sheetMQ.addListener) sheetMQ.addListener(reset);
  addEventListener('pageshow', function (e) { if (e.persisted) { [dd, ctc, scrim].forEach(function (x) { if (x) hideNow(x); }); ddOn = ctcOn = false; layer = null; pushed = false; lock(false); expand(ddB, false); abClose(false); fabVer(); } });
})();

(function () {
  'use strict';
  var d = document, imgs = [].slice.call(d.images);
  imgs.forEach(function (im) {
    if (im.complete && im.naturalWidth) return;
    im.classList.add('pf-wait');
    var off = function () { im.classList.remove('pf-wait'); };
    im.addEventListener('load', off, { once: true }); im.addEventListener('error', off, { once: true });
  });
  var lazy = imgs.filter(function (im) { return im.getAttribute('loading') === 'lazy'; });
  if (!lazy.length) return;
  if (!('IntersectionObserver' in window)) { lazy.forEach(function (im) { im.loading = 'eager'; }); return; }
  function host(im) {
    for (var e = im.parentElement; e && e !== d.body; e = e.parentElement) {
      var o = getComputedStyle(e).overflowX; if (o === 'auto' || o === 'scroll') return e;
    }
    return im;
  }
  var groups = new Map();
  lazy.forEach(function (im) { var h = host(im); if (!groups.has(h)) groups.set(h, []); groups.get(h).push(im); });
  var io = new IntersectionObserver(function (es) {
    es.forEach(function (en) {
      if (!en.isIntersecting) return;
      io.unobserve(en.target);
      (groups.get(en.target) || []).forEach(function (im) { if (im.getAttribute('loading') === 'lazy') im.loading = 'eager'; });
    });
  }, { rootMargin: '300% 0px 300% 0px' });
  groups.forEach(function (v, h) { io.observe(h); });
})();
