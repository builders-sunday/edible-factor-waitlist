/* EDIBLE FACTOR preview — dual-budget gauges scrubbed by scroll + instrument dials.
   Vanilla, Lenis, reduced-motion aware (idle motion frozen, scrub still works). */
(function () {
  "use strict";
  var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var TAU = Math.PI * 2;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function smooth(t) { return t * t * (3 - 2 * t); }

  var CAL = "#6eddf0", BUD = "#ff8a4a", PERI = "#a8aaff", INK = "#eceaf3";

  function fitCanvas(cv) {
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    var r = cv.getBoundingClientRect();
    cv.width = Math.max(1, Math.round(r.width * dpr));
    cv.height = Math.max(1, Math.round(r.height * dpr));
    cv.getContext("2d").setTransform(dpr, 0, 0, dpr, 0, 0);
    return r;
  }

  // an arc gauge: sweeps `frac` of a 270deg arc, starting bottom-left
  function drawArc(ctx, cx, cy, r, frac, color, width, glow, t) {
    var a0 = Math.PI * 0.75, a1 = a0 + Math.PI * 1.5;
    // track
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, a1); ctx.strokeStyle = "rgba(236,234,243,.08)"; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.stroke();
    // ticks
    ctx.save();
    for (var i = 0; i <= 30; i++) {
      var a = a0 + (a1 - a0) * (i / 30);
      var on = (i / 30) <= frac;
      ctx.strokeStyle = on ? color : "rgba(236,234,243,.10)";
      ctx.globalAlpha = on ? 0.9 : 1;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a) * (r - width * 0.5 - 3), cy + Math.sin(a) * (r - width * 0.5 - 3));
      ctx.lineTo(cx + Math.cos(a) * (r + width * 0.5 + 3), cy + Math.sin(a) * (r + width * 0.5 + 3));
      ctx.stroke();
    }
    ctx.restore();
    // value arc
    var ae = a0 + (a1 - a0) * clamp(frac, 0, 1);
    ctx.save();
    ctx.shadowColor = color; ctx.shadowBlur = glow ? 16 : 0;
    ctx.beginPath(); ctx.arc(cx, cy, r, a0, ae); ctx.strokeStyle = color; ctx.lineWidth = width; ctx.lineCap = "round"; ctx.stroke();
    ctx.restore();
    // head dot
    ctx.beginPath(); ctx.arc(cx + Math.cos(ae) * r, cy + Math.sin(ae) * r, width * 0.55, 0, TAU); ctx.fillStyle = "#fff"; ctx.fill();
  }

  // two concentric budget arcs: outer=calorie(cyan), inner=money(orange)
  function drawDual(ctx, cx, cy, R, calFrac, budFrac, t, big) {
    var breathe = big ? 0 : Math.sin(t * 1.2) * 0.006;
    drawArc(ctx, cx, cy, R, calFrac + breathe, CAL, big ? 9 : 7, true, t);
    drawArc(ctx, cx, cy, R * 0.66, budFrac - breathe, BUD, big ? 9 : 7, true, t);
    // faint core
    var g = ctx.createRadialGradient(cx, cy, 0, cx, cy, R * 0.5);
    g.addColorStop(0, "rgba(168,170,255,.10)"); g.addColorStop(1, "rgba(168,170,255,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R * 0.5, 0, TAU); ctx.fill();
  }

  /* ---- the meal: cumulative kcal + cost through the courses ---- */
  var CAL_BUDGET = 2000, MONEY_BUDGET = 1800;
  var COURSES = [
    { n: "01", t: "Amuse", d: "Sparkling kombucha", kcal: 40, cost: 120 },
    { n: "02", t: "Starter", d: "Burrata, heirloom tomato", kcal: 320, cost: 380 },
    { n: "03", t: "Main", d: "Grilled seabass, greens", kcal: 540, cost: 620 },
    { n: "04", t: "Dessert", d: "Dark chocolate tart", kcal: 410, cost: 290 },
    { n: "05", t: "The bill", d: "One plate, both budgets", kcal: 0, cost: 0 }
  ];
  // cumulative after each course
  var cumK = [0], cumC = [0];
  for (var ci = 0; ci < COURSES.length; ci++) { cumK.push(cumK[ci] + COURSES[ci].kcal); cumC.push(cumC[ci] + COURSES[ci].cost); }
  function mealAt(p) {
    var band = clamp(p, 0, 0.999) * COURSES.length; // 0..5
    var i = Math.floor(band), f = band - i;
    var kcal = lerp(cumK[i], cumK[i + 1], f);
    var cost = lerp(cumC[i], cumC[i + 1], f);
    return { i: Math.min(i, COURSES.length - 1), kcal: kcal, cost: cost };
  }

  function ready(fn) { document.readyState !== "loading" ? fn() : document.addEventListener("DOMContentLoaded", fn); }

  ready(function () {
    var lenis = null;
    if (!reduce && typeof window.Lenis !== "undefined") { lenis = new window.Lenis({ lerp: 0.09, wheelMultiplier: 1.05, smoothWheel: true }); window.__lenis = lenis; }

    /* reveals + failsafe */
    (function () {
      var els = document.querySelectorAll(".rise");
      if (reduce || !("IntersectionObserver" in window)) { els.forEach(function (e) { e.classList.add("in"); }); return; }
      var io = new IntersectionObserver(function (es) { es.forEach(function (e) { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }); }, { threshold: 0.14, rootMargin: "0px 0px -8% 0px" });
      els.forEach(function (e) { io.observe(e); });
      setTimeout(function () { els.forEach(function (e) { e.classList.add("in"); }); }, 2000);
    })();

    /* spotlight */
    document.querySelectorAll(".spot").forEach(function (el) {
      el.addEventListener("pointermove", function (e) { var r = el.getBoundingClientRect(); el.style.setProperty("--mx", ((e.clientX - r.left) / r.width * 100) + "%"); el.style.setProperty("--my", ((e.clientY - r.top) / r.height * 100) + "%"); });
    });

    /* canvases */
    var heroCv = document.getElementById("heroGauge"), heroCtx = heroCv && heroCv.getContext("2d"), heroBox = heroCv && fitCanvas(heroCv);
    var plateCv = document.getElementById("plateGauge"), plateCtx = plateCv && plateCv.getContext("2d"), plateBox = plateCv && fitCanvas(plateCv);
    var plate = document.querySelector(".plate");
    var courses = Array.prototype.slice.call(document.querySelectorAll(".courses .c"));
    var calV = document.querySelector("[data-cal]"), budV = document.querySelector("[data-bud]");
    var calDish = document.querySelector("[data-dish]"), scrubFill = document.querySelector(".scrub i");
    var lastBand = -1;

    var forcedP = null;
    try { var q = new URLSearchParams(location.search).get("p"); if (q !== null) forcedP = clamp(parseFloat(q), 0, 1); } catch (e) {}
    function plateProgress() { if (forcedP !== null) return forcedP; if (!plate) return 0; var r = plate.getBoundingClientRect(); return clamp(-r.top / (r.height - window.innerHeight), 0, 1); }

    function setPlateUI(p) {
      var m = mealAt(p);
      var calLeft = Math.max(0, CAL_BUDGET - m.kcal), budLeft = Math.max(0, MONEY_BUDGET - m.cost);
      if (calV) calV.textContent = Math.round(calLeft).toLocaleString();
      if (budV) budV.textContent = "₹" + Math.round(budLeft).toLocaleString();
      if (m.i !== lastBand) {
        lastBand = m.i;
        courses.forEach(function (c, i) { c.classList.toggle("on", i === m.i); });
        if (calDish) calDish.textContent = COURSES[m.i].d;
      }
      if (scrubFill) scrubFill.style.width = (p * 100) + "%";
      return { calFrac: calLeft / CAL_BUDGET, budFrac: budLeft / MONEY_BUDGET };
    }

    function resize() { if (heroCv) heroBox = fitCanvas(heroCv); if (plateCv) plateBox = fitCanvas(plateCv); }
    window.addEventListener("resize", resize);

    var t0 = null;
    function frame(ts) {
      if (t0 === null) t0 = ts;
      var t = reduce ? 0 : (ts - t0) / 1000;
      if (lenis) { try { lenis.raf(ts); } catch (e) { lenis = null; } }
      if (heroCtx && heroBox) {
        heroCtx.clearRect(0, 0, heroBox.width, heroBox.height);
        var hR = Math.min(heroBox.width, heroBox.height) * 0.40;
        drawDual(heroCtx, heroBox.width / 2, heroBox.height / 2, hR, 0.66, 0.5, t, false);
      }
      if (plateCtx && plateBox) {
        var p = plateProgress(); var fr = setPlateUI(p);
        plateCtx.clearRect(0, 0, plateBox.width, plateBox.height);
        var mob = plateBox.width < 680;
        var cx = plateBox.width * 0.5, cy = plateBox.height * 0.5;
        var pR = Math.min(plateBox.width, plateBox.height) * (mob ? 0.42 : 0.30);
        drawDual(plateCtx, cx, cy, pR, fr.calFrac, fr.budFrac, t, true);
      }
      requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);

    /* ---- instrument dials (Numbers that mean something) ---- */
    function makeGaugeDial(el, opts) {
      var knob = el.querySelector(".gknob"), ptr = el.querySelector(".gp");
      var cv = el.querySelector("canvas"), ctx = cv && cv.getContext("2d"), box = cv && fitCanvas(cv);
      var min = -135, max = 135, angle = lerp(min, max, opts.init), dragging = false, startA = 0, startAng = 0;
      function center() { var r = knob.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
      function pAng(e, c) { return Math.atan2(e.clientY - c.y, e.clientX - c.x) * 180 / Math.PI; }
      function draw(v) {
        if (!ctx) return; ctx.clearRect(0, 0, box.width, box.height);
        drawArc(ctx, box.width / 2, box.height / 2, Math.min(box.width, box.height) * 0.42, v, opts.color, 6, true, 0);
      }
      function apply() {
        angle = clamp(angle, min, max); ptr.style.transform = "translateX(-50%) rotate(" + angle + "deg)";
        var v = (angle - min) / (max - min); opts.onChange(v); draw(v);
      }
      knob.addEventListener("pointerdown", function (e) { dragging = true; knob.setPointerCapture(e.pointerId); startA = pAng(e, center()); startAng = angle; if (window.__lenis) window.__lenis.stop(); });
      knob.addEventListener("pointermove", function (e) { if (!dragging) return; var d = pAng(e, center()) - startA; if (d > 180) d -= 360; if (d < -180) d += 360; angle = startAng + d; apply(); });
      function up() { dragging = false; if (window.__lenis) window.__lenis.start(); }
      knob.addEventListener("pointerup", up); knob.addEventListener("pointercancel", up);
      // keyboard a11y (no wheel-trap: arrows only, and only when focused)
      el.setAttribute("tabindex", "0"); el.setAttribute("role", "slider");
      el.addEventListener("keydown", function (e) { if (e.key === "ArrowRight" || e.key === "ArrowUp") { angle += 8; apply(); e.preventDefault(); } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") { angle -= 8; apply(); e.preventDefault(); } });
      apply();
    }

    var GD = document.querySelector('[data-gauge="metabolic"]');
    if (GD) makeGaugeDial(GD, { init: 0.72, color: CAL, onChange: function (v) {
      var rd = GD.querySelector(".rd"); rd.childNodes[0].nodeValue = Math.round(v * 100) + "%";
      rd.querySelector("small").textContent = "METABOLIC EFFICIENCY";
      var _pm = Math.round(v * 100); GD.querySelector(".rn").textContent = _pm === 100 ? "Perfection. Unison. Brilliance." : _pm >= 90 ? "Top 1%. On Target." : "LOW. WE CAN DO BETTER!";
    }});
    var GG = document.querySelector('[data-gauge="goal"]');
    if (GG) makeGaugeDial(GG, { init: 0.6, color: PERI, onChange: function (v) {
      var rd = GG.querySelector(".rd"); rd.childNodes[0].nodeValue = Math.round(v * 100) + "%";
      rd.querySelector("small").textContent = "GOAL ALIGNMENT";
      var _pg = Math.round(v * 100); GG.querySelector(".rn").textContent = _pg === 100 ? "Precision. Perfection." : _pg >= 90 ? "Top 1%. Goals Achieved." : _pg >= 45 ? "A little off plan. Good pace." : "Off plan. We can improve!";
    }});
    var GB = document.querySelector('[data-gauge="precision"]');
    if (GB) makeGaugeDial(GB, { init: 0.82, color: BUD, onChange: function (v) {
      var rd = GB.querySelector(".rd"); rd.childNodes[0].nodeValue = Math.round(v * 100) + "%";
      rd.querySelector("small").textContent = "BUDGET PRECISION";
      var _pb = Math.round(v * 100); GB.querySelector(".rn").textContent = _pb === 100 ? "Perfect. To the paisa." : _pb >= 90 ? "Top 1%. On the money." : _pb >= 45 ? "Close. Keep going!" : "Over budget. Recalibrate a smidge.";
    }});

    /* anchors */
    document.querySelectorAll('a[href^="#"]').forEach(function (a) {
      a.addEventListener("click", function (e) { var id = a.getAttribute("href"); if (id.length < 2) return; var tg = document.querySelector(id); if (!tg) return; e.preventDefault(); if (window.__lenis) window.__lenis.scrollTo(tg, { offset: -20 }); else tg.scrollIntoView({ behavior: reduce ? "auto" : "smooth" }); });
    });

    /* waitlist (preview: client-side only) */
    var form = document.querySelector(".wl-form");
    if (form) form.addEventListener("submit", function (e) { e.preventDefault(); var i = form.querySelector("input"); var note = document.querySelector(".wl-note"); if (i.value && i.value.indexOf("@") > 0) { note.textContent = "SEAT RESERVED (PREVIEW). WIRE TO /api/waitlist ON SHIP."; note.style.color = "var(--peri-bright)"; i.value = ""; } else { note.textContent = "ENTER A VALID EMAIL."; note.style.color = "var(--budget)"; } });
  });
})();
