# agent/AgentOrchestrator.py
from .rag import RAGEngine
from .llm import get_llm_response # Untuk fallback/generasi murni

class AgentOrchestrator:
    """
    Mengorkestrasi penggunaan RAGEngine dan LLM murni (Gemini).
    """
    def __init__(self):
        # RAGEngine harus diinisialisasi di main.py, kita hanya menyimpannya
        self.rag_engine = RAGEngine()
        print("AgentOrchestrator initialized.")

    def process_query(self, user_query: str) -> str:
        """
        Menentukan alur terbaik untuk query: RAG atau LLM murni.
        
        ASUMSI LOGIKA:
        - Jika query pendek/faktual (Ask), coba RAG dulu.
        - Jika query panjang/kompleks (Generate), langsung ke LLM murni (Gemini).
        """
        
        # Logika sederhana penentuan (bisa diperluas menggunakan prompt classification)
        if len(user_query) < 150 and not user_query.lower().startswith("saya membutuhkan rekomendasi"):
            # Factual query (Ask) -> Coba RAG
            print("Orchestrator: Directing query to RAG Engine.")
            rag_answer = self.rag_engine.query(user_query)
            
            # Tambahkan logika untuk cek apakah RAG menjawab dengan baik (opsional)
            if "tidak dapat menemukan jawaban yang relevan" in rag_answer:
                 # Jika RAG gagal, fallback ke LLM murni
                 print("Orchestrator: RAG failed, falling back to LLM.")
                 return get_llm_response(user_query)
            
            return rag_answer
            
        else:
            # Complex/Generation query -> Langsung ke LLM murni (Gemini)
            print("Orchestrator: Directing complex query to pure LLM (Gemini).")
            return get_llm_response(user_query)