/* eslint-disable no-unused-vars */
// FILE: explorasi.js (REVISI FINAL: MENGGUNAKAN DELEGASI EVENT UNTUK TOMBOL CANCEL)

// =================================================================
// KONFIGURASI API
// =================================================================
const API_BASE_URL = "http://127.0.0.1:8000"; 
const ENDPOINT_COMBINE = "/combine"; 
const ENDPOINT_SAVE = "/save_compound"; 
const ENDPOINT_GET_ALL = "/get_all_compounds"; 

// === STATE MANAGEMENT GLOBAL ===
let currentReactionResult = null; 
let progressInterval;
let currentPopup = null;

const REACTION_STEPS = [
    "Menganalisis sifat kimia reaktan pertama...",
    "Menganalisis sifat kimia reaktan kedua...",
    "Menghitung kompatibilitas molekuler...",
    "Memprediksi jenis reaksi kimia...",
    "Menyusun persamaan stoikiometri...",
    "Menilai risiko dan keselamatan...",
    "Memuat hasil reaksi."
];

// Variabel Global untuk Senyawa
let selectedCompounds = [];
let allCompoundsData = []; 

document.addEventListener("DOMContentLoaded", () => {
    console.log("Explorasi.js loaded successfully!");
    
    // Ambil elemen utama
    const compoundGrid = document.querySelector(".compound-grid"); 
    const box1 = document.querySelector(".reactor-boxes .compound-box:nth-child(1)");
    const box2 = document.querySelector(".reactor-boxes .compound-box:nth-child(3)");
    const btnReset = document.querySelector(".btn-reset");
    const btnGabung = document.querySelector(".btn-gabung");

    // 1. Inisialisasi: Load data senyawa dari backend
    loadCompoundLibrary();

    // 2. Setup Listeners
    setupReactorListeners();

    // =================================================================
    // HELPER FUNGSIONALITAS UMUM
    // =================================================================

    function getCardColor(cardElement) {
        const colorClasses = [
            'water', 'salt', 'co2', 'sulfat', 'oksigen', 'etanol', 
            'amonia', 'glukosa', 'kalsium', 'besi', 'hcl-2', 'NaOH', 
            'c6h6', 'ch3cooh', 'kcl', 'no', 'hf', 'mgcl2', 'n2o', 
            'cuso4', 'nano3', 'c2h4', 'kmnO4', 'metana'
        ];
        
        let colorClass = null;
        for (let cls of cardElement.classList) {
            if (colorClasses.includes(cls)) {
                colorClass = cls;
                break;
            }
        }

        if (colorClass) {
            const formulaCircle = cardElement.querySelector('.formula-circle');
            if (formulaCircle) {
                return getComputedStyle(formulaCircle).backgroundColor;
            }
        }
        
        return "rgb(0, 174, 239)"; 
    }

    function updateReactorBoxes() {
        box1.classList.remove("selected", "active");
        box2.classList.remove("selected", "active");
        box1.innerHTML = '<p class="placeholder-text">Pilih senyawa pertama</p>';
        box2.innerHTML = '<p class="placeholder-text">Pilih senyawa kedua</p>';

        const fillBox = (boxElement, compound) => {
            const cardElement = document.querySelector(`[data-compound-id="${compound.id}"]`);
            const color = cardElement ? getCardColor(cardElement) : "rgb(0, 174, 239)";

            boxElement.innerHTML = `
                <div class="selected-compound-display" data-compound-id="${compound.id}" data-formula="${compound.rumus_molekul}" style="background-color: ${color};">
                    <h4 class="compound-name">${compound.nama_senyawa}</h4>
                    <p class="formula-text">${compound.rumus_molekul}</p>
                    <button class="remove-compound-btn" data-compound-id="${compound.id}">
                        &times;
                    </button>
                </div>
            `;
            boxElement.classList.add("selected", "active");
        };

        if (selectedCompounds[0]) {
            fillBox(box1, selectedCompounds[0]);
        }
        if (selectedCompounds[1]) {
            fillBox(box2, selectedCompounds[1]);
        }
        
        // Cek kembali status tombol Gabung
        btnGabung.disabled = selectedCompounds.length !== 2;
        if (selectedCompounds.length === 2) {
            btnGabung.style.opacity = "1";
            btnGabung.style.cursor = "pointer";
        } else {
            btnGabung.style.opacity = "0.5";
            btnGabung.style.cursor = "not-allowed";
        }
    }

    function toggleCompoundSelection(cardElement, compoundData) {
        const index = selectedCompounds.findIndex(c => String(c.id) === String(compoundData.id));

        if (index > -1) {
            // Menghapus/Deselect
            selectedCompounds.splice(index, 1);
            cardElement.classList.remove('selected-compound');
        } else {
            // Memilih/Select
            if (selectedCompounds.length < 2) {
                selectedCompounds.push(compoundData);
                cardElement.classList.add('selected-compound');
            } else {
                showTemporaryMessage("Peringatan", "Maksimal hanya 2 senyawa yang dapat digabungkan!", '#ffaa00');
                return;
            }
        }
        updateReactorBoxes();
    }
    
    // --- FUNGSI DELEGASI CLICK UNTUK TOMBOL CANCEL ---
    function handleCompoundRemoval(targetElement) {
        let compoundId = null;
        
        // Kasus 1: Mengklik tombol 'x' atau ikon di dalamnya
        if (targetElement.classList.contains('remove-compound-btn') || targetElement.closest('.remove-compound-btn')) {
            const btn = targetElement.closest('.remove-compound-btn');
            compoundId = btn.dataset.compoundId;
        } 
        // Kasus 2: Mengklik area card di dalam box reaktor
        else if (targetElement.classList.contains('selected-compound-display') || targetElement.closest('.selected-compound-display')) {
             const display = targetElement.closest('.selected-compound-display');
             compoundId = display.dataset.compoundId;
        }
        
        if (compoundId) {
            const cardToDeselect = document.querySelector(`.compound-card[data-compound-id="${compoundId}"]`);
            const compoundDataToRemove = allCompoundsData.find(c => String(c.id) === compoundId);
            
            if (cardToDeselect && compoundDataToRemove) {
                // Hapus senyawa
                toggleCompoundSelection(cardToDeselect, compoundDataToRemove);
                return true;
            }
        }
        return false;
    }


    function setupReactorListeners() {
        btnGabung.addEventListener('click', () => {
            if (selectedCompounds.length === 2) {
                const compA = selectedCompounds[0];
                const compB = selectedCompounds[1];
                processCombineReaction(compA, compB);
            } else {
                showTemporaryMessage("Peringatan", "Harap pilih tepat 2 senyawa untuk digabungkan.", '#ffaa00');
            }
        });

        btnReset.addEventListener("click", () => {
            selectedCompounds = [];
            document.querySelectorAll(".compound-card").forEach((card) => {
                card.classList.remove("selected-compound");
            });
            updateReactorBoxes();
            currentReactionResult = null; 
            console.log("Reaktor Direset.");
        });
        
        // ==========================================================
        // DELEGASI EVENT UNTUK TOMBOL CANCEL (Paling Stabil)
        // ==========================================================
        
        document.addEventListener('click', (event) => {
            const target = event.target;
            
            // Cek apakah klik terjadi di dalam box reaktor
            if (target.closest('.reactor-boxes')) {
                // Cek apakah target atau parent-nya adalah compound-box yang sudah terisi
                const clickedBox = target.closest('.compound-box.selected');
                
                if (clickedBox) {
                    // Coba hapus senyawa berdasarkan target klik
                    const wasCompoundRemoved = handleCompoundRemoval(target);
                    
                    if (wasCompoundRemoved) {
                        event.stopPropagation();
                        // Karena handleCompoundRemoval memanggil updateReactorBoxes(), DOM akan berubah
                    }
                }
            }
        });
    }
    
    function showTemporaryMessage(title, message, color) {
        let popupOverlay = getOrCreatePopup();
        const popupHeader = popupOverlay.querySelector('.popup-header h3');
        const popupContent = popupOverlay.querySelector('.popup-content');
        const popupActions = popupOverlay.querySelector('.popup-actions');
        
        popupHeader.textContent = title;
        popupHeader.style.color = color;
        popupContent.innerHTML = `<p style="text-align: center; color: #ccc;">${message}</p>`;
        
        popupActions.innerHTML = `<button class="popup-btn popup-btn-close" id="tempCloseBtn" style="background: #444; color: white; padding: 0.6rem 1.2rem; border: none; border-radius: 5px; cursor: pointer; font-size: 0.9rem; margin-left: auto;">
                                     Tutup
                                 </button>`;
        
        const tempCloseBtn = popupActions.querySelector('#tempCloseBtn');
        if (tempCloseBtn) {
            tempCloseBtn.addEventListener('click', () => {
                popupOverlay.style.display = 'none';
            });
        }

        popupOverlay.style.display = 'flex';
    }

    // =================================================================
    // FUNGSI LOADING
    // =================================================================
    function setLoadingState(isLoading, popupElement = null, message = "GABUNGKAN") {
        const btnGabung = document.querySelector(".btn-gabung");
        
        if (btnGabung) {
            btnGabung.textContent = isLoading ? "Processing..." : message;
            btnGabung.disabled = isLoading;
            btnGabung.classList.toggle('loading', isLoading);
        }

        if (isLoading && popupElement) {
            const popupContent = popupElement.querySelector('.popup-content');
            const popupTitle = popupElement.querySelector('#popupTitle'); 
            
            if (popupTitle) popupTitle.textContent = "⚙️ Memproses Reaksi...";
            
            if (popupContent) {
                popupContent.innerHTML = `
                    <div id="ai-progress-display">
                        <p>Memulai Analisis Reaksi. Ini mungkin memakan waktu beberapa detik...</p>
                        <ul id="stepList" class="ai-steps" style="list-style: none; padding: 0; margin: 20px 0;">
                            ${REACTION_STEPS.map((step, index) => 
                                `<li id="step-${index}" style="margin: 10px 0; padding: 8px 15px; background: rgba(0,0,0,0.3); border-radius: 5px; border-left: 3px solid #444;">
                                    <span>${step}</span>
                                </li>`
                            ).join('')}
                        </ul>
                    </div>
                    <div class="loading-bar"></div>
                `;
                
                const styleId = 'loading-animation-style';
                if (!document.getElementById(styleId)) {
                    const style = document.createElement('style');
                    style.id = styleId;
                    style.textContent = `
                        @keyframes loading {
                            0% { background-position: 100% 0; }
                            100% { background-position: -100% 0; }
                        }
                        .ai-steps li.active {
                            border-left-color: #00aeef !important;
                            background: rgba(0, 174, 239, 0.1) !important;
                            color: #00aeef !important;
                        }
                        .ai-steps li.active span {
                            color: #00aeef !important;
                        }
                    `;
                    document.head.appendChild(style);
                }
                
                simulateReactionProgress();
            }
        }
    }

    function simulateReactionProgress() {
        let currentStep = 0;
        const stepList = document.getElementById('stepList');
        if (!stepList) return;

        Array.from(stepList.children).forEach(li => {
            li.style.borderLeftColor = '#444';
            li.style.background = 'rgba(0,0,0,0.3)';
            li.style.color = '#aaa';
            li.classList.remove('active');
        });

        if (progressInterval) clearInterval(progressInterval);

        progressInterval = setInterval(() => {
            if (currentStep < REACTION_STEPS.length) {
                const currentLi = document.getElementById(`step-${currentStep}`);
                if (currentLi) {
                    currentLi.classList.add('active');
                    currentLi.style.borderLeftColor = '#00aeef';
                    currentLi.style.background = 'rgba(0, 174, 239, 0.1)';
                    currentLi.style.color = '#00aeef';
                }
                currentStep++;
            }
        }, 800);
    }

    // =================================================================
    // FUNGSI DINAMIS LOAD DATA
    // =================================================================

    async function loadCompoundLibrary() {
        compoundGrid.innerHTML = '<p style="text-align: center; color: #00bfff;">Memuat perpustakaan senyawa...</p>';

        try {
            const response = await fetch(`${API_BASE_URL}${ENDPOINT_GET_ALL}`);
            
            if (!response.ok) {
                throw new Error(`HTTP Error! Status: ${response.status}. Cek log backend.`);
            }

            allCompoundsData = await response.json();
            
            if (allCompoundsData && allCompoundsData.length > 0) {
                renderCompoundCards(allCompoundsData);
            } else {
                compoundGrid.innerHTML = '<p class="error-message">Database senyawa kosong.</p>';
            }

        } catch (error) {
            console.error("Gagal memuat data senyawa dari API:", error);
            compoundGrid.innerHTML = `<p class="error-message" style="color: #ff4444; text-align: center;">❌ Gagal memuat data. Detail: ${error.message}</p>`;
        }
    }

    function renderCompoundCards(compounds) {
        compoundGrid.innerHTML = ''; 

        compounds.forEach((compound, index) => {
            const name = compound.nama_senyawa || 'Senyawa Tak Dikenal';
            const formula = compound.rumus_molekul || 'N/A';
            const description = compound.deskripsi || 'Belum ada deskripsi detail.';
            const id = String(compound.id || index); 

            const card = document.createElement('div');
            card.className = 'compound-card';
            card.dataset.compoundName = name;
            card.dataset.compoundId = id;
            
            const colorClasses = ['water', 'salt', 'co2', 'sulfat', 'oksigen', 'etanol', 'amonia', 'glukosa', 'kalsium', 'besi', 'hcl-2', 'NaOH', 'c6h6', 'ch3cooh', 'kcl', 'no', 'hf', 'mgcl2', 'n2o', 'cuso4', 'nano3', 'c2h4', 'kmnO4', 'metana'];
            const colorClass = colorClasses[index % colorClasses.length]; 
            card.classList.add(colorClass); 

            card.innerHTML = `
                <div class="formula-circle">${formula}</div>
                <h4>${name}</h4>
                <p class="formula-text">${formula}</p>
                <p class="description">${description.length > 100 ? description.substring(0, 100) + '...' : description}</p>
            `;

            if (selectedCompounds.some(c => String(c.id) === id)) {
                card.classList.add('selected-compound');
            }

            const compoundDataForHandler = {
                id: id,
                nama_senyawa: name,
                rumus_molekul: formula,
                deskripsi: description
            };

            card.addEventListener('click', () => toggleCompoundSelection(card, compoundDataForHandler));
            compoundGrid.appendChild(card);
        });
        updateReactorBoxes();
    }

    // =================================================================
    // FUNGSI API CALL & POPUP HASIL
    // =================================================================

    function getOrCreatePopup() {
        if (currentPopup) {
            currentPopup.remove();
        }
        
        const popupOverlay = document.createElement('div');
        popupOverlay.className = 'popup-overlay';
        popupOverlay.id = 'reactionPopup';
        
        popupOverlay.innerHTML = `
            <div class="popup-container" style="background: #111; border-radius: 12px; max-width: 700px; width: 90%; box-shadow: 0 0 25px rgba(0, 191, 255, 0.4); padding: 1.5rem; position: relative;">
                <button class="popup-close" id="mainCloseBtn" style="position: absolute; top: 10px; right: 15px; background: #e74c3c; border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer;">&times;</button>
                <div class="popup-header">
                    <h3 style="color: #00bfff;" id="popupTitle">Hasil Reaksi</h3>
                    <p style="color: #aaa; font-size: 0.9rem;">Berikut hasil dari reaksi yang Anda lakukan</p>
                </div>
                <div class="popup-content" id="popupContent"></div>
                <div class="popup-actions" id="popupActions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);"></div>
            </div>
        `;
        
        document.body.appendChild(popupOverlay);
        currentPopup = popupOverlay;

        const mainCloseBtn = popupOverlay.querySelector('#mainCloseBtn');
        if (mainCloseBtn) {
            mainCloseBtn.addEventListener('click', () => {
                popupOverlay.style.display = 'none';
                clearInterval(progressInterval);
            });
        }

        popupOverlay.addEventListener('click', (e) => {
            if (e.target === popupOverlay) {
                popupOverlay.style.display = 'none';
                clearInterval(progressInterval);
            }
        });
        
        return popupOverlay;
    }

    async function processCombineReaction(compoundA, compoundB) {
        const dataToSend = {
            compound_a: compoundA.nama_senyawa,
            compound_b: compoundB.nama_senyawa
        };

        let popupOverlay = getOrCreatePopup();
        popupOverlay.style.display = 'flex';
        
        setLoadingState(true, popupOverlay, "GABUNGKAN");

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
                currentReactionResult = result.result;
                console.log("✅ API Response Success:", result);
                showReactionPopup(compoundA, compoundB, result.result);
            } else {
                throw new Error("Respons API tidak valid: Tidak ada 'success: true' atau 'result'.");
            }

        } catch (error) {
            console.error("Kesalahan saat menggabungkan senyawa:", error);
            clearInterval(progressInterval); 
            
            const popupContent = popupOverlay.querySelector('#popupContent');
            const popupActions = popupOverlay.querySelector('#popupActions');
            const popupTitle = popupOverlay.querySelector('#popupTitle');

            if (popupTitle) popupTitle.textContent = "❌ Gagal Reaksi";
            if (popupContent) {
                let errorMessage = String(error.message).replace(/['"]+/g, ''); 
                popupContent.innerHTML = `
                    <div style="padding: 1rem; text-align: center;">
                        <h3 style="color: #ff4444; margin-bottom: 0.5rem;">Gagal Memproses Reaksi</h3>
                        <p style="color: #ffaa00; font-size: 0.9rem;">${errorMessage || 'Terjadi kesalahan jaringan atau server.'}</p>
                    </div>
                `;
            }
            
            if (popupActions) {
                popupActions.innerHTML = `<button class="popup-btn popup-btn-close" id="errorCloseBtn" style="background: #e74c3c; color: white; padding: 0.8rem 1.5rem; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem; margin-left: auto;">
                                             <i class="fas fa-times"></i> Tutup
                                         </button>`;
                
                const errorCloseBtn = popupActions.querySelector('#errorCloseBtn');
                if (errorCloseBtn) {
                    errorCloseBtn.addEventListener('click', () => {
                        popupOverlay.style.display = 'none';
                    });
                }
            }
        } finally {
            setLoadingState(false, null, "GABUNGKAN");
        }
    }

    // =================================================================
    // FUNGSI UTAMA SHOW REACTION POPUP
    // =================================================================
    function showReactionPopup(compoundA, compoundB, apiResult = null) {
        console.log("Showing reaction popup...");
        
        clearInterval(progressInterval); 
        
        let popupOverlay = currentPopup || getOrCreatePopup();
        const popupContent = popupOverlay.querySelector('#popupContent');
        const popupActions = popupOverlay.querySelector('#popupActions');
        const popupTitle = popupOverlay.querySelector('#popupTitle');

        // Reset semua konten popup
        popupContent.innerHTML = '';
        popupActions.innerHTML = '';

        const compAName = compoundA.nama_senyawa;
        const compBName = compoundB.nama_senyawa;
        const compAFormula = compoundA.rumus_molekul;
        const compBFormula = compoundB.rumus_molekul;
        
        const cardA = document.querySelector(`[data-compound-id="${compoundA.id}"]`);
        const cardB = document.querySelector(`[data-compound-id="${compoundB.id}"]`);
        const compAColor = cardA ? getCardColor(cardA) : "#00aeef";
        const compBColor = cardB ? getCardColor(cardB) : "#ff00aa";

        let result;

        if (apiResult) {
            result = {
                name: apiResult.produk_utama || "Hasil Reaksi",
                formula: apiResult.persamaan_stoikiometri || "Produk",
                description: apiResult.deskripsi_ringkas || "Deskripsi tidak tersedia",
                reactionType: apiResult.jenis_reaksi || "Tidak Diketahui",
                risk: apiResult.catatan_risiko || "Tidak ada catatan risiko",
                reaktanA: apiResult.reaktan_a || compAName,
                reaktanB: apiResult.reaktan_b || compBName,
                color: "#2ecc71"
            };
            if (popupTitle) popupTitle.textContent = "✅ Reaksi Kimia Berhasil!";
        } else {
            result = {
                name: "Hasil Campuran",
                formula: "N/A",
                description: "Gagal mendapatkan hasil dari API. Tidak ada data lokal fallback.",
                reactionType: "N/A",
                risk: "Unknown",
                color: "#9b59b6"
            };
            if (popupTitle) popupTitle.textContent = "⚠️ Hasil Reaksi (Fallback)";
        }

        const initialDisplayHTML = `
            <div class="reaction-display" style="display: flex; align-items: center; justify-content: center; gap: 1rem; margin: 1.5rem 0; flex-wrap: wrap;">
                <div class="compound-display" style="text-align: center; min-width: 100px;">
                    <div class="formula-circle" style="background-color: ${compAColor}; width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem; font-size: 1rem; font-weight: bold;">
                        ${compAFormula}
                    </div>
                    <h4 style="font-size: 0.95rem; margin: 0.3rem 0;">${compAName}</h4>
                    <p class="formula-text" style="font-size: 0.8rem; color: #888; margin: 0;">${compAFormula}</p>
                </div>
                
                <div class="reaction-arrow" style="font-size: 1.5rem; font-weight: bold; color: #00d4ff;">+</div>
                
                <div class="compound-display" style="text-align: center; min-width: 100px;">
                    <div class="formula-circle" style="background-color: ${compBColor}; width: 70px; height: 70px; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin: 0 auto 0.5rem; font-size: 1rem; font-weight: bold;">
                        ${compBFormula}
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
            
            <div id="detailSection" style="display: none;">
                <div style="display: flex; justify-content: space-between; flex-wrap: wrap; gap: 1rem; margin-bottom: 1.5rem;">
                    <div style="flex: 1; min-width: 200px;">
                        <div style="background: rgba(0,174,239,0.1); padding: 1rem; border-radius: 8px; border-left: 4px solid #00aeef;">
                            <h4 style="color: #00aeef; font-size: 0.9rem; margin-bottom: 0.5rem;">Reaktan 1 (${compoundA.nama_senyawa})</h4>
                            <p style="color: #fff; font-size: 1.1rem; font-weight: bold; margin: 0;">${compoundA.rumus_molekul}</p>
                        </div>
                    </div>
                    <div style="flex: 1; min-width: 200px;">
                        <div style="background: rgba(255,0,170,0.1); padding: 1rem; border-radius: 8px; border-left: 4px solid #ff00aa;">
                            <h4 style="color: #ff00aa; font-size: 0.9rem; margin-bottom: 0.5rem;">Reaktan 2 (${compoundB.nama_senyawa})</h4>
                            <p style="color: #fff; font-size: 1.1rem; font-weight: bold; margin: 0;">${compoundB.rumus_molekul}</p>
                        </div>
                    </div>
                </div>
                
                <div style="background: rgba(0,255,136,0.1); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border-left: 4px solid #00ff88;">
                    <h4 style="color: #00ff88; font-size: 1rem; margin-bottom: 0.8rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-flask"></i> Hasil Reaksi
                    </h4>
                    <div style="display: flex; align-items: center; gap: 1rem; flex-wrap: wrap;">
                        <div style="background: #00ff88; color: #000; padding: 0.5rem 1rem; border-radius: 6px; font-weight: bold; font-size: 1.1rem;">
                            ${result.name}
                        </div>
                        <div style="color: #fff; font-size: 0.9rem;">
                            ${result.formula.includes('+') ? 'Produk sampingan lainnya...' : ''}
                        </div>
                    </div>
                    <p style="color: #ccc; font-size: 0.9rem; margin-top: 10px;">Persamaan: ${result.formula}</p>
                </div>
                
                <div style="background: rgba(30, 30, 63, 0.8); padding: 1.5rem; border-radius: 8px; margin-bottom: 1.5rem; border: 1px solid rgba(0,174,239,0.3);">
                    <h4 style="color: #00aeef; font-size: 1rem; margin-bottom: 1rem; display: flex; align-items: center; gap: 0.5rem;">
                        <i class="fas fa-info-circle"></i> Detail Reaksi
                    </h4>
                    
                    <div style="display: grid; grid-template-columns: auto 1fr; gap: 0.8rem; margin-bottom: 1rem;">
                        <div style="color: #aaa; font-size: 0.9rem;">Jenis Reaksi:</div>
                        <div style="color: #fff; font-weight: bold;">${result.reactionType}</div>
                        
                        <div style="color: #aaa; font-size: 0.9rem;">Risiko:</div>
                        <div style="color: ${result.risk.includes('Tinggi') ? '#ff4444' : result.risk.includes('Sedang') ? '#ffaa00' : '#00ff88'}; font-weight: bold;">${result.risk}</div>
                    </div>
                    
                    <div style="background: rgba(255, 68, 68, 0.1); padding: 1rem; border-radius: 6px; border-left: 3px solid #ff4444; margin-top: 1rem;">
                        <h5 style="color: #ffaa00; font-size: 0.9rem; margin-bottom: 0.5rem;">⚠️ Catatan Keselamatan:</h5>
                        <p style="color: #ccc; font-size: 0.85rem; line-height: 1.5; margin: 0;">
                            ${generateSafetyDescription(result.reactionType, result.risk, compAName, compBName)}
                        </p>
                    </div>
                </div>
                
                <button id="saveDetailBtn" style="width: 100%; padding: 1rem; background: linear-gradient(135deg, #00cc66, #00994d); border: none; color: white; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: bold; display: flex; align-items: center; justify-content: center; gap: 0.5rem;">
                    <i class="fas fa-save"></i> Simpan ke Database
                </button>
                
                <button id="backToMainBtn" style="width: 100%; margin-top: 1rem; padding: 0.8rem; background: #444; border: none; color: white; border-radius: 8px; font-size: 0.9rem; cursor: pointer;">
                    ← Kembali ke Hasil Reaksi
                </button>
            </div>
        `;

        popupContent.innerHTML = initialDisplayHTML;

        // BAGIAN 2: TOMBOL AKSI UTAMA
        const mainActionsHTML = `
            <button id="detailReactionBtn" class="popup-btn popup-btn-details" style="background: #0088cc; padding: 0.8rem 1.5rem; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem; color: white;">
                <i class="fas fa-info-circle"></i> Detail Reaksi
            </button>
            ${apiResult ? `
                <button id="saveReactionBtn" class="popup-btn popup-btn-save" style="background: #00cc66; padding: 0.8rem 1.5rem; border: none; color: white; border-radius: 5px; cursor: pointer; font-size: 1rem;">
                    <i class="fas fa-save"></i> Simpan ke Database
                </button>
            ` : ''}
        `;

        popupActions.innerHTML = mainActionsHTML;

        // BAGIAN 3: EVENT LISTENERS
        // 1. Tombol Detail Reaksi
        const detailReactionBtn = popupActions.querySelector('#detailReactionBtn');
        if (detailReactionBtn) {
            detailReactionBtn.addEventListener('click', () => {
                popupActions.style.display = 'none';
                popupContent.querySelector('.reaction-display').style.display = 'none';
                const detailSection = popupContent.querySelector('#detailSection');
                if (detailSection) {
                    detailSection.style.display = 'block';
                    
                    const saveDetailBtn = detailSection.querySelector('#saveDetailBtn');
                    if (saveDetailBtn && apiResult) {
                        saveDetailBtn.addEventListener('click', () => {
                            handleSaveReaction(apiResult);
                        });
                    }
                }
            });
        }

        // 2. Tombol Back to Main (dari detail)
        const backToMainBtn = popupContent.querySelector('#backToMainBtn');
        if (backToMainBtn) {
            backToMainBtn.addEventListener('click', () => {
                const detailSection = popupContent.querySelector('#detailSection');
                if (detailSection) {
                    detailSection.style.display = 'none';
                }
                popupContent.querySelector('.reaction-display').style.display = 'flex';
                popupActions.style.display = 'flex';
            });
        }

        // 3. Tombol Save (utama)
        if (apiResult) {
            const saveReactionBtn = popupActions.querySelector('#saveReactionBtn');
            if (saveReactionBtn) {
                saveReactionBtn.addEventListener('click', () => {
                    handleSaveReaction(apiResult);
                });
            }
        }

        popupOverlay.style.display = 'flex';
    }

    // =================================================================
    // HELPER FUNCTION: GENERATE SAFETY DESCRIPTION
    // =================================================================
    function generateSafetyDescription(reactionType, riskLevel, compoundA, compoundB) {
        const baseDescription = "Reaksi kimia ini memerlukan penanganan khusus. ";
        
        if (riskLevel.includes("Tinggi") || riskLevel.includes("tinggi")) {
            return `${baseDescription}Kedua reaktan (${compoundA} dan ${compoundB}) memiliki sifat korosif dan dapat menyebabkan luka bakar parah pada kulit dan kerusakan mata. Reaksi ${reactionType} ini bersifat eksotermik, melepaskan panas yang dapat menyebabkan larutan memanas dan berpotensi memercik. Penanganan harus dilakukan dengan hati-hati menggunakan alat pelindung diri (APD) yang sesuai seperti sarung tangan, pelindung mata, dan jas lab, serta di area berventilasi baik.`;
        } else if (riskLevel.includes("Sedang") || riskLevel.includes("sedang")) {
            return `${baseDescription}Reaktan dapat menyebabkan iritasi pada kulit dan mata. Reaksi ${reactionType} ini dapat menghasilkan panas atau gas. Gunakan alat pelindung dasar dan lakukan di area berventilasi.`;
        } else {
            return `${baseDescription}Reaksi ${reactionType} ini relatif aman dengan risiko rendah. Tetap gunakan alat pelindung standar laboratorium dan lakukan dengan pengawasan.`;
        }
    }

    // =================================================================
    // FUNGSI SAVE: SIMPAN HASIL REAKSI KE DATABASE
    // =================================================================
    async function handleSaveReaction(reactionData) {
        if (!reactionData) {
            showTemporaryMessage("Peringatan", "Tidak ada data reaksi untuk disimpan.", '#ffaa00');
            return;
        }
        
        const userConfirmed = confirm(`Simpan hasil reaksi "${reactionData.produk_utama}" ke database?`);
        if (!userConfirmed) return;

        try {
            console.log("Menyimpan hasil reaksi ke database:", reactionData);
            
            showTemporaryMessage("Penyimpanan", `Mengirim senyawa "${reactionData.produk_utama}" untuk disimpan.`, '#00bfff');

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
            
            showTemporaryMessage("Penyimpanan Berhasil!", result.message || 'Data reaksi telah disimpan ke database.', '#2ecc71');
            
            currentReactionResult = null;
            loadCompoundLibrary();
            
        } catch (error) {
            console.error("Kesalahan saat menyimpan hasil reaksi:", error);
            showTemporaryMessage("Error Penyimpanan", `Gagal menyimpan: ${error.message}`, '#ff4444');
        }
    }
});