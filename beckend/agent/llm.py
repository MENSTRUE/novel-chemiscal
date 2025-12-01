import os
from dotenv import load_dotenv
import google.generativeai as genai

load_dotenv()  # baca .env

class LLMHandler:
    def __init__(self):
        self.gemini_key = os.getenv("GEMINI_API_KEY")

        if not self.gemini_key:
            raise ValueError("GEMINI_API_KEY tidak ditemukan di .env")

        genai.configure(api_key=self.gemini_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash")

    def generate(self, prompt: str) -> str:
        """Generate text dengan Gemini"""
        try:
            res = self.model.generate_content(prompt)
            return res.text
        except Exception as e:
            return f"[ERROR GEMINI] {str(e)}"

    # FIX UTAMA 🔥
    def ask(self, prompt: str) -> str:
        """Alias agar orchestrator bisa pakai .ask()"""
        return self.generate(prompt)
