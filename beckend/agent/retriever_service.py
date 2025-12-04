# agent/retriever_service.py
import os
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document
from .embedding_service import initialize_embeddings, VECTOR_DB_PATH

def get_retriever():
    """Memuat Vector Store dan mengembalikannya sebagai Retriever."""
    
    # Kunci perbaikan: Cek eksistensi folder fisik Vector DB
    if not os.path.exists(VECTOR_DB_PATH):
        # Jika folder tidak ada, RAGEngine pasti gagal, kita lempar error yang jelas
        raise FileNotFoundError(
            f"Vector Database not found at {VECTOR_DB_PATH}. Run ingestion (startup event) first."
        )
        
    embeddings = initialize_embeddings()
    
    # Memuat Vector Store yang sudah di-persist
    # KODE INI BERJALAN di setiap worker yang memproses query
    vectorstore = Chroma(
        persist_directory=VECTOR_DB_PATH,
        embedding_function=embeddings
    )
    
    # Mengembalikan sebagai LangChain Retriever
    return vectorstore.as_retriever(search_kwargs={"k": 3})

def retrieve_documents(user_query: str) -> list[Document]:
    """Mencari dan mengambil dokumen yang relevan."""
    try:
        retriever = get_retriever()
        documents = retriever.invoke(user_query)
        return documents
    except FileNotFoundError as e:
        print(f"Retrieval Error: {e}")
        # Jika file tidak ada, kembalikan list kosong, yang akan ditangkap di generator_service
        return [] 
    except Exception as e:
        print(f"Retrieval Error: An unexpected error occurred: {e}")
        return []