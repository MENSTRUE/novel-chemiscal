/* eslint-disable no-unused-vars */
/* eslint-disable no-irregular-whitespace */
// File: generate-page.js (FINAL FIX: Sembunyikan Tombol Aksi & Duplikasi History)

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
// UTILITY: History Management
// ======================================================================
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
    // Kita panggil renderHistoryList di akhir showResultPopup untuk update UI
}

function deleteHistoryItem(id) {
    let history = loadHistory();
    history = history.filter(h => h.id !== id);
    saveHistory(history);
    renderHistoryList();
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

    // NEW: History Modal Elements
    const historyModal = document.getElementById("historyModal");
    const btnToggleHistory = document.querySelector(".btn-history-toggle");
    const closeHistoryModal = document.getElementById("closeHistoryModal");

    // History & Search elements (desktop & mobile)
    const desktopHistoryListEl = document.querySelector(".chat-history-list:not(.modal-history-list)");
    const mobileHistoryListEl = document.querySelector(".modal-history-list");
    const desktopHistorySearchInput = document.querySelector('.sidebar-container .history-search');
    const mobileHistorySearchInput = document.getElementById('modalHistorySearch');
    const desktopClearBtn = document.querySelector('.sidebar-container .btn-clear-search');
    const mobileClearBtn = document.getElementById('modalClearSearch');

    if (popup) popup.style.display = "none";
    if (historyModal) historyModal.style.display = "none";
    if (closePopup) closePopup.style.display = "flex"; // Pastikan default terlihat

    // ==================================================================
    // FUNGSI: SETUP HISTORY SEARCH (Dijalankan untuk Desktop & Mobile)
    // ==================================================================
    function setupHistorySearch(input, clearBtn) {
        if (!input || !clearBtn) return;

        input.addEventListener('input', () => {
            const query = input.value.trim();
            // Sinkronkan input di kedua tempat
            if (input === desktopHistorySearchInput && mobileHistorySearchInput) {
                mobileHistorySearchInput.value = query;
            } else if (input === mobileHistorySearchInput && desktopHistorySearchInput) {
                desktopHistorySearchInput.value = query;
            }
            renderHistoryList(query);
        });
        
        clearBtn.addEventListener('click', () => { 
            desktopHistorySearchInput.value = ''; 
            if (mobileHistorySearchInput) mobileHistorySearchInput.value = '';
            renderHistoryList(); 
        });
    }

    setupHistorySearch(desktopHistorySearchInput, desktopClearBtn);
    setupHistorySearch(mobileHistorySearchInput, mobileClearBtn);


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
            if (closePopup) closePopup.style.display = "none"; // Sembunyikan tombol tutup saat loading

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
        } else if (!isLoading && closePopup) {
             // Tampilkan kembali tombol tutup setelah selesai (kecuali jika ada modal kustom yang meng-handle)
            if (!document.getElementById("confirmDeleteBtn") && !document.getElementById("closeModalBtn")) {
                 closePopup.style.display = "flex";
            }
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
        if (closePopup) closePopup.style.display = "none"; // Sembunyikan tombol 'X' jika ada tombol 'OK'

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
    // FUNGSI: MODAL KONFIRMASI HAPUS KUSTOM (BARU)
    // ==================================================================
    function showDeleteConfirmModal(id, name) {
        if (!popup || !popupContent) return;

        clearInterval(progressInterval);
        if (closePopup) closePopup.style.display = "none"; // Sembunyikan tombol 'X'

        // Setel judul popup menjadi konfirmasi
        popup.querySelector(".popup-title").textContent = `⚠️ Konfirmasi Penghapusan`;

        popupContent.innerHTML = `
            <div class="custom-modal-content">
                <h3 style="color:var(--color-reset);">Yakin Hapus Riwayat Ini?</h3>
                <div class="delete-confirm-content">
                    <p><strong>Nama Senyawa:</strong> ${escapeHtml(name)}</p>
                    <p>Data ini akan hilang permanen dari riwayat lokal.</p>
                </div>
            </div>

            <div class="result-actions" style="justify-content:center; margin-top:30px;">
                <button id="cancelDeleteBtn" class="btn-modal-action" style="background-color:var(--color-card-bg); color:var(--color-text-light);">Batal</button>
                <button id="confirmDeleteBtn" class="btn-modal-action btn-delete">Hapus Permanen</button>
            </div>
        `;

        popup.style.display = "flex";

        // Tambahkan event listener untuk tombol di modal
        document.getElementById("cancelDeleteBtn").addEventListener('click', () => {
            popup.style.display = "none";
            if (closePopup) closePopup.style.display = "flex"; // Tampilkan kembali tombol tutup
        });
        
        document.getElementById("confirmDeleteBtn").addEventListener('click', () => {
            // Lakukan penghapusan dan tutup modal
            deleteHistoryItem(id);
            popup.style.display = "none";
            if (closePopup) closePopup.style.display = "flex"; // Tampilkan kembali tombol tutup
            
            // Opsional: Tampilkan modal sukses sesaat jika diperlukan
            // showCustomModal('Berhasil Dihapus', `Riwayat "${name}" telah dihapus.`, true);
        });
    }


    // ==================================================================
    // FUNGSI: RIWAYAT (Rendering & Viewing)
    // ==================================================================

    // FUNGSI INI DIUBAH UNTUK MENGATUR STRUKTUR HTML AGAR SESUAI DENGAN CSS BARU
    function renderHistoryList(filter = '') {
        const history = loadHistory();
        const listsToUpdate = [desktopHistoryListEl];
        if (mobileHistoryListEl) listsToUpdate.push(mobileHistoryListEl);

        const query = filter.toLowerCase();

        listsToUpdate.forEach(list => {
            if (!list) return;

            list.innerHTML = '';
            let historyCount = 0;

            history.forEach(h => {
                const nameLower = (h.nama || '').toLowerCase();
                // Menggabungkan beberapa field untuk pencarian
                const formulaLower = (h.answer?.rumus_molekul || '').toLowerCase();
                const riskLower = (h.answer?.tingkat_risiko_keselamatan || '').toLowerCase();
                const descLower = ((h.answer?.deskripsi || '') + ' ' + (h.answer?.justifikasi_ringkas || '')).toLowerCase();

                if (query && !(nameLower.includes(query) || formulaLower.includes(query) || riskLower.includes(query) || descLower.includes(query))) return; // skip

                historyCount++;
                const li = document.createElement('li');
                li.className = 'history-item-card'; // Kelas baru untuk styling card
                li.dataset.id = h.id;

                const date = new Date(h.timestamp);
                const prettyDate = date.toLocaleString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

                const compoundName = escapeHtml(h.nama || 'Senyawa Tanpa Nama');
                const formula = escapeHtml(h.answer?.rumus_molekul || '—');
                const score = h.answer?.skor_kecocokan || 0;
                const risk = escapeHtml(h.answer?.tingkat_risiko_keselamatan || 'N/A');
                // Pastikan class CSS sesuai dengan nama risiko
                const riskClass = `risk-${risk.toLowerCase().replace(/[^a-z0-9]/g, '-')}`; 

                // STRUKTUR HTML BARU
                li.innerHTML = `
                    <div class="history-content-main">
                        <div class="history-icon-box"></div>
                        <div class="history-text-details">
                            <div class="history-title-name">${compoundName}</div>
                            <div class="history-meta-data">
                                <span>Formula: <strong>${formula}</strong></span>
                            </div>
                        </div>
                    </div>
                    
                    <div class="history-info-bar">
                        <div class="history-date">${prettyDate}</div>
                        <div class="history-badges">
                            <span class="score-badge">Match: ${score}%</span>
                            <span class="risk-badge ${riskClass}">${risk}</span>
                        </div>
                    </div>

                    <div class="history-actions-group">
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

                // REVISI: Mengganti confirm() dengan modal kustom
                li.querySelector('.btn-history-delete').addEventListener('click', (e) => {
                    e.stopPropagation();
                    // Panggil modal konfirmasi kustom
                    showDeleteConfirmModal(h.id, h.nama);
                });

                list.appendChild(li);
            });

            if (historyCount === 0) {
                list.innerHTML = `<p class="empty-history-message" style="color:var(--color-text-secondary); padding: 15px; text-align: center;">Tidak ada riwayat yang ditemukan.${query ? ' Bersihkan filter untuk melihat semua.' : ''}</p>`;
            }
        });

        // Sinkronkan input search setelah render
        if (mobileHistorySearchInput && query) mobileHistorySearchInput.value = query;
        if (desktopHistorySearchInput && query) desktopHistorySearchInput.value = query;
    }

    
    function viewHistoryItem(id) {
        const history = loadHistory();
        const h = history.find(x => x.id === id);
        if (!h) return showCustomModal('Tidak ditemukan', 'Data riwayat tidak ada.', 'error');

        if (historyModal) historyModal.style.display = "none";
        if (closePopup) closePopup.style.display = "flex"; // Pastikan tombol tutup terlihat saat hasil ditampilkan

        currentRecommendation = h.answer; 
        // currentCompoundData tidak disentuh (diasumsikan menggunakan data form saat ini untuk refine)

        popup.querySelector('.popup-title').textContent = `🕘 Riwayat: ${h.nama}`;
        // Flag isHistory di set true agar tidak tersimpan lagi ke riwayat
        showResultPopup({ answer: h.answer }, false, true); 
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
        closePopup.addEventListener("click", () => {
            if (popup) popup.style.display = "none";
        });
    }

    // NEW: HISTORY MODAL EVENT
    if (btnToggleHistory) {
        btnToggleHistory.addEventListener("click", () => {
            if (historyModal) {
                renderHistoryList(mobileHistorySearchInput ? mobileHistorySearchInput.value : ''); // Re-render list saat dibuka
                historyModal.style.display = "flex";
            }
        });
    }

    if (closeHistoryModal) {
        closeHistoryModal.addEventListener("click", () => {
            if (historyModal) historyModal.style.display = "none";
        });
    }


    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            if (popup && popup.style.display === "flex") {
                 // Cek apakah ini modal kustom yang harus di-handle oleh tombolnya (misalnya Hapus)
                if (document.getElementById("confirmDeleteBtn") || document.getElementById("closeModalBtn")) {
                    return; // Biarkan user klik tombol Batal/OK
                }
                popup.style.display = "none";
            } else if (historyModal && historyModal.style.display === "flex") {
                historyModal.style.display = "none";
            }
        }
    });

    // ==================================================================
    // EVENT LISTENER: POPUP ACTION
    // ==================================================================
    if (popup) {
        popup.addEventListener("click", (e) => {
            const id = e.target.id;

            // REFINE (Generate Ulang)
            if (id === "refineResultBtn") {
                const inp = document.getElementById("feedbackInput");
                if (!inp || !currentRecommendation)
                    return showCustomModal("Gagal", "Tidak ada rekomendasi senyawa saat ini.", "error");

                const text = inp.value.trim();
                if (!text)
                    return showCustomModal("Input Kosong", "Masukkan perintah perbaikan!", "error");

                const dataFromForm = collectData(); 
                
                const refineData = {
                    ...dataFromForm, // Kirim input form saat ini
                    currentRecommendation: currentRecommendation,
                    feedback: text,
                };
                // Tutup popup hasil
                popup.style.display = "none"; 
                 if (closePopup) closePopup.style.display = "flex"; // Pastikan tombol tutup kembali normal
                // Mulai proses generate ulang
                collectAndProcessData(ENDPOINT_REFINE, refineData);
            }

            // SAVE
            if (id === "saveResultBtn") {
                if (!currentRecommendation)
                    return showCustomModal("Gagal", "Tidak ada rekomendasi.", "error");
                handleSaveResult(currentRecommendation);
            }

            // NEW SESSION
            if (id === "newChatBtn" || id === "newChatBtn.icon") { // Tambahkan icon jika perlu
                if (form) form.reset();
                currentCompoundData = null;
                currentRecommendation = null;
                popup.style.display = "none";
                 if (closePopup) closePopup.style.display = "flex"; // Pastikan tombol tutup kembali normal
            }

            // CLOSE MODAL
            if (id === "closeModalBtn") {
                popup.style.display = "none";
                if (closePopup) closePopup.style.display = "flex"; // Tampilkan kembali tombol tutup

                if (e.target.textContent === "Selesai") {
                    // Aksi setelah Save Berhasil
                    if (form) form.reset();
                    currentCompoundData = null;
                    currentRecommendation = null;
                } else if (e.target.textContent === "OK") {
                    // Aksi setelah Error / Close
                    if (currentRecommendation) {
                        // Tampilkan ulang hasil generate terakhir jika bukan Save Selesai
                        showResultPopup({ answer: currentRecommendation }, true);
                    }
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
    function showResultPopup(apiResult, isRefinement = false, isHistory = false) {
        if (!popup || !popupContent) return;

        clearInterval(progressInterval);
        if (closePopup) closePopup.style.display = "flex"; // Tampilkan tombol tutup 'X'

        const c = apiResult.answer;
        
        // Cek apakah ini duplikasi (digunakan untuk mencegah double save saat pop up dipanggil ulang)
        const isDuplicateSaveAttempt = currentRecommendation && 
                                           currentRecommendation.nama_senyawa === c?.nama_senyawa &&
                                           currentRecommendation.skor_kecocokan === c?.skor_kecocokan &&
                                           !isRefinement && !isHistory;
        
        currentRecommendation = c;

        const name = c?.nama_senyawa || "Senyawa Baru";

        let titleText = "Hasil Generate Ditemukan!";
        if (isHistory) {
             // Biarkan title dari viewHistoryItem
        } else if (isRefinement) {
            titleText = "✨ Rekomendasi Diperbarui!";
        } else {
            titleText = "Hasil Generate Ditemukan!";
        }
        popup.querySelector(".popup-title").textContent = titleText;

        const riskValue = String(c?.tingkat_risiko_keselamatan || "N/A");
        const riskClass = `risk-${riskValue.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;


        // HTML Content for the popup
        popupContent.innerHTML = `
            <div class="result-header">
                <h3>Senyawa Rekomendasi:
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
                <h4>Justifikasi & Deskripsi</h4>
                <p><strong>Justifikasi:</strong> ${escapeHtml(c?.justifikasi_ringkas || "N/A")}</p>
                <p><strong>Deskripsi Detail:</strong> ${escapeHtml(c?.deskripsi || "N/A")}</p>
            </div>

            <details class="property-details">
                <summary>Lihat Properti Kimia Detail</summary>
                <div class="property-grid">
                    <div><strong>Titik Didih:</strong> ${escapeHtml(c?.titik_didih_celsius || "N/A")} °C</div>
                    <div><strong>Viskositas:</strong> ${escapeHtml(c?.viskositas || "N/A")} cP</div>
                    <div><strong>pH:</strong> ${escapeHtml(c?.ph || "N/A")}</div>
                    <div><strong>Densitas:</strong> ${escapeHtml(c?.densitas_gcm3 || "N/A")} g/cm³</div>
                    <div><strong>Polaritas:</strong> ${escapeHtml(c?.polaritas || "N/A")}</div>
                    <div><strong>Biodegradabilitas:</strong> ${escapeHtml(c?.biodegradabilitas || "N/A")}</div>
                    <div><strong>Sifat Fungsional:</strong> ${escapeHtml(c?.sifat_fungsional || "N/A")}</div>
                    <div><strong>Risiko Keselamatan:</strong>
                        <span class="risk-level ${riskClass}">
                            ${escapeHtml(riskValue)}
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

        // LOGIC KRITIS: Hanya tambahkan ke riwayat jika ini hasil generate/refine baru
        if (!isHistory && !isDuplicateSaveAttempt) {
            try {
                addToHistory(name, currentRecommendation);
                renderHistoryList(); // Update tampilan sidebar/modal history
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

            if (endpoint === ENDPOINT_REFINE) {
                // Simpan data form terbaru setelah refine
                currentCompoundData = collectData(); 
            }

            showResultPopup(result, endpoint === ENDPOINT_REFINE);

        } catch (err) {
            popupContent.innerHTML = `
                <h3>❌ Gagal Generate Senyawa</h3>
                <p>${escapeHtml(err.message)}</p>
                <div class="result-actions" style="justify-content:center; margin-top:20px;">
                    <button id="closeModalBtn" class="btn-modal-action btn-save">OK</button>
                </div>
            `;

            popup.querySelector(".popup-title").textContent = "Error";
            if (closePopup) closePopup.style.display = "none"; // Sembunyikan 'X'
            popup.style.display = "flex";

        } finally {
            setLoadingState(false, endpoint === ENDPOINT_REFINE ? "GENERATE ULANG" : "GENERATE");
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
            
            showCustomModal("Penyimpanan Berhasil!", result.message, true);

        } catch (err) {
            showCustomModal("Error Penyimpanan", err.message, "error");
        }
    }

    
    // ==================================================================
    // INISIALISASI
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