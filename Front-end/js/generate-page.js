// File: generate-page.js

document.addEventListener("DOMContentLoaded", function () {
  console.log("generate-page.js loaded");

  // ================================
  // Ambil elemen utama
  // ================================
  const form = document.querySelector(".form-layout");
  const btnGenerate = document.querySelector(".btn-generate");
  const btnBack = document.querySelector(".btn-back");
  const btnNewChat = document.querySelector(".btn-new-chat");
  const chatItems = document.querySelectorAll(".chat-item");

  // Popup Elements
  const popup = document.getElementById("resultPopup");
  const popupContent = document.getElementById("resultContent");
  const closePopup = document.getElementById("closeResultPopup");

  // ================================
  // 1. Tombol BACK
  // ================================
  if (btnBack) {
    btnBack.addEventListener("click", function (event) {
      event.preventDefault();
      // Pastikan path ini benar sesuai lokasi file HTML kamu!
      window.location.href = "../../index.html";
    });
  }

  // ================================
  // 2. Sidebar – Riwayat Chat
  // ================================
  if (chatItems) {
    chatItems.forEach((item) => {
      item.addEventListener("click", function () {
        chatItems.forEach((i) => i.classList.remove("active"));
        this.classList.add("active");
        console.log(`Riwayat Chat dipilih: ${this.textContent.trim()}`);
      });
    });
  }

  // ================================
  // 3. Tombol New Chat
  // ================================
  if (btnNewChat) {
    btnNewChat.addEventListener("click", function (event) {
      event.preventDefault();
      chatItems.forEach((i) => i.classList.remove("active"));
      if (form) form.reset();
      console.log("Memulai Sesi Chat Baru...");
    });
  }

  // ================================
  // 4. Submit Form
  // ================================
  if (form) {
    form.addEventListener("submit", function (event) {
      event.preventDefault();
      collectAndProcessData();
    });
  }

  // ================================
  // 5. POPUP – Menampilkan Hasil Generate
  // ================================
  function showResultPopup(data) {
    if (!popup || !popupContent) return;

    let html = `
      <strong>Jenis Produk:</strong> ${data.jenisProduk || "-"}<br><br>
      <strong>Tujuan Produk:</strong> ${data.tujuan || "-"}<br><br>
      <strong><u>Properti Target:</u></strong><br>
    `;

    const keys = Object.keys(data.propertiTarget);

    if (keys.length > 0) {
      keys.forEach((key) => {
        html += `<div>${key}: ${data.propertiTarget[key]}</div>`;
      });
    } else {
      html += "<div>Tidak ada properti yang diisi.</div>";
    }

    html += `
      <br><strong>Deskripsi Tambahan:</strong><br>
      ${data.deskripsiKriteria || "-"}
    `;

    popupContent.innerHTML = html;
    popup.style.display = "flex";
  }

  if (closePopup) {
    closePopup.addEventListener("click", () => {
      popup.style.display = "none";
    });
  }

  if (popup) {
    popup.addEventListener("click", (e) => {
      if (e.target === popup) popup.style.display = "none";
    });
  }

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && popup) popup.style.display = "none";
  });

  // ================================
  // 6. Fungsi Kumpul Data Input
  // ================================
  function collectAndProcessData() {
    const compoundData = {};

    // --- 1. Input utama ---
    const primaryInputs = document.querySelectorAll(
      ".input-row.main-header .input-field"
    );

    compoundData.jenisProduk = primaryInputs[0]?.value.trim() || "";
    compoundData.tujuan = primaryInputs[1]?.value.trim() || "";

    // --- 2. Properti Kimia ---
    compoundData.propertiTarget = {};
    const propertyGroups = document.querySelectorAll(
      ".input-row.property-group"
    );

    propertyGroups.forEach((group) => {
      const labelInput = group.querySelector(".property-field-label");
      const valueInput = group.querySelector(".property-field-value");

      const rawLabel = labelInput?.value.trim() || "";
      const value = valueInput?.value.trim() || "";

      // abaikan jika label atau nilai kosong
      if (!rawLabel || !value) return;

      // Sanitasi key: huruf kecil + menghapus spasi/simbol
      const key = rawLabel.toLowerCase().replace(/[^a-z0-9]/g, "");

      compoundData.propertiTarget[key] = value;
    });

    // --- 3. Textarea bawah ---
    const textArea = document.querySelector(".textarea-placeholder");
    compoundData.deskripsiKriteria = textArea ? textArea.value.trim() : "";

    // --- 4. Loading sementara ---
    if (btnGenerate) {
      btnGenerate.textContent = "Processing...";
      btnGenerate.disabled = true;
    }

    setTimeout(() => {
      if (btnGenerate) {
        btnGenerate.textContent = "GENERATE";
        btnGenerate.disabled = false;
      }

      showResultPopup(compoundData);
    }, 900);
  }
});
