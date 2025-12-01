# agent/retriever_service.py
import os
from langchain_community.vectorstores import Chroma
from langchain_core.documents import Document 
from .embedding_service import initialize_embeddings, VECTOR_DB_PATH

def get_retriever():
    """Memuat Vector Store dan mengembalikannya sebagai Retriever."""
    
    if not os.path.exists(VECTOR_DB_PATH):
        raise FileNotFoundError(
            f"Vector Database not found at {VECTOR_DB_PATH}. Run ingestion first."
        )
        
    embeddings = initialize_embeddings()
    
    # Memuat Vector Store yang sudah di-persist
    vectorstore = Chroma(
        persist_directory=VECTOR_DB_PATH,
        embedding_function=embeddings
    )
    
    # Mengembalikan sebagai LangChain Retriever
    return vectorstore.as_retriever(search_kwargs={"k": 3}) # Mencari 3 dokumen teratas

def retrieve_documents(user_query: str) -> list[Document]:
    """Mencari dan mengambil dokumen yang relevan."""
    try:
        retriever = get_retriever()
        documents = retriever.invoke(user_query) # Menggunakan invoke()
        return documents
    except FileNotFoundError as e:
        print(f"Retrieval Error: {e}")
        return []