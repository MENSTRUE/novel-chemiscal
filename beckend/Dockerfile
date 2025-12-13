# Gunakan image Python yang ringan
# Kita menggunakan 3.11 karena itu yang dideteksi oleh build log sebelumnya.
FROM python:3.11-slim

# Instal tools kompilasi yang dibutuhkan oleh package seperti chromadb, numpy, dll.
# Railway logs menunjukkan build-essential berhasil diinstal, tetapi kita buat eksplisit di sini.
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Tetapkan direktori kerja
WORKDIR /app

# Salin requirements.txt dan instal dependencies
COPY requirements.txt .
# Melakukan instalasi
RUN pip install --no-cache-dir -r requirements.txt

# Salin sisa kode aplikasi (main.py, dll.)
COPY . .

# Perintah untuk menjalankan server (menggunakan Uvicorn/Gunicorn untuk FastAPI/ASG)
# Kami menggunakan Mangum yang Anda sebutkan di requirements.txt, tetapi Uvicorn langsung lebih sederhana untuk Railway.
# ASUMSI: instance FastAPI/Flask Anda bernama 'app' di main.py
CMD ["/usr/local/bin/python", "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "$PORT", "--workers", "4"]