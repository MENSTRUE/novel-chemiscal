# FILE: agent/llm.py (KODE FINAL YANG SUDAH DIKOREKSI)

import os
from dotenv import load_dotenv
from google import genai
from google.genai.errors import APIError
from google.genai import types 

# Memuat variabel dari .env
load_dotenv()

# Konfigurasi Default (Flash untuk kecepatan/RAG ringan)
GEMINI_MODEL_DEFAULT = "gemini-2.5-flash" 
GEMINI_MODEL_PRO = "gemini-2.5-pro" # Tetap didefinisikan, tapi tidak digunakan untuk JSON forcing

# Inisialisasi Klien Gemini
def get_gemini_client():
    """Menginisialisasi dan mengembalikan klien Google GenAI."""
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY tidak ditemukan di environment variables.")
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error saat inisialisasi Gemini Client: {e}")
        return None

# 🔥 Fungsi LLM utama (DUPLIKASI DIHILANGKAN)
def get_llm_response(prompt: str, force_json: bool = False) -> str:
    """Mengambil respons dari Gemini LLM, opsional memaksa output JSON."""
    client = get_gemini_client()
    if not client:
        return "Error: LLM client tidak dapat diinisialisasi."
        
    # 🔥 FIX 1: Turunkan suhu untuk kepatuhan format JSON yang lebih baik
    config_params = {"temperature": 0.2} 
    model_to_use = GEMINI_MODEL_DEFAULT # Default menggunakan Flash
    
    # Logic KRITIS: Memaksa mode JSON jika diminta
    if force_json:
        config_params['response_mime_type'] = "application/json" 
        # 🔥 FIX 2: Ganti ke GEMINI_MODEL_DEFAULT (Flash) untuk JSON forcing (mengatasi 429)
        model_to_use = GEMINI_MODEL_DEFAULT 
    
    try:
        response = client.models.generate_content(
            model=model_to_use,
            contents=[prompt],
            config=types.GenerateContentConfig(**config_params)
        )
        return response.text 
    except APIError as e:
        # 🔥 FIX 3: Error Handling 429 yang ditangkap oleh main.py
        error_detail = str(e)
        if "429" in error_detail or "RESOURCE_EXHAUSTED" in error_detail:
            # Mengembalikan string unik yang dapat dideteksi oleh main.py
            return "API_ERROR_429: Quota exceeded. Periksa plan dan billing Anda."
        
        # Mengembalikan string error API lainnya (untuk ditangkap sebagai 503 di main.py)
        return f"API_ERROR: {error_detail}" 
    except Exception as e:
        return f"Terjadi kesalahan LLM tak terduga: {e}"