/* eslint-disable no-unused-vars */
/* eslint-disable no-irregular-whitespace */
// File: generate-page.js (VERSI FINAL BERSIH & TERSTRUKTUR)

// ======================================================================
// KONFIGURASI API
// ======================================================================
const API_BASE_URL = "http://127.0.0.1:8000";
const ENDPOINT_GENERATE = "/generate";
const ENDPOINT_REFINE = "/refine";
const ENDPOINT_SAVE = "/save_compound";

// ======================================================================
// STATE GLOBAL
// ======================================================================
let currentCompoundData = null;
let currentRecommendation = null;
let progressInterval;

const AI_STEPS = [
    "Menentukan kriteria dan preferensi produk...",
    "Mengorkestrasi (Directing) ke Gemini Pro untuk penalaran...",
    "Menjalankan analisis & pencocokan basis data (RAG)...",
    "Membuat Justifikasi & Menghitung Skor Kecocokan...",
    "Memformat output menjadi JSON KETAT...",
    "Selesai! Memuat hasil."
];

// Local storage key untuk riwayat
const HISTORY_KEY = "chemistry_history_v1";

// ======================================================================
// UTILITY: Generate ID
// ======================================================================
function generateId() {
    return 'h_' + Date.now() + '_' + Math.random().toString(36).slice(2, 9);
}

// ======================================================================
// MAIN EXECUTION
// ======================================================================
document.addEventListener("DOMContentLoaded", function () {
    console.log("generate-page.js loaded");

    // ==========================
    // ELEMENT UTAMA
    // ==========================
    const form = document.querySelector(".form-layout");
    const btnGenerate = document.querySelector(".btn-generate");
    const btnBack = document.querySelector(".btn-back");

    const popup = document.getElementById("resultPopup");
    const popupContent = document.getElementById("resultContent");
    const closePopup = document.getElementById("closeResultPopup");

    const historyListEl = document.querySelector(".chat-history-list");

    if (popup) popup.style.display = "none";

    // Jika tidak ada elem search di HTML, buatkan secara dinamis
    let historySearchInput = document.querySelector('.history-search');
    if (!historySearchInput && historyListEl) {
        const container = document.createElement('div');
        container.className = 'history-search-wrapper';
        container.innerHTML = `
            <input type="text" class="history-search" placeholder="Cari riwayat... (nama, rumus, deskripsi)" />
            <button class="btn-clear-search" title="Bersihkan">✖</button>
        `;
        historyListEl.parentNode.insertBefore(container, historyListEl);
        historySearchInput = container.querySelector('.history-search');
        const clearBtn = container.querySelector('.btn-clear-search');
        clearBtn.addEventListener('click', () => { historySearchInput.value = ''; renderHistoryList(); });

        historySearchInput.addEventListener('input', () => renderHistoryList(historySearchInput.value.trim()));
    }

    // ==================================================================
    // FUNGSI: LOADING & PROGRESS AI
    // ==================================================================
    function setLoadingState(isLoading, message = "GENERATE") {
        if (btnGenerate) {
            btnGenerate.textContent = isLoading ? "Processing..." : message;
            btnGenerate.disabled = isLoading;
            btnGenerate.classList.toggle("loading", isLoading);
        }

        if (isLoading && popup && popupContent) {
            popup.style.display = "flex";

            const popupTitle = popup.querySelector(".popup-title");
            if (popupTitle) popupTitle.textContent = "⚙️ Memproses Senyawa Baru...";

            popupContent.innerHTML = `
                <div id="ai-progress-display">
                    <p>Memulai Analisis. Ini mungkin memakan waktu beberapa detik...</p>
                    <ul id="stepList" class="ai-steps">
                        ${AI_STEPS.map((s, i) => `<li id="step-${i}"><span>${s}</span></li>`).join("")}
                    </ul>
                </div>
                <div class="loading-bar"></div>
            `;

            simulateProgress();
        }
    }

    function simulateProgress() {
        let currentStep = 0;
        const stepList = document.getElementById("stepList");
        if (!stepList) return;

        Array.from(stepList.children).forEach((li) => (li.className = ""));

        if (progressInterval) clearInterval(progressInterval);

        progressInterval = setInterval(() => {
            if (currentStep < AI_STEPS.length) {
                const li = document.getElementById(`step-${currentStep}`);
                if (li) li.classList.add("active");
                currentStep++;
            }
        }, 1000);
    }

    
    // ==================================================================
    // FUNGSI: MODAL KUSTOM GENERIK
    // ==================================================================
    function showCustomModal(title, message, status) {
        if (!popup || !popupContent) return;

        clearInterval(progressInterval);

        let icon = "❌";
        let color = "var(--color-error)";
        let spinner = "";

        if (status === true) {
            icon = "✅";
            color = "var(--color-success)";
        } else if (status === false) {
            icon = "🔄";
            color = "var(--color-accent-blue-neon)";
            spinner = `<div class="loading-spinner"></div>`;
        }

        const btnText = status === true ? "Selesai" : "OK";
        const titleEl = popup.querySelector(".popup-title");

        if (titleEl) titleEl.textContent = `${icon} ${title}`;

        popupContent.innerHTML = `
            <div class="custom-modal-content">
                <h3 style="color:${color};">${message}</h3>
                ${spinner}
            </div>

            <div class="result-actions" style="justify-content:center; margin-top:20px;">
                <button id="closeModalBtn" class="btn-modal-action btn-save">${btnText}</button>
            </div>
        `;

        if (status === false) {
            const closeBtn = document.getElementById("closeModalBtn");
            if (closeBtn) closeBtn.style.display = "none";
        }

        popup.style.display = "flex";
    }

    // ==================================================================
    // FUNGSI: RIWAYAT (localStorage)
    // ==================================================================
    function loadHistory() {
        try {
            const raw = localStorage.getItem(HISTORY_KEY);
            if (!raw) return [];
            const arr = JSON.parse(raw);
            if (!Array.isArray(arr)) return [];
            return arr;
        } catch (e) {
            console.warn('Gagal parse history', e);
            return [];
        }
    }

    function saveHistory(arr) {
        try {
            localStorage.setItem(HISTORY_KEY, JSON.stringify(arr));
        } catch (e) {
            console.warn('Gagal menyimpan history', e);
        }
    }

    function addToHistory(name, answerObj) {
        // Simpan ke UI dan localStorage
        const history = loadHistory();
        const item = {
            id: generateId(),
            nama: name || (answerObj?.nama_senyawa) || 'Senyawa Baru',
            timestamp: Date.now(),
            answer: answerObj || null
        };

        // tambahkan ke awal
        history.unshift(item);
        saveHistory(history);
        renderHistoryList();
    }

    function deleteHistoryItem(id) {
        let history = loadHistory();
        const beforeCount = history.length;
        history = history.filter(h => h.id !== id);
        saveHistory(history);
        renderHistoryList();
    }

    // 🌟 FUNGSI INI YANG DIMODIFIKASI UNTUK TAMPILAN LEBIH MENARIK 🌟
    function renderHistoryList(filter = '') {
        const list = document.querySelector('.chat-history-list');
        if (!list) return;

        const history = loadHistory();
        list.innerHTML = '';

        const query = filter.toLowerCase();
        let historyCount = 0;

        history.forEach(h => {
            const nameLower = (h.nama || '').toLowerCase();
            const desc = (h.answer?.deskripsi || '') + ' ' + (h.answer?.justifikasi_ringkas || '') + ' ' + (h.answer?.rumus_molekul || '');
            const descLower = desc.toLowerCase();

            if (query && !(nameLower.includes(query) || descLower.includes(query))) return; // skip

            historyCount++;
            const li = document.createElement('li');
            li.className = 'history-item-card'; // Kelas baru untuk styling card
            li.dataset.id = h.id;

            const date = new Date(h.timestamp);
            const prettyDate = date.toLocaleString('id-ID', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });

            const compoundName = escapeHtml(h.nama || 'Senyawa Tanpa Nama');
            const formula = escapeHtml(h.answer?.rumus_molekul || '—');
            const score = h.answer?.skor_kecocokan || 0;
            const risk = escapeHtml(h.answer?.tingkat_risiko_keselamatan || 'N/A');

            li.innerHTML = `
                <div class="history-content-main">
                    <div class="history-icon-box">🧪</div>
                    <div class="history-text-details">
                        <div class="history-title-name">${compoundName}</div>
                        <div class="history-meta-data">
                            <span>Formula: <strong>${formula}</strong></span>
                            <span class="score-badge">Match: ${score}%</span>
                            <span class="risk-badge risk-${risk.toLowerCase()}">${risk}</span>
                        </div>
                    </div>
                </div>
                <div class="history-actions-group">
                    <div class="history-date">${prettyDate}</div>
                    <button class="btn-history-view" title="Lihat Detail">Lihat</button>
                    <button class="btn-history-delete" title="Hapus Permanen">Hapus</button>
                </div>
            `;

            // click pada seluruh li (kecuali area tombol) -> lihat
            li.addEventListener('click', (e) => {
                // Pastikan klik tidak berasal dari tombol aksi
                if (e.target.closest('.btn-history-view') || e.target.closest('.btn-history-delete')) {
                    return;
                }
                viewHistoryItem(h.id);
            });


            li.querySelector('.btn-history-view').addEventListener('click', (e) => {
                e.stopPropagation();
                viewHistoryItem(h.id);
            });

            li.querySelector('.btn-history-delete').addEventListener('click', (e) => {
                e.stopPropagation();
                if (confirm(`Hapus riwayat "${h.nama}"?`)) deleteHistoryItem(h.id);
            });

            list.appendChild(li);
        });

        if (historyCount === 0) {
            list.innerHTML = `<p class="empty-history-message">Tidak ada riwayat yang ditemukan.${query ? ' Bersihkan filter untuk melihat semua.' : ''}</p>`;
        }
    }

    
    // 🌟 AKHIR MODIFIKASI FUNGSI RIWAYAT 🌟

    function viewHistoryItem(id) {
        const history = loadHistory();
        const h = history.find(x => x.id === id);
        if (!h) return showCustomModal('Tidak ditemukan', 'Data riwayat tidak ada.', 'error');

        // tampilkan menggunakan showResultPopup
        const apiResult = { answer: h.answer };
        currentRecommendation = h.answer;
        popup.querySelector('.popup-title').textContent = `🕘 Riwayat: ${h.nama}`;
        showResultPopup(apiResult, false);
    }

    // ==================================================================
    // EVENT LISTENER UTAMA
    // ==================================================================
    if (form) {
        form.addEventListener("submit", function (e) {
            e.preventDefault();
            collectAndProcessData(ENDPOINT_GENERATE, collectData());
        });
    }

    if (btnBack) {
        btnBack.addEventListener("click", (e) => {
            e.preventDefault();
            window.location.href = "../../index.html";
        });
    }

    if (closePopup) {
        closePopup.addEventListener("click", () => (popup.style.display = "none"));
    }

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && popup) popup.style.display = "none";
    });

    // ==================================================================
    // EVENT LISTENER: POPUP ACTION
    // ==================================================================
    if (popup) {
        popup.addEventListener("click", (e) => {
            const id = e.target.id;

            // REFINE
            if (id === "refineResultBtn") {
                const inp = document.getElementById("feedbackInput");
                if (!inp || !currentCompoundData || !currentRecommendation)
                    return showCustomModal("Input Kurang", "Harap masukkan feedback.", "error");

                const text = inp.value.trim();
                if (!text)
                    return showCustomModal("Input Kosong", "Masukkan perintah perbaikan!", "error");

                const refineData = {
                    ...currentCompoundData,
                    currentRecommendation,
                    feedback: text,
                };

                collectAndProcessData(ENDPOINT_REFINE, refineData);
            }

            // SAVE
            if (id === "saveResultBtn") {
                if (!currentRecommendation)
                    return showCustomModal("Gagal", "Tidak ada rekomendasi.", "error");
                handleSaveResult(currentRecommendation);
            }

            // NEW SESSION
            if (id === "newChatBtn") {
                if (form) form.reset();
                currentCompoundData = null;
                currentRecommendation = null;
                popup.style.display = "none";
            }

            // CLOSE MODAL
            if (id === "closeModalBtn") {
                popup.style.display = "none";

                if (e.target.textContent === "Selesai") {
                    if (form) form.reset();
                    currentCompoundData = null;
                    currentRecommendation = null;
                } else if (e.target.textContent === "OK") {
                    if (currentRecommendation)
                        showResultPopup({ answer: currentRecommendation }, true);
                }
            }
        });
    }

    // ==================================================================
    // FUNGSI: COLLECT DATA FORM
    // ==================================================================
    function collectData() {
        const data = {};

        const primaryInputs = document.querySelectorAll(".input-row.main-header .input-field");
        data.jenisProduk = primaryInputs[0]?.value.trim() || "";
        data.tujuan = primaryInputs[1]?.value.trim() || "";

        data.propertiTarget = {};
        document.querySelectorAll(".input-row.property-group").forEach((g) => {
            const key = g.querySelector(".property-field-label")?.value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            const val = g.querySelector(".property-field-value")?.value.trim();

            if (key && val) data.propertiTarget[key] = val;
        });

        const textArea = document.querySelector(".textarea-placeholder");
        data.deskripsiKriteria = textArea ? textArea.value.trim() : "";

        const wideInputs = document.querySelectorAll(".input-row.wide-input .input-field");
        let logistik = "Keterbatasan & Preferensi Logistik:\n";
        let used = false;

        wideInputs.forEach((el) => {
            if (el.value.trim()) {
                logistik += `- ${el.placeholder}: ${el.value.trim()}\n`;
                used = true;
            }
        });

        if (used)
            data.deskripsiKriteria += (data.deskripsiKriteria ? "\n\n" : "") + logistik;

        return data;
    }

    // ==================================================================
    // FUNGSI: TAMPILKAN HASIL
    // ==================================================================
    function showResultPopup(apiResult, isRefinement = false) {
        if (!popup || !popupContent) return;

        clearInterval(progressInterval);

        const c = apiResult.answer;
        currentRecommendation = c;

        const name = c?.nama_senyawa || "Senyawa Baru";

        popup.querySelector(".popup-title").textContent = "✅ Hasil Generate Ditemukan!";

        popupContent.innerHTML = `
            <div class="result-header">
                <h3>🧪 Senyawa Rekomendasi ${isRefinement ? "Baru" : "Awal"}:
                    <strong>${escapeHtml(name)}</strong>
                </h3>

                <p class="match-score">Skor Kecocokan:
                    <span class="score">${c?.skor_kecocokan || 0}%</span>
                </p>

                <p class="molecule-detail">
                    <span class="detail-item">Rumus: <strong>${escapeHtml(c?.rumus_molekul || "N/A")}</strong></span> |
                    <span class="detail-item">Berat: ${escapeHtml(c?.berat_molekul || "N/A")} g/mol</span>
                </p>
            </div>

            <div class="result-section">
                <h4>📝 Justifikasi & Deskripsi</h4>
                <p><strong>Justifikasi:</strong> ${escapeHtml(c?.justifikasi_ringkas || "N/A")}</p>
                <p><strong>Deskripsi Detail:</strong> ${escapeHtml(c?.deskripsi || "N/A")}</p>
            </div>

            <details class="property-details">
                <summary>🔬 Lihat Properti Kimia Detail</summary>
                <div class="property-grid">
                    <div><strong>Titik Didih:</strong> ${escapeHtml(c?.titik_didih_celsius || "N/A")} °C</div>
                    <div><strong>Densitas:</strong> ${escapeHtml(c?.densitas_gcm3 || "N/A")} g/cm³</div>
                    <div><strong>Sifat Fungsional:</strong> ${escapeHtml(c?.sifat_fungsional || "N/A")}</div>
                    <div><strong>Risiko Keselamatan:</strong>
                        <span class="risk-level risk-${(String(c?.tingkat_risiko_keselamatan || "N/A")).toLowerCase()}">
                            ${escapeHtml(c?.tingkat_risiko_keselamatan || "N/A")}
                        </span>
                    </div>
                </div>
            </details>

            <div class="feedback-section">
                <h4>Perlu Perbaikan?</h4>
                <p>Masukkan instruksi perbaikan, misalnya:
                "Cari yang titik didihnya lebih rendah" atau "Tekankan sifat anti-oksidan".</p>

                <input type="text" id="feedbackInput" class="feedback-input"
                    placeholder="Masukkan perintah perbaikan (feedback)...">
            </div>

            <div class="result-actions">
                <button id="newChatBtn" class="btn-action btn-new btn-reset-form">
                    <i class="fas fa-plus"></i> Mulai Sesi Baru
                </button>

                <div class="action-group-right">
                    <button id="refineResultBtn" class="btn-action btn-refine">
                        <i class="fas fa-sync-alt"></i> Generate Ulang
                    </button>

                    <button id="saveResultBtn" class="btn-action btn-save">
                        <i class="fas fa-check"></i> Save & Selesai
                    </button>
                </div>
            </div>
        `;

        // Jika hasil berasal dari API generate (bukan hanya melihat riwayat), tambahkan ke riwayat
        // Kita anggap currentCompoundData ada saat generate
        if (currentRecommendation && currentCompoundData) {
            try {
                addToHistory(name, currentRecommendation);
                // reset currentCompoundData agar tidak menyimpan duplikat saat refine
                currentCompoundData = null;
            } catch (e) {
                console.warn('Gagal menambahkan ke riwayat:', e);
            }
        }

        popup.style.display = "flex";
    }

    // ==================================================================
    // FUNGSI: CALL API GENERATE / REFINE
    // ==================================================================
    async function collectAndProcessData(endpoint, dataToSend) {
        if (endpoint === ENDPOINT_GENERATE) {
            currentCompoundData = dataToSend;
            if (!dataToSend.jenisProduk || !dataToSend.tujuan)
                return showCustomModal("Input Kurang", "Field utama wajib diisi.", "error");
        }

        setLoadingState(true);

        try {
            const res = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSend),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || res.statusText);
            }

            const result = await res.json();
            if (!result.success || !result.answer)
                throw new Error("Respons API tidak valid");

            showResultPopup(result, endpoint === ENDPOINT_REFINE);

        } catch (err) {
            popupContent.innerHTML = `
                <h3>❌ Gagal Generate Senyawa</h3>
                <p>${escapeHtml(err.message)}</p>
            `;

            popup.querySelector(".popup-title").textContent = "Error";
            popup.style.display = "flex";

        } finally {
            setLoadingState(false, endpoint === ENDPOINT_REFINE ? "RE-GENERATE" : "GENERATE");
        }
    }

    // ==================================================================
    // FUNGSI: SIMPAN DATA
    // ==================================================================
    async function handleSaveResult(data) {
        if (!data)
            return showCustomModal("Gagal", "Tidak ada data untuk disimpan.", "error");

        showCustomModal(
            "Proses Menyimpan",
            `Menyimpan senyawa "${data.nama_senyawa}" ke database...`,
            false
        );

        try {
            const res = await fetch(`${API_BASE_URL}${ENDPOINT_SAVE}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.detail || res.statusText);
            }

            const result = await res.json();
            addToHistory(data.nama_senyawa, data);

            showCustomModal("Penyimpanan Berhasil!", result.message, true);

        } catch (err) {
            showCustomModal("Error Penyimpanan", err.message, "error");
        }
    }

    
    // ==================================================================
    // INISIALISASI: render riwayat saat load
    // ==================================================================
    renderHistoryList();

    // ==================================================================
    // HELPERS
    // ==================================================================
    function escapeHtml(unsafe) {
        if (unsafe === null || unsafe === undefined) return '';
        return String(unsafe)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

});