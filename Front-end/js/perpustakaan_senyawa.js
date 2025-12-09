/* eslint-disable no-irregular-whitespace */
// FILE: perpustakaan_senyawa.js (FINAL BERSIH: Color diterapkan HANYA ke Circle)

const API_BASE_URL = "http://127.0.0.1:8000";
const ENDPOINT_GET_ALL = "/get_all_compounds";

let allCompoundsData = []; 

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById('searchInput');
    
    loadCompoundLibrary();

    // Event listener untuk pencarian (dijalankan setiap kali ada input)
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        filterAndRenderCompounds(query);
    });
});

// ===============================================
// LOGIKA LOAD DATA & RENDER
// ===============================================

async function loadCompoundLibrary() {
    const compoundGrid = document.getElementById('compoundGrid');
    const compoundCount = document.getElementById('compoundCount');
    compoundGrid.innerHTML = '<p class="loading-message">Memuat data dari database...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT_GET_ALL}`);
        
        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}. Cek log backend.`);
        }

        allCompoundsData = await response.json();
        
        if (allCompoundsData && allCompoundsData.length > 0) {
            filterAndRenderCompounds(""); // Render semua data setelah load selesai
        } else {
            compoundGrid.innerHTML = '<p class="error-message">Database senyawa kosong.</p>';
            compoundCount.textContent = '0 Senyawa Ditemukan';
        }

    } catch (error) {
        console.error("Gagal memuat data senyawa dari API:", error);
        compoundGrid.innerHTML = `<p class="error-message" style="color: var(--color-error);">❌ Gagal memuat data. Detail: ${error.message}</p>`;
        compoundCount.textContent = 'Gagal Memuat';
    }
}

function filterAndRenderCompounds(query) {
    const compoundCount = document.getElementById('compoundCount');
    
    // Filter data berdasarkan query
    const filteredCompounds = allCompoundsData.filter(compound => {
        const name = compound.nama_senyawa ? compound.nama_senyawa.toLowerCase() : '';
        const formula = compound.rumus_molekul ? compound.rumus_molekul.toLowerCase() : '';
        const description = compound.deskripsi ? compound.deskripsi.toLowerCase() : '';
        const category = compound.kategori_aplikasi ? compound.kategori_aplikasi.toLowerCase() : '';

        return name.includes(query) || 
               formula.includes(query) || 
               description.includes(query) ||
               category.includes(query);
    });

    renderCompoundCards(filteredCompounds);
    
    // Update count setelah render
    compoundCount.textContent = `${filteredCompounds.length} Senyawa Ditemukan`;
}


function renderCompoundCards(compounds) {
    const compoundGrid = document.getElementById('compoundGrid');
    compoundGrid.innerHTML = ''; 

    // Daftar class warna yang sudah didefinisikan di CSS
    const colorClasses = ['water', 'salt', 'co2', 'sulfat', 'oksigen', 'etanol', 'amonia', 'glukosa', 'kalsium', 'besi'];

    compounds.forEach((compound, index) => {
        const name = compound.nama_senyawa || 'N/A';
        const formula = compound.rumus_molekul || 'N/A';
        const description = compound.deskripsi || 'Tidak ada deskripsi detail.';
        const id = compound.id || index;
        
        const colorClass = colorClasses[index % colorClasses.length]; 

        const card = document.createElement('div');
        card.className = `compound-card`; // 🔥 HANYA compound-card, TIDAK ADA class warna
        card.dataset.compoundName = name;
        card.dataset.compoundId = compound.id || index;
        
        card.innerHTML = `
            <div class="formula-circle ${colorClass}">${formula}</div>             <h4>${name}</h4>
            <p class="formula-text">${formula}</p>
            <p class="description">${description.length > 80 ? description.substring(0, 80) + '...' : description}</p>
        `;

        card.addEventListener('click', () => showCompoundDetail(compound));
        compoundGrid.appendChild(card);
    });
    
    if (compounds.length === 0) {
        compoundGrid.innerHTML = '<p class="loading-message" style="color: var(--color-text-secondary);">Tidak ada senyawa yang cocok dengan kriteria pencarian.</p>';
    }
}


// ===============================================
// LOGIKA POPUP DETAIL
// ===============================================

function showCompoundDetail(compound) {
    const popupOverlay = document.getElementById('compoundDetailPopup');
    const box = popupOverlay.querySelector('.popup-detail-box') || document.createElement('div');
    
    if (!box.classList.contains('popup-detail-box')) {
        box.className = 'popup-detail-box';
        popupOverlay.appendChild(box);
    }
    
    // Tentukan warna risiko
    let riskColor = '#fff';
    if (compound.tingkat_risiko_keselamatan) {
        const risk = compound.tingkat_risiko_keselamatan.toLowerCase();
        if (risk.includes('tinggi')) riskColor = 'var(--color-error)';
        else if (risk.includes('sedang')) riskColor = 'var(--color-warning)';
        else riskColor = 'var(--color-success)';
    }

    const detailContent = `
        <button class="close-btn">&times;</button>
        <div class="detail-section">
            <h2>${compound.nama_senyawa}</h2>
            <p>Rumus Molekul: <strong>${compound.rumus_molekul || 'N/A'}</strong></p>
            <p>Berat Molekul: <strong>${compound.berat_molekul || 'N/A'} g/mol</strong></p>
            
            <h4>📝 Deskripsi</h4>
            <p>${compound.deskripsi || 'Tidak ada deskripsi detail.'}</p>
            
            <h4>🔬 Properti Fisik</h4>
            <p>Titik Didih: <strong>${compound.titik_didih_celsius || 'N/A'} °C</strong></p>
            <p>Densitas: <strong>${compound.densitas_gcm3 || 'N/A'} g/cm³</strong></p>
            <p>Sifat Fungsional: <strong>${compound.sifat_fungsional || 'N/A'}</strong></p>
            
            <h4>⚠️ Risiko & Logistik</h4>
            <p>Tingkat Risiko: <strong style="color: ${riskColor};">${compound.tingkat_risiko_keselamatan || 'N/A'}</strong></p>
            <p>Bahaya Keselamatan: <strong>${compound.bahaya_keselamatan || 'Tidak ada catatan.'}</strong></p>
            <p>Ketersediaan Bahan Baku: <strong>${compound.ketersediaan_bahan_baku || 'N/A'}</strong></p>
        </div>
    `;
    
    box.innerHTML = detailContent;
    
    // Setup close button listener
    box.querySelector('.close-btn').addEventListener('click', () => {
        popupOverlay.style.display = 'none';
    });

    popupOverlay.style.display = 'flex';
}