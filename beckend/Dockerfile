# ===============================================
# STAGE 1: BUILDER - Untuk menginstal dependencies berat
# Stage ini menyimpan semua build tools (gcc, build-essential)
# ===============================================
FROM python:3.11-slim AS builder

# Instal tools kompilasi (HANYA di stage ini, akan dibuang nanti)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Pindah ke direktori instalasi
WORKDIR /install

# Salin requirements.txt dan instal packages
COPY requirements.txt .
# Instal dependencies ke direktori /usr/local
RUN pip install --prefix=/usr/local --no-cache-dir -r requirements.txt


# ===============================================
# STAGE 2: PRODUCTION - Image akhir yang bersih dan kecil
# Stage ini TIDAK mewarisi build tools dari Stage 1
# ===============================================
FROM python:3.11-slim

# Tetapkan direktori kerja aplikasi
WORKDIR /app

# Langkah KRITIS: Salin HANYA yang dibutuhkan (package yang sudah terinstal)
# Stage ini TIDAK menyertakan build-essential atau cache apt.
COPY --from=builder /usr/local /usr/local

# Salin kode aplikasi Anda
COPY . .

# Perintah menjalankan server
# Ganti 'main:app' jika entry point Anda berbeda (misalnya 'app_file:app_instance')
CMD ["/usr/local/bin/python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "$PORT", "--workers", "4"]