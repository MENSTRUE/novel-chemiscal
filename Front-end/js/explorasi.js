/* eslint-disable no-irregular-whitespace */
// FILE: explorasi.js (GABUNGAN AKHIR BERSIH & FIXED)

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
        // Logika mendapatkan warna card
        if (cardElement.classList.contains('selected-compound')) {
            const tempBox = document.createElement('div');
            tempBox.style.cssText = 'display: none;';
            document.body.appendChild(tempBox);
            for (let cls of cardElement.classList) {
                if (['water', 'salt', 'co2', 'sulfat', 'oksigen', 'etanol', 'amonia', 'glukosa', 'kalsium', 'besi', 'hcl-2', 'NaOH', 'c6h6', 'ch3cooh', 'kcl', 'no', 'hf', 'mgcl2', 'n2o', 'cuso4', 'nano3', 'c2h4', 'kmnO4'].includes(cls)) {
                    tempBox.className = cls;
                    const style = getComputedStyle(tempBox);
                    const backgroundColor = style.backgroundColor;
                    tempBox.remove();
                    return backgroundColor;
                }
            }
            tempBox.remove();
        }
        return "rgb(17, 17, 17)"; 
    }

    function updateReactorBoxes() {
        box1.classList.remove("selected", "active");
        box2.classList.remove("selected", "active");
        box1.innerHTML = '<p class="placeholder-text">Pilih senyawa pertama</p>';
        box2.innerHTML = '<p class="placeholder-text">Pilih senyawa kedua</p>';

        const fillBox = (boxElement, compound) => {
            const cardElement = document.querySelector(`[data-compound-id="${compound.id}"]`);
            const color = getCardColor(cardElement);

            boxElement.innerHTML = `
                <div class="selected-compound-display">
                    <div class="formula-circle" style="background-color: ${color};">${compound.rumus_molekul}</div>
                    <h4>${compound.nama_senyawa}</h4>
                    <p class="formula-text">${compound.rumus_molekul}</p>
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
        const index = selectedCompounds.findIndex(c => c.id === compoundData.id);

        if (index > -1) {
            selectedCompounds.splice(index, 1);
            cardElement.classList.remove('selected-compound');
        } else {
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
            document.getElementById('reactionResultArea').innerHTML = '';
            console.log("Reaktor Direset.");
        });
    }
    
    // 🔥 FUNGSI BARU: Menampilkan pesan sederhana di popup sementara
    function showTemporaryMessage(title, message, color) {
        let popupOverlay = getOrCreatePopup();
        const popupHeader = popupOverlay.querySelector('.popup-header h3');
        const popupContent = popupOverlay.querySelector('.popup-content');
        const popupActions = popupOverlay.querySelector('.popup-actions');
        
        popupHeader.textContent = title;
        popupHeader.style.color = color;
        popupContent.innerHTML = `<p style="text-align: center; color: #ccc;">${message}</p>`;
        
        // Hapus tombol aksi dan ganti dengan tombol Tutup
        popupActions.innerHTML = `<button class="popup-btn popup-btn-close" style="background: #444; color: white; padding: 0.6rem 1.2rem; border: none; border-radius: 5px; cursor: pointer; font-size: 0.9rem; margin-left: auto;">
                                    Tutup
                                </button>`;
        popupActions.querySelector('.popup-btn-close').addEventListener('click', () => {
            popupOverlay.style.display = 'none';
        });

        popupOverlay.style.display = 'flex';
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
            const id = compound.id || index; 

            const card = document.createElement('div');
            card.className = 'compound-card';
            card.dataset.compoundName = name;
            card.dataset.compoundId = id;
            
            // Rotasi class warna berdasarkan index
            const colorClasses = ['water', 'salt', 'co2', 'sulfat', 'oksigen', 'etanol', 'amonia', 'glukosa', 'kalsium', 'besi'];
            const colorClass = colorClasses[index % colorClasses.length]; 
            card.classList.add(colorClass); 

            card.innerHTML = `
                <div class="formula-circle">${formula}</div>
                <h4>${name}</h4>
                <p class="formula-text">${formula}</p>
                <p class="description">${description.length > 100 ? description.substring(0, 100) + '...' : description}</p>
            `;

            const compoundDataForHandler = {
                id: id,
                nama_senyawa: name,
                rumus_molekul: formula,
                deskripsi: description
            };

            card.addEventListener('click', () => toggleCompoundSelection(card, compoundDataForHandler));
            compoundGrid.appendChild(card);
        });
    }


    // =================================================================
    // FUNGSI API CALL & POPUP HASIL
    // =================================================================

    // HELPER: GET OR CREATE POPUP
    function getOrCreatePopup() {
        let popupOverlay = document.querySelector('.popup-overlay');
        if (!popupOverlay) {
            popupOverlay = document.createElement('div');
            popupOverlay.className = 'popup-overlay';
            // HANYA MEMBUAT STRUKTUR LUAR, ISI DIBUAT DENGAN SHOW REACTION POPUP
            popupOverlay.innerHTML = `
                <div class="popup-container" style="background: #111; border-radius: 12px; max-width: 650px; width: 90%; box-shadow: 0 0 25px rgba(0, 191, 255, 0.4); padding: 1.5rem; position: relative;">
                    <button class="popup-close" style="position: absolute; top: 10px; right: 15px; background: #e74c3c; border: none; color: white; width: 30px; height: 30px; border-radius: 50%; cursor: pointer;">&times;</button>
                    <div class="popup-header">
                        <h3 style="color: #00bfff;">Hasil Reaksi</h3>
                        <p style="color: #aaa; font-size: 0.9rem;">Berikut hasil dari reaksi yang Anda lakukan</p>
                    </div>
                    <div class="popup-content"></div>
                    <div class="popup-actions" style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 1.5rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);"></div>
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


    async function processCombineReaction(compoundA, compoundB) {
        
        // Data yang akan dikirim ke API (sesuai CombineRequest di main.py)
        const dataToSend = {
            compound_a: compoundA.nama_senyawa,
            compound_b: compoundB.nama_senyawa
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
            
            // Tampilkan error di popup (MENGGANTIKAN LOGIKA FALLBACK)
            const popupContent = popupOverlay.querySelector('.popup-content');
            const popupActions = popupOverlay.querySelector('.popup-actions');
            const popupHeader = popupOverlay.querySelector('.popup-header h3');

            if (popupHeader) popupHeader.textContent = "❌ Gagal Reaksi";
            if (popupContent) {
                let errorMessage = String(error.message).replace(/['"]+/g, ''); 
                popupContent.innerHTML = `
                    <div style="padding: 1rem; text-align: center;">
                        <h3 style="color: #ff4444; margin-bottom: 0.5rem;">Gagal Memproses Reaksi</h3>
                        <p style="color: #ffaa00; font-size: 0.9rem;">${errorMessage || 'Terjadi kesalahan jaringan atau server.'}</p>
                    </div>
                `;
            }
            // Tambahkan tombol Tutup saja di actions
            if (popupActions) {
                popupActions.innerHTML = `<button class="popup-btn popup-btn-close" style="background: #e74c3c; color: white; padding: 0.8rem 1.5rem; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem; margin-left: auto;">
                                            <i class="fas fa-times"></i> Tutup
                                        </button>`;
                popupActions.querySelector('.popup-btn-close').addEventListener('click', () => {
                    popupOverlay.style.display = 'none';
                });
            }
        } finally {
            setLoadingState(false, popupOverlay);
        }
    }

    // =================================================================
    // POPUP HASIL REAKSI (Dengan Dukungan Data API + SAVE BUTTON)
    // =================================================================
    function showReactionPopup(compoundA, compoundB, apiResult = null) {
        console.log("Showing reaction popup...");
        
        clearInterval(progressInterval); 
        
        let popupOverlay = getOrCreatePopup();
        const popupContent = popupOverlay.querySelector('.popup-content');
        const popupActions = popupOverlay.querySelector('.popup-actions');
        const popupHeader = popupOverlay.querySelector('.popup-header h3');

        // Mengambil data dari objek data handler, BUKAN dari DOM card
        const compAName = compoundA.nama_senyawa;
        const compBName = compoundB.nama_senyawa;
        const compAFormula = compoundA.rumus_molekul;
        const compBFormula = compoundB.rumus_molekul;
        // Warna diambil dari DOM, jadi kita perlu mencari card-nya lagi
        const compAColor = getCardColor(document.querySelector(`[data-compound-id="${compoundA.id}"]`));
        const compBColor = getCardColor(document.querySelector(`[data-compound-id="${compoundB.id}"]`));

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
            if (popupHeader) popupHeader.textContent = "✅ Reaksi Kimia Berhasil!";
        } else {
            // Logika Fallback Lokal (Jika API gagal dan tidak ada apiResult)
            // Untuk menghindari masalah, kita berikan default error object yang jelas
            result = {
                name: "Hasil Campuran",
                formula: "N/A",
                description: "Gagal mendapatkan hasil dari API. Tidak ada data lokal fallback.",
                reactionType: "N/A",
                risk: "Unknown",
                color: "#9b59b6"
            };
            if (popupHeader) popupHeader.textContent = "⚠️ Hasil Reaksi (Fallback)";
        }

        // =================================================================
        // ISI POPUP DENGAN DATA (Menggunakan Styling Inline)
        // =================================================================
        popupContent.innerHTML = `
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
            
            <button class="detail-close-btn" style="width: 100%; margin-top: 1.5rem; padding: 0.8rem; background: #0088cc; border: none; color: white; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: bold;">
                Tutup Detail
            </button>
            
            </div>
            <div style="clear: both;"></div>
            </div>
        `;

        // Event listeners untuk tombol
        const detailCloseButton = popupContent.querySelector('.detail-close-btn');
        const popupCloseButton = popupOverlay.querySelector('.popup-close');
        
        [detailCloseButton, popupCloseButton].forEach(btn => {
            btn.addEventListener('click', () => {
                popupOverlay.style.display = 'none';
            });
        });

        // Tambahkan tombol Detail Reaksi dan Save (karena tidak ada di HTML original)
        const detailsBtn = document.createElement('button');
        detailsBtn.className = 'popup-btn popup-btn-details';
        detailsBtn.innerHTML = '<i class="fas fa-info-circle"></i> Detail Reaksi';
        detailsBtn.style.cssText = 'background: #0088cc; padding: 0.8rem 1.5rem; border: none; border-radius: 5px; cursor: pointer; font-size: 1rem; color: white;';
        detailsBtn.addEventListener('click', () => {
            showDetailedReactionInfo(result, compoundA, compoundB);
        });
        popupActions.prepend(detailsBtn); // Tambahkan tombol di depan

        // Tambahkan tombol Save jika ada hasil API
        if (apiResult) {
            const saveBtn = document.createElement('button');
            saveBtn.className = 'popup-btn popup-btn-save';
            saveBtn.innerHTML = '<i class="fas fa-save"></i> Simpan ke Database';
            saveBtn.style.cssText = 'background: #00cc66; padding: 0.8rem 1.5rem; border: none; color: white; border-radius: 5px; cursor: pointer; font-size: 1rem;';
            saveBtn.addEventListener('click', () => {
                handleSaveReaction(apiResult);
            });
            popupActions.appendChild(saveBtn);
        }

        popupOverlay.style.display = 'flex';
        console.log("Popup displayed successfully!");
    }

    // =================================================================
    // 🔥 FUNGSI SAVE: SIMPAN HASIL REAKSI KE DATABASE (MENGHILANGKAN ALERT)
    // =================================================================
    async function handleSaveReaction(reactionData) {
        if (!reactionData) {
            showTemporaryMessage("Peringatan", "Tidak ada data reaksi untuk disimpan.", '#ffaa00');
            return;
        }
        
        // Tampilkan konfirmasi menggunakan modal (Ganti confirm() bawaan)
        if (!confirm(`Simpan hasil reaksi "${reactionData.produk_utama}" ke database?`)) return;

        try {
            console.log("Menyimpan hasil reaksi ke database:", reactionData);
            
            // Tampilkan pesan "Mengirim senyawa..." (Ganti alert bawaan)
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
            
            // Tampilkan pesan Sukses (Ganti alert bawaan)
            showTemporaryMessage("Penyimpanan Berhasil!", result.message || 'Data reaksi telah disimpan ke database.', '#2ecc71');
            
            // Reset state setelah berhasil simpan
            currentReactionResult = null;
            // Muat ulang library untuk melihat senyawa baru di grid (Opsional)
            loadCompoundLibrary();
            
        } catch (error) {
            console.error("Kesalahan saat menyimpan hasil reaksi:", error);
            // Tampilkan pesan Error (Ganti alert bawaan)
            showTemporaryMessage("Error Penyimpanan", `Gagal menyimpan: ${error.message}`, '#ff4444');
        }
    }
    
    // =================================================================
    // 📊 FUNGSI DETAIL REAKSI: TAMPILKAN INFO LENGKAP
    // =================================================================
    function showDetailedReactionInfo(result, compoundA, compoundB) {
        // Menggunakan data nama dan formula dari objek compoundA/B
        const compAName = compoundA.nama_senyawa;
        const compBName = compoundB.nama_senyawa;
        
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
                    <p style="margin: 0.3rem 0; color: #ccc;">• <strong>${compAName}</strong></p>
                    <p style="margin: 0.3rem 0; color: #ccc;">• <strong>${compBName}</strong></p>
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
                    <p style="color: #ccc; font-size: 0.9rem; line-height: 1.5;">${result.risk.includes('Aman') || result.risk.includes('Rendah') ? 'Reaksi ini relatif aman untuk dilakukan dengan prosedur standar laboratorium.' : result.risk.includes('Tinggi') ? 'PERHATIAN: Reaksi ini memiliki risiko tinggi. Gunakan APD lengkap dan lakukan di ruang berventilasi baik.' : 'Lakukan dengan hati-hati dan gunakan peralatan keselamatan standar.'}</p>
                </div>
                
                <button class="detail-close-btn" style="width: 100%; margin-top: 1.5rem; padding: 0.8rem; background: #0088cc; border: none; color: white; border-radius: 8px; font-size: 1rem; cursor: pointer; font-weight: bold;">
                    Tutup Detail
                </button>
                
                </div>
                <div style="clear: both;"></div>
            </div>
        `;

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
});