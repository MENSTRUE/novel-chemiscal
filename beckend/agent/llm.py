# FILE: agent/llm.py

import os
from dotenv import load_dotenv
from google import genai
from google.genai.errors import APIError
from google.genai import types # Import types untuk konfigurasi LLM

# Memuat variabel dari .env
load_dotenv()

# Konfigurasi Default (Flash untuk kecepatan/RAG ringan)
GEMINI_MODEL_DEFAULT = "gemini-2.5-flash" 
GEMINI_MODEL_PRO = "gemini-2.5-pro" # Pro untuk Complex reasoning/JSON

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

# Fungsi LLM utama yang diupdate untuk mendukung JSON forcing
def get_llm_response(prompt: str, force_json: bool = False) -> str:
    """Mengambil respons dari Gemini LLM, opsional memaksa output JSON."""
    client = get_gemini_client()
    if not client:
        return "Error: LLM client tidak dapat diinisialisasi."
        
    config_params = {"temperature": 0.7}
    model_to_use = GEMINI_MODEL_DEFAULT
    
    # Logic KRITIS: Memaksa mode JSON jika diminta
    if force_json:
        # Gunakan MIME type yang memaksa LLM mengembalikan JSON MURNI
        config_params['response_mime_type'] = "application/json" 
        model_to_use = GEMINI_MODEL_PRO # Menggunakan model Pro untuk kualitas JSON/penalaran
    
    try:
        response = client.models.generate_content(
            model=model_to_use,
            contents=[prompt],
            config=types.GenerateContentConfig(**config_params)
        )
        # LLM yang dipaksa JSON akan mengembalikan string JSON murni
        return response.text 
    except APIError as e:
        return f"Error: Gemini API Error: {e}"
    except Exception as e:
        return f"Terjadi kesalahan LLM tak terduga: {e}"