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

  // Array untuk melacak senyawa mana yang sudah dipilih (maksimal 2)
  let selectedCompounds = [];

  // Fungsi untuk memperbarui tampilan kotak reaktor
  function updateReactorBoxes() {
    // Reset isi kotak
    box1.innerHTML = '<p class="placeholder-text">Pilih senyawa pertama</p>';
    box2.innerHTML = '<p class="placeholder-text">Pilih senyawa kedua</p>';

    // Tampilkan senyawa yang dipilih di kotak 1
    if (selectedCompounds[0]) {
      const card = selectedCompounds[0];
      box1.innerHTML = `
                <div class="selected-compound-display" style="--card-color: ${getCardColor(
                  card
                )};">
                    <div class="formula-circle">${
                      card.querySelector(".formula-circle").textContent
                    }</div>
                    <h4>${card.querySelector("h4").textContent}</h4>
                    <p class="formula-text">${
                      card.querySelector(".formula-text").textContent
                    }</p>
                </div>
            `;
      box1.querySelector(".selected-compound-display").classList.add("active");
    }

    // Tampilkan senyawa yang dipilih di kotak 2
    if (selectedCompounds[1]) {
      const card = selectedCompounds[1];
      box2.innerHTML = `
                <div class="selected-compound-display" style="--card-color: ${getCardColor(
                  card
                )};">
                    <div class="formula-circle">${
                      card.querySelector(".formula-circle").textContent
                    }</div>
                    <h4>${card.querySelector("h4").textContent}</h4>
                    <p class="formula-text">${
                      card.querySelector(".formula-text").textContent
                    }</p>
                </div>
            `;
      box2.querySelector(".selected-compound-display").classList.add("active");
    }
  }

  // Fungsi pembantu untuk mengambil warna dari variabel CSS (digunakan untuk style inline)
  function getCardColor(cardElement) {
    // Mengambil nama kelas warna (e.g., 'water', 'salt')
    const colorClass = Array.from(cardElement.classList).find((c) =>
      c.startsWith("c")
    );
    if (colorClass) {
      // Mengambil nilai variabel CSS berdasarkan kelas
      const rootStyle = getComputedStyle(document.documentElement);
      return rootStyle.getPropertyValue(`--color-card-${colorClass}`).trim();
    }
    return "#ffffff"; // Default putih
  }

  // 2. Tambahkan event listener ke setiap kartu senyawa
  compoundCards.forEach((card) => {
    card.addEventListener("click", () => {
      const isSelected = card.classList.contains("is-selected");

      if (isSelected) {
        // Jika sudah dipilih, hapus dari array dan hilangkan highlight
        selectedCompounds = selectedCompounds.filter((c) => c !== card);
        card.classList.remove("is-selected");
      } else {
        // Jika belum dipilih, dan array belum penuh (maksimal 2)
        if (selectedCompounds.length < 2) {
          selectedCompounds.push(card);
          card.classList.add("is-selected");
        } else {
          // Beri notifikasi (atau hanya abaikan klik)
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
      card.classList.remove("is-selected");
    });
    updateReactorBoxes();
  });

  // Panggil sekali untuk inisialisasi tampilan awal kotak reaktor
  updateReactorBoxes();
});
