document.addEventListener("DOMContentLoaded", function () {
  var key = "seenTransition_v1";
  var seen = localStorage.getItem(key);
  var overlay = document.getElementById("page-transition");
  if (!overlay) return;

  function removeOverlay() {
    if (!overlay) return;
    overlay.classList.add("hide");
    document.documentElement.classList.remove("no-scroll");
    document.body.classList.remove("no-scroll");
    overlay.addEventListener("transitionend", function () {
      if (overlay && overlay.parentNode)
        overlay.parentNode.removeChild(overlay);
    });
  }

  // kick off a staged animation sequence
  function startSequence(delayShort) {
    // small delay to allow paint
    setTimeout(function () {
      // trigger internal animations (logo draw, texts)
      overlay.classList.add("pt-start");

      // start sweep and spawn particles for visual interest
      overlay.classList.add("sweep-active");
      var generated = generateParticles(overlay, 10);

      // After logo draw, slide the overlay off to the left to reveal page
      setTimeout(function () {
        overlay.classList.add("slide-off-left");

        // cleanup after slide completes
        setTimeout(function () {
          cleanupParticles(overlay);
          removeOverlay();
        }, Math.max(delayShort, 520));
      }, 900);
    }, 30);
  }

  function generateParticles(container, count) {
    if (!container) return [];
    var wrap = container.querySelector(".pt-particles");
    if (!wrap) {
      wrap = document.createElement("div");
      wrap.className = "pt-particles";
      container.appendChild(wrap);
    }
    var created = [];
    for (var i = 0; i < count; i++) {
      var dot = document.createElement("span");
      dot.className = "pt-dot";
      var left = 10 + Math.random() * 80; // percentage
      var top = 40 + Math.random() * 40;
      dot.style.left = left + "%";
      dot.style.top = top + "%";
      var dur = 800 + Math.random() * 900;
      dot.style.animationDuration = dur + "ms";
      dot.style.animationDelay = Math.random() * 400 + "ms";
      wrap.appendChild(dot);
      created.push(dot);
    }
    return created;
  }

  function cleanupParticles(container) {
    if (!container) return;
    var wrap = container.querySelector(".pt-particles");
    if (!wrap) return;
    // fade and remove
    wrap.parentNode && wrap.parentNode.removeChild(wrap);
  }

  // Create mosaic tiles inside container and animate them.
  // returns estimated max stagger time (ms)
  function generateMosaic(container, cols, rows, clickX, clickY, durationMs) {
    cleanupMosaic(container);
    var wrap = document.createElement("div");
    wrap.className = "mosaic-wrap";
    wrap.style.setProperty("--mosaic-cols", cols);
    container.appendChild(wrap);

    var total = cols * rows;
    var vw = window.innerWidth;
    var vh = window.innerHeight;
    var tiles = [];
    for (var r = 0; r < rows; r++) {
      for (var c = 0; c < cols; c++) {
        var t = document.createElement("div");
        t.className = "mosaic-tile";
        // compute tile center
        var tileWidth = vw / cols;
        var tileHeight = vh / rows;
        var cx = (c + 0.5) * tileWidth;
        var cy = (r + 0.5) * tileHeight;
        var dx = (clickX || vw / 2) - cx;
        var dy = (clickY || vh / 2) - cy;
        var dist = Math.hypot(dx, dy);
        tiles.push({ el: t, dist: dist });
        wrap.appendChild(t);
      }
    }

    // compute max dist for normalization
    var maxDist = 0;
    tiles.forEach(function (it) {
      if (it.dist > maxDist) maxDist = it.dist;
    });
    var maxStagger = Math.min(
      700,
      Math.round((maxDist / Math.max(vw, vh)) * 900)
    );
    // animate tiles with stagger based on distance (closest first)
    tiles.sort(function (a, b) {
      return a.dist - b.dist;
    });
    tiles.forEach(function (item, idx) {
      var delay = Math.round((item.dist / maxDist) * maxStagger);
      item.el.style.transitionDelay = delay + "ms";
      item.el.style.transitionDuration =
        Math.max(380, Math.round(durationMs * 0.6)) + "ms";
      // trigger showing a little after insertion
      setTimeout(function () {
        item.el.classList.add("show");
      }, 20 + delay);
    });

    return maxStagger + Math.max(380, Math.round(durationMs * 0.6));
  }

  function cleanupMosaic(container) {
    var wrap = container.querySelector(".mosaic-wrap");
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }

  if (!seen) {
    // first visit: longer, more dramatic
    document.documentElement.classList.add("no-scroll");
    document.body.classList.add("no-scroll");
    startSequence(900);
    try {
      localStorage.setItem(key, "1");
    } catch (e) {}
  } else {
    // repeat visits: keep animation subtle and brief
    document.documentElement.classList.add("no-scroll");
    document.body.classList.add("no-scroll");
    startSequence(220);
  }

  // Exposed helper to navigate with an exit transition.
  // Usage: window.navigateWithTransition(url, durationMs)
  window.navigateWithTransition = function (url, durationMs, variant, opts) {
    durationMs = typeof durationMs === "number" ? durationMs : 600;
    variant = variant || "slide";
    opts = opts || {};

    // create or reuse exit overlay
    var exitOverlay = document.getElementById("page-exit-overlay");
    if (!exitOverlay) {
      exitOverlay = document.createElement("div");
      exitOverlay.id = "page-exit-overlay";
      exitOverlay.className = "page-transition exit-overlay";
      exitOverlay.innerHTML =
        '<div class="pt-inner"><div class="pt-title">ChemisTry</div></div>';
      document.body.appendChild(exitOverlay);
    }

    document.documentElement.classList.add("no-scroll");
    document.body.classList.add("no-scroll");

    // Choose behavior by variant
    if (variant === "reveal") {
      // circular reveal from click point (opts.x, opts.y)
      var x = typeof opts.x === "number" ? opts.x : window.innerWidth / 2;
      var y = typeof opts.y === "number" ? opts.y : window.innerHeight / 2;
      var vw = Math.max(
        document.documentElement.clientWidth,
        window.innerWidth || 0
      );
      var vh = Math.max(
        document.documentElement.clientHeight,
        window.innerHeight || 0
      );
      var distX = Math.max(x, vw - x);
      var distY = Math.max(y, vh - y);
      var maxRadius = Math.ceil(Math.hypot(distX, distY));

      exitOverlay.style.clipPath = "circle(0px at " + x + "px " + y + "px)";
      exitOverlay.style.opacity = "1";
      exitOverlay.classList.add("sweep-active");
      generateParticles(exitOverlay, 10);

      // force reflow
      void exitOverlay.offsetWidth;

      exitOverlay.style.transition =
        "clip-path " +
        Math.min(durationMs, 900) +
        "ms cubic-bezier(.22,.9,.32,1), opacity 250ms ease";
      exitOverlay.style.clipPath =
        "circle(" + (maxRadius + 40) + "px at " + x + "px " + y + "px)";

      setTimeout(function () {
        window.location.href = url;
      }, durationMs);
      return;
    }

    // special: mosaic (tile) variant handled separately
    if (variant === "mosaic") {
      exitOverlay.classList.add("mosaic-overlay");
      // decide grid size based on viewport
      var cols = Math.max(8, Math.round(window.innerWidth / 80));
      var rows = Math.max(6, Math.round(window.innerHeight / 80));
      exitOverlay.style.opacity = "1";
      // create tiles and animate
      var longest = generateMosaic(
        exitOverlay,
        cols,
        rows,
        opts.x,
        opts.y,
        durationMs
      );
      setTimeout(function () {
        window.location.href = url;
      }, Math.min(durationMs + longest, 1400));
      return;
    }

    // default: slide (from right)
    exitOverlay.classList.add("sweep-active");
    generateParticles(exitOverlay, 8);
    exitOverlay.style.transform = "translateX(120%)";
    exitOverlay.style.opacity = "1";

    // force reflow
    void exitOverlay.offsetWidth;

    exitOverlay.style.transition =
      "transform " +
      Math.min(durationMs, 700) +
      "ms cubic-bezier(.22,.9,.32,1), opacity 300ms ease";
    exitOverlay.style.transform = "translateX(0%)";

    setTimeout(function () {
      window.location.href = url;
    }, durationMs);
  };

  // SPA-related navigation removed: this file now performs full-page navigations
});
