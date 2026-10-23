(function () {
  'use strict';
  var d = document, raiz = d.documentElement, cuerpo = d.body;
  if (!cuerpo || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var cv = d.createElement('canvas'), gl = null;
  try { gl = cv.getContext('webgl', { preserveDrawingBuffer: true, antialias: false, alpha: false }); } catch (e) {}
  if (!gl) return;

  var VS = 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}';
  var FS = [
    '#ifdef GL_FRAGMENT_PRECISION_HIGH',
    'precision highp float;',
    '#else',
    'precision mediump float;',
    '#endif',
    'uniform vec2 u_res, u_gs; uniform float u_dpr, u_k, u_cell, u_off, u_r0; uniform vec3 u_page, u_mark; uniform sampler2D u_t;',
    'float h21(vec2 p){vec3 q=fract(vec3(p.xyx)*.1031);q+=dot(q,q.yzx+33.33);return fract((q.x+q.y)*q.z);}',
    'float T(vec2 p){return texture2D(u_t,vec2(p.x/u_cell/u_gs.x,(p.y/u_cell-u_r0)/u_gs.y)).r;}',
    'void main(){',
    ' vec2 fc=gl_FragCoord.xy; vec2 p=vec2(fc.x,u_res.y-fc.y)/u_dpr+vec2(0.,u_off);',
    ' float e=1./u_dpr; float h=T(p); vec2 g=vec2(T(p+vec2(e,0.))-h,T(p+vec2(0.,e))-h);',
    ' float a=1.-smoothstep(.5*u_dpr-.6,.5*u_dpr+.6,abs(h-.45)/max(length(g),1e-4));',
    ' gl_FragColor=vec4(mix(u_page,u_mark,a*.2*u_k)+(h21(fc+.5)-.5)/255.,1.);}'
  ].join('\n');
  function sh(t, s) { var o = gl.createShader(t); gl.shaderSource(o, s); gl.compileShader(o); if (!gl.getShaderParameter(o, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(o)); return o; }
  var pr = gl.createProgram();
  try { gl.attachShader(pr, sh(gl.VERTEX_SHADER, VS)); gl.attachShader(pr, sh(gl.FRAGMENT_SHADER, FS)); gl.linkProgram(pr); if (!gl.getProgramParameter(pr, gl.LINK_STATUS)) throw new Error('link'); }
  catch (err) { return; }
  gl.useProgram(pr);
  var buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  var loc = gl.getAttribLocation(pr, 'a'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  var U = {}; ['u_res', 'u_gs', 'u_dpr', 'u_k', 'u_cell', 'u_off', 'u_r0', 'u_page', 'u_mark', 'u_t'].forEach(function (n) { U[n] = gl.getUniformLocation(pr, n); });
  function rgb(v, def) { v = (v || '').trim(); if (!/^#[0-9a-f]{6}$/i.test(v)) v = def; return [1, 3, 5].map(function (i) { return parseInt(v.slice(i, i + 2), 16) / 255; }); }
  var cs = getComputedStyle(raiz);
  gl.uniform3fv(U.u_page, rgb(cs.getPropertyValue('--page'), '#E3E8EE')); gl.uniform3fv(U.u_mark, rgb(cs.getPropertyValue('--mark'), '#3B5BDB'));
  gl.uniform1i(U.u_t, 0);
  var tex = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  var caja = d.createElement('div');
  caja.setAttribute('aria-hidden', 'true');
  caja.style.cssText = 'position:absolute;inset:0;z-index:-1;overflow:hidden;overflow:clip;pointer-events:none';
  cv.style.cssText = 'position:absolute;left:0;top:0;display:block;width:100%;height:0';
  caja.appendChild(cv);
  cuerpo.style.position = 'relative';
  cuerpo.insertBefore(caja, cuerpo.firstChild);

  var CELDA = 3, WMAX = 854, F = .029, K = .057, RADIO = 6, BANDA = 40, MARGEN = 500, DENS = 1 / 800, FORMA = 2600, RELLENO = 900;
  var INT = .25, VEL = 200;
  var conMouse = matchMedia('(hover: hover) and (pointer: fine)');
  var G = null, docH = 0, andando = false, mouse = null, previo = null, acum = 0, tPrev = 0, ocupadoHasta = 0;
  var win = { top: 0, h: 0, r0: 0, rows: 0 }, tmp = { A: null, B: null };
  function azar(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function alto() { return Math.max(cuerpo.offsetHeight, innerHeight); }
  function ocupar() { ocupadoHasta = performance.now() + 300; }

  function nueva() {
    var dw = raiz.clientWidth, c = Math.max(CELDA, dw / WMAX), W = Math.ceil(dw / c);
    docH = alto();
    var H = Math.ceil(docH / c), n = W * H, nb = Math.ceil(H / BANDA);
    G = { W: W, H: H, c: c, dw: dw, A: new Float32Array(n).fill(1), B: new Float32Array(n), px: new Uint8Array(n), sembrada: new Uint8Array(nb), falta: new Float64Array(nb) };
    gl.uniform1f(U.u_cell, c);
    win.h = 0; win.rows = 0; ventana(true);
  }
  function crecer(h) {
    var H = Math.ceil(h / G.c); if (H <= G.H) return;
    var n = G.W * H, nb = Math.ceil(H / BANDA);
    var A = new Float32Array(n).fill(1); A.set(G.A); var B = new Float32Array(n); B.set(G.B); var px = new Uint8Array(n); px.set(G.px);
    var se = new Uint8Array(nb); se.set(G.sembrada); var fa = new Float64Array(nb); fa.set(G.falta);
    G.A = A; G.B = B; G.px = px; G.sembrada = se; G.falta = fa; G.H = H;
  }
  function activar(b, cuanto) { if (b >= 0 && b < G.falta.length) G.falta[b] = Math.max(G.falta[b], cuanto); }
  function sembrar(b) {
    if (G.sembrada[b]) return; G.sembrada[b] = 1;
    var r = azar(7 + b * 131), y0 = b * BANDA, y1 = Math.min(G.H, y0 + BANDA), m = Math.round(G.W * (y1 - y0) * DENS);
    for (var q = 0; q < m; q++) {
      var sx = Math.floor(r() * G.W), sy = y0 + Math.floor(r() * (y1 - y0)), v = .25 + .05 * r();
      for (var dy = -3; dy <= 3; dy++) for (var dx = -3; dx <= 3; dx++) {
        if (dx * dx + dy * dy > 9) continue; var x = sx + dx, y = sy + dy;
        if (x < 0 || y < 0 || x >= G.W || y >= G.H) continue; var j = y * G.W + x; G.A[j] = .5; G.B[j] = v;
      }
    }
    activar(b - 1, FORMA); activar(b, FORMA); activar(b + 1, FORMA);
    subirFilas(Math.max(0, y0 - 3), Math.min(G.H - 1, y1 + 2));
  }
  function sembrarVisibles() {
    var hasta = (scrollY + innerHeight + 40) / G.c;
    for (var b = 0; b < G.sembrada.length && b * BANDA < hasta; b++) sembrar(b);
  }
  function pasos(y0, y1) {
    var W = G.W, H = G.H, A = G.A, B = G.B, n = (y1 - y0 + 1) * W;
    if (!tmp.A || tmp.A.length < n) { tmp.A = new Float32Array(n); tmp.B = new Float32Array(n); }
    var A2 = tmp.A, B2 = tmp.B, o = y0 * W;
    for (var y = y0; y <= y1; y++) {
      var yu = (y > 0 ? y - 1 : 0) * W, yc = y * W, yd = (y < H - 1 ? y + 1 : y) * W;
      for (var x = 0; x < W; x++) {
        var l = x > 0 ? x - 1 : 0, rr = x < W - 1 ? x + 1 : x, i = yc + x, a = A[i], bb = B[i];
        var la = .2 * (A[yu + x] + A[yd + x] + A[yc + l] + A[yc + rr]) + .05 * (A[yu + l] + A[yu + rr] + A[yd + l] + A[yd + rr]) - a;
        var lb = .2 * (B[yu + x] + B[yd + x] + B[yc + l] + B[yc + rr]) + .05 * (B[yu + l] + B[yu + rr] + B[yd + l] + B[yd + rr]) - bb;
        var abb = a * bb * bb;
        A2[i - o] = a + (la - abb + F * (1 - a)); B2[i - o] = bb + (.5 * lb + abb - (K + F) * bb);
      }
    }
    A.set(A2.subarray(0, n), o); B.set(B2.subarray(0, n), o);
  }
  function subirFilas(y0, y1) {
    var W = G.W, B = G.B, px = G.px;
    for (var i = y0 * W, fin = (y1 + 1) * W; i < fin; i++) { var v = B[i] * 637.5; px[i] = v > 255 ? 255 : v; }
    var a = Math.max(y0, win.r0), z = Math.min(y1, win.r0 + win.rows - 1);
    if (a <= z) gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, a - win.r0, W, z - a + 1, gl.LUMINANCE, gl.UNSIGNED_BYTE, px.subarray(a * W, (z + 1) * W));
  }
  function borrar(px, py) {
    var c = G.c, gx = px / c, gy = py / c, R = RADIO;
    var x0 = Math.max(0, Math.floor(gx - R)), x1 = Math.min(G.W - 1, Math.ceil(gx + R)), y0 = Math.max(0, Math.floor(gy - R)), y1 = Math.min(G.H - 1, Math.ceil(gy + R));
    if (y0 > y1 || x0 > x1) return;
    for (var y = y0; y <= y1; y++) for (var x = x0; x <= x1; x++) {
      var dd = Math.hypot(x + .5 - gx, y + .5 - gy); if (dd >= R) continue;
      var w = dd < R * .6 ? 1 : 1 - (dd - R * .6) / (R * .4), i = y * G.W + x;
      G.A[i] += (1 - G.A[i]) * w; G.B[i] *= 1 - w;
    }
    for (var b = Math.floor(y0 / BANDA); b <= Math.floor(y1 / BANDA); b++) activar(b, RELLENO);
    subirFilas(y0, y1);
  }
  function trazo() {
    var cur = { x: mouse.x, y: mouse.y + scrollY };
    if (previo && cur.x === previo.x && cur.y === previo.y) return false;
    var a = previo || cur, dist = Math.hypot(cur.x - a.x, cur.y - a.y);
    if (dist > 400) { a = cur; dist = 0; }
    var tramos = Math.max(1, Math.ceil(dist / (RADIO * G.c * .4)));
    for (var q = 1; q <= tramos; q++) borrar(a.x + (cur.x - a.x) * q / tramos, a.y + (cur.y - a.y) * q / tramos);
    previo = cur; return true;
  }
  function ventana(forzar) {
    var vh = innerHeight, h = Math.min(docH, vh + 2 * MARGEN);
    var lejos = scrollY < win.top + 100 && win.top > 0 || scrollY + vh > win.top + win.h - 100 && win.top + win.h < docH;
    if (!forzar && !lejos && h === win.h) return;
    if (h !== win.h) {
      win.h = h; var dpr = Math.min(window.devicePixelRatio || 1, 2);
      cv.style.height = h + 'px'; cv.width = Math.round(G.dw * dpr); cv.height = Math.round(h * dpr);
      gl.viewport(0, 0, cv.width, cv.height); gl.uniform2f(U.u_res, cv.width, cv.height); gl.uniform1f(U.u_dpr, cv.width / G.dw);
    }
    win.top = Math.max(0, Math.min(docH - h, scrollY - MARGEN));
    cv.style.top = win.top + 'px'; gl.uniform1f(U.u_off, win.top);
    var r0 = Math.max(0, Math.min(G.H - 1, Math.floor(win.top / G.c))), rows = Math.max(1, Math.min(G.H - r0, Math.ceil((win.top + h) / G.c) - r0 + 2));
    if (rows !== win.rows) gl.texImage2D(gl.TEXTURE_2D, 0, gl.LUMINANCE, G.W, rows, 0, gl.LUMINANCE, gl.UNSIGNED_BYTE, null);
    win.r0 = r0; win.rows = rows;
    gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, G.W, rows, gl.LUMINANCE, gl.UNSIGNED_BYTE, G.px.subarray(r0 * G.W, (r0 + rows) * G.W));
    gl.uniform2f(U.u_gs, G.W, rows); gl.uniform1f(U.u_r0, r0);
    pintar();
  }
  function pintar() { gl.uniform1f(U.u_k, INT); gl.drawArrays(gl.TRIANGLES, 0, 3); }
  function cuadro(ts) {
    andando = false;
    if (!G) return;
    var dt = tPrev ? Math.min(100, ts - tPrev) : 16; tPrev = ts;
    sembrarVisibles();
    var cambio = mouse ? trazo() : false;
    var c = G.c, arriba = scrollY, c0 = Math.floor(Math.max(0, arriba - 200) / c / BANDA), c1 = Math.floor(Math.min(docH - 1, arriba + innerHeight + 200) / c / BANDA);
    var b0 = -1, b1 = -1;
    for (var b = c0; b <= c1 && b < G.falta.length; b++) if (G.falta[b] > 0) { if (b0 < 0) b0 = b; b1 = b; }
    var hay = b0 >= 0;
    if (hay) {
      var ocupado = performance.now() < ocupadoHasta;
      acum = Math.min(acum + dt * VEL / 1000, 6);
      var n = ocupado ? (dt > 20 ? 0 : Math.min(1, Math.floor(acum))) : Math.min(6, Math.floor(acum));
      var y0 = b0 * BANDA, y1 = Math.min(G.H - 1, (b1 + 1) * BANDA - 1), t0 = performance.now(), hechos = 0;
      while (hechos < n && (hechos === 0 || performance.now() - t0 < 6)) { pasos(y0, y1); hechos++; }
      if (hechos) {
        acum -= hechos;
        for (b = b0; b <= b1; b++) if (G.falta[b] > 0) G.falta[b] = Math.max(0, G.falta[b] - hechos);
        subirFilas(y0, y1); cambio = true;
      }
    } else acum = 0;
    if (cambio) pintar();
    if (hay) andar(); else tPrev = 0;
  }
  function andar() { if (!andando && G) { andando = true; requestAnimationFrame(cuadro); } }
  function empezar() { previo = null; nueva(); sembrarVisibles(); pintar(); andar(); }

  addEventListener('scroll', function () { if (!G) return; ocupar(); ventana(false); andar(); }, { passive: true });
  addEventListener('wheel', ocupar, { passive: true });
  addEventListener('touchmove', ocupar, { passive: true });
  addEventListener('pointermove', function (e) {
    if (!G) return; ocupar();
    if (e.pointerType !== 'mouse' || !conMouse.matches) return;
    mouse = { x: e.clientX, y: e.clientY }; andar();
  }, { passive: true });
  raiz.addEventListener('pointerleave', function () { mouse = null; previo = null; });
  addEventListener('blur', function () { mouse = null; previo = null; });
  if ('ResizeObserver' in window) new ResizeObserver(function () {
    if (!G) return; var h = alto(); if (h === docH) return;
    crecer(h); docH = h; ventana(true); andar();
  }).observe(cuerpo);
  var espera = 0, ancho = raiz.clientWidth;
  addEventListener('resize', function () {
    var w = raiz.clientWidth;
    if (w !== ancho) { ancho = w; clearTimeout(espera); espera = setTimeout(empezar, 200); } else if (G) ventana(true);
  });
  var arrancado = false;
  function arrancar() { if (arrancado) return; arrancado = true; empezar(); }
  if (d.fonts && d.fonts.ready) d.fonts.ready.then(arrancar);
  setTimeout(arrancar, 1500);
})();
