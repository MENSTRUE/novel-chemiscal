# agent/rag.py (Sekarang berfungsi sebagai RAG Orchestrator)
from .retriever_service import retrieve_documents
from .generator_service import generate_answer

class RAGEngine:
    def __init__(self):
        self.is_indexed = False # Tetap simpan flag untuk health check
        print("RAGEngine initialized.")

    def index_data(self):
        """Melakukan indexing/ingestion data. Dipanggil saat startup main.py."""
        # ... (Logika indexing tetap sama)
        
        # Setelah sukses indexing:
        # ...
        self.is_indexed = True # Tetapkan True di sini.

    def query(self, user_query: str) -> str:
        """Menjalankan alur RAG (Retrieve -> Generate)."""
        
        # HAPUS pengecekan `if not self.is_indexed:` 
        # Kita biarkan kode mencoba retrieval, dan ia akan gagal
        # jika file fisik 'chroma_db' belum ada.

        print(f"RAG Pipeline: Running retrieval for query: {user_query}")
        
        # 1. RETRIEVAL
        retrieved_docs = retrieve_documents(user_query) # Ini akan lempar FileNotFoundError jika DB belum siap
        
        if not retrieved_docs:
            # Jika retrieval gagal (folder tidak ada atau error internal), kembalikan pesan ini.
            return "Gagal melakukan retrieval dokumen. Pastikan data sudah di-ingest dan server stabil."
            
        print(f"RAG Pipeline: Found {len(retrieved_docs)} relevant documents.")

        # 2. GENERATION
        final_answer = generate_answer(user_query, retrieved_docs)
        
        return final_answer