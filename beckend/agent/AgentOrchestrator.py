# File: agent/orchestrator.py

from .rag import RAGEngine
from .llm import LLMHandler

class AgentOrchestrator:
    def __init__(self):
        self.rag_engine = RAGEngine()
        self.llm_handler = LLMHandler()

    def process_query(self, user_query: str) -> str:
        # Panggil RAGEngine untuk mengambil data
        relevant_docs = self.rag_engine.search(query=user_query, k=5)
        
        # Panggil fungsi yang Anda tanyakan: Mengubah hasil retrieval menjadi prompt
        augmented_prompt = self._build_rag_prompt(user_query, relevant_docs)

        # Kirim prompt yang diperkaya ke LLM
        final_answer = self.llm_handler.ask(augmented_prompt)
        
        return final_answer

    # ⬅️ FUNGSI YANG ANDA TANYAKAN DITEMPATKAN DI SINI:
    def _build_rag_prompt(self, query: str, context_results: list) -> str:
        # Logika pembentukan prompt RAG yang Anda berikan
        if not context_results['documents'][0]:
            system_message = "Anda adalah asisten kimia. Jawab pertanyaan berikut. Jika Anda tidak yakin, jawab seadanya."
            context_text = "TIDAK ADA DATA KHUSUS DITEMUKAN."
        else:
            context_parts = context_results['documents'][0]
            context_text = "\n---\n".join(context_parts)
            
            system_message = """
Anda adalah asisten AI yang ahli dalam ilmu kimia. Tugas Anda adalah menjawab pertanyaan pengguna HANYA berdasarkan informasi yang tersedia di dalam KONTEKS DATA yang disediakan di bawah.
Jika konteks data tidak menyediakan informasi yang cukup untuk menjawab kueri, AKUI bahwa informasinya tidak ada di dalam data yang diberikan.
"""
            
        full_prompt = f"""{system_message}

---
KONTEKS DATA (Senyawa Kimia Terstruktur):{context_text}
---

PERTANYANAN PENGGUNA:{query}

Jawaban Akhir (Hanya berdasarkan Konteks Data):
"""
        return full_prompt