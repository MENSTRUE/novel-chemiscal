// File: generate-page.js (VERSI FINAL ITERATIF & FIX)

// =================================================================
// KONFIGURASI API
// =================================================================
const API_BASE_URL = "http://127.0.0.1:8000"; 
const ENDPOINT_GENERATE = "/generate"; // Endpoint awal
const ENDPOINT_REFINE = "/refine";     // 🔥 ENDPOINT BARU: Untuk iterasi feedback
const ENDPOINT_SAVE = "/save_compound"; // 🔥 ENDPOINT BARU: Untuk menyimpan hasil akhir

// === STATE MANAGEMENT GLOBAL ===
let currentCompoundData = null; // Menyimpan input kriteria pengguna (jenisProduk, tujuan, dll)
let currentRecommendation = null; // Menyimpan hasil JSON rekomendasi terakhir
let progressInterval;
const AI_STEPS = [
    "Menentukan kriteria dan preferensi produk...",
    "Mengorkestrasi (Directing) ke Gemini Pro untuk penalaran...",
    "Menjalankan analisis & pencocokan basis data (RAG)..",
    "Membuat Justifikasi & Menghitung Skor Kecocokan...",
    "Memformat output menjadi JSON KETAT...",
    "Selesai! Memuat hasil."
];
// ===============================

document.addEventListener("DOMContentLoaded", function () {
    console.log("generate-page.js loaded");

    // =================================
    // 1. AMBIL ELEMEN UTAMA & POPUP
    // =================================
    const form = document.querySelector(".form-layout");
    const btnGenerate = document.querySelector(".btn-generate");
    const btnBack = document.querySelector(".btn-back");
    const popup = document.getElementById("resultPopup");
    const popupContent = document.getElementById("resultContent");
    const closePopup = document.getElementById("closeResultPopup");

    if (popup) {
        popup.style.display = "none"; 
    }

    // =================================
    // 2. HELPER: LOADING STATE
    // =================================
    function setLoadingState(isLoading, message = "GENERATE") {
        if (btnGenerate) {
            btnGenerate.textContent = isLoading ? "Processing..." : message;
            btnGenerate.disabled = isLoading;
            btnGenerate.classList.toggle('loading', isLoading); 
        }
        
        if (isLoading && popup && popupContent) {
            popup.style.display = "flex";
            const popupTitle = popup.querySelector('.popup-title');
            if (popupTitle) popupTitle.textContent = "⚙️ Memproses Senyawa Baru...";
            
            // Tampilkan progress bar
            popupContent.innerHTML = `
                <div id="ai-progress-display">
                    <p>Memulai Analisis. Ini mungkin memakan waktu beberapa detik...</p>
                    <ul id="stepList" class="ai-steps">
                        ${AI_STEPS.map((step, index) => `<li id="step-${index}"><span>${step}</span></li>`).join('')}
                    </ul>
                </div>
                <div class="loading-bar"></div>
            `;
            simulateProgress();
        }
    }

    function simulateProgress() {
        let currentStep = 0;
        const stepList = document.getElementById('stepList');
        if (!stepList) return;

        Array.from(stepList.children).forEach(li => li.className = '');
        
        // Hentikan interval lama jika ada
        if (progressInterval) clearInterval(progressInterval);

        progressInterval = setInterval(() => {
            if (currentStep < AI_STEPS.length) {
                const currentLi = document.getElementById(`step-${currentStep}`);
                if (currentLi) {
                    currentLi.classList.add('active'); 
                }
                currentStep++;
            } else {
                // Biarkan interval berjalan hingga data API diterima
                // Interval akan di-clear di showResultPopup/catch error
            }
        }, 1000); 
    }

    // =================================
    // 3. EVENT LISTENER
    // =================================
    
    // Submit Form (Hanya untuk inisiasi pertama)
    if (form) {
        form.addEventListener("submit", function (event) {
            event.preventDefault();
            // Panggilan awal selalu menggunakan data dari form
            collectAndProcessData(ENDPOINT_GENERATE, collectData());
        });
    }

    // Tombol Kembali
    if (btnBack) {
        btnBack.addEventListener("click", function (event) {
            event.preventDefault();
            window.location.href = "../../index.html"; 
        });
    }

    // Tutup Popup & Klik Aksi (diperbaiki agar lebih fleksibel)
    if (closePopup) {
        closePopup.addEventListener("click", () => {
            popup.style.display = "none";
        });
    }
    if (popup) {
        popup.addEventListener("click", (e) => {
            // Aksi Refine
            if (e.target.id === 'refineResultBtn') {
                const feedbackInput = document.getElementById('feedbackInput');
                if (feedbackInput && currentCompoundData && currentRecommendation) {
                    const newFeedback = feedbackInput.value.trim();
                    if (newFeedback) {
                        // Gabungkan input awal + rekomendasi + feedback baru
                        const refineData = {
                            ...currentCompoundData,
                            currentRecommendation: currentRecommendation, // Kirim hasil saat ini
                            feedback: newFeedback
                        };
                        // Panggil endpoint /refine
                        collectAndProcessData(ENDPOINT_REFINE, refineData);
                    } else {
                        alert("Harap masukkan perintah perbaikan (feedback) Anda.");
                    }
                }
            }
            // Aksi Simpan
            if (e.target.id === 'saveResultBtn') {
                if (currentRecommendation) {
                    handleSaveResult(currentRecommendation);
                } else {
                    alert('Tidak ada rekomendasi untuk disimpan.');
                }
            }
            // Aksi Mulai Baru (Reset Form)
            if (e.target.id === 'newChatBtn') {
                if (form) form.reset();
                currentCompoundData = null;
                currentRecommendation = null;
                alert('Memulai Sesi Generate Baru. Semua input direset.');
                popup.style.display = 'none';
            }
            
        });
    }
    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape" && popup) popup.style.display = "none";
    });

    // =================================
    // 4. LOGIKA PENGUMPULAN DATA & API CALL
    // =================================
    
    // Fungsi collectData TIDAK BERUBAH karena hanya bertugas mengumpulkan dari FORM
    function collectData() {
        const compoundData = {};
        
        // 1. Input utama (jenisProduk, tujuan)
        const primaryInputs = document.querySelectorAll(
            ".input-row.main-header .input-field"
        );
        compoundData.jenisProduk = primaryInputs[0]?.value.trim() || "";
        compoundData.tujuan = primaryInputs[1]?.value.trim() || "";

        // 2. Properti Kimia (propertiTarget)
        compoundData.propertiTarget = {};
        const propertyGroups = document.querySelectorAll(
            ".input-row.property-group"
        );
        propertyGroups.forEach((group) => {
            const labelInput = group.querySelector(".property-field-label");
            const valueInput = group.querySelector(".property-field-value");
            const rawLabel = labelInput?.value.trim() || "";
            const value = valueInput?.value.trim() || "";

            if (!rawLabel || !value) return;
            
            const key = rawLabel.toLowerCase().replace(/[^a-z0-9]/g, "");
            compoundData.propertiTarget[key] = value;
        });

        // 3. Deskripsi Kriteria Tambahan (deskripsiKriteria) & Logistik
        const textArea = document.querySelector(".textarea-placeholder");
        compoundData.deskripsiKriteria = textArea ? textArea.value.trim() : "";
        
        const wideInputs = document.querySelectorAll(".input-row.wide-input .input-field");
        if(wideInputs.length > 0) {
            let logistikNotes = "Keterbatasan & Preferensi Logistik:\n";
            let addedLogistics = false;
            wideInputs.forEach(input => {
                if (input.value.trim()) {
                    logistikNotes += `- ${input.placeholder}: ${input.value.trim()}\n`;
                    addedLogistics = true;
                }
            });
            if (addedLogistics) {
                compoundData.deskripsiKriteria += (compoundData.deskripsiKriteria ? "\n\n" : "") + logistikNotes;
            }
        }
        
        return compoundData;
    }

    /**
     * Menampilkan hasil generate dari API di popup.
     */
    function showResultPopup(apiResult, isRefinement = false) {
        if (!popup || !popupContent) return;
        
        clearInterval(progressInterval); 

        const compound = apiResult.answer;
        const compoundName = compound.nama_senyawa || 'Senyawa Baru';

        // === SIMPAN STATE REKOMENDASI TERAKHIR ===
        currentRecommendation = compound; 
        
        // --- Konten Utama HTML ---
let htmlContent = `
    <div class="result-header">
        <h3>🧪 Senyawa Rekomendasi ${isRefinement ? "Baru" : "Awal"}: <strong>${compoundName}</strong></h3>
        <p class="match-score">Skor Kecocokan: <span class="score">${compound.skor_kecocokan || 0}%</span></p>
        <p class="molecule-detail">
            <span class="detail-item">Rumus: <strong>${compound.rumus_molekul || 'N/A'}</strong></span> 
            | 
            <span class="detail-item">Berat: ${compound.berat_molekul || 'N/A'} g/mol</span>
        </p>
    </div>
    
    <div class="result-section">
        <h4>📝 Justifikasi & Deskripsi</h4>
        <p><strong>Justifikasi:</strong> ${compound.justifikasi_ringkas || 'N/A'}</p>
        <p><strong>Deskripsi Detail:</strong> ${compound.deskripsi || 'N/A'}</p>
    </div>
    
    <details class="property-details">
        <summary>🔬 Lihat Properti Kimia Detail</summary>
        <div class="property-grid">
            <div><strong>Titik Didih:</strong> ${compound.titik_didih_celsius || 'N/A'} °C</div>
            <div><strong>Densitas:</strong> ${compound.densitas_gcm3 || 'N/A'} g/cm³</div>
            <div><strong>Sifat Fungsional:</strong> ${compound.sifat_fungsional || 'N/A'}</div>
            <div><strong>Risiko Keselamatan:</strong> <span class="risk-level risk-${(compound.tingkat_risiko_keselamatan || 'N/A').toLowerCase()}">${compound.tingkat_risiko_keselamatan || 'N/A'}</span></div>
        </div>
    </details>
    
    <div class="feedback-section">
        <h4>Perlu Perbaikan?</h4>
        <p>Masukkan instruksi perbaikan, misalnya: "Cari yang Titik Didihnya lebih rendah dari 100C" atau "Tekankan sifat fungsional sebagai anti-oksidan."</p>
        <input type="text" id="feedbackInput" placeholder="Masukkan perintah perbaikan (feedback)..." class="feedback-input">
    </div>
    
    <div class="result-actions">
        <button id="newChatBtn" class="btn-action btn-new btn-reset-form">
             <i class="fas fa-plus"></i> Mulai Sesi Baru (Reset Form)
        </button>

        <div class="action-group-right"> 
            <button id="refineResultBtn" class="btn-action btn-refine">
                <i class="fas fa-sync-alt"></i> Generate Rekomendasi Ulang
            </button>
            <button id="saveResultBtn" class="btn-action btn-save">
                <i class="fas fa-check"></i> Save & Selesai
            </button>
        </div>
    </div>
`;
        
        const popupTitle = popup.querySelector('.popup-title');
        if (popupTitle) popupTitle.textContent = "✅ Hasil Generate Ditemukan!";
        
        popupContent.innerHTML = htmlContent;
    }
    
    /**
     * Fungsi utama untuk memanggil API Generate atau Refine.
     */
    async function collectAndProcessData(endpoint, dataToSend) {
        
        // Jika ini adalah panggilan generate awal, simpan input form ke state
        if (endpoint === ENDPOINT_GENERATE) {
             currentCompoundData = dataToSend;
             if (!currentCompoundData.jenisProduk || !currentCompoundData.tujuan) {
                 alert("Harap isi Jenis Produk dan Tujuan Produk (Field utama).");
                 return;
             }
        }
        
        setLoadingState(true);

        // --- Panggilan API ---
        try {
            console.log(`Mengirim data ke API ${endpoint}:`, dataToSend);
            const response = await fetch(`${API_BASE_URL}${endpoint}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSend),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP Error ${response.status}: ${errorData.detail || response.statusText}`);
            }

            const result = await response.json();

            if (result.success && result.answer) {
                // Tampilkan hasil, tandai jika ini iterasi
                showResultPopup(result, endpoint === ENDPOINT_REFINE); 
            } else {
                throw new Error("Respons API tidak valid: Tidak ada 'success: true' atau 'answer'.");
            }

        } catch (error) {
            console.error("Kesalahan saat menghasilkan/memperbaiki senyawa:", error);
            clearInterval(progressInterval); // Hentikan progress
            if (popupContent) {
                let errorMessage = String(error.message).replace(/['"]+/g, ''); 
                popupContent.innerHTML = `<h3>❌ Gagal Generate Senyawa</h3><p>${errorMessage || 'Terjadi kesalahan jaringan atau server.'}</p>`;
                const popupTitle = popup.querySelector('.popup-title');
                if (popupTitle) popupTitle.textContent = "Error";
                popup.style.display = "flex";
            }
        } finally {
            setLoadingState(false, endpoint === ENDPOINT_REFINE ? "RE-GENERATE" : "GENERATE"); 
        }
    }

    // =================================
    // 5. LOGIKA AKSI LANJUTAN (Simpan & Chat Baru)
    // =================================

    // 🔥 Fungsi Simpan: Sekarang memanggil endpoint /save_compound
    async function handleSaveResult(finalCompoundData) {
        if (!finalCompoundData) {
            alert("Tidak ada data final untuk disimpan.");
            return;
        }
        
        alert(`Mengirim senyawa "${finalCompoundData.nama_senyawa}" untuk disimpan.`);
        
        try {
            const response = await fetch(`${API_BASE_URL}${ENDPOINT_SAVE}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(finalCompoundData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Gagal menyimpan: ${errorData.detail || response.statusText}`);
            }

            const result = await response.json();
            alert(`✅ Penyimpanan Berhasil! ${result.message}`);
            // Pindah ke mode Mulai Sesi Baru
            if (form) form.reset();
            currentCompoundData = null;
            currentRecommendation = null;
            popup.style.display = "none";
            
        } catch (error) {
            console.error("Kesalahan saat menyimpan hasil:", error);
            alert(`❌ Error Penyimpanan: ${error.message}`);
        }
    }
});