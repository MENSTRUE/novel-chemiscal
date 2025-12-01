# agent/llm.py
import os
from dotenv import load_dotenv
from google import genai
from google.genai.errors import APIError

# Memuat variabel dari .env
load_dotenv()

# Konfigurasi
GEMINI_MODEL = "gemini-2.5-flash" 

# Inisialisasi Klien Gemini
def get_gemini_client():
    """Menginisialisasi dan mengembalikan klien Google GenAI."""
    # Klien akan otomatis mencari GEMINI_API_KEY dari variabel lingkungan
    try:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY tidak ditemukan di environment variables.")
        return genai.Client(api_key=api_key)
    except Exception as e:
        print(f"Error saat inisialisasi Gemini Client: {e}")
        return None

def get_llm_response(prompt: str) -> str:
    """Mengambil respons dari Gemini LLM berdasarkan prompt"""
    client = get_gemini_client()
    if not client:
        return "Error: LLM client tidak dapat diinisialisasi."
        
    try:
        response = client.models.generate_content(
            model=GEMINI_MODEL,
            contents=[prompt],
            config={"temperature": 0.7} # Contoh konfigurasi
        )
        return response.text
    except APIError as e:
        return f"Error saat memanggil Gemini API: {e}"
    except Exception as e:
        return f"Terjadi kesalahan LLM tak terduga: {e}"

# Catatan: Fungsi ini tidak perlu dipanggil secara langsung
# `rag.py` akan mengimpor dan menggunakannya