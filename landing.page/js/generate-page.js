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

  // API Configuration
  const API_BASE_URL = "http://127.0.0.1:8000";

  // ================================
  // 1. Tombol BACK
  // ================================
  if (btnBack) {
    btnBack.addEventListener("click", function (event) {
      event.preventDefault();
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
  function showResultPopup(data, aiResponse) {
    if (!popup || !popupContent) return;

    let html = `
      <div style="margin-bottom: 20px; padding: 15px; background: rgba(0, 191, 255, 0.1); border-radius: 8px; border-left: 4px solid var(--color-accent-blue-neon);">
        <h3 style="color: var(--color-accent-blue-neon); margin-bottom: 10px;">📋 Kriteria Input Anda:</h3>
        <div style="color: var(--color-text-light);">
          <p><strong>Jenis Produk:</strong> ${data.jenisProduk || "-"}</p>
          <p><strong>Tujuan Produk:</strong> ${data.tujuan || "-"}</p>
        </div>
      </div>

      <div style="margin-bottom: 20px;">
        <h3 style="color: var(--color-accent-blue-neon); margin-bottom: 10px;">🎯 Properti Target:</h3>
        <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 8px;">
    `;

    const keys = Object.keys(data.propertiTarget);
    if (keys.length > 0) {
      keys.forEach((key) => {
        if (data.propertiTarget[key]) {
          html += `<div style="margin: 5px 0; color: var(--color-text-light);"><strong>${key}:</strong> ${data.propertiTarget[key]}</div>`;
        }
      });
    } else {
      html += "<div style='color: var(--color-text-secondary);'>Tidak ada properti yang diisi.</div>";
    }

    html += `</div></div>`;

    if (data.deskripsiKriteria) {
      html += `
        <div style="margin-bottom: 20px;">
          <h3 style="color: var(--color-accent-blue-neon); margin-bottom: 10px;">📝 Deskripsi Tambahan:</h3>
          <div style="background: rgba(0, 0, 0, 0.3); padding: 15px; border-radius: 8px; color: var(--color-text-light);">
            ${data.deskripsiKriteria}
          </div>
        </div>
      `;
    }

    // AI Response Section
    html += `
      <div style="margin-top: 30px; padding: 20px; background: linear-gradient(135deg, rgba(0, 191, 255, 0.15), rgba(74, 144, 226, 0.15)); border-radius: 10px; border: 2px solid var(--color-accent-blue-neon);">
        <h3 style="color: var(--color-accent-blue-neon); margin-bottom: 15px; display: flex; align-items: center;">
          <span style="margin-right: 10px;">🤖</span> Rekomendasi AI:
        </h3>
        <div style="color: var(--color-text-light); line-height: 1.8; white-space: pre-wrap;">
          ${formatAIResponse(aiResponse)}
        </div>
      </div>
    `;

    popupContent.innerHTML = html;
    popup.style.display = "flex";
  }

  function formatAIResponse(response) {
    // Format response untuk lebih mudah dibaca
    if (!response) return "Tidak ada respons dari AI.";
    
    // Convert markdown-style formatting to HTML
    let formatted = response
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') // Bold
      .replace(/\*(.*?)\*/g, '<em>$1</em>') // Italic
      .replace(/\n\n/g, '</p><p style="margin: 10px 0;">') // Paragraphs
      .replace(/\n/g, '<br>'); // Line breaks
    
    return `<p style="margin: 10px 0;">${formatted}</p>`;
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
  // 6. Fungsi Kumpul Data Input dan Kirim ke Backend
  // ================================
  async function collectAndProcessData() {
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

      if (rawLabel && value) {
        compoundData.propertiTarget[rawLabel] = value;
      }
    });

    // --- 3. Textarea bawah ---
    const textArea = document.querySelector(".textarea-placeholder");
    compoundData.deskripsiKriteria = textArea ? textArea.value.trim() : "";

    // Validate input
    if (!compoundData.jenisProduk || !compoundData.tujuan) {
      alert("Mohon isi Jenis Produk dan Tujuan Produk!");
      return;
    }

    // --- 4. Show loading state ---
    if (btnGenerate) {
      btnGenerate.textContent = "🔄 Memproses...";
      btnGenerate.disabled = true;
    }

    try {
      // --- 5. Send to backend API ---
      console.log("📤 Sending request to API...", compoundData);
      
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(compoundData),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();
      console.log("✅ Response received:", result);

      // --- 6. Show result in popup ---
      showResultPopup(compoundData, result.answer);

      // Optional: Add to history
      addToHistory(compoundData.jenisProduk);

    } catch (error) {
      console.error("❌ Error:", error);
      alert(
        "Terjadi kesalahan saat menghubungi server. Pastikan backend sudah berjalan!\n\n" +
        "Error: " + error.message
      );
    } finally {
      // --- 7. Reset button state ---
      if (btnGenerate) {
        btnGenerate.textContent = "GENERATE";
        btnGenerate.disabled = false;
      }
    }
  }

  // ================================
  // 7. Add to History (Optional)
  // ================================
  function addToHistory(title) {
    const historyList = document.querySelector(".chat-history-list");
    if (!historyList) return;

    const timestamp = new Date().toLocaleTimeString('id-ID', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
    
    const historyItem = document.createElement("li");
    historyItem.className = "chat-item";
    historyItem.textContent = `${title} - ${timestamp}`;
    
    historyList.insertBefore(historyItem, historyList.firstChild);

    // Add click event
    historyItem.addEventListener("click", function() {
      document.querySelectorAll(".chat-item").forEach(i => i.classList.remove("active"));
      this.classList.add("active");
    });
  }

  // ================================
  // 8. Clear History Button
  // ================================
  const btnClearHistory = document.querySelector(".btn-clear-history");
  if (btnClearHistory) {
    btnClearHistory.addEventListener("click", function() {
      const historyList = document.querySelector(".chat-history-list");
      if (historyList && confirm("Hapus semua riwayat?")) {
        historyList.innerHTML = "";
        console.log("Riwayat telah dihapus");
      }
    });
  }

  // ================================
  // 9. Check Backend Health on Load
  // ================================
  async function checkBackendHealth() {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      const data = await response.json();
      console.log("🏥 Backend health:", data);
    } catch (error) {
      console.warn("⚠️ Backend tidak dapat dijangkau. Pastikan server berjalan di http://127.0.0.1:8000");
    }
  }

  checkBackendHealth();
});