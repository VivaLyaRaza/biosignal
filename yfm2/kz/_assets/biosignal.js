// Фон БиоСигнала на выбор читателя: «Классика» (белый/чёрный без фона), «Мягкий» (нейтральные пятна) и
// «Неон» (живая сеть «нейронов»). Выбор — кнопками в углу, хранится в localStorage. Неон приглушён в колонке
// текста и ярче к краям, рисует ~30 кадров/с, в скрытой вкладке не рисует, при prefers-reduced-motion — один кадр.
(function () {
  var DEF = 'neon'
  var KEY = 'bs-bg'
  var MODES = [['classic', 'Классика', '◻'], ['soft', 'Мягкий', '◐'], ['neon', 'Неон', '✦']]
  var root = document.documentElement
  var mode = DEF
  try { mode = localStorage.getItem(KEY) || DEF } catch (e) {}
  function apply (m) {
    mode = m
    MODES.forEach(function (x) { root.classList.toggle('bs-bg-' + x[0], x[0] === m) })
    try { localStorage.setItem(KEY, m) } catch (e) {}
    var bs = document.querySelectorAll('.bs-bgpick button')
    for (var i = 0; i < bs.length; i++) bs[i].setAttribute('aria-pressed', String(bs[i].dataset.m === m))
    if (m === 'neon') neon.start(); else neon.stop()
  }

  var neon = (function () {
    var cv, ctx, W, H, dpr, nodes = [], pulses = [], on = false, last = 0, raf = 0
    var still = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches
    var CYAN = '#5ce6e6', VIOLET = '#9a8cff', LINK = 150
    function dark () { return !!document.querySelector('.g-root_theme_dark') }
    function size () {
      W = window.innerWidth; H = window.innerHeight; dpr = Math.min(window.devicePixelRatio || 1, 2)
      cv.width = W * dpr; cv.height = H * dpr; cv.style.width = W + 'px'; cv.style.height = H + 'px'
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      nodes = []
      var n = Math.round(Math.min(70, W * H / 20000))
      for (var i = 0; i < n; i++) {
        nodes.push({ x: Math.random() * W, y: Math.random() * H, vx: (Math.random() - .5) * .14, vy: (Math.random() - .5) * .14,
          r: .8 + Math.random() * 1.4, c: Math.random() < .65 ? CYAN : VIOLET, ph: Math.random() * 6.28 })
      }
    }
    // колонка текста: там сеть почти прозрачна, к краям экрана — ярче
    function calm (x) {
      var main = document.querySelector('.dc-doc-page__main, .pc-page-constructor__wrapper, main')
      var r = main ? main.getBoundingClientRect() : { left: W * .2, right: W * .8 }
      var cx = (r.left + r.right) / 2, half = (r.right - r.left) / 2
      var d = Math.abs(x - cx) - half * .55
      return Math.max(.12, Math.min(1, d / 260 + .12))
    }
    function frame (t) {
      var dk = dark(), a = dk ? .75 : .4
      ctx.clearRect(0, 0, W, H)
      ctx.globalCompositeOperation = dk ? 'lighter' : 'source-over'
      for (var i = 0; i < nodes.length; i++) {
        var p = nodes[i]
        if (!still) {
          p.x += p.vx; p.y += p.vy
          if (p.x < -20) p.x = W + 20; if (p.x > W + 20) p.x = -20
          if (p.y < -20) p.y = H + 20; if (p.y > H + 20) p.y = -20
        }
        p.k = calm(p.x)
        for (var j = i + 1; j < nodes.length; j++) {
          var q = nodes[j], dx = p.x - q.x, dy = p.y - q.y, d = Math.sqrt(dx * dx + dy * dy)
          if (d < LINK) {
            ctx.strokeStyle = p.c; ctx.lineWidth = .7
            ctx.globalAlpha = (1 - d / LINK) * .22 * a * Math.min(p.k, calm(q.x))
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke()
            if (!still && Math.random() < .0004) pulses.push({ a: p, b: q, k: 0 })
          }
        }
      }
      for (i = 0; i < nodes.length; i++) {
        p = nodes[i]
        ctx.globalAlpha = .8 * a * p.k * (.6 + .4 * Math.sin(t / 1100 + p.ph))
        ctx.fillStyle = p.c; ctx.shadowColor = p.c; ctx.shadowBlur = dk ? 12 : 4
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, 6.283); ctx.fill()
      }
      for (i = pulses.length - 1; i >= 0; i--) {
        var s = pulses[i]
        s.k += .01
        if (s.k >= 1) { pulses.splice(i, 1); continue }
        var x = s.a.x + (s.b.x - s.a.x) * s.k, y = s.a.y + (s.b.y - s.a.y) * s.k
        ctx.globalAlpha = a * calm(x) * (1 - Math.abs(s.k - .5) * 1.4)
        ctx.fillStyle = CYAN; ctx.shadowColor = CYAN; ctx.shadowBlur = dk ? 18 : 6
        ctx.beginPath(); ctx.arc(x, y, 2, 0, 6.283); ctx.fill()
      }
      ctx.shadowBlur = 0; ctx.globalAlpha = 1
    }
    function loop (t) {
      if (!on) return
      raf = requestAnimationFrame(loop)
      if (document.hidden || t - last < 33) return
      last = t; frame(t)
    }
    return {
      start: function () {
        if (on) return
        on = true
        if (!cv) {
          cv = document.createElement('canvas'); cv.className = 'bs-fx'; cv.setAttribute('aria-hidden', 'true')
          document.body.appendChild(cv); ctx = cv.getContext('2d'); size()
          window.addEventListener('resize', function () { size(); if (still && on) frame(0) })
        }
        cv.style.display = ''
        if (still) frame(0); else raf = requestAnimationFrame(loop)
      },
      stop: function () { on = false; cancelAnimationFrame(raf); if (cv) cv.style.display = 'none' }
    }
  })()

  // класс режима — сразу (до отрисовки), кнопки и холст — когда есть body
  MODES.forEach(function (x) { root.classList.toggle('bs-bg-' + x[0], x[0] === mode) })
  function ui () {
    var box = document.createElement('div')
    box.className = 'bs-bgpick'
    box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Фон')
    MODES.forEach(function (x) {
      var b = document.createElement('button')
      b.type = 'button'; b.dataset.m = x[0]; b.title = 'Фон: ' + x[1]; b.textContent = x[2]
      b.addEventListener('click', function () { apply(x[0]) })
      box.appendChild(b)
    })
    document.body.appendChild(box)
    apply(mode)
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ui); else ui()
})()
