# 📘 Git Workflow & Aturan Push Repository

Dokumen ini berisi aturan kerja Git untuk seluruh anggota tim, termasuk cara push, pull, membuat branch, merge, dan alur kerja dari fitur hingga masuk ke branch **main**.

---

# 🏛️ Struktur Branch Wajib

```
main      → Branch final (HANYA ketua yang boleh merge)
gladi     → Branch staging / testing (pra-main)
fitur/*   → Branch pengembangan fitur oleh masing-masing anggota
```

---

# 🚫 Aturan Push

### ❌ Anggota TIDAK BOLEH:

* Push langsung ke **main**
* Push langsung ke **gladi**

### ✔️ Anggota HANYA BOLEH:

* Membuat branch baru dari **main** atau **gladi**
* Push ke branch **fitur/nama-fitur**

Format nama branch fitur:

```
fitur/nama-fitur
```

Contoh:

```
fitur/login
fitur/fix-database
fitur/api-user
```

---

# 🔧 Alur Kerja Anggota

## 1️⃣ Buat Branch Fitur

```bash
git checkout main
git pull origin main

git checkout -b fitur/nama-fitur
```

## 2️⃣ Kerjakan Coding

Edit file sesuai kebutuhan.

## 3️⃣ Add → Commit → Push

```bash
git add .
git commit -m "Deskripsi pekerjaan"
git push origin fitur/nama-fitur
```

## 4️⃣ Ajukan "Pull Request (PR)" ke Branch gladi

* Buka GitHub
* Pilih *Compare & Pull Request*
* Target PR → **gladi**
* Judul jelas, sertakan deskripsi perubahan
* Klik **Create Pull Request**

Setelah itu, PR akan direview ketua.

---

# 🧑‍💼 Alur Kerja Ketua Tim

## Ketua yang melakukan:

* Review PR anggota
* Merge dari fitur → gladi
* Test pekerjaan di gladi
* Merge gladi → main

---

# 🧪 Ketua: Merge fitur → gladi

```bash
git checkout gladi
git pull origin gladi

git merge fitur/nama-fitur
git push origin gladi
```

Atau merge via GitHub.

---

# 🚀 Ketua: Merge gladi → main (Setelah Lulus Testing)

```bash
git checkout main
git pull origin main

git merge gladi
git push origin main
```

Atau merge via GitHub.

---

# 🔄 Cara Pull Update (Semua Anggota)

Selalu lakukan pull sebelum mulai ngerjain.

```bash
git checkout main
git pull origin main
```

Jika di branch fitur:

```bash
git checkout fitur/nama-fitur
git pull origin main
```

---

# 🆘 Jika Terjadi Konflik

### 1. Perbaiki file yang konflik

### 2. Add & Commit ulang

```bash
git add .
git commit -m "Fix conflict"
git push origin fitur/nama-fitur
```

---

# 📅 Aturan 1 Day 1 Progress

Setiap anggota **WAJIB** melakukan minimal **1 progress per hari**, berupa:

* Commit kecil (minimal 1 perubahan signifikan)
* Push ke branch fitur masing-masing
* Update status harian di grup/kanban (apa yang dikerjakan)
* Jika tidak coding, wajib menulis laporan progress (bug yang ditemukan, rencana esok hari, atau hasil riset)

Jika dalam 1 hari tidak ada progress **HARUS** memberi alasan dan rencana catch-up.

---

# 📌 Tips Kerja Tim

* Sering lakukan *pull* dari main agar branch fitur tetap up-to-date
* Commit harus jelas dan rapi
* Jangan push file yang tidak perlu (node_modules, .env, venv)
* Gunakan .gitignore

---

# ⚔️ Penjelasan Lengkap Mengatasi Konflik Saat Merge

Konflik merge terjadi ketika dua branch mengubah bagian **kode yang sama** pada baris yang sama, sehingga Git tidak bisa memutuskan mana yang benar.

---

## 🔥 Kapan Konflik Terjadi?

* Merge **fitur → gladi**
* Merge **gladi → main**
* Pull main ke branch fitur

Kalau ada perubahan yang bertabrakan, Git akan memberi tanda bahwa ada konflik.

---

# 🧭 Cara Mengatasi Konflik (Untuk Anggota & Ketua)

## 1️⃣ Jalankan merge terlebih dahulu

Contoh untuk anggota yang mau merge main ke branch fitur:

```bash
git checkout fitur/nama-fitur
git pull origin main
```

atau untuk ketua yang merge fitur ke gladi:

```bash
git checkout gladi
git merge fitur/nama-fitur
```

Jika konflik muncul, Git akan menampilkan pesan:

```
CONFLICT (content): Merge conflict in NamaFile.py
```

---

# 2️⃣ Buka file yang konflik

Git akan menandai bagian konflik seperti ini:

```
<<<<<<< HEAD
kode versi branch yang sedang kamu pakai
=======
kode versi branch yang kamu merge
>>>>>>> fitur/nama-fitur
```

### Kamu harus memilih salah satu:

✔ pake versi atas (HEAD)
✔ pake versi bawah (branch lain)
✔ atau gabungkan manual

Contoh hasil perbaikan:

```python
hasil_final = fungsi_baru()  # hasil merge yang sudah benar
```

---

# 3️⃣ Setelah diperbaiki → Add & Commit ulang

```bash
git add .
git commit -m "Fix merge conflict"
```

---

# 4️⃣ Push kembali

Untuk anggota:

```bash
git push origin fitur/nama-fitur
```

Untuk ketua:

```bash
git push origin gladi
```

atau

```bash
git push origin main
```

(setelah gladi dipastikan sudah clean)

---

# 5️⃣ Lanjutkan merge seperti biasa

Kalau via GitHub, PR otomatis akan bilang:
**"All conflicts resolved"** → tinggal klik **Merge**.

---

# 🎉 Selesai!

Dokumen ini wajib diikuti untuk menjaga workflow tim tetap bersih, terstruktur, dan profesional.
