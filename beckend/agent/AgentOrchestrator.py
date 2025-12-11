# FILE: agent/AgentOrchestrator.py (KODE LENGKAP DIPERBARUI)

from .rag import RAGEngine
from .llm import get_llm_response

class AgentOrchestrator:
    """
    Mengorkestrasi penggunaan RAGEngine dan LLM murni (Gemini).
    """
    def __init__(self):
        self.rag_engine = RAGEngine()
        print("AgentOrchestrator initialized.")

    # MENAMBAH PARAMETER force_json
    def process_query(self, user_query: str, force_json: bool = False) -> str:
        """
        Menentukan alur terbaik untuk query: RAG atau LLM murni, dan meneruskan flag JSON.
        """
        
        # Logika: Jika JSON diminta (dari /generate atau /combine), atau jika query panjang/kompleks.
        # Rute ke LLM Pro dengan JSON forcing.
        if force_json or (len(user_query) >= 150 or user_query.lower().startswith("saya membutuhkan rekomendasi")):
            print(f"Orchestrator: Directing query (Complex/JSON={force_json}) to pure LLM (Gemini Pro).")
            return get_llm_response(user_query, force_json=force_json)
            
        # Logika lama: Ask (RAG pipeline)
        elif len(user_query) < 150 and not user_query.lower().startswith("saya membutuhkan rekomendasi"):
            print("Orchestrator: Directing query to RAG Engine.")
            
            rag_answer = self.rag_engine.query(user_query) 
            
            if "tidak dapat menemukan jawaban yang relevan" in rag_answer or rag_answer.startswith("Error"):
                 print("Orchestrator: RAG failed, falling back to LLM.")
                 # Panggil LLM Flash tanpa JSON force (default)
                 return get_llm_response(user_query, force_json=False)
            
            return rag_answer
            
        else:
            # Fallback untuk complex query lainnya
            print("Orchestrator: Directing complex query to pure LLM (Gemini).")
            return get_llm_response(user_query, force_json=False)