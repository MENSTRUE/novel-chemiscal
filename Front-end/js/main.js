(function () {
  function attachNav() {
    // Memilih tautan yang memerlukan transisi kustom
    var anchors = document.querySelectorAll(
      'a[href$="explorasi.html"], a[href$="generate-page.html"], a[href$="tabel-periodik.html"]'
    );

    anchors.forEach(function (a) {
      a.addEventListener("click", function (e) {
        var href = a.getAttribute("href");
        if (!href) return;

        // Mencegah navigasi default
        e.preventDefault();

        // Menentukan varian transisi
        var variant = "slide"; // Default
        if (href.endsWith("explorasi.html")) variant = "reveal";
        if (href.endsWith("tabel-periodik.html")) variant = "mosaic";

        // Mendapatkan koordinat klik
        var coords = { x: e.clientX, y: e.clientY };

        // Menjalankan fungsi transisi yang diasumsikan ada di window (dari transition.js)
        if (window.navigateWithTransition) {
          window.navigateWithTransition(href, 750, variant, coords);
        } else {
          // Fallback jika fungsi transisi tidak tersedia
          window.location.href = href;
        }
      });
    });
  }

  // Memastikan DOM telah dimuat sebelum melampirkan event listener
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", attachNav);
  } else {
    attachNav();
  }
})();