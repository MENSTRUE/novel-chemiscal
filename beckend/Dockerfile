# ==================================
# STAGE 1: Build & Install Dependencies
# ==================================
FROM python:3.11-slim AS builder

# Atur WORKDIR
WORKDIR /install

# Instal system dependencies yang diperlukan untuk kompilasi (HANYA di stage ini)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Salin requirements.txt dan instal packages
COPY requirements.txt .
# Instal dependencies ke direktori /usr/local/lib/python...
RUN pip install --prefix=/usr/local --no-cache-dir -r requirements.txt


# ==================================
# STAGE 2: Final Image (Production)
# ==================================
# Gunakan base image yang sangat bersih (tidak ada build tools)
FROM python:3.11-slim

# Tetapkan direktori kerja aplikasi
WORKDIR /app

# Salin packages yang sudah terinstal dari 'builder' stage
# Ini adalah langkah KRITIS yang membuang build-essential dan cache
COPY --from=builder /usr/local /usr/local

# Salin kode aplikasi Anda
COPY . .

# Perintah untuk menjalankan server (Pastikan entry point Anda 'main:app')
CMD ["/usr/local/bin/python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "$PORT", "--workers", "4"]