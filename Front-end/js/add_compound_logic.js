// FILE: add_compound_logic.js

const API_POST_URL = "http://127.0.0.1:8000/add_compound"; // Ganti dengan endpoint POST Anda

document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById('addCompoundForm');
    const messageArea = document.getElementById('messageArea');
    const submitBtn = document.getElementById('submitCompoundBtn');

    form.addEventListener('submit', async function (e) {
        e.preventDefault();
        
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Memproses...';
        messageArea.textContent = '';

        const compoundData = {
            nama_senyawa: document.getElementById('nama_senyawa').value,
            rumus_molekul: document.getElementById('rumus_molekul').value,
            berat_molekul: parseFloat(document.getElementById('berat_molekul').value) || null,
            deskripsi: document.getElementById('deskripsi').value,
            titik_didih_celsius: parseFloat(document.getElementById('titik_didih_celsius').value) || null,
            densitas_gcm3: parseFloat(document.getElementById('densitas_gcm3').value) || null,
            kategori_aplikasi: document.getElementById('kategori_aplikasi').value,
            tingkat_risiko_keselamatan: document.getElementById('tingkat_risiko_keselamatan').value,
            bahaya_keselamatan: document.getElementById('bahaya_keselamatan').value,
            // Kolom lain (sinonim, data_unsur_penyusun, dll.) dapat ditambahkan di sini
        };

        try {
            const response = await fetch(API_POST_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(compoundData),
            });

            if (response.ok) {
                const result = await response.json();
                messageArea.textContent = `✅ Senyawa "${result.nama_senyawa || compoundData.nama_senyawa}" berhasil ditambahkan!`;
                form.reset(); // Kosongkan form setelah berhasil
            } else {
                const errorData = await response.json();
                messageArea.textContent = `❌ Gagal menyimpan data: ${errorData.detail || response.statusText}`;
                messageArea.style.color = 'var(--color-error)';
            }
        } catch (error) {
            console.error('Error saat mengirim data:', error);
            messageArea.textContent = '❌ Terjadi kesalahan jaringan atau server tidak merespons.';
            messageArea.style.color = 'var(--color-error)';
        } finally {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<i class="fas fa-save"></i> Simpan Senyawa';
        }
    });

    // Logika tombol Reset Form (jika menggunakan type="button")
    document.querySelector('.btn-back').addEventListener('click', () => {
        form.reset();
        messageArea.textContent = '';
        messageArea.style.color = 'var(--color-success)';
    });
});