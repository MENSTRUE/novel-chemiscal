document.addEventListener("DOMContentLoaded", () => {
  const openBtn = document.getElementById("open-sidebar-btn");
  const closeBtn = document.getElementById("close-sidebar-btn");
  const sidebar = document.getElementById("mobile-sidebar");
  const sidebarLinks = document.querySelectorAll(".sidebar-link");

  // Fungsi untuk membuka sidebar
  openBtn.addEventListener("click", () => {
    sidebar.classList.add("is-open");
    document.body.classList.add("no-scroll"); // Mencegah scroll saat sidebar terbuka
  });

  // Fungsi untuk menutup sidebar
  const closeSidebar = () => {
    sidebar.classList.remove("is-open");
    document.body.classList.remove("no-scroll");
  };

  // Tutup sidebar saat tombol close diklik
  closeBtn.addEventListener("click", closeSidebar);

  // Tutup sidebar saat salah satu link diklik (untuk navigasi)
  sidebarLinks.forEach((link) => {
    link.addEventListener("click", closeSidebar);
  });

  // Opsional: Tutup sidebar jika mengklik di luar sidebar
  document.addEventListener("click", (e) => {
    if (
      sidebar.classList.contains("is-open") &&
      !sidebar.contains(e.target) &&
      !openBtn.contains(e.target)
    ) {
      closeSidebar();
    }
  });

  // *CATATAN: Pastikan Anda juga memiliki file js/transition.js dari kode asli Anda.
});