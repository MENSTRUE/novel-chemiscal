// File: generate-page.js

// Tunggu hingga seluruh dokumen HTML selesai dimuat
document.addEventListener("DOMContentLoaded", function () {
  // 1. Ambil referensi ke formulir dan tombol-tombol
  const form = document.querySelector(".form-layout");
  const btnGenerate = document.querySelector(".btn-generate");
  const btnBack = document.querySelector(".btn-back");
  const chatItems = document.querySelectorAll(".chat-item");

  // =======================================================
  // Fungsionalitas Tombol BACK: Kembali ke index.html
  // =======================================================
  btnBack.addEventListener("click", function (event) {
    event.preventDefault(); // Mencegah tindakan default tombol

    // Mengasumsikan generate-page.html berada di subfolder (misalnya /pages/ atau /html/)
    // dan index.html berada di folder induk (root).
    window.location.href = "../index.html";
  });
  // =======================================================

  // =======================================================
  // Fungsionalitas SIDEBAR (Simulasi memilih riwayat chat)
  // =======================================================
  chatItems.forEach((item) => {
    item.addEventListener("click", function () {
      // Hapus kelas 'active' dari semua item
      chatItems.forEach((i) => i.classList.remove("active"));

      // Tambahkan kelas 'active' ke item yang baru diklik
      this.classList.add("active");

      // TODO: Di sini Anda akan menambahkan kode untuk memuat data
      // dari chat yang dipilih ke dalam formulir utama.

      // Simulasi: Tampilkan nama chat di konsol
      console.log(`Riwayat Chat dipilih: ${this.textContent.trim()}`);
    });
  });

  // Tambahkan fungsionalitas untuk tombol New Chat
  const btnNewChat = document.querySelector(".btn-new-chat");
  if (btnNewChat) {
    btnNewChat.addEventListener("click", function (event) {
      event.preventDefault();
      // Hapus kelas 'active' dari semua chat item
      chatItems.forEach((i) => i.classList.remove("active"));

      // Reset formulir
      form.reset();
      console.log("Memulai Sesi Chat Baru...");
    });
  }
  // =======================================================

  // Fungsionalitas Tombol GENERATE (Submit Form)
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    collectAndProcessData();
  });

  /**
   * Fungsi untuk mengumpulkan data dari semua input field
   */
  function collectAndProcessData() {
    const compoundData = {};

    // --- 1. Kumpulkan Input Utama ---
    const primaryInputs = document.querySelectorAll(
      ".input-row.main-header .input-field"
    );
    if (primaryInputs.length >= 2) {
      compoundData.jenisProduk = primaryInputs[0].value.trim();
      compoundData.tujuan = primaryInputs[1].value.trim();
    }

    // --- 2. Kumpulkan Properti Kimia ---
    compoundData.propertiTarget = {};
    const propertyGroups = document.querySelectorAll(
      ".input-row.property-group"
    );

    propertyGroups.forEach((group) => {
      const labelInput = group.querySelector(".property-field-label");
      const valueInput = group.querySelector(".property-field-value");

      if (labelInput && valueInput) {
        // Menggunakan ID/Nama yang lebih terstruktur dan menghindari spasi
        const rawLabel = labelInput.value.trim();
        const key = rawLabel.toLowerCase().replace(/\s+/g, ""); // Ex: titikdidih
        const value = valueInput.value.trim();

        if (value) {
          compoundData.propertiTarget[key] = value;
        }
      }
    });

    // --- 3. Kumpulkan Area Teks Bawah ---
    const textArea = document.querySelector(".textarea-placeholder");
    compoundData.deskripsiKriteria = textArea ? textArea.value.trim() : "";

    // --- 4. Tampilkan Hasil (Simulasi Proses Generate) ---
    console.log("===================================");
    console.log("Data Kimia Siap untuk di-Generate:");
    console.log(compoundData);

    // --- Feedback ke Pengguna ---
    btnGenerate.textContent = "Processing...";
    btnGenerate.disabled = true;

    setTimeout(() => {
      btnGenerate.textContent = "GENERATE";
      btnGenerate.disabled = false;
      // Gunakan console.table untuk tampilan data yang lebih rapi
      console.table(compoundData.propertiTarget);
      alert(
        "Data berhasil dikirim. Cek konsol (F12) untuk melihat data yang terstruktur!"
      );
    }, 1500);
  }
});
