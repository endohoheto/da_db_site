// Halloween front for 2026-10-31 (JST). index.html loads this only on that day.
// Draws the raymarched pumpkin field from scene.frag into the overlay's canvas;
// "ハッピーハロウィン" fades the overlay away and leaves the normal front page.
(function () {
  var root = document.getElementById('halloween');
  var cv = document.getElementById('hw-scene');
  var btn = document.getElementById('hw-enter');
  var running = true;

  function close() {
    running = false;
    root.classList.add('hw-out');
    document.documentElement.classList.remove('hw-on');
    if (window.gtag) gtag('event', 'halloween_enter');
    setTimeout(function () { root.remove(); }, 700);
  }
  btn.addEventListener('click', close);
  addEventListener('keydown', function (e) { if (running && e.key === 'Escape') close(); });

  // The moon in the scene is tonight's: age from a known new moon (2000-01-06 18:14 UTC)
  // and the mean synodic month.
  var SYN = 29.530588853, REF = Date.UTC(2000, 0, 6, 18, 14);
  var age = ((((Date.now() - REF) / 864e5) % SYN) + SYN) % SYN;
  var phase = age / SYN;
  var illum = (1 - Math.cos(2 * Math.PI * phase)) / 2;
  var name =
    age < 1.5 || age > 28.0 ? '新月' :
    age >= 6.4 && age <= 8.4 ? '上弦の月' :
    age >= 13.8 && age <= 15.8 ? '満月' :
    age >= 21.1 && age <= 23.1 ? '下弦の月' :
    age < 14.8 ? '満ちていく月' : '欠けていく月';
  document.getElementById('hw-almanac').innerHTML =
    '月齢 <b>' + age.toFixed(1) + '</b> · 輝面比 <b>' + Math.round(illum * 100) + '%</b> · ' + name;

  var gl = cv.getContext('webgl', { antialias: false, powerPreference: 'high-performance' });
  if (!gl) { root.classList.add('hw-flat'); return; }

  fetch('halloween/scene.frag').then(function (r) {
    if (!r.ok) throw new Error('scene.frag ' + r.status);
    return r.text();
  }).then(start).catch(function (e) {
    console.error(e);
    root.classList.add('hw-flat');
  });

  function start(fsSrc) {
    function compile(type, src) {
      var s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
      if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
      return s;
    }
    var prog = gl.createProgram();
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, 'attribute vec2 a;void main(){gl_Position=vec4(a,0.,1.);}'));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, fsSrc));
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    var aLoc = gl.getAttribLocation(prog, 'a');
    gl.enableVertexAttribArray(aLoc);
    gl.vertexAttribPointer(aLoc, 2, gl.FLOAT, false, 0, 0);
    var U = {};
    ['uRes', 'uTime', 'uTravel', 'uFlash', 'uPhase', 'uIllum', 'uLook'].forEach(function (n) {
      U[n] = gl.getUniformLocation(prog, n);
    });

    var reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    var scale = 0.7, travel = 0, time = 0, last = performance.now(), frames = 0, acc = 0;
    var look = { x: 0, y: 0 }, target = { x: 0, y: 0 };
    var strikeAt = -10, nextAuto = 10 + Math.random() * 8;

    function resize() {
      var w = innerWidth, h = innerHeight, s = scale;
      if (w * h * s * s > 1.4e6) s = Math.sqrt(1.4e6 / (w * h));
      var W = Math.max(2, Math.round(w * s)), H = Math.max(2, Math.round(h * s));
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H; gl.viewport(0, 0, W, H); }
    }
    function flashAt(s) {
      if (s < 0 || s > 1.6) return 0;
      var f = 0, hits = [[0, 1], [0.09, 0.55], [0.32, 0.85]];
      for (var i = 0; i < hits.length; i++) { var d = s - hits[i][0]; if (d >= 0) f += hits[i][1] * Math.exp(-d * 15); }
      return Math.min(f, 1.4);
    }

    // Look around with the mouse or a drag; a tap or click that doesn't move calls lightning.
    var down = null;
    cv.addEventListener('pointerdown', function (e) {
      down = { x: e.clientX, y: e.clientY, lx: target.x, ly: target.y, moved: false };
      cv.setPointerCapture(e.pointerId);
    });
    cv.addEventListener('pointermove', function (e) {
      if (down) {
        var dx = e.clientX - down.x, dy = e.clientY - down.y;
        if (Math.hypot(dx, dy) > 6) down.moved = true;
        if (e.pointerType !== 'mouse') {
          target.x = Math.max(-1, Math.min(1, down.lx - dx / innerWidth * 2));
          target.y = Math.max(-0.6, Math.min(1, down.ly + dy / innerHeight * 2));
        }
      }
      if (e.pointerType === 'mouse') {
        target.x = (e.clientX / innerWidth - 0.5) * 2;
        target.y = -(e.clientY / innerHeight - 0.5) * 2;
      }
    });
    cv.addEventListener('pointerup', function () { if (down && !down.moved) strikeAt = time; down = null; });
    cv.addEventListener('pointercancel', function () { down = null; });

    function frame(now) {
      if (!running) {
        var lose = gl.getExtension('WEBGL_lose_context');
        if (lose) lose.loseContext();
        return;
      }
      var dt = Math.min(0.1, (now - last) / 1000); last = now;
      time += dt;
      travel += dt * (reduce ? 0.35 : 1.1);
      if (!reduce && time > nextAuto) { strikeAt = time; nextAuto = time + 18 + Math.random() * 20; }
      look.x += (target.x - look.x) * Math.min(1, dt * 3);
      look.y += (target.y - look.y) * Math.min(1, dt * 3);

      // Keep the frame rate up on slow devices by drawing fewer pixels.
      acc += dt; frames++;
      if (frames >= 30) {
        var avg = acc / frames * 1000;
        if (avg > 24 && scale > 0.32) scale *= 0.85;
        else if (avg < 15 && scale < 1) scale = Math.min(1, scale * 1.08);
        frames = 0; acc = 0;
      }
      resize();
      gl.uniform2f(U.uRes, cv.width, cv.height);
      gl.uniform1f(U.uTime, time);
      gl.uniform1f(U.uTravel, travel);
      gl.uniform1f(U.uFlash, flashAt(time - strikeAt));
      gl.uniform1f(U.uPhase, phase);
      gl.uniform1f(U.uIllum, illum);
      gl.uniform2f(U.uLook, look.x, look.y * 0.6);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      requestAnimationFrame(frame);
    }
    resize();
    root.classList.add('hw-ready');
    requestAnimationFrame(frame);
  }
})();
