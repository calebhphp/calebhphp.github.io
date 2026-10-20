// ===================================================================
// ACCRÁ — gerador das espirais orgânicas (porta do estudo aprovado)
// Quatro traços feitos "à mão": entalhe, pincel, quitanda, tinta falhada
// ===================================================================
(function () {
  function rnd(i) {
    var x = Math.sin(i * 12.9898 + 78.233) * 43758.5453;
    return x - Math.floor(x);
  }

  function center(turns, seed) {
    var p = [];
    var max = turns * 2 * Math.PI;
    for (var th = 0; th <= max; th += 0.045) {
      var r =
        5.1 * th +
        3.0 * Math.sin(th * 0.83 + seed) +
        1.7 * Math.sin(th * 1.91 + seed * 2.3) +
        0.9 * Math.sin(th * 3.7 + seed * 4.1);
      var cx = 100 + 1.6 * Math.sin(seed * 3 + th * 0.3);
      var cy = 100 + 1.6 * Math.cos(seed * 5 + th * 0.27);
      p.push([cx + r * Math.cos(th - Math.PI / 2), cy + r * Math.sin(th - Math.PI / 2), th, max]);
    }
    return p;
  }

  function ribbonPaths(pts, wfn, rough, seed, gapfn) {
    var paths = [];
    var segs = [], cur = [];
    for (var i = 0; i < pts.length; i++) {
      if (gapfn && gapfn(pts[i][2], i)) {
        if (cur.length > 3) segs.push(cur);
        cur = [];
        continue;
      }
      cur.push(i);
    }
    if (cur.length > 3) segs.push(cur);
    segs.forEach(function (seg) {
      var o = [], n = [];
      seg.forEach(function (i, j) {
        var t = pts[i][2], frac = t / pts[i][3];
        var w = wfn(t, frac) / 2;
        if (j < 2) w *= (j + 1) / 3;
        if (j > seg.length - 3) w *= (seg.length - j) / 3;
        if (w < 0.5) w = 0.5;
        var a, b;
        if (i < pts.length - 1) { a = pts[i + 1][0] - pts[i][0]; b = pts[i + 1][1] - pts[i][1]; }
        else { a = pts[i][0] - pts[i - 1][0]; b = pts[i][1] - pts[i - 1][1]; }
        var L = Math.sqrt(a * a + b * b) || 1, nx = -b / L, ny = a / L;
        var r1 = rough * (rnd(i * 3 + seed) - 0.5);
        var r2 = rough * (rnd(i * 7 + seed + 99) - 0.5);
        o.push([pts[i][0] + nx * (w + r1), pts[i][1] + ny * (w + r1)]);
        n.push([pts[i][0] - nx * (w + r2), pts[i][1] - ny * (w + r2)]);
      });
      var d = "M" + o[0][0].toFixed(1) + " " + o[0][1].toFixed(1);
      for (var i = 1; i < o.length; i++) d += "L" + o[i][0].toFixed(1) + " " + o[i][1].toFixed(1);
      for (var i = n.length - 1; i >= 0; i--) d += "L" + n[i][0].toFixed(1) + " " + n[i][1].toFixed(1);
      paths.push(d + "Z");
    });
    return paths;
  }

  function speckCircles(count, seed, rmin, rmax) {
    var out = [];
    for (var i = 0; i < count; i++) {
      var ang = rnd(i + seed) * 6.283;
      var rad = rmin + rnd(i + seed + 40) * (rmax - rmin);
      out.push({
        cx: +(100 + rad * Math.cos(ang)).toFixed(1),
        cy: +(100 + rad * Math.sin(ang)).toFixed(1),
        r: +(0.8 + rnd(i + seed + 80) * 1.7).toFixed(2),
        opacity: +(0.55 + rnd(i + seed + 120) * 0.4).toFixed(2),
      });
    }
    return out;
  }

  function raiosQuitanda() {
    var paths = [];
    var NR = 9;
    for (var i = 0; i < NR; i++) {
      var ang = (i / NR) * 6.283 - 1.5708 + (rnd(i + 200) - 0.5) * 0.3;
      var r0 = 64 + (rnd(i + 220) - 0.5) * 7;
      var len = 15 + rnd(i + 240) * 16;
      var bw = 4.5 + rnd(i + 260) * 4;
      var ca = Math.cos(ang), sa = Math.sin(ang), nx = -sa, ny = ca;
      var bx = 100 + r0 * ca, by = 100 + r0 * sa;
      var tx = 100 + (r0 + len) * ca + (rnd(i + 280) - 0.5) * 6;
      var ty = 100 + (r0 + len) * sa + (rnd(i + 290) - 0.5) * 6;
      var mx = (bx + tx) / 2 + nx * (rnd(i + 310) - 0.5) * 5;
      var my = (by + ty) / 2 + ny * (rnd(i + 320) - 0.5) * 5;
      var d =
        "M" + (bx + nx * bw).toFixed(1) + " " + (by + ny * bw).toFixed(1) +
        "Q" + (mx + nx * bw * 0.5).toFixed(1) + " " + (my + ny * bw * 0.5).toFixed(1) + " " + tx.toFixed(1) + " " + ty.toFixed(1) +
        "Q" + (mx - nx * bw * 0.5).toFixed(1) + " " + (my - ny * bw * 0.5).toFixed(1) + " " + (bx - nx * bw).toFixed(1) + " " + (by - ny * bw).toFixed(1) + "Z";
      paths.push(d);
    }
    return paths;
  }

  var cache = {};
  function solVariantShapes(variant) {
    if (cache[variant]) return cache[variant];
    var paths = [], circles = [];
    if (variant === "entalhe") {
      paths = ribbonPaths(center(2.45, 1.7), function (t) { return 9.5 + 3.5 * Math.sin(t * 1.7 + 0.8) + 2 * Math.sin(t * 4.3); }, 3.4, 11);
      circles = speckCircles(9, 300, 68, 90);
    } else if (variant === "pincel") {
      paths = ribbonPaths(center(2.55, 4.2), function (t, f) {
        var press = 10 * Math.sin(f * Math.PI) + 2.5;
        return press + 2.8 * Math.sin(t * 2.2 + 1.1);
      }, 1.6, 55);
    } else if (variant === "quitanda") {
      paths = ribbonPaths(center(1.85, 7.9), function (t) { return 8.5 + 2.5 * Math.sin(t * 2.6); }, 2.2, 77).concat(raiosQuitanda());
    } else if (variant === "falhada") {
      paths = ribbonPaths(center(2.5, 2.9), function (t) { return 9 + 3 * Math.sin(t * 1.9 + 2); }, 3.0, 33,
        function (t, i) {
          var g = Math.sin(t * 3.1 + 0.6) + Math.sin(t * 7.7 + 2.2) + rnd(i) * 0.7;
          return g > 1.55;
        });
      circles = speckCircles(6, 500, 30, 72);
    }
    cache[variant] = { paths: paths, circles: circles };
    return cache[variant];
  }

  window.solVariantShapes = solVariantShapes;
})();
