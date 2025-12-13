# 1. Gunakan image Python yang ringan dan stabil
FROM python:3.11-slim

# 2. Instal dependencies sistem yang diperlukan. 
# Ini sangat penting untuk package seperti chromadb yang mungkin membutuhkan tools kompilasi.
# build-essential menyediakan tools seperti gcc/g++ untuk kompilasi C/C++ yang diperlukan oleh beberapa package Python.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    # Tambahkan dependensi sistem lain di sini jika dibutuhkan di masa depan.
    && rm -rf /var/lib/apt/lists/*

# 3. Tetapkan direktori kerja
WORKDIR /app

# 4. Salin requirements.txt dan instal dependencies
COPY requirements.txt .
# --no-cache-dir mengurangi ukuran image
RUN pip install --no-cache-dir -r requirements.txt

# 5. Salin sisa kode aplikasi
COPY . .

# 6. Tentukan command untuk menjalankan aplikasi
# Ini akan menjadi Startup Command Anda (gunakan Mangum untuk FastAPI/ASG
CMD ["/usr/local/bin/python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "$PORT", "--workers", "4"]