📝 Novel Chemicals Discovery Agent

🧪 Deskripsi Proyek
Proyek ini adalah pengembangan Platform Penemuan Materi (Material Discovery) Berbasis Kecerdasan Buatan (AI) yang dirancang untuk mengatasi inefisiensi biaya dan waktu yang ekstrem dalam Riset & Pengembangan (R&D) materi baru di industri.

#### Menjalankan Backend #### 
Ikuti langkah-langkah berikut untuk menjalankan backend:

# 1. Instal Library Python
Karena sudah ada file requirements.txt, Anda dapat menginstal semua dependensi yang diperlukan  dengan satu perintah yaitu 
pip install -r requirements.txt 

jika terjadi masalah download manual 
pip install fastapi uvicorn chromadb sentence-transformers google-generativeai python-dotenv httpx
pip install langchain-community
pip install google-genai
pip install langchain-huggingface

# 2. Jalankan Server BackendNavigasikan ke direktori backend dan jalankan server menggunakan Uvicorn:

cd .\beckend\
uvicorn main:app --reload --host 0.0.0.0 --port 8000
    Server akan berjalan di http://0.0.0.0:8000 atau http://127.0.0.1:8000/.

# 3. Endpoint APIBackend menyediakan endpoint POST berikut:
POSThttp://127.0.0.1:8000/combine Untuk menggabungkan atau memproses data.
POSThttp://127.0.0.1:8000/generate Untuk generate senyawa menggunakan model AI.


#### Menjalankan Frontend ####
Frontend dikonfigurasi menggunakan Webpack, TypeScript, dan hot-reload untuk pengembangan.

# 1. Instal Dependensi Node.js
Navigasikan ke direktori frontend Anda (sesuaikan path) dan instal semua dependensi Node.js:

cd 'path/ke/direktori/frontend' 
npm install

# 2. Jalankan Server Pengembangan (Development Server)
Jalankan server pengembangan dengan hot-reload
npm run start-dev

# 3. Build Produksi
Untuk membuat versi production dari frontend yang dioptimalkan, jalankan perintah build:
npm run build

Hasil build akan berada di folder dist/.
Folder landing.page/ dan file kimia1.png disalin secara otomatis ke dist/ oleh copy-webpack-plugin