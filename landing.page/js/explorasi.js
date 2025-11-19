// File: explorasi.js

document.addEventListener("DOMContentLoaded", () => {
  // 1. Ambil semua elemen penting dari DOM
  const compoundCards = document.querySelectorAll(".compound-card");
  const box1 = document.querySelector(
    ".reactor-boxes .compound-box:nth-child(1)"
  );
  const box2 = document.querySelector(
    ".reactor-boxes .compound-box:nth-child(3)"
  );
  const btnReset = document.querySelector(".btn-reset");
  const btnGabung = document.querySelector(".btn-gabung"); // Tambahkan tombol Gabung

  // Array untuk melacak elemen kartu senyawa mana yang sudah dipilih (maksimal 2)
  let selectedCompounds = [];

  // Fungsi pembantu untuk mengambil warna latar belakang dari formula circle
  function getCardColor(cardElement) {
    const formulaCircle = cardElement.querySelector(".formula-circle");
    if (formulaCircle) {
      // Mengambil computed style untuk mendapatkan warna latar belakang yang diterapkan CSS
      const style = getComputedStyle(formulaCircle);
      return style.backgroundColor;
    }
    return "#ffffff"; // Default putih
  }

  // Fungsi untuk memperbarui tampilan kotak reaktor
  function updateReactorBoxes() {
    // Hapus kelas 'selected' dari kotak reaktor
    box1.classList.remove("selected");
    box2.classList.remove("selected");

    // Reset isi kotak
    box1.innerHTML = '<p class="placeholder-text">Pilih senyawa pertama</p>';
    box2.innerHTML = '<p class="placeholder-text">Pilih senyawa kedua</p>';

    // Fungsi pembantu untuk mengisi kotak
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

    // Tampilkan senyawa yang dipilih
    if (selectedCompounds[0]) {
      fillBox(box1, selectedCompounds[0]);
    }

    if (selectedCompounds[1]) {
      fillBox(box2, selectedCompounds[1]);
    }

    // Atur status tombol Gabung
    btnGabung.disabled = selectedCompounds.length !== 2;
    if (selectedCompounds.length === 2) {
      btnGabung.style.opacity = 1;
    } else {
      btnGabung.style.opacity = 0.5;
    }
  }

  // 2. Tambahkan event listener ke setiap kartu senyawa
  compoundCards.forEach((card) => {
    card.addEventListener("click", () => {
      // Perhatian: Menggunakan kelas 'selected-compound' yang ada di CSS Anda
      const isSelected = card.classList.contains("selected-compound");

      if (isSelected) {
        // Jika sudah dipilih, hapus dari array dan hilangkan highlight
        selectedCompounds = selectedCompounds.filter((c) => c !== card);
        card.classList.remove("selected-compound");
      } else {
        // Jika belum dipilih, dan array belum penuh (maksimal 2)
        if (selectedCompounds.length < 2) {
          selectedCompounds.push(card);
          card.classList.add("selected-compound");
        } else {
          // Beri notifikasi
          alert("Maksimal hanya 2 senyawa yang dapat dipilih!");
        }
      }

      updateReactorBoxes();
    });
  });

  // 3. Tambahkan fungsi Reset
  btnReset.addEventListener("click", () => {
    selectedCompounds = [];
    compoundCards.forEach((card) => {
      // Menghapus highlight
      card.classList.remove("selected-compound");
    });
    updateReactorBoxes();
    console.log("Reaktor Direset.");
  });

  // 4. Tambahkan fungsi Gabung
  btnGabung.addEventListener("click", () => {
    if (selectedCompounds.length === 2) {
      const compoundA = selectedCompounds[0].querySelector("h4").textContent;
      const compoundB = selectedCompounds[1].querySelector("h4").textContent;

      // Logika Reaksi Sederhana (Contoh Simulasi)
      console.log(`Menggabungkan ${compoundA} dan ${compoundB}...`);

      // Di sini Anda akan menambahkan logika untuk menentukan hasil reaksi
      alert(
        `Simulasi: ${compoundA} bereaksi dengan ${compoundB} (Lihat konsol untuk detail)`
      );
    } else {
      alert("Harap pilih 2 senyawa untuk digabungkan.");
    }
  });

  // Panggil sekali untuk inisialisasi tampilan awal kotak reaktor
  updateReactorBoxes();
});
