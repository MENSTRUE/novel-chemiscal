// =================================================================
// KONFIGURASI API (Mengikuti Pola generate-page.js)
// =================================================================
const API_BASE_URL = "http://127.0.0.1:8000"; 
const ENDPOINT_COMBINE = "/combine"; // Endpoint untuk menggabungkan senyawa
const ENDPOINT_SAVE = "/save_compound"; // 🔥 Endpoint untuk menyimpan hasil reaksi

// === STATE MANAGEMENT GLOBAL ===
let currentReactionResult = null; // Menyimpan hasil reaksi terakhir dari API
let progressInterval;
const REACTION_STEPS = [
    "Menganalisis sifat kimia reaktan pertama...",
    "Menganalisis sifat kimia reaktan kedua...",
    "Menghitung kompatibilitas molekuler...",
    "Memprediksi jenis reaksi kimia...",
    "Menyusun persamaan stoikiometri...",
    "Menilai risiko dan keselamatan...",
    "Memuat hasil reaksi."
];
// ===============================

document.addEventListener("DOMContentLoaded", () => {
    console.log("Explorasi.js loaded successfully!");
    
    const compoundCards = document.querySelectorAll(".compound-card");
    const box1 = document.querySelector(".reactor-boxes .compound-box:nth-child(1)");
    const box2 = document.querySelector(".reactor-boxes .compound-box:nth-child(3)");
    const btnReset = document.querySelector(".btn-reset");
    const btnGabung = document.querySelector(".btn-gabung");

    console.log("Elements found:", {
        compoundCards: compoundCards.length,
        box1: !!box1,
        box2: !!box2,
        btnReset: !!btnReset,
        btnGabung: !!btnGabung
    });

    let selectedCompounds = [];

    function getCardColor(cardElement) {
        const formulaCircle = cardElement.querySelector(".formula-circle");
        if (formulaCircle) {
            const style = getComputedStyle(formulaCircle);
            return style.backgroundColor;
        }
        return "#ffffff"; 
    }

    function updateReactorBoxes() {
        console.log("Updating reactor boxes...", selectedCompounds);
        
        box1.classList.remove("selected");
        box2.classList.remove("selected");
        box1.innerHTML = '<p class="placeholder-text">Pilih senyawa pertama</p>';
        box2.innerHTML = '<p class="placeholder-text">Pilih senyawa kedua</p>';

        const fillBox = (boxElement, card) => {
            const circleText = card.querySelector(".formula-circle").textContent;
            const compoundName = card.querySelector("h4").textContent;
            const compoundFormula = card.querySelector(".formula-text").textContent;
            const color = getCardColor(card);
            
            boxElement.innerHTML = `
                <div class="selected-compound-display">
                    <div class="formula-circle" style="background-color: ${color}; color: var(--color-background-dark)">${circleText}</div>
                    <h4>${compoundName}</h4>
                    <p class="formula-text">${compoundFormula}</p>
                </div>
            `;
            boxElement.classList.add("selected");
        };

        if (selectedCompounds[0]) {
            fillBox(box1, selectedCompounds[0]);
        }
        if (selectedCompounds[1]) {
            fillBox(box2, selectedCompounds[1]);
        }

        btnGabung.disabled = selectedCompounds.length !== 2;
        if (selectedCompounds.length === 2) {
            btnGabung.style.opacity = "1";
            btnGabung.style.cursor = "pointer";
        } else {
            btnGabung.style.opacity = "0.5";
            btnGabung.style.cursor = "not-allowed";
        }
    }

    compoundCards.forEach((card) => {
        card.addEventListener("click", () => {
            console.log("Card clicked:", card.querySelector("h4").textContent);
            
            const isSelected = card.classList.contains("selected-compound");
            
            if (isSelected) {
                selectedCompounds = selectedCompounds.filter((c) => c !== card);
                card.classList.remove("selected-compound");
            } else {
                if (selectedCompounds.length < 2) {
                    selectedCompounds.push(card);
                    card.classList.add("selected-compound");
                } else {
                    alert("Maksimal hanya 2 senyawa yang dapat dipilih!");
                    return;
                }
            }
            
            updateReactorBoxes();
        });
    });

    btnReset.addEventListener("click", () => {
        console.log("Reset button clicked");
        selectedCompounds = [];
        compoundCards.forEach((card) => {
            card.classList.remove("selected-compound");
        });
        updateReactorBoxes();
        currentReactionResult = null; // Reset hasil reaksi
        console.log("Reaktor Direset.");
    });

    // =================================================================
    // HELPER: LOADING STATE DENGAN PROGRESS BAR (Seperti generate-page.js)
    // =================================================================
    function setLoadingState(isLoading, popupOverlay) {
        if (btnGabung) {
            btnGabung.textContent = isLoading ? "Processing..." : "Gabung";
            btnGabung.disabled = isLoading;
            btnGabung.classList.toggle('loading', isLoading);
        }
        
        if (isLoading && popupOverlay) {
            const popupContent = popupOverlay.querySelector('.popup-content');
            const popupTitle = popupOverlay.querySelector('.popup-header h3');
            
            if (popupTitle) popupTitle.textContent = "⚙️ Memproses Reaksi Kimia...";
            
            // Tampilkan progress bar dengan steps
            if (popupContent) {
                popupContent.innerHTML = `
                    <div id="reaction-progress-display" style="padding: 2rem;">
                        <p style="text-align: center; margin-bottom: 1.5rem; font-size: 1.1rem;">
                            Menganalisis reaksi antara kedua senyawa...<br>
                            Ini mungkin memakan waktu beberapa detik.
                        </p>
                        <ul id="stepList" class="ai-steps" style="list-style: none; padding: 0;">
                            ${REACTION_STEPS.map((step, index) => `
                                <li id="step-${index}" style="padding: 0.5rem; margin: 0.3rem 0; border-left: 3px solid #555; transition: all 0.3s;">
                                    <span>${step}</span>
                                </li>
                            `).join('')}
                        </ul>
                        <div class="loading-bar" style="margin-top: 1.5rem; height: 4px; background: #333; border-radius: 2px; overflow: hidden;">
                            <div style="height: 100%; width: 0%; background: linear-gradient(90deg, #00d4ff, #00ff88); animation: loadingBar 7s ease-in-out infinite;"></div>
                        </div>
                    </div>
                    <style>
                        @keyframes loadingBar {
                            0% { width: 0%; }
                            100% { width: 100%; }
                        }
                        .ai-steps li.active {
                            background: rgba(0, 212, 255, 0.1);
                            border-left-color: #00d4ff;
                            font-weight: bold;
                        }
                    </style>
                `;
                simulateProgress();
            }
        }
    }

    function simulateProgress() {
        let currentStep = 0;
        const stepList = document.getElementById('stepList');
        if (!stepList) return;

        // Reset semua steps
        Array.from(stepList.children).forEach(li => li.className = '');
        
        // Hentikan interval lama jika ada
        if (progressInterval) clearInterval(progressInterval);

        progressInterval = setInterval(() => {
            if (currentStep < REACTION_STEPS.length) {
                const currentLi = document.getElementById(`step-${currentStep}`);
                if (currentLi) {
                    currentLi.classList.add('active'); 
                }
                currentStep++;
            }
            // Interval akan di-clear di showReactionPopup atau catch error
        }, 1000); // Setiap 1 detik ganti step
    }

    // =================================================================
    // FUNGSI UTAMA: PANGGIL API COMBINE (Mengikuti Pola generate-page.js)
    // =================================================================
    async function processCombineReaction(compoundA, compoundB) {
        const compoundAName = compoundA.querySelector("h4").textContent;
        const compoundBName = compoundB.querySelector("h4").textContent;

        // Data yang akan dikirim ke API (sesuai CombineRequest di main.py)
        const dataToSend = {
            compound_a: compoundAName,
            compound_b: compoundBName
        };

        // Buat atau tampilkan popup
        let popupOverlay = getOrCreatePopup();
        popupOverlay.style.display = 'flex';
        
        setLoadingState(true, popupOverlay);

        try {
            console.log(`Mengirim data ke API ${ENDPOINT_COMBINE}:`, dataToSend);
            
            const response = await fetch(`${API_BASE_URL}${ENDPOINT_COMBINE}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(dataToSend),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`HTTP Error ${response.status}: ${errorData.detail || response.statusText}`);
            }

            const result = await response.json();

            if (result.success && result.result) {
                // Simpan hasil ke state global
                currentReactionResult = result.result;
                
                // Tampilkan hasil dari API
                console.log("✅ API Response Success:", result);
                showReactionPopup(compoundA, compoundB, result.result);
            } else {
                throw new Error("Respons API tidak valid: Tidak ada 'success: true' atau 'result'.");
            }

        } catch (error) {
            console.error("Kesalahan saat menggabungkan senyawa:", error);
            clearInterval(progressInterval); // Hentikan progress
            
            // Tampilkan error di popup
            const popupContent = popupOverlay.querySelector('.popup-content');
            if (popupContent) {
                let errorMessage = String(error.message).replace(/['"]+/g, ''); 
                popupContent.innerHTML = `
                    <div style="padding: 2rem; text-align: center;">
                        <h3 style="color: #ff4444;">❌ Gagal Memproses Reaksi</h3>
                        <p style="margin: 1rem 0;">${errorMessage || 'Terjadi kesalahan jaringan atau server.'}</p>
                        <p style="margin-top: 1.5rem; color: #ffaa00;">⚠️ Menggunakan data lokal sebagai fallback...</p>
                    </div>
                `;
            }
            
            // Tunggu 2 detik lalu tampilkan fallback
            setTimeout(() => {
                showReactionPopup(compoundA, compoundB, null);
            }, 2000);
            
        } finally {
            setLoadingState(false, popupOverlay);
        }
    }

    // =================================================================
    // EVENT LISTENER TOMBOL GABUNG
    // =================================================================
    btnGabung.addEventListener("click", () => {
        console.log("Gabung button clicked");
        
        if (selectedCompounds.length === 2) {
            const compoundA = selectedCompounds[0];
            const compoundB = selectedCompounds[1];
            
            // Panggil fungsi API
            processCombineReaction(compoundA, compoundB);
            
        } else {
            alert("Harap pilih 2 senyawa untuk digabungkan.");
        }
    });

    // =================================================================
    // HELPER: GET OR CREATE POPUP
    // =================================================================
    function getOrCreatePopup() {
        let popupOverlay = document.querySelector('.popup-overlay');
        if (!popupOverlay) {
            popupOverlay = document.createElement('div');
            popupOverlay.className = 'popup-overlay';
            popupOverlay.innerHTML = `
                <div class="popup-container">
                    <button class="popup-close">&times;</button>
                    <div class="popup-header">
                        <h3>Reaksi Kimia Berhasil!</h3>
                        <p>Berikut hasil dari reaksi yang Anda lakukan</p>
                    </div>
                    <div class="popup-content">
                        <!-- Konten akan diisi dinamis -->
                    </div>
                    <div class="popup-actions">
                        <!-- Tombol akan diisi dinamis -->
                    </div>
                </div>
            `;
            document.body.appendChild(popupOverlay);

            // Event listener untuk close
            const closeBtn = popupOverlay.querySelector('.popup-close');
            closeBtn.addEventListener('click', () => {
                popupOverlay.style.display = 'none';
                clearInterval(progressInterval);
            });

            popupOverlay.addEventListener('click', (e) => {
                if (e.target === popupOverlay) {
                    popupOverlay.style.display = 'none';
                    clearInterval(progressInterval);
                }
            });
        }
        return popupOverlay;
    }

    // =================================================================
    // POPUP HASIL REAKSI (Dengan Dukungan Data API + SAVE BUTTON)
    // =================================================================
    function showReactionPopup(compoundA, compoundB, apiResult = null) {
        console.log("Showing reaction popup...");
        console.log("API Result:", apiResult);
        
        clearInterval(progressInterval); // Hentikan progress bar
        
        let popupOverlay = getOrCreatePopup();
        const popupContent = popupOverlay.querySelector('.popup-content');
        const popupActions = popupOverlay.querySelector('.popup-actions');
        const popupHeader = popupOverlay.querySelector('.popup-header h3');

        const compAName = compoundA.querySelector('h4').textContent;
        const compBName = compoundB.querySelector('h4').textContent;
        const compAFormula = compoundA.querySelector('.formula-text').textContent;
        const compBFormula = compoundB.querySelector('.formula-text').textContent;
        const compAColor = getCardColor(compoundA);
        const compBColor = getCardColor(compoundB);

        let result;

        // =================================================================
        // PRIORITAS 1: Gunakan Data dari API jika tersedia
        // =================================================================
        if (apiResult) {
            result = {
                name: apiResult.produk_utama || "Hasil Reaksi",
                formula: apiResult.persamaan_stoikiometri || "Produk",
                description: apiResult.deskripsi_ringkas || "Deskripsi tidak tersedia",
                reactionType: apiResult.jenis_reaksi || "Tidak Diketahui",
                risk: apiResult.catatan_risiko || "Tidak ada catatan risiko",
                reaktanA: apiResult.reaktan_a || compAName,
                reaktanB: apiResult.reaktan_b || compBName,
                color: "#2ecc71" // Warna hijau untuk hasil dari API
            };
            console.log("✅ Using API result:", result);
            if (popupHeader) popupHeader.textContent = "✅ Reaksi Kimia Berhasil!";
        } else {
            // =================================================================
            // PRIORITAS 2: Fallback ke Data Lokal
            // =================================================================
            console.log("⚠️ Using fallback local data");
            if (popupHeader) popupHeader.textContent = "⚠️ Hasil Reaksi (Data Lokal)";
            
            const reactionResults = {
                "AirGaram Dapur": {
                    name: "Larutan Garam",
                    formula: "NaCl(aq)",
                    description: "Larutan elektrolit yang menghantarkan listrik. Air dan garam bereaksi membentuk larutan ionik.",
                    reactionType: "Pelarutan",
                    risk: "Aman",
                    color: "#3498db"
                },
                "AirAsam Sulfat": {
                    name: "Larutan Asam Sulfat",
                    formula: "H₂SO₄(aq)",
                    description: "Larutan asam kuat yang sangat korosif. Harap hati-hati dalam penanganannya.",
                    reactionType: "Pelarutan Asam",
                    risk: "Tinggi - Korosif",
                    color: "#f39c12"
                },
                "Garam DapurAsam Sulfat": {
                    name: "Asam Klorida + Natrium Sulfat",
                    formula: "2HCl + Na₂SO₄",
                    description: "Reaksi pertukaran ganda menghasilkan asam klorida dan natrium sulfat.",
                    reactionType: "Pertukaran Ganda",
                    risk: "Sedang",
                    color: "#e74c3c"
                },
                "AirKarbon Dioksida": {
                    name: "Asam Karbonat",
                    formula: "H₂CO₃",
                    description: "Asam lemah yang terbentuk ketika CO₂ larut dalam air, ditemukan dalam minuman berkarbonasi.",
                    reactionType: "Hidrasi",
                    risk: "Rendah",
                    color: "#2ecc71"
                }
            };

            const reactionKey = `${compAName}${compBName}`;
            const reverseKey = `${compBName}${compAName}`;
            
            result = reactionResults[reactionKey] || reactionResults[reverseKey];
            
            if (!result) {
                result = {
                    name: "Campuran Senyawa",
                    formula: "Campuran",
                    description: `Campuran antara ${compAName} dan ${compBName}. Reaksi spesifik belum terdefinisi dalam database.`,
                    reactionType: "Tidak Terdefinisi",
                    risk: "Tidak Diketahui",
                    color: "#9b59b6"
                };
            }
            
            result.reaktanA = compAName;
            result.reaktanB = compBName;
        }

        // =================================================================
        // ISI POPUP DENGAN DATA
        // =================================================================
        popupContent.innerHTML = `
            <div class="reaction-display" style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin: 1.5rem 0; flex-wrap: wrap;">
                <div class="compound-display" style="text-align: center; min-width: 100px;">
                    <div class="formula-circle" style="background-color: ${compAColor}; width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem; font-size: 1rem; font-weight: bold;">
                        ${compoundA.querySelector('.formula-circle').textContent}
                    </div>
                    <h4 style="font-size: 0.95rem; margin: 0.3rem 0;">${compAName}</h4>
                    <p class="formula-text" style="font-size: 0.8rem; color: #888; margin: 0;">${compAFormula}</p>
                </div>
                
                <div class="reaction-arrow" style="font-size: 1.5rem; font-weight: bold; color: #00d4ff;">+</div>
                
                <div class="compound-display" style="text-align: center; min-width: 100px;">
                    <div class="formula-circle" style="background-color: ${compBColor}; width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem; font-size: 1rem; font-weight: bold;">
                        ${compoundB.querySelector('.formula-circle').textContent}
                    </div>
                    <h4 style="font-size: 0.95rem; margin: 0.3rem 0;">${compBName}</h4>
                    <p class="formula-text" style="font-size: 0.8rem; color: #888; margin: 0;">${compBFormula}</p>
                </div>
                
                <div class="reaction-arrow" style="font-size: 1.5rem; font-weight: bold; color: #00ff88;">→</div>
                
                <div class="result-display" style="text-align: center; min-width: 100px;">
                    <div class="formula-circle" style="background-color: ${result.color}; width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem; font-size: 0.85rem; font-weight: bold;">
                        ✓
                    </div>
                    <h4 style="font-size: 0.95rem; margin: 0.3rem 0;">${result.name}</h4>
                </div>
            </div>
            
            <div class="result-details" style="background: rgba(255,255,255,0.05); padding: 1.2rem; border-radius: 8px; margin-top: 1rem; max-height: 300px; overflow-y: auto;">
                <h4 style="margin-bottom: 0.8rem; color: #00d4ff; font-size: 1rem;">📋 Detail Reaksi</h4>
                
                <div style="margin-bottom: 1rem; padding-bottom: 1rem; border-bottom: 1px solid rgba(255,255,255,0.1);">
                    <p style="margin: 0.3rem 0; font-size: 0.9rem;"><strong>Persamaan:</strong></p>
                    <p style="margin: 0.3rem 0; font-size: 0.85rem; color: #00ff88; font-family: monospace;">${result.formula}</p>
                </div>
                
                <div style="margin-bottom: 0.8rem;">
                    <p style="margin: 0.3rem 0; font-size: 0.9rem;"><strong>Deskripsi:</strong></p>
                    <p style="margin: 0.3rem 0; font-size: 0.85rem; color: #ccc; line-height: 1.5;">${result.description}</p>
                </div>
                
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; margin-top: 0.8rem;">
                    <div>
                        <p style="margin: 0.2rem 0; font-size: 0.85rem;"><strong>Jenis Reaksi:</strong></p>
                        <p style="margin: 0.2rem 0; font-size: 0.85rem; color: #00ff88;">${result.reactionType}</p>
                    </div>
                    <div>
                        <p style="margin: 0.2rem 0; font-size: 0.85rem;"><strong>Risiko:</strong></p>
                        <p style="margin: 0.2rem 0; font-size: 0.85rem; color: ${result.risk.includes('Tinggi') ? '#ff4444' : result.risk.includes('Sedang') ? '#ffaa00' : '#00ff88'};">${result.risk}</p>
                    </div>
                </div>
            </div>
        `;

        // =================================================================
        // TOMBOL AKSI (Tutup + Detail + Save)
        // =================================================================
        popupActions.innerHTML = `
            <button class="popup-btn popup-btn-close" style="background: #444; padding: 0.8rem 1.5rem; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem;">
                <i class="fas fa-times"></i> Tutup
            </button>
            <button class="popup-btn popup-btn-details" style="background: #0088cc; padding: 0.8rem 1.5rem; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem;">
                <i class="fas fa-info-circle"></i> Detail Reaksi
            </button>
            ${apiResult ? `
                <button class="popup-btn popup-btn-save" style="background: #00cc66; padding: 0.8rem 1.5rem; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem;">
                    <i class="fas fa-save"></i> Simpan ke Database
                </button>
            ` : ''}
        `;

        // Event listeners untuk tombol
        const closeBtn = popupActions.querySelector('.popup-btn-close');
        const detailsBtn = popupActions.querySelector('.popup-btn-details');
        const saveBtn = popupActions.querySelector('.popup-btn-save');

        closeBtn.addEventListener('click', () => {
            popupOverlay.style.display = 'none';
        });

        detailsBtn.addEventListener('click', () => {
            // Buat popup detail yang lebih lengkap
            showDetailedReactionInfo(result, compAName, compBName);
        });

        // 🔥 TOMBOL SAVE (Hanya muncul jika dari API)
        if (saveBtn && apiResult) {
            saveBtn.addEventListener('click', () => {
                handleSaveReaction(currentReactionResult);
            });
        }

        popupOverlay.style.display = 'flex';
        console.log("Popup displayed successfully!");
    }

    // =================================================================
    // 🔥 FUNGSI SAVE: SIMPAN HASIL REAKSI KE DATABASE
    // =================================================================
    async function handleSaveReaction(reactionData) {
        if (!reactionData) {
            alert("Tidak ada data reaksi untuk disimpan.");
            return;
        }
        
        // Konfirmasi sebelum menyimpan
        const confirmSave = confirm(`Simpan hasil reaksi "${reactionData.produk_utama}" ke database?`);
        if (!confirmSave) return;

        try {
            console.log("Menyimpan hasil reaksi ke database:", reactionData);
            
            const response = await fetch(`${API_BASE_URL}${ENDPOINT_SAVE}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    nama_senyawa: reactionData.produk_utama,
                    rumus_molekul: reactionData.persamaan_stoikiometri,
                    deskripsi: reactionData.deskripsi_ringkas,
                    kategori_aplikasi: "Hasil Reaksi",
                    jenis_reaksi: reactionData.jenis_reaksi,
                    catatan_risiko: reactionData.catatan_risiko,
                    reaktan_a: reactionData.reaktan_a,
                    reaktan_b: reactionData.reaktan_b
                }),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`Gagal menyimpan: ${errorData.detail || response.statusText}`);
            }

            const result = await response.json();
            alert(`✅ Penyimpanan Berhasil!\n${result.message || 'Data reaksi telah disimpan ke database.'}`);
            
            // Reset state setelah berhasil simpan
            currentReactionResult = null;
            
        } catch (error) {
            console.error("Kesalahan saat menyimpan hasil reaksi:", error);
            alert(`❌ Error Penyimpanan:\n${error.message}`);
        }
    }

    // =================================================================
    // 📊 FUNGSI DETAIL REAKSI: TAMPILKAN INFO LENGKAP
    // =================================================================
    function showDetailedReactionInfo(result, compoundAName, compoundBName) {
        // Buat popup detail baru
        const detailPopup = document.createElement('div');
        detailPopup.className = 'popup-overlay';
        detailPopup.style.cssText = 'position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.8); display: flex; align-items: center; justify-content: center; z-index: 10000;';
        
        detailPopup.innerHTML = `
            <div style="background: #1a1a2e; border-radius: 12px; max-width: 600px; width: 90%; max-height: 80vh; overflow-y: auto; padding: 2rem; position: relative;">
                <button class="detail-close" style="position: absolute; top: 1rem; right: 1rem; background: #ff4444; border: none; color: white; width: 35px; height: 35px; border-radius: 50%; cursor: pointer; font-size: 1.2rem; font-weight: bold;">&times;</button>
                
                <h2 style="color: #00d4ff; margin-bottom: 1.5rem; font-size: 1.5rem;">📊 Detail Lengkap Reaksi</h2>
                
                <div style="background: rgba(0,212,255,0.1); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #00d4ff;">
                    <h3 style="color: #00d4ff; font-size: 1.1rem; margin-bottom: 0.5rem;">Reaktan</h3>
                    <p style="margin: 0.3rem 0; color: #ccc;">• <strong>${compoundAName}</strong></p>
                    <p style="margin: 0.3rem 0; color: #ccc;">• <strong>${compoundBName}</strong></p>
                </div>
                
                <div style="background: rgba(0,255,136,0.1); padding: 1rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #00ff88;">
                    <h3 style="color: #00ff88; font-size: 1.1rem; margin-bottom: 0.5rem;">Produk Reaksi</h3>
                    <p style="margin: 0.3rem 0; color: #ccc;"><strong>${result.name}</strong></p>
                    <p style="margin: 0.3rem 0; color: #aaa; font-family: monospace; font-size: 0.9rem;">${result.formula}</p>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="color: #00d4ff; font-size: 1.1rem; margin-bottom: 0.8rem;">🧪 Informasi Reaksi</h3>
                    <table style="width: 100%; border-collapse: collapse;">
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <td style="padding: 0.6rem; color: #aaa; width: 40%;">Jenis Reaksi:</td>
                            <td style="padding: 0.6rem; color: #00ff88; font-weight: bold;">${result.reactionType}</td>
                        </tr>
                        <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                            <td style="padding: 0.6rem; color: #aaa;">Tingkat Risiko:</td>
                            <td style="padding: 0.6rem; color: ${result.risk.includes('Tinggi') ? '#ff4444' : result.risk.includes('Sedang') ? '#ffaa00' : '#00ff88'}; font-weight: bold;">${result.risk}</td>
                        </tr>
                    </table>
                </div>
                
                <div style="margin-bottom: 1.5rem;">
                    <h3 style="color: #00d4ff; font-size: 1.1rem; margin-bottom: 0.8rem;">📝 Deskripsi Lengkap</h3>
                    <p style="color: #ccc; line-height: 1.6; font-size: 0.95rem;">${result.description}</p>
                </div>
                
                <div style="background: rgba(255,170,0,0.1); padding: 1rem; border-radius: 8px; border-left: 4px solid #ffaa00;">
                    <h3 style="color: #ffaa00; font-size: 1rem; margin-bottom: 0.5rem;">⚠️ Catatan Keselamatan</h3>
                    <p style="color: #ccc; font-size: 0.9rem; line-height: 1.5;">${result.risk === 'Aman' || result.risk === 'Rendah' ? 'Reaksi ini relatif aman untuk dilakukan dengan prosedur standar laboratorium.' : result.risk.includes('Tinggi') ? 'PERHATIAN: Reaksi ini memiliki risiko tinggi. Gunakan APD lengkap dan lakukan di ruang berventilasi baik.' : 'Lakukan dengan hati-hati dan gunakan peralatan keselamatan standar.'}</p>
                </div>
                
                <button class="detail-close-btn" style="width: 100%; margin-top: 1.5rem; padding: 0.8rem; background: #0088cc; border: none; color: white; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: bold;">
                    Tutup Detail
                </button>
            </div>
        `;
        
        document.body.appendChild(detailPopup);
        
        // Event listeners untuk menutup
        const closeButton = detailPopup.querySelector('.detail-close');
        const closeBtn = detailPopup.querySelector('.detail-close-btn');
        
        [closeButton, closeBtn].forEach(btn => {
            btn.addEventListener('click', () => {
                detailPopup.remove();
            });
        });
        
        detailPopup.addEventListener('click', (e) => {
            if (e.target === detailPopup) {
                detailPopup.remove();
            }
        });
    }

    updateReactorBoxes();
    console.log("Explorasi.js initialization complete!");
});