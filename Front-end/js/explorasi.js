
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
        console.log("Reaktor Direset.");
    });

    
    btnGabung.addEventListener("click", () => {
        console.log("Gabung button clicked");
        
        if (selectedCompounds.length === 2) {
            const compoundA = selectedCompounds[0];
            const compoundB = selectedCompounds[1];
            
            const compoundAName = compoundA.querySelector("h4").textContent;
            const compoundBName = compoundB.querySelector("h4").textContent;

            console.log(`Menggabungkan ${compoundAName} dan ${compoundBName}...`);
            
            
            showReactionPopup(compoundA, compoundB);
            
        } else {
            alert("Harap pilih 2 senyawa untuk digabungkan.");
        }
    });

    

    function showReactionPopup(compoundA, compoundB) {
        console.log("Showing reaction popup...");
        
        
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
                        <div class="reaction-display">
                            <div class="compound-display" id="popup-compound-a">
                                <div class="formula-circle"></div>
                                <h4></h4>
                                <p class="formula-text"></p>
                            </div>
                            <div class="reaction-arrow">+</div>
                            <div class="compound-display" id="popup-compound-b">
                                <div class="formula-circle"></div>
                                <h4></h4>
                                <p class="formula-text"></p>
                            </div>
                            <div class="reaction-arrow">→</div>
                            <div class="result-display">
                                <div class="formula-circle" id="popup-result-circle"></div>
                                <h4 id="popup-result-name"></h4>
                                <p class="formula-text" id="popup-result-formula"></p>
                            </div>
                        </div>
                        <div class="result-description" id="popup-result-desc"></div>
                    </div>
                    <div class="popup-actions">
                        <button class="popup-btn popup-btn-close">
                            <i class="fas fa-times"></i> Tutup
                        </button>
                        <button class="popup-btn popup-btn-details">
                            <i class="fas fa-info-circle"></i> Detail Reaksi
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(popupOverlay);

            
            const closeBtn = popupOverlay.querySelector('.popup-close');
            const closePopupBtn = popupOverlay.querySelector('.popup-btn-close');
            
            [closeBtn, closePopupBtn].forEach(btn => {
                btn.addEventListener('click', () => {
                    popupOverlay.style.display = 'none';
                });
            });

            
            popupOverlay.addEventListener('click', (e) => {
                if (e.target === popupOverlay) {
                    popupOverlay.style.display = 'none';
                }
            });

            
            const detailsBtn = popupOverlay.querySelector('.popup-btn-details');
            detailsBtn.addEventListener('click', () => {
                alert('Fitur detail reaksi akan segera hadir!');
            });
        }

        
        const compAName = compoundA.querySelector('h4').textContent;
        const compBName = compoundB.querySelector('h4').textContent;
        const compAFormula = compoundA.querySelector('.formula-text').textContent;
        const compBFormula = compoundB.querySelector('.formula-text').textContent;
        const compAColor = getCardColor(compoundA);
        const compBColor = getCardColor(compoundB);

        
        const reactionResults = {
            "AirGaram Dapur": {
                name: "Larutan Garam",
                formula: "NaCl(aq)",
                description: "Larutan elektrolit yang menghantarkan listrik. Air dan garam bereaksi membentuk larutan ionik.",
                color: "#3498db"
            },
            "AirAsam Sulfat": {
                name: "Larutan Asam Sulfat",
                formula: "H₂SO₄(aq)",
                description: "Larutan asam kuat yang sangat korosif. Harap hati-hati dalam penanganannya.",
                color: "#f39c12"
            },
            "Garam DapurAsam Sulfat": {
                name: "Asam Klorida + Natrium Sulfat",
                formula: "2HCl + Na₂SO₄",
                description: "Reaksi pertukaran ganda menghasilkan asam klorida dan natrium sulfat.",
                color: "#e74c3c"
            },
            "AirKarbon Dioksida": {
                name: "Asam Karbonat",
                formula: "H₂CO₃",
                description: "Asam lemah yang terbentuk ketika CO₂ larut dalam air, ditemukan dalam minuman berkarbonasi.",
                color: "#2ecc71"
            }
        };

        const reactionKey = `${compAName}${compBName}`;
        const reverseKey = `${compBName}${compAName}`;
        
        let result = reactionResults[reactionKey] || reactionResults[reverseKey];
        
        if (!result) {
            
            result = {
                name: "Campuran Senyawa",
                formula: "Campuran",
                description: `Campuran antara ${compAName} dan ${compBName}. Reaksi spesifik belum terdefinisi dalam database.`,
                color: "#9b59b6"
            };
        }

        
        document.getElementById('popup-compound-a').querySelector('.formula-circle').textContent = compoundA.querySelector('.formula-circle').textContent;
        document.getElementById('popup-compound-a').querySelector('.formula-circle').style.backgroundColor = compAColor;
        document.getElementById('popup-compound-a').querySelector('h4').textContent = compAName;
        document.getElementById('popup-compound-a').querySelector('.formula-text').textContent = compAFormula;

        
        document.getElementById('popup-compound-b').querySelector('.formula-circle').textContent = compoundB.querySelector('.formula-circle').textContent;
        document.getElementById('popup-compound-b').querySelector('.formula-circle').style.backgroundColor = compBColor;
        document.getElementById('popup-compound-b').querySelector('h4').textContent = compBName;
        document.getElementById('popup-compound-b').querySelector('.formula-text').textContent = compBFormula;

        
        document.getElementById('popup-result-circle').textContent = result.formula;
        document.getElementById('popup-result-circle').style.backgroundColor = result.color;
        document.getElementById('popup-result-name').textContent = result.name;
        document.getElementById('popup-result-formula').textContent = result.formula;
        document.getElementById('popup-result-desc').textContent = result.description;

        
        popupOverlay.style.display = 'flex';
        console.log("Popup displayed successfully!");
    }

    
    updateReactorBoxes();
    console.log("Explorasi.js initialization complete!");
});