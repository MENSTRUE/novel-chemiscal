# agent/rag.py
from .embedding_service import run_ingestion
from .retriever_service import retrieve_documents
from .generator_service import generate_answer
from .llm import get_llm_response # Untuk fallback langsung ke Gemini

class RAGEngine:
    """
    Menggabungkan proses Ingestion, Retrieval, dan Generation.
    Dipanggil langsung oleh main.py.
    """
    def __init__(self):
        # State: Menandakan apakah data sudah diindeks/siap
        self.is_indexed = False
        print("RAGEngine initialized.")

    def index_data(self):
        """
        Melakukan indexing/ingestion data. Dipanggil saat startup main.py.
        """
        print("Starting RAG data indexing...")
        result = run_ingestion()
        
        if result.startswith("Error"):
            print(f"❌ RAGEngine Indexing failed: {result}")
            self.is_indexed = False
            raise Exception(result)
        else:
            print(f"✅ RAGEngine Indexing successful: {result}")
            self.is_indexed = True

    def query(self, user_query: str) -> str:
        """
        Menjalankan alur RAG (Retrieve -> Generate).
        """
        if not self.is_indexed:
            return "Error: Data RAG belum diindeks atau gagal diinisialisasi. Tidak bisa melakukan pencarian."
            
        print(f"RAGEngine: Running retrieval for query: {user_query}")
        
        # 1. RETRIEVAL
        retrieved_docs = retrieve_documents(user_query)
        
        # 2. GENERATION
        final_answer = generate_answer(user_query, retrieved_docs)
        
        return final_answer