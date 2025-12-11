/* eslint-disable no-prototype-builtins */
/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
// FILE: perpustakaan_senyawa.js (FINAL BERSIH: Sudah Termasuk Toggle, Chart.js, dan DARK THEME FIX)

const API_BASE_URL = "http://127.0.0.1:8000";
const ENDPOINT_GET_ALL = "/get_all_compounds";

let allCompoundsData = []; 
let categoryChartInstance = null;
let riskChartInstance = null;

// ===============================================
// 🔥 FIX: KONFIGURASI GLOBAL CHART.JS (DARK THEME) 🔥
// ===============================================

// Ambil warna dari CSS Root Variables (asumsi warna Anda di CSS sama)
const FONT_COLOR = 'rgb(255, 255, 255)'; // --color-text-light
const GRID_COLOR = 'rgba(255, 255, 255, 0.1)'; // --color-border-dark

Chart.defaults.color = FONT_COLOR;
Chart.defaults.borderColor = GRID_COLOR; 
Chart.defaults.font.family = "'Roboto', Arial, sans-serif";

document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById('searchInput');
    
    // Tombol Utama
    const toggleStatsBtn = document.getElementById('toggleStatsBtn');
    const addCompoundBtn = document.getElementById('addCompoundBtn'); 
    
    // Container
    const statsSection = document.getElementById('compoundStatsSection');
    const listContainer = document.getElementById('compoundListAndSearchContainer');
    const body = document.body;

    loadCompoundLibrary();

    // Event listener untuk pencarian
    searchInput.addEventListener('input', () => {
        const query = searchInput.value.toLowerCase();
        filterAndRenderCompounds(query);
    });

    // --- LOGIKA TOGGLE & BUTTONS ---
    
    function showList() {
        statsSection.style.display = 'none';
        listContainer.style.display = 'block';
        toggleStatsBtn.classList.remove('active'); 
    }

    function showStats() {
        statsSection.style.display = 'block';
        listContainer.style.display = 'none';
        toggleStatsBtn.classList.add('active'); 
        
        if (!categoryChartInstance && allCompoundsData.length > 0) {
            calculateAndRenderCharts(allCompoundsData);
        }
    }

    // Event Listener: Beralih antara Daftar dan Statistik
    toggleStatsBtn.addEventListener('click', () => {
        if (listContainer.style.display !== 'none') {
            showStats(); 
        } else {
            showList(); 
        }
    });
    
    // Event Listener: Tombol Tambah Senyawa
    addCompoundBtn.addEventListener('click', () => {
        alert("TODO: Implementasi Form Input Senyawa. Redirect ke /ui/add_compound.html atau tampilkan modal form.");
    });
    
    // Tampilan awal: Daftar Senyawa
    showList(); 
});


// ===============================================
// LOGIKA LOAD DATA & RENDER (Compound Grid)
// ===============================================

async function loadCompoundLibrary() {
    const compoundGrid = document.getElementById('compoundGrid');
    const compoundCount = document.getElementById('compoundCount');
    const body = document.body;
    compoundGrid.innerHTML = '<p class="loading-message">Memuat data dari database...</p>';

    try {
        const response = await fetch(`${API_BASE_URL}${ENDPOINT_GET_ALL}`);
        
        if (!response.ok) {
            throw new Error(`HTTP Error! Status: ${response.status}. Cek log backend.`);
        }

        allCompoundsData = await response.json();
        
        if (allCompoundsData && allCompoundsData.length > 0) {
            filterAndRenderCompounds(""); 
            calculateAndRenderCharts(allCompoundsData);
            
        } else {
            compoundGrid.innerHTML = '<p class="error-message">Database senyawa kosong.</p>';
            compoundCount.textContent = '0 Senyawa Ditemukan';
        }

    } catch (error) {
        console.error("Gagal memuat data senyawa dari API:", error);
        compoundGrid.innerHTML = `<p class="error-message" style="color: var(--color-error);">❌ Gagal memuat data. Detail: ${error.message}</p>`;
        compoundCount.textContent = 'Gagal Memuat';
    } finally {
        body.classList.remove('no-scroll');
    }
}

function filterAndRenderCompounds(query) {
    const compoundCount = document.getElementById('compoundCount');
    
    const filteredCompounds = allCompoundsData.filter(compound => {
        const name = compound.nama_senyawa ? compound.nama_senyawa.toLowerCase() : '';
        const formula = compound.rumus_molekul ? compound.rumus_molekul.toLowerCase() : '';
        const description = compound.deskripsi ? compound.deskripsi.toLowerCase() : '';
        const category = compound.kategori_aplikasi ? compound.kategori_aplikasi.toLowerCase() : '';

        return name.includes(query) || formula.includes(query) || description.includes(query) || category.includes(query);
    });

    renderCompoundCards(filteredCompounds);
    compoundCount.textContent = `${filteredCompounds.length} Senyawa Ditemukan`;
}

function renderCompoundCards(compounds) {
    const compoundGrid = document.getElementById('compoundGrid');
    compoundGrid.innerHTML = ''; 

    const colorClasses = ['water', 'salt', 'co2', 'sulfat', 'oksigen', 'etanol', 'amonia', 'glukosa', 'kalsium', 'besi'];

    compounds.forEach((compound, index) => {
        const name = compound.nama_senyawa || 'N/A';
        const formula = compound.rumus_molekul || 'N/A';
        const description = compound.deskripsi || 'Tidak ada deskripsi detail.';
        
        const colorClass = colorClasses[index % colorClasses.length]; 

        const card = document.createElement('div');
        card.className = `compound-card`; 
        card.dataset.compoundName = name;
        card.dataset.compoundId = compound.id || index;
        
        card.innerHTML = `
            <div class="formula-circle ${colorClass}">${formula}</div> 
            <h4>${name}</h4>
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
    const body = document.body;
    
    if (!box.classList.contains('popup-detail-box')) {
        box.className = 'popup-detail-box';
        popupOverlay.appendChild(box);
    }
    
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
            
            <h4>Deskripsi</h4>
            <p>${compound.deskripsi || 'Tidak ada deskripsi detail.'}</p>
            
            <h4>Properti Fisik</h4>
            <p>Titik Didih: <strong>${compound.titik_didih_celsius || 'N/A'} °C</strong></p>
            <p>Densitas: <strong>${compound.densitas_gcm3 || 'N/A'} g/cm³</strong></p>
            <p>Sifat Fungsional: <strong>${compound.sifat_fungsional || 'N/A'}</strong></p>
            
            <h4>Risiko & Logistik</h4>
            <p>Tingkat Risiko: <strong style="color: ${riskColor};">${compound.tingkat_risiko_keselamatan || 'N/A'}</strong></p>
            <p>Bahaya Keselamatan: <strong>${compound.bahaya_keselamatan || 'Tidak ada catatan.'}</strong></p>
        </div>
    `;
    
    box.innerHTML = detailContent;
    
    const closePopup = () => {
        popupOverlay.style.display = 'none';
        body.classList.remove('no-scroll');
    };

    box.querySelector('.close-btn').addEventListener('click', closePopup);
    popupOverlay.addEventListener('click', (e) => {
        if (e.target === popupOverlay) {
            closePopup();
        }
    });
    
    body.classList.add('no-scroll');
    popupOverlay.style.display = 'flex';
}

// ===============================================
// LOGIKA CHART.JS (STATISTIK)
// ===============================================

function calculateAndRenderCharts(compounds) {
    if (categoryChartInstance) categoryChartInstance.destroy();
    if (riskChartInstance) riskChartInstance.destroy();
    
    // 1. Hitung Data Kategori Aplikasi
    const categoryCounts = {};
    compounds.forEach(c => {
        const category = c.kategori_aplikasi || 'Lain-lain';
        category.split(',').map(name => name.trim()).forEach(name => {
            if (name) categoryCounts[name] = (categoryCounts[name] || 0) + 1;
        });
    });

    const topCategories = Object.entries(categoryCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 5); 

    // 2. Hitung Data Tingkat Risiko
    const riskCounts = { Rendah: 0, Sedang: 0, Tinggi: 0, 'N/A': 0 };
    compounds.forEach(c => {
        const risk = (c.tingkat_risiko_keselamatan || 'N/A').trim();
        if (riskCounts.hasOwnProperty(risk)) {
            riskCounts[risk] += 1;
        } else {
            riskCounts['N/A'] += 1;
        }
    });

    renderCategoryChart(topCategories);
    renderRiskChart(riskCounts);
}

function renderCategoryChart(data) {
    const ctx = document.getElementById('categoryChart');
    if (!ctx) return;
    
    categoryChartInstance = new Chart(ctx, {
        type: 'doughnut', 
        data: {
            labels: data.map(d => d[0]),
            datasets: [{
                label: 'Jumlah Senyawa',
                data: data.map(d => d[1]),
                // Menggunakan warna custom yang sesuai dengan tema terang/neon Anda
                backgroundColor: ['#00bfff', '#4a90e2', '#2ecc71', '#f39c12', '#e74c3c'], 
                hoverOffset: 10
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'right',
                    labels: { 
                        color: FONT_COLOR // Mengambil dari setting global
                    }
                },
                title: {
                    display: false
                }
            }
        }
    });
}

function renderRiskChart(data) {
    const ctx = document.getElementById('riskChart');
    if (!ctx) return;
    
    riskChartInstance = new Chart(ctx, {
        type: 'bar', 
        data: {
            labels: Object.keys(data),
            datasets: [{
                label: 'Jumlah Senyawa',
                data: Object.values(data),
                // Menggunakan warna yang sesuai untuk Risiko (Hijau, Kuning, Merah, Abu)
                backgroundColor: ['#2ecc71', '#f39c12', '#e74c3c', '#95a5a6'],
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { color: FONT_COLOR },
                    grid: { color: GRID_COLOR }
                },
                x: {
                    ticks: { color: FONT_COLOR },
                    grid: { display: false }
                }
            },
            plugins: {
                legend: { display: false }
            }
        }
    });
}