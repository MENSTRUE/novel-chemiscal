/**
 * File: tabel-periodik.js
 * Menangani interaksi klik pada elemen tabel periodik
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Ambil semua elemen
  const elements = document.querySelectorAll(".element");
  const popup = document.getElementById("element-popup");
  const closeBtn = document.querySelector(".popup-close-btn");

  // 2. Fungsi untuk menampilkan pop-up
  const showPopup = (element) => {
    // Ambil data dari atribut data-* HTML
    const name = element.getAttribute("data-name");
    const symbol = element.getAttribute("data-symbol");
    const number = element.getAttribute("data-number");
    const desc = element.getAttribute("data-desc");

    // Isi konten pop-up
    document.querySelector(".popup-name").textContent = name;
    document.querySelector(".popup-symbol").textContent = symbol;
    document.querySelector(".popup-number").textContent = number;
    document.querySelector(".popup-description").textContent = desc;

    // Tampilkan pop-up
    popup.style.display = "block";
  };

  // 3. Fungsi untuk menyembunyikan pop-up
  const hidePopup = () => {
    popup.style.display = "none";
  };

  // 4. Tambahkan event listener ke setiap elemen
  elements.forEach((element) => {
    element.addEventListener("click", () => {
      showPopup(element);
    });
  });

  // 5. Tambahkan event listener untuk tombol tutup
  closeBtn.addEventListener("click", hidePopup);

  // Sembunyikan pop-up jika mengklik di luar area pop-up
  document.addEventListener("click", (event) => {
    // Cek jika yang diklik bukan pop-up itu sendiri dan bukan elemen tabel
    if (!popup.contains(event.target) && !event.target.closest(".element")) {
      hidePopup();
    }
  });
});
